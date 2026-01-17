/**
 * Netlify Serverless Function: Latest Loto Results API
 * GET /api/loto/latest
 * 
 * Returns the latest Loto draw results from LLDJ website
 * with proper caching headers for stale-while-revalidate
 */

const { getLatestLoto } = require('../../src/services/lldjLoto');

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
    const useCache = queryParams.cache !== 'false';
    
    // Fetch latest loto results
    const result = await getLatestLoto(useCache);
    
    // Determine status code
    let statusCode = 200;
    if (result.error && !result.numbers) {
      // No cached data available, but return 200 with error (consistent with other endpoints)
      statusCode = 200;
    }
    
    // Set cache headers based on result
    if (result.from_cache) {
      headers['Cache-Control'] = 'public, max-age=300'; // 5 minutes for cached
    } else {
      headers['Cache-Control'] = 'public, max-age=60, stale-while-revalidate=600'; // 1 min fresh, 10 min stale
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('Error fetching loto results:', error);
    
    // Try to return cached data if available
    try {
      const fs = require('fs');
      const path = require('path');
      const cacheFile = path.join(process.cwd(), 'data/loto-latest.json');
      if (fs.existsSync(cacheFile)) {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Cache-Control': 'public, max-age=300'
          },
          body: JSON.stringify({
            ...cached,
            from_cache: true,
            _note: 'Showing last saved result due to fetch failure'
          })
        };
      }
    } catch (cacheError) {
      // Ignore cache read errors
    }
    
    // Return error response
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch loto results',
        details: error.message,
        sourceUrl: 'https://www.lldj.com/',
        fetchedAt: new Date().toISOString(),
        drawNumber: null,
        drawDate: null,
        numbers: []
      })
    };
  }
};
