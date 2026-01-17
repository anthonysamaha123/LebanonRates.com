/**
 * Vercel API Route: Lebanon Gold Prices
 * Compatible with Vercel's serverless function API
 * 
 * This file is a Vercel-compatible version of netlify/functions/lebanon-gold.js
 */

const { fetchLebanonGold } = require('../scripts/fetch-lebanon-gold');
const { fetchUSDRate } = require('../scripts/fetch-data');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Check if refresh is requested
    const refresh = req.query.refresh === 'true';
    
    // Fetch USD rate for conversion
    let usdLbpRate = null;
    try {
      const usdRates = await fetchUSDRate(false);
      usdLbpRate = usdRates ? usdRates.rate : null;
    } catch (error) {
      console.warn('Failed to fetch USD rate, proceeding without USD conversion:', error.message);
    }
    
    // Fetch Lebanon gold prices
    const goldData = await fetchLebanonGold(refresh, usdLbpRate);
    
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json(goldData);
    
  } catch (error) {
    console.error('Error fetching Lebanon gold data:', error);
    
    // Set no-cache headers for errors
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(500).json({
      error: 'Failed to fetch Lebanon gold prices',
      details: error.message
    });
  }
};
