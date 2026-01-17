const axios = require('axios');
const https = require('https');
const { parseMedcoFuelPrices } = require('./parseMedco');

const SOURCE_URL = 'https://medco.com.lb/';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000; // 2 seconds

// In-memory cache
let cache = {
  data: null,
  timestamp: null,
  fromCache: false
};

// File cache path (optional)
const path = require('path');
const fs = require('fs');
const CACHE_FILE = path.join(__dirname, '../.cache', 'medco-fuel-prices.json');

// Ensure cache directory exists
const cacheDir = path.dirname(CACHE_FILE);
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

/**
 * Load cached data from file
 */
function loadFileCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const fileData = fs.readFileSync(CACHE_FILE, 'utf8');
      const cached = JSON.parse(fileData);
      
      // Check if cache is still valid
      const cacheAge = Date.now() - new Date(cached.fetched_at_iso).getTime();
      if (cacheAge < CACHE_TTL_MS) {
        return cached;
      }
    }
  } catch (error) {
    // Ignore cache read errors
  }
  return null;
}

/**
 * Save data to file cache
 */
function saveFileCache(data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    // Ignore cache write errors
  }
}

/**
 * Fetch MEDCO fuel prices with retries and error handling
 */
async function fetchMedcoFuelPrices(useCache = true) {
  // Check in-memory cache first
  if (useCache && cache.data && cache.timestamp) {
    const cacheAge = Date.now() - cache.timestamp;
    if (cacheAge < CACHE_TTL_MS) {
      return {
        ...cache.data,
        from_cache: true,
        ok: true
      };
    }
  }

  // Check file cache
  if (useCache) {
    const fileCached = loadFileCache();
    if (fileCached) {
      // Update in-memory cache
      cache.data = fileCached;
      cache.timestamp = new Date(fileCached.fetched_at_iso).getTime();
      
      return {
        ...fileCached,
        from_cache: true,
        ok: true
      };
    }
  }

  // Fetch fresh data with retries
  let lastError = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Create HTTPS agent that handles SSL issues gracefully
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false // Allow self-signed certificates (needed for some sites)
      });
      
      const response = await axios.get(SOURCE_URL, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        validateStatus: (status) => status === 200,
        httpsAgent: httpsAgent,
        maxRedirects: 5
      });

      const parsed = parseMedcoFuelPrices(response.data);
      
      if (!parsed) {
        throw new Error('Failed to parse fuel prices from HTML');
      }

      const result = {
        ok: true,
        from_cache: false,
        source_url: SOURCE_URL,
        fetched_at_iso: new Date().toISOString(),
        unl95_lbp: parsed.unl95_lbp,
        unl98_lbp: parsed.unl98_lbp,
        lpg10kg_lbp: parsed.lpg10kg_lbp,
        diesel_note: parsed.diesel_note || null
      };

      // Update caches
      cache.data = result;
      cache.timestamp = Date.now();
      saveFileCache(result);

      return result;

    } catch (error) {
      lastError = error;
      
      // Log error but continue to retry
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  // All retries failed - return cached data if available
  if (useCache) {
    const fileCached = loadFileCache();
    if (fileCached) {
      return {
        ...fileCached,
        from_cache: true,
        ok: true
      };
    }

    // Try in-memory cache even if expired
    if (cache.data) {
      return {
        ...cache.data,
        from_cache: true,
        ok: true
      };
    }
  }

  // No cache available - return error response
  return {
    ok: false,
    from_cache: false,
    source_url: SOURCE_URL,
    fetched_at_iso: new Date().toISOString(),
    error: lastError ? lastError.message : 'Failed to fetch fuel prices',
    unl95_lbp: null,
    unl98_lbp: null,
    lpg10kg_lbp: null,
    diesel_note: null
  };
}

module.exports = {
  fetchMedcoFuelPrices
};
