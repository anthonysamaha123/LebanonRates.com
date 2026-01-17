#!/usr/bin/env node
/**
 * Monitor script for MEDCO Fuel Prices API
 * Continuously monitors the API endpoint and displays updates
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const ENDPOINT = `${API_URL}/api/medco/fuel-prices`;
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '30000', 10); // Default 30 seconds

let previousData = null;
let requestCount = 0;
let successCount = 0;
let errorCount = 0;

function formatTimestamp() {
  return new Date().toISOString();
}

function displayData(data) {
  console.clear();
  console.log('📊 MEDCO Fuel Prices API Monitor');
  console.log('═'.repeat(60));
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Interval: ${INTERVAL_MS / 1000}s`);
  console.log(`Last update: ${formatTimestamp()}`);
  console.log('─'.repeat(60));
  console.log(`Requests: ${requestCount} | Success: ${successCount} | Errors: ${errorCount}`);
  console.log('─'.repeat(60));

  if (data && data.ok) {
    console.log('\n✅ Status: OK');
    console.log(`   From cache: ${data.from_cache ? 'Yes' : 'No'}`);
    console.log(`   Fetched at: ${data.fetched_at_iso}`);
    
    console.log('\n💰 Fuel Prices:');
    if (data.unl95_lbp) {
      const changed = previousData && previousData.unl95_lbp !== data.unl95_lbp;
      const indicator = changed ? '🔄' : '  ';
      console.log(`${indicator} UNL 95:     ${data.unl95_lbp.toLocaleString()} LBP`);
    } else {
      console.log('   UNL 95:     N/A');
    }
    
    if (data.unl98_lbp) {
      const changed = previousData && previousData.unl98_lbp !== data.unl98_lbp;
      const indicator = changed ? '🔄' : '  ';
      console.log(`${indicator} UNL 98:     ${data.unl98_lbp.toLocaleString()} LBP`);
    } else {
      console.log('   UNL 98:     N/A');
    }
    
    if (data.lpg10kg_lbp) {
      const changed = previousData && previousData.lpg10kg_lbp !== data.lpg10kg_lbp;
      const indicator = changed ? '🔄' : '  ';
      console.log(`${indicator} LPG 10 KG:  ${data.lpg10kg_lbp.toLocaleString()} LBP`);
    } else {
      console.log('   LPG 10 KG:  N/A');
    }
    
    if (data.diesel_note) {
      const changed = previousData && previousData.diesel_note !== data.diesel_note;
      const indicator = changed ? '🔄' : '  ';
      console.log(`${indicator} Diesel Oil: ${data.diesel_note}`);
    } else {
      console.log('   Diesel Oil: N/A');
    }

    if (previousData && JSON.stringify(data) !== JSON.stringify(previousData)) {
      console.log('\n⚠️  Data changed since last check!');
    }
  } else {
    console.log('\n❌ Status: ERROR');
    if (data && data.error) {
      console.log(`   Error: ${data.error}`);
    } else {
      console.log('   Unknown error');
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('Press Ctrl+C to stop monitoring\n');
}

async function checkAPI() {
  requestCount++;
  
  try {
    const start = Date.now();
    const response = await axios.get(ENDPOINT, {
      timeout: 10000,
      validateStatus: () => true // Don't throw on any status
    });
    const duration = Date.now() - start;

    if (response.status === 200 && response.data.ok) {
      successCount++;
      previousData = response.data;
      displayData(response.data);
    } else {
      errorCount++;
      displayData(response.data);
    }
  } catch (error) {
    errorCount++;
    
    if (error.code === 'ECONNREFUSED') {
      console.clear();
      console.log('❌ MEDCO Fuel Prices API Monitor');
      console.log('═'.repeat(60));
      console.log(`Endpoint: ${ENDPOINT}`);
      console.log('─'.repeat(60));
      console.log('✗ Error: Could not connect to API server');
      console.log('  Make sure the server is running: npm start');
      console.log('\nPress Ctrl+C to stop\n');
    } else {
      displayData({
        ok: false,
        error: error.message
      });
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Monitoring stopped');
  console.log(`Total requests: ${requestCount}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  process.exit(0);
});

// Start monitoring
console.log('🚀 Starting MEDCO Fuel Prices API Monitor...');
console.log(`   Endpoint: ${ENDPOINT}`);
console.log(`   Interval: ${INTERVAL_MS / 1000}s`);
console.log('   Press Ctrl+C to stop\n');

// Initial check
checkAPI();

// Set up interval
setInterval(checkAPI, INTERVAL_MS);
