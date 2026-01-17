/**
 * Store Gold History Script
 * Appends current gold prices to history file for tracking
 * Run this every 15 minutes (or hourly) via cron
 */

const fs = require('fs-extra');
const path = require('path');
const { fetchLebanonGold } = require('./fetch-lebanon-gold');

const DATA_DIR = path.join(__dirname, '../data');
const HISTORY_FILE = path.join(DATA_DIR, 'gold-history.json');
const RATES_FILE = path.join(DATA_DIR, 'rates.json');
const MAX_HISTORY_DAYS = 30;

/**
 * Load existing history
 */
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('Failed to load history file:', error.message);
  }
  
  return {
    items: {},
    metadata: {
      updateInterval: '15min',
      lastSnapshot: null
    }
  };
}

/**
 * Save history
 */
function saveHistory(history) {
  try {
    fs.ensureDirSync(DATA_DIR);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save history:', error.message);
    throw error;
  }
}

/**
 * Clean old history (keep only last 30 days)
 */
function cleanOldHistory(history) {
  const now = Date.now();
  const maxAge = MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000; // 30 days in ms
  
  Object.keys(history.items).forEach(key => {
    history.items[key] = history.items[key].filter(entry => {
      const entryTime = new Date(entry.timestamp).getTime();
      return (now - entryTime) < maxAge;
    });
    
    // Remove empty arrays
    if (history.items[key].length === 0) {
      delete history.items[key];
    }
  });
}

/**
 * Get USD rate for conversion
 */
function getUSDRate() {
  try {
    if (fs.existsSync(RATES_FILE)) {
      const rates = JSON.parse(fs.readFileSync(RATES_FILE, 'utf8'));
      return rates.usd?.rate || rates.usd?.buy || null;
    }
  } catch (error) {
    console.warn('Failed to load USD rate:', error.message);
  }
  return null;
}

/**
 * Main function to store current prices
 */
async function storeGoldHistory() {
  console.log('📊 Storing gold price history snapshot...');
  
  try {
    // Get current gold prices
    const usdRate = getUSDRate();
    const goldData = await fetchLebanonGold(true, usdRate);
    
    if (!goldData || !goldData.items) {
      throw new Error('No gold data available');
    }
    
    // Load existing history
    const history = loadHistory();
    
    // Get current timestamp
    const now = new Date().toISOString();
    
    // Store snapshot for each item
    goldData.items.forEach(item => {
      if (item.priceUsd !== null || item.priceLbp !== null) {
        if (!history.items[item.key]) {
          history.items[item.key] = [];
        }
        
        history.items[item.key].push({
          timestamp: now,
          priceUsd: item.priceUsd,
          priceLbp: item.priceLbp
        });
      }
    });
    
    // Update metadata
    history.metadata.lastSnapshot = now;
    
    // Clean old history
    cleanOldHistory(history);
    
    // Save history
    saveHistory(history);
    
    const itemCount = Object.keys(history.items).length;
    const totalEntries = Object.values(history.items).reduce((sum, arr) => sum + arr.length, 0);
    
    console.log(`✓ Stored snapshot: ${itemCount} items, ${totalEntries} total entries`);
    console.log(`  Last snapshot: ${now}`);
    
    return history;
    
  } catch (error) {
    console.error('❌ Failed to store gold history:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  storeGoldHistory()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { storeGoldHistory, loadHistory, saveHistory, cleanOldHistory };
