const express = require('express');
const { fetchMedcoFuelPrices } = require('./scrapeMedco');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for JSON responses
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MEDCO fuel prices endpoint
app.get('/api/medco/fuel-prices', async (req, res) => {
  try {
    const useCache = req.query.cache !== 'false';
    const result = await fetchMedcoFuelPrices(useCache);
    
    // Always return JSON, even on errors
    res.status(result.ok ? 200 : 500).json(result);
  } catch (error) {
    // Never crash - always return JSON
    console.error('Unexpected error in /api/medco/fuel-prices:', error);
    res.status(500).json({
      ok: false,
      from_cache: false,
      source_url: 'https://medco.com.lb/',
      fetched_at_iso: new Date().toISOString(),
      error: error.message || 'Internal server error',
      unl95_lbp: null,
      unl98_lbp: null,
      lpg10kg_lbp: null,
      diesel_note: null
    });
  }
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MEDCO Fuel Prices API server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Fuel prices: http://localhost:${PORT}/api/medco/fuel-prices`);
  });
}

module.exports = app;
