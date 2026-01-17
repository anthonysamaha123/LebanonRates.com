#!/usr/bin/env node
/**
 * Test script for MEDCO Fuel Prices API
 * Tests the local API endpoint and displays results
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const ENDPOINT = `${API_URL}/api/medco/fuel-prices`;

async function testAPI() {
  console.log('🧪 Testing MEDCO Fuel Prices API\n');
  console.log(`Endpoint: ${ENDPOINT}\n`);

  try {
    // Test 1: Basic request
    console.log('Test 1: Basic request (with cache)...');
    const start1 = Date.now();
    const response1 = await axios.get(ENDPOINT);
    const duration1 = Date.now() - start1;
    
    console.log(`✓ Status: ${response1.status}`);
    console.log(`✓ Response time: ${duration1}ms`);
    console.log(`✓ From cache: ${response1.data.from_cache}`);
    console.log(`✓ OK: ${response1.data.ok}`);
    
    if (response1.data.ok) {
      console.log('\n📊 Fuel Prices:');
      if (response1.data.unl95_lbp) {
        console.log(`  UNL 95: ${response1.data.unl95_lbp.toLocaleString()} LBP`);
      }
      if (response1.data.unl98_lbp) {
        console.log(`  UNL 98: ${response1.data.unl98_lbp.toLocaleString()} LBP`);
      }
      if (response1.data.lpg10kg_lbp) {
        console.log(`  LPG 10 KG: ${response1.data.lpg10kg_lbp.toLocaleString()} LBP`);
      }
      if (response1.data.diesel_note) {
        console.log(`  Diesel Oil: ${response1.data.diesel_note}`);
      }
      console.log(`\n  Fetched at: ${response1.data.fetched_at_iso}`);
      console.log(`  Source: ${response1.data.source_url}`);
    } else {
      console.log(`✗ Error: ${response1.data.error || 'Unknown error'}`);
    }

    // Test 2: Force fresh fetch
    console.log('\n\nTest 2: Force fresh fetch (cache=false)...');
    const start2 = Date.now();
    const response2 = await axios.get(`${ENDPOINT}?cache=false`);
    const duration2 = Date.now() - start2;
    
    console.log(`✓ Status: ${response2.status}`);
    console.log(`✓ Response time: ${duration2}ms`);
    console.log(`✓ From cache: ${response2.data.from_cache}`);
    console.log(`✓ OK: ${response2.data.ok}`);

    // Test 3: Health check
    console.log('\n\nTest 3: Health check...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log(`✓ Status: ${healthResponse.status}`);
    console.log(`✓ Health: ${JSON.stringify(healthResponse.data, null, 2)}`);

    console.log('\n✅ All tests passed!\n');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('✗ Error: Could not connect to API server');
      console.error('  Make sure the server is running: npm start');
      process.exit(1);
    } else if (error.response) {
      console.error(`✗ Error: ${error.response.status} ${error.response.statusText}`);
      console.error(`  ${JSON.stringify(error.response.data, null, 2)}`);
      process.exit(1);
    } else {
      console.error(`✗ Error: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run tests
testAPI();
