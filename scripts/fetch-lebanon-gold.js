/**
 * Lebanon Gold Prices Fetcher
 * Production-ready fetcher for Lebanor.com gold prices API
 * 
 * Endpoint: https://lebanor.com/home/price_ajax
 * Returns normalized schema with Lebanon-local "We Buy" prices
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const LEBANOR_API_URL = 'https://lebanor.com/home/price_ajax';
const CACHE_FILE = path.join(__dirname, '../data/lebanon-gold.json');
const CACHE_TTL_SECONDS = 60; // Cache for 60 seconds
const STALE_TTL_SECONDS = 600; // Allow stale data for 10 minutes
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Normalize item name to key
 */
function normalizeKey(name) {
  if (!name) return null;
  
  const lower = name.toLowerCase().trim();
  
  // Mapping patterns
  if (lower.includes('14') && lower.includes('karat')) return 'gold_14k_1g_buy';
  if (lower.includes('18') && lower.includes('karat')) return 'gold_18k_1g_buy';
  if (lower.includes('21') && lower.includes('karat')) return 'gold_21k_1g_buy';
  if (lower.includes('24') && lower.includes('karat')) return 'gold_24k_1g_buy';
  if (lower.includes('lira') && lower.includes('8g')) return 'gold_lira_8g_buy';
  if (lower.includes('silver') && lower.includes('999')) return 'silver_999_1g_buy';
  
  return null;
}

/**
 * Parse price string to number
 */
function parsePrice(priceStr) {
  if (!priceStr) return null;
  
  // Remove any non-numeric characters except decimal point and minus
  const cleaned = String(priceStr).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalize Lebanor API response to our schema
 */
function normalizeResponse(apiData, usdRate = null) {
  if (!Array.isArray(apiData)) {
    throw new Error('Invalid API response: expected array');
  }
  
  const items = [];
  const now = new Date().toISOString();
  
  // Expected items in order
  const expectedItems = [
    { key: 'gold_14k_1g_buy', label: 'We Buy 1g Gold 14 Karat' },
    { key: 'gold_18k_1g_buy', label: 'We Buy 1g Gold 18 karat' },
    { key: 'gold_21k_1g_buy', label: 'We Buy 1g Gold 21 Karat' },
    { key: 'gold_24k_1g_buy', label: 'We Buy 1g Gold 24 Karat' },
    { key: 'gold_lira_8g_buy', label: 'We Buy Gold Coin 8g (LIRA)' },
    { key: 'silver_999_1g_buy', label: 'We Buy 1g Silver 999' }
  ];
  
  // Process each item from API
  for (const apiItem of apiData) {
    const name = apiItem.name || apiItem.itemname || '';
    const priceStr = apiItem.itempr || apiItem.itemprice || apiItem.price || '';
    
    // Try to match by key
    const key = normalizeKey(name);
    if (!key) continue;
    
    const priceLbp = parsePrice(priceStr);
    if (priceLbp === null) continue;
    
    // Find corresponding label
    const expected = expectedItems.find(e => e.key === key);
    if (!expected) continue;
    
    // Convert LBP to USD if rate provided
    const priceUsd = usdRate && usdRate > 0 
      ? parseFloat((priceLbp / usdRate).toFixed(2))
      : null;
    
    items.push({
      key,
      label: expected.label,
      priceLbp: Math.round(priceLbp),
      priceUsd,
      rawName: name,
      rawPrice: priceStr
    });
  }
  
  // Ensure all expected items are present (fill missing with null)
  const resultItems = expectedItems.map(expected => {
    const found = items.find(item => item.key === expected.key);
    return found || {
      key: expected.key,
      label: expected.label,
      priceLbp: null,
      priceUsd: null,
      rawName: null,
      rawPrice: null
    };
  });
  
  return {
    source: 'lebanor',
    fetchedAt: now,
    items: resultItems
  };
}

/**
 * Read cached data
 */
function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return null;
    }
    
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const cacheAge = Math.floor((Date.now() - new Date(data.fetchedAt).getTime()) / 1000);
    
    return {
      data,
      age: cacheAge,
      isFresh: cacheAge < CACHE_TTL_SECONDS,
      isStale: cacheAge < STALE_TTL_SECONDS
    };
  } catch (error) {
    return null;
  }
}

/**
 * Write data to cache
 */
function writeCache(data) {
  try {
    fs.ensureDirSync(path.dirname(CACHE_FILE));
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write cache:', error.message);
  }
}

/**
 * Sleep utility for retries
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch gold prices from Lebanor API
 * @param {boolean} forceRefresh - Ignore cache and force fresh fetch
 * @param {number} usdRate - USD to LBP rate for conversion (optional)
 * @returns {Promise<Object>} Normalized gold prices data
 */
async function fetchLebanonGold(forceRefresh = false, usdRate = null) {
  // Check cache first (unless forced refresh)
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) {
      if (cached.isFresh) {
        console.log(`✓ Using fresh cached Lebanon gold data (${cached.age}s old)`);
        return cached.data;
      }
      if (cached.isStale) {
        console.log(`⚠ Using stale cached Lebanon gold data (${cached.age}s old, max ${STALE_TTL_SECONDS}s)`);
        // Return stale data but attempt refresh in background
        refreshInBackground(usdRate);
        return cached.data;
      }
    }
  }
  
  // Attempt fetch with retries
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      if (attempt > 1) {
        const delay = RETRY_DELAY_MS * (attempt - 1);
        console.log(`⏳ Retry attempt ${attempt}/${MAX_RETRIES + 1} after ${delay}ms...`);
        await sleep(delay);
      } else {
        console.log(`🌐 Fetching Lebanon gold prices from ${LEBANOR_API_URL}...`);
      }
      
      const response = await axios.get(LEBANOR_API_URL, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://lebanor.com/',
          'Origin': 'https://lebanor.com',
          'X-Requested-With': 'XMLHttpRequest'
        },
        validateStatus: (status) => status >= 200 && status < 400
      });
      
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid API response: expected array');
      }
      
      // Normalize response
      const normalized = normalizeResponse(response.data, usdRate);
      
      // Validate we got at least some items
      const validItems = normalized.items.filter(item => item.priceLbp !== null);
      if (validItems.length === 0) {
        throw new Error('No valid price items found in API response');
      }
      
      // Cache the result
      writeCache(normalized);
      
      console.log(`✓ Successfully fetched Lebanon gold prices (${validItems.length} items)`);
      return normalized;
      
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt > MAX_RETRIES;
      
      if (isLastAttempt) {
        console.warn(`❌ All ${MAX_RETRIES + 1} attempts failed. Last error: ${error.message}`);
        break;
      }
      
      console.warn(`⚠ Attempt ${attempt} failed: ${error.message}`);
    }
  }
  
  // All retries failed - try to return stale cache
  const cached = readCache();
  if (cached && cached.isStale) {
    console.warn(`⚠ Returning stale cache due to fetch failure`);
    return cached.data;
  }
  
  // No cache available - throw error
  throw new Error(`Failed to fetch Lebanon gold prices: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Refresh cache in background (non-blocking)
 */
function refreshInBackground(usdRate = null) {
  // Fire and forget
  fetchLebanonGold(true, usdRate).catch(err => {
    console.warn('Background refresh failed:', err.message);
  });
}

/**
 * Get cached data only (no fetch)
 */
function getCachedLebanonGold() {
  const cached = readCache();
  return cached ? cached.data : null;
}

// Export functions
module.exports = {
  fetchLebanonGold,
  getCachedLebanonGold,
  normalizeResponse,
  normalizeKey,
  parsePrice
};

// CLI usage
if (require.main === module) {
  (async () => {
    try {
      // Try to get USD rate for conversion
      let usdRate = null;
      try {
        const ratesFile = path.join(__dirname, '../data/rates.json');
        if (fs.existsSync(ratesFile)) {
          const rates = JSON.parse(fs.readFileSync(ratesFile, 'utf8'));
          usdRate = rates.usd?.rate || rates.usd?.buy || null;
        }
      } catch (e) {
        // Ignore
      }
      
      const data = await fetchLebanonGold(false, usdRate);
      
      console.log('\n📊 Lebanon Gold Prices:');
      console.log('=' .repeat(50));
      data.items.forEach(item => {
        if (item.priceLbp !== null) {
          const priceStr = item.priceUsd 
            ? `${item.priceLbp.toLocaleString()} LBP ($${item.priceUsd.toFixed(2)} USD)`
            : `${item.priceLbp.toLocaleString()} LBP`;
          console.log(`  ${item.label}: ${priceStr}`);
        }
      });
      console.log(`\n  Last updated: ${data.fetchedAt}`);
      console.log('=' .repeat(50));
      
      process.exit(0);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}
