#!/usr/bin/env node
/**
 * Local API Endpoint Test Script
 * Tests the Lebanon Gold API endpoint locally
 */

const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 8888;
const API_PATH = '/api/lebanon-gold';

// Import the Netlify function handler
const { handler } = require('../netlify/functions/lebanon-gold');

function createEvent(method = 'GET', path = API_PATH, query = {}) {
  const queryString = new URLSearchParams(query).toString();
  const fullPath = queryString ? `${path}?${queryString}` : path;
  
  return {
    httpMethod: method,
    path: fullPath,
    pathParameters: null,
    queryStringParameters: query,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Test-Script/1.0'
    },
    body: null,
    isBase64Encoded: false,
    requestContext: {
      requestId: 'test-request',
      identity: {
        sourceIp: '127.0.0.1'
      }
    }
  };
}

async function testEndpoint(options = {}) {
  const { refresh = false, timeout = 15000 } = options;
  
  console.log(`\n🧪 Testing Lebanon Gold API Endpoint`);
  console.log(`📍 Path: ${API_PATH}${refresh ? '?refresh=true' : ''}`);
  console.log(`⏱  Timeout: ${timeout}ms\n`);
  
  const startTime = Date.now();
  const event = createEvent('GET', API_PATH, refresh ? { refresh: 'true' } : {});
  
  try {
    const response = await Promise.race([
      handler(event, {}),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
    
    const duration = Date.now() - startTime;
    
    // Parse response body
    let body;
    try {
      body = JSON.parse(response.body);
    } catch (e) {
      body = response.body;
    }
    
    console.log(`✅ Status: ${response.statusCode} ${getStatusText(response.statusCode)}`);
    console.log(`⏱  Duration: ${duration}ms\n`);
    
    // Display headers
    console.log('📋 Response Headers:');
    Object.entries(response.headers || {}).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    console.log('');
    
    // Display cache headers
    if (response.headers && response.headers['Cache-Control']) {
      const cacheControl = response.headers['Cache-Control'];
      console.log(`📦 Cache Policy: ${cacheControl}`);
      console.log('');
    }
    
    // Display data
    if (body && body.items) {
      console.log(`📊 Data Summary:`);
      console.log(`   Source: ${body.source || 'unknown'}`);
      console.log(`   Fetched: ${body.fetchedAt || 'unknown'}`);
      console.log(`   Items: ${body.items.length}\n`);
      
      console.log('📋 Items:');
      body.items.forEach(item => {
        const usdStr = item.priceUsd !== null && item.priceUsd !== 0
          ? `$${item.priceUsd.toFixed(2)}`
          : '—';
        console.log(`   ${item.label}: ${item.priceLbp} LBP (${usdStr} USD)`);
      });
    } else if (body.error) {
      console.log(`❌ Error: ${body.error}`);
      if (body.details) {
        console.log(`   Details: ${body.details}`);
      }
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    return {
      success: response.statusCode === 200,
      statusCode: response.statusCode,
      duration,
      headers: response.headers,
      body
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error: ${error.message}`);
    console.log(`⏱  Duration: ${duration}ms\n`);
    return {
      success: false,
      error: error.message,
      duration
    };
  }
}

function getStatusText(code) {
  const statusTexts = {
    200: 'OK',
    400: 'Bad Request',
    500: 'Internal Server Error',
    503: 'Service Unavailable'
  };
  return statusTexts[code] || 'Unknown';
}

async function runTests() {
  console.log('🚀 Lebanon Gold API Local Test Suite\n');
  console.log('='.repeat(60));
  
  // Test 1: Normal request (should use cache if fresh)
  console.log('\n📝 Test 1: Normal Request (Cached)');
  const test1 = await testEndpoint({ refresh: false });
  
  // Test 2: Force refresh
  console.log('\n📝 Test 2: Force Refresh');
  const test2 = await testEndpoint({ refresh: true });
  
  // Test 3: Rapid requests (cache test)
  console.log('\n📝 Test 3: Rapid Requests (Cache Test)');
  const test3a = await testEndpoint({ refresh: false });
  const test3b = await testEndpoint({ refresh: false });
  
  // Summary
  console.log('📊 Test Summary:');
  console.log(`   Test 1 (Cached): ${test1.success ? '✅ PASS' : '❌ FAIL'} (${test1.duration}ms)`);
  console.log(`   Test 2 (Refresh): ${test2.success ? '✅ PASS' : '❌ FAIL'} (${test2.duration}ms)`);
  console.log(`   Test 3a (Rapid): ${test3a.success ? '✅ PASS' : '❌ FAIL'} (${test3a.duration}ms)`);
  console.log(`   Test 3b (Rapid): ${test3b.success ? '✅ PASS' : '❌ FAIL'} (${test3b.duration}ms)`);
  
  const allPassed = [test1, test2, test3a, test3b].every(t => t.success);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}\n`);
  
  process.exit(allPassed ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testEndpoint };
