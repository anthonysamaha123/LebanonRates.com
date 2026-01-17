#!/usr/bin/env node
/**
 * API Monitoring Script
 * Monitors the Lebanon Gold API endpoint for performance and errors
 */

const https = require('https');
const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:8888/api/lebanon-gold';
const INTERVAL_MS = process.env.INTERVAL_MS || 60000; // 1 minute default
const MAX_REQUESTS = process.env.MAX_REQUESTS || 10;

const stats = {
  total: 0,
  success: 0,
  errors: 0,
  durations: [],
  cacheHits: 0,
  cacheMisses: 0,
  lastError: null,
  lastSuccess: null
};

function makeRequest() {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    const client = url.protocol === 'https:' ? https : http;
    const startTime = Date.now();
    
    const req = client.request(url, { method: 'GET' }, (res) => {
      let body = '';
      
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        
        // Check cache headers
        const cacheControl = res.headers['cache-control'] || '';
        const isCacheHit = cacheControl.includes('public') && statusCode === 200;
        
        stats.total++;
        stats.durations.push(duration);
        
        if (statusCode === 200) {
          stats.success++;
          stats.lastSuccess = new Date().toISOString();
          
          if (isCacheHit) {
            stats.cacheHits++;
          } else {
            stats.cacheMisses++;
          }
          
          try {
            const data = JSON.parse(body);
            resolve({
              success: true,
              statusCode,
              duration,
              cacheHit: isCacheHit,
              itemsCount: data.items ? data.items.length : 0,
              fetchedAt: data.fetchedAt
            });
          } catch (e) {
            resolve({
              success: true,
              statusCode,
              duration,
              cacheHit: isCacheHit,
              parseError: e.message
            });
          }
        } else {
          stats.errors++;
          stats.lastError = new Date().toISOString();
          reject({
            success: false,
            statusCode,
            duration,
            error: `HTTP ${statusCode}`
          });
        }
      });
    });
    
    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      stats.errors++;
      stats.lastError = new Date().toISOString();
      reject({
        success: false,
        error: error.message,
        duration
      });
    });
    
    req.setTimeout(15000, () => {
      req.destroy();
      const duration = Date.now() - startTime;
      stats.errors++;
      stats.lastError = new Date().toISOString();
      reject({
        success: false,
        error: 'Request timeout',
        duration
      });
    });
    
    req.end();
  });
}

function getStats() {
  const avgDuration = stats.durations.length > 0
    ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length)
    : 0;
  
  const minDuration = stats.durations.length > 0
    ? Math.min(...stats.durations)
    : 0;
  
  const maxDuration = stats.durations.length > 0
    ? Math.max(...stats.durations)
    : 0;
  
  const successRate = stats.total > 0
    ? ((stats.success / stats.total) * 100).toFixed(2)
    : 0;
  
  const cacheHitRate = (stats.cacheHits + stats.cacheMisses) > 0
    ? ((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(2)
    : 0;
  
  return {
    total: stats.total,
    success: stats.success,
    errors: stats.errors,
    successRate: `${successRate}%`,
    avgDuration: `${avgDuration}ms`,
    minDuration: `${minDuration}ms`,
    maxDuration: `${maxDuration}ms`,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    cacheHitRate: `${cacheHitRate}%`,
    lastSuccess: stats.lastSuccess,
    lastError: stats.lastError
  };
}

function printStats() {
  const statsObj = getStats();
  console.log('\n' + '='.repeat(60));
  console.log('📊 API Monitoring Stats');
  console.log('='.repeat(60));
  console.log(`Total Requests: ${statsObj.total}`);
  console.log(`Success: ${statsObj.success} (${statsObj.successRate})`);
  console.log(`Errors: ${statsObj.errors}`);
  console.log(`Avg Duration: ${statsObj.avgDuration}`);
  console.log(`Min/Max: ${statsObj.minDuration} / ${statsObj.maxDuration}`);
  console.log(`Cache Hits: ${statsObj.cacheHits} (${statsObj.cacheHitRate})`);
  console.log(`Cache Misses: ${statsObj.cacheMisses}`);
  if (statsObj.lastSuccess) {
    console.log(`Last Success: ${statsObj.lastSuccess}`);
  }
  if (statsObj.lastError) {
    console.log(`Last Error: ${statsObj.lastError}`);
  }
  console.log('='.repeat(60) + '\n');
}

async function monitor() {
  console.log('🔍 Starting API Monitoring');
  console.log(`📍 Endpoint: ${API_URL}`);
  console.log(`⏱  Interval: ${INTERVAL_MS}ms`);
  console.log(`📊 Max Requests: ${MAX_REQUESTS || 'Unlimited'}\n`);
  
  let requestCount = 0;
  
  const interval = setInterval(async () => {
    requestCount++;
    
    if (MAX_REQUESTS && requestCount > MAX_REQUESTS) {
      clearInterval(interval);
      printStats();
      console.log('✅ Monitoring complete\n');
      process.exit(0);
    }
    
    const timestamp = new Date().toISOString();
    process.stdout.write(`[${timestamp}] Request ${requestCount}... `);
    
    try {
      const result = await makeRequest();
      const cacheInfo = result.cacheHit ? '(cached)' : '(fresh)';
      console.log(`✅ ${result.statusCode} ${result.duration}ms ${cacheInfo}`);
    } catch (error) {
      console.log(`❌ ${error.error || 'Failed'} ${error.duration || 0}ms`);
    }
    
    // Print stats every 5 requests
    if (requestCount % 5 === 0) {
      printStats();
    }
  }, INTERVAL_MS);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n⏹  Stopping monitoring...');
    clearInterval(interval);
    printStats();
    process.exit(0);
  });
}

// Run if called directly
if (require.main === module) {
  monitor().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { makeRequest, getStats, monitor };
