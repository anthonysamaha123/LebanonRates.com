const axios = require('axios');
const https = require('https');
const path = require('path');
const fs = require('fs');
const { parseLldjLoto } = require('../parseLldjLoto');

const SOURCE_URL = 'https://www.lldj.com/';
const ALT_SOURCE_URL = 'https://www.lldj.com/en/LatestResults/Loto';
const CACHE_TTL_MS = 60 * 1000; // 60 seconds (configurable)
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000; // 2 seconds

// In-memory cache
let cache = {
  data: null,
  timestamp: null,
  fromCache: false
};

// File cache path - persist to data/ directory for UI fallback
const CACHE_FILE = path.join(__dirname, '../../data/loto-latest.json');

// Ensure data directory exists
const dataDir = path.dirname(CACHE_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Load cached data from file
 * @returns {Object|null} Cached data or null if not available
 */
function loadFileCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const fileData = fs.readFileSync(CACHE_FILE, 'utf8');
      const cached = JSON.parse(fileData);
      return cached;
    }
  } catch (error) {
    // Ignore cache read errors - will fetch fresh data
  }
  return null;
}

/**
 * Save data to file cache
 * @param {Object} data - Data to save
 */
function saveFileCache(data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    // Ignore cache write errors - not critical
  }
}

/**
 * Fetch latest Loto results from LLDJ website
 * @param {boolean} useCache - Whether to use cached results if available
 * @returns {Object} Result object with loto data or error
 */
async function getLatestLoto(useCache = true) {
  // Check in-memory cache first
  if (useCache && cache.data && cache.timestamp) {
    const cacheAge = Date.now() - cache.timestamp;
    if (cacheAge < CACHE_TTL_MS) {
      return {
        ...cache.data,
        from_cache: true
      };
    }
  }

  // Check file cache (even if expired, it's better than nothing)
  if (useCache) {
    const fileCached = loadFileCache();
    if (fileCached) {
      const cacheAge = Date.now() - new Date(fileCached.fetchedAt).getTime();
      if (cacheAge < CACHE_TTL_MS) {
        // Update in-memory cache
        cache.data = fileCached;
        cache.timestamp = new Date(fileCached.fetchedAt).getTime();
        
        return {
          ...fileCached,
          from_cache: true
        };
      }
    }
  }

  // Fetch fresh data with retries
  // Try homepage first (has "LOTO & ZEED LATEST RESULTS" section)
  // Fall back to Latest Results page if needed
  let lastError = null;
  const urlsToTry = [SOURCE_URL, ALT_SOURCE_URL];
  
  for (const url of urlsToTry) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Create HTTPS agent that handles SSL issues gracefully
        const httpsAgent = new https.Agent({
          rejectUnauthorized: false // Allow self-signed certificates
        });
        
        const response = await axios.get(url, {
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

        const parsed = parseLldjLoto(response.data);
        
        if (!parsed) {
          throw new Error(`Failed to parse loto data from ${url}. Expected 7 numbers but found ${parsed?.numbers?.length || 0}`);
        }

        // Validate parsed data
        if (!parsed.drawNumber || !parsed.drawDate || !parsed.numbers || parsed.numbers.length !== 7) {
          throw new Error(`Invalid parsed data: drawNumber=${parsed.drawNumber}, drawDate=${parsed.drawDate}, numbers.length=${parsed.numbers?.length || 0}`);
        }

        const result = {
          drawNumber: parsed.drawNumber,
          drawDate: parsed.drawDate,
          numbers: parsed.numbers, // Array of 7 numbers (6 main + 1 extra/red)
          sourceUrl: url,
          fetchedAt: new Date().toISOString()
        };

        // Update caches
        cache.data = result;
        cache.timestamp = Date.now();
        saveFileCache(result);

        return result;

      } catch (error) {
        lastError = error;
        
        // If parsing failed, don't retry the same URL
        if (error.message.includes('Failed to parse') || error.message.includes('Invalid parsed data')) {
          break; // Try next URL instead
        }
        
        // Log error but continue to retry
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }
    
    // If we successfully parsed from this URL, stop trying other URLs
    if (cache.data && cache.timestamp) {
      break;
    }
  }

  // All retries failed - return cached data if available (file cache)
  if (useCache) {
    const fileCached = loadFileCache();
    if (fileCached) {
      return {
        ...fileCached,
        from_cache: true,
        _note: 'Showing last saved result due to fetch failure'
      };
    }

    // Try in-memory cache even if expired
    if (cache.data) {
      return {
        ...cache.data,
        from_cache: true,
        _note: 'Showing last saved result due to fetch failure'
      };
    }
  }

  // No cache available - return error response
  return {
    error: lastError ? lastError.message : 'Failed to fetch loto results',
    sourceUrl: SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    drawNumber: null,
    drawDate: null,
    numbers: []
  };
}

module.exports = {
  getLatestLoto
};
