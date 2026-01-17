/**
 * Netlify Serverless Function: Lebanon Gold Prices API
 * GET /api/lebanon-gold
 * 
 * Returns normalized Lebanon gold prices from Lebanor.com
 * with proper caching headers for stale-while-revalidate
 */

const { fetchLebanonGold, getCachedLebanonGold } = require('../../scripts/fetch-lebanon-gold');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=600'
  };
  
  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }
  
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    // Check query params
    const queryParams = event.queryStringParameters || {};
    const forceRefresh = queryParams.refresh === 'true';
    
    // Try to get USD rate from cache (for conversion)
    let usdRate = null;
    try {
      const fs = require('fs');
      const path = require('path');
      const ratesFile = path.join(process.cwd(), 'data/rates.json');
      if (fs.existsSync(ratesFile)) {
        const rates = JSON.parse(fs.readFileSync(ratesFile, 'utf8'));
        usdRate = rates.usd?.rate || rates.usd?.buy || null;
      }
    } catch (e) {
      // Ignore
    }
    
    // Fetch gold prices (with stale-while-revalidate behavior)
    let data;
    
    if (forceRefresh) {
      // Force fresh fetch
      data = await fetchLebanonGold(true, usdRate);
    } else {
      // Try cached first, then fetch if needed
      const cached = getCachedLebanonGold();
      if (cached) {
        const cacheAge = Math.floor((Date.now() - new Date(cached.fetchedAt).getTime()) / 1000);
        if (cacheAge < 60) {
          // Fresh cache - return immediately
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(cached)
          };
        }
        // Stale cache - return it but refresh in background
        data = cached;
        // Trigger background refresh (non-blocking)
        fetchLebanonGold(true, usdRate).catch(err => {
          console.warn('Background refresh failed:', err.message);
        });
      } else {
        // No cache - fetch fresh
        data = await fetchLebanonGold(false, usdRate);
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    console.error('Error fetching Lebanon gold prices:', error);
    
    // Try to return cached data even on error
    const cached = getCachedLebanonGold();
    if (cached) {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'X-Cache': 'stale',
          'X-Error': error.message
        },
        body: JSON.stringify(cached)
      };
    }
    
    // No cache available - return error
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch gold prices',
        message: error.message,
        source: 'lebanor'
      })
    };
  }
};
