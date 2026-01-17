const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const { format } = require('date-fns');
const { fetchLebanonGold } = require('./fetch-lebanon-gold');

const DATA_DIR = path.join(__dirname, '../data');
const RATES_FILE = path.join(DATA_DIR, 'rates.json');
const FUEL_FILE = path.join(DATA_DIR, 'fuel.json');
const GOLD_FILE = path.join(DATA_DIR, 'gold.json');

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);

// Rate limiting settings - respect source limits
const MIN_CACHE_SECONDS = 120; // Minimum time between requests (2 minutes - increased to be more respectful)
const MAX_FETCH_ATTEMPTS = 3; // Maximum retry attempts (reduced to avoid overwhelming the server)
const RETRY_DELAY_MS = 5000; // Delay between retries (5 seconds - increased to be more respectful)

// In-memory cache (for same-process calls)
let lastFetchTime = 0;
let lastFetchResult = null;

/**
 * Check if we should skip fetching based on file timestamp
 * This respects rate limits across processes (important for automation)
 */
function shouldSkipFetch() {
  if (!fs.existsSync(RATES_FILE)) {
    return false; // No cached file, need to fetch
  }

  try {
    const stats = fs.statSync(RATES_FILE);
    const fileAge = Date.now() - stats.mtimeMs;
    const fileAgeSeconds = Math.floor(fileAge / 1000);

    if (fileAgeSeconds < MIN_CACHE_SECONDS) {
      console.log(`⏭ Skipping fetch - data is fresh (${fileAgeSeconds}s old, minimum ${MIN_CACHE_SECONDS}s)`);
      return true;
    }
  } catch (error) {
    // If we can't read file stats, proceed with fetch
    console.warn('Could not check file timestamp, proceeding with fetch');
    return false;
  }

  return false; // File exists and is old enough, proceed with fetch
}

/**
 * Extract number from text, handling various formats (90,000, 90000, 90.000)
 */
function extractNumber(text) {
  // Match numbers with optional thousands separators (commas or periods)
  const match = text.match(/(\d{1,3}(?:[,.]?\d{3})*)/);
  if (match) {
    // Remove all non-digit characters and parse
    return parseInt(match[1].replace(/[,.]/g, ''), 10);
  }
  return null;
}

/**
 * Sleep/delay utility for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch black market USD/LBP buy and sell rates from LiraRate.org
 * Implements caching and rate limiting to avoid hitting the site too frequently
 */
async function fetchUSDRate(forceRefresh = false) {
  // Check file-based rate limiting first (respects limits across processes)
  if (!forceRefresh && shouldSkipFetch()) {
    // Load from cached file
    if (fs.existsSync(RATES_FILE)) {
      try {
        const cached = JSON.parse(fs.readFileSync(RATES_FILE, 'utf8'));
        if (cached.usd?.rate) {
          const cachedRate = cached.usd.rate;
          const cachedBuy = cached.usd.buy || cachedRate;
          const cachedSell = cached.usd.sell || cachedRate;
          console.log(`✓ Using cached file data: Buy ${cachedBuy.toLocaleString()}, Sell ${cachedSell.toLocaleString()} LBP`);
          return { rate: cachedRate, buy: cachedBuy, sell: cachedSell };
        }
      } catch (error) {
        console.warn('Failed to read cached file, will fetch fresh data');
      }
    }
  }

  // Check in-memory cache (for same-process calls)
  const now = Date.now();
  if (lastFetchResult && (now - lastFetchTime) < MIN_CACHE_SECONDS * 1000) {
    const ageSeconds = Math.round((now - lastFetchTime) / 1000);
    console.log(`✓ Using in-memory cache (${ageSeconds}s old)`);
    return lastFetchResult;
  }

  const lirarateUrl = 'https://lirarate.org';
  
  // Retry logic with exponential backoff
  let attempt = 0;
  while (attempt < MAX_FETCH_ATTEMPTS) {
    try {
      attempt++;
      if (attempt > 1) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 2); // Exponential backoff
        console.log(`⏳ Retry attempt ${attempt}/${MAX_FETCH_ATTEMPTS} after ${delay}ms delay...`);
        await sleep(delay);
      } else {
        console.log(`🌐 Fetching rates from ${lirarateUrl}...`);
      }
      
      const response = await axios.get(lirarateUrl, {
        timeout: 25000, // 25 second timeout (increased for slow connections)
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://www.google.com/'
        },
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept 2xx and 3xx
        },
        // Add retry logic at axios level too
        httpAgent: new (require('http').Agent)({ keepAlive: true }),
        httpsAgent: new (require('https').Agent)({ keepAlive: true })
      });

      const $ = cheerio.load(response.data);
    const bodyText = $('body').text();
    
    // Strategy 1: Look for explicit "Buy 1 USD at" and "Sell 1 USD at" patterns
    // Based on actual lirarate.org format: "Buy 1 USD at 89,700 LBP" and "Sell 1 USD at 89,400 LBP"
    const buyPatterns = [
      /Buy\s+1\s+USD\s+at\s+([\d,]+)\s*LBP/i,  // Exact format: "Buy 1 USD at 89,700 LBP"
      /Buy\s+1\s+USD\s+at\s+([\d,.]+)\s*LBP/i,
      /Buy\s+1\s+\$\s+at\s+([\d,]+)\s*LBP/i,
      /شراء\s+1\s+دولار\s+بسعر\s+([\d,.]+)/i, // Arabic
      /Buy.*?(\d{1,3}(?:[,.]?\d{3})+).*?LBP/i,
    ];
    
    const sellPatterns = [
      /Sell\s+1\s+USD\s+at\s+([\d,]+)\s*LBP/i,  // Exact format: "Sell 1 USD at 89,400 LBP"
      /Sell\s+1\s+USD\s+at\s+([\d,.]+)\s*LBP/i,
      /Sell\s+1\s+\$\s+at\s+([\d,]+)\s*LBP/i,
      /بيع\s+1\s+دولار\s+بسعر\s+([\d,.]+)/i, // Arabic
      /Sell.*?(\d{1,3}(?:[,.]?\d{3})+).*?LBP/i,
    ];

    let buyRate = null;
    let sellRate = null;

    // Try to extract buy rate
    for (const pattern of buyPatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        buyRate = extractNumber(match[1] || match[0]);
        if (buyRate && buyRate > 10000 && buyRate < 1000000) {
          console.log(`✓ Found buy rate: ${buyRate.toLocaleString()} LBP`);
          break;
        }
        buyRate = null;
      }
    }

    // Try to extract sell rate
    for (const pattern of sellPatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        sellRate = extractNumber(match[1] || match[0]);
        if (sellRate && sellRate > 10000 && sellRate < 1000000) {
          console.log(`✓ Found sell rate: ${sellRate.toLocaleString()} LBP`);
          break;
        }
        sellRate = null;
      }
    }

    // Strategy 2: Look in HTML elements with common rate-related classes/IDs
    if (!buyRate || !sellRate) {
      // Check for data attributes, common class names
      const rateElements = $('[class*="buy"], [class*="sell"], [class*="rate"], [id*="rate"], [data-buy], [data-sell]');
      
      rateElements.each((i, elem) => {
        const $elem = $(elem);
        const text = $elem.text();
        const classText = ($elem.attr('class') || '').toLowerCase();
        const idText = ($elem.attr('id') || '').toLowerCase();
        
        const num = extractNumber(text);
        if (num && num > 10000 && num < 1000000) {
          if ((classText.includes('buy') || idText.includes('buy') || $elem.attr('data-buy')) && !buyRate) {
            buyRate = num;
          } else if ((classText.includes('sell') || idText.includes('sell') || $elem.attr('data-sell')) && !sellRate) {
            sellRate = num;
          }
        }
      });
    }

    // Strategy 3: Look for pairs of numbers near "buy"/"sell" keywords
    if (!buyRate || !sellRate) {
      // Find all numbers in the body that could be rates
      const allNumbers = [];
      const numberRegex = /(\d{1,3}(?:[,.]?\d{3})+)/g;
      let match;
      
      while ((match = numberRegex.exec(bodyText)) !== null) {
        const num = extractNumber(match[1]);
        const context = bodyText.substring(Math.max(0, match.index - 50), match.index + 100);
        if (num && num > 10000 && num < 1000000) {
          allNumbers.push({ num, context: context.toLowerCase() });
        }
      }

      // Try to identify buy/sell from context
      for (const item of allNumbers) {
        if (item.context.includes('buy') || item.context.includes('شراء')) {
          buyRate = buyRate || item.num;
        }
        if (item.context.includes('sell') || item.context.includes('بيع')) {
          sellRate = sellRate || item.num;
        }
      }
    }

    // Strategy 4: If we have two rates, assign based on typical pattern (buy < sell)
    if (!buyRate || !sellRate) {
      const rateMatches = bodyText.matchAll(/(\d{1,3}(?:[,.]?\d{3})+)/g);
      const rates = [];
      
      for (const match of rateMatches) {
        const num = extractNumber(match[1]);
        if (num && num > 10000 && num < 1000000) {
          rates.push(num);
        }
      }
      
      // Remove duplicates and sort
      const uniqueRates = [...new Set(rates)].sort((a, b) => a - b);
      
      if (uniqueRates.length >= 2) {
        // Usually buy < sell, so take the first two
        if (!buyRate) buyRate = uniqueRates[0];
        if (!sellRate) sellRate = uniqueRates[1];
      } else if (uniqueRates.length === 1) {
        // Only one rate found - use it for both
        if (!buyRate) buyRate = uniqueRates[0];
        if (!sellRate) sellRate = uniqueRates[0];
      }
    }

      // Determine final rate to return (prefer buy, fallback to sell, or average)
      const finalRate = buyRate || sellRate || (buyRate && sellRate ? Math.round((buyRate + sellRate) / 2) : null);
      
      if (finalRate) {
        // Cache the result (both in-memory and update file timestamp)
        lastFetchTime = Date.now();
        lastFetchResult = { rate: finalRate, buy: buyRate || finalRate, sell: sellRate || finalRate };
        
        if (buyRate && sellRate) {
          console.log(`✓ Successfully fetched rates from LiraRate (attempt ${attempt}):`);
          console.log(`  Buy:  ${buyRate.toLocaleString()} LBP`);
          console.log(`  Sell: ${sellRate.toLocaleString()} LBP`);
          console.log(`  Using buy rate: ${finalRate.toLocaleString()} LBP`);
        } else if (buyRate) {
          console.log(`✓ Fetched buy rate from LiraRate (attempt ${attempt}): ${buyRate.toLocaleString()} LBP`);
        } else if (sellRate) {
          console.log(`✓ Fetched sell rate from LiraRate (attempt ${attempt}): ${sellRate.toLocaleString()} LBP`);
        }
        
        // Update file timestamp to track last successful fetch
        try {
          if (fs.existsSync(RATES_FILE)) {
            fs.utimesSync(RATES_FILE, new Date(), new Date());
          }
        } catch (err) {
          // Ignore timestamp update errors
        }
        
        return { rate: finalRate, buy: buyRate || finalRate, sell: sellRate || finalRate };
      }

      throw new Error('Could not extract buy/sell rates from page content');

    } catch (error) {
      // If this is not the last attempt, continue to retry
      if (attempt < MAX_FETCH_ATTEMPTS) {
        console.warn(`⚠ Attempt ${attempt} failed: ${error.message}`);
        continue; // Retry
      }
      
      // Last attempt failed, break out of loop to fall back to cached data
      console.warn(`❌ All ${MAX_FETCH_ATTEMPTS} attempts failed. Last error: ${error.message}`);
      break; // Exit retry loop
    }
  }
  
  // All retries exhausted - fall back to cached file
  if (fs.existsSync(RATES_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(RATES_FILE, 'utf8'));
      if (cached.usd?.rate) {
        const cachedRate = cached.usd.rate;
        const cachedBuy = cached.usd.buy || cachedRate;
        const cachedSell = cached.usd.sell || cachedRate;
        const cachedTime = new Date(cached.usd.lastUpdated).getTime();
        const ageMinutes = Math.round((Date.now() - cachedTime) / 60000);
        
        console.warn(`⚠ Using cached USD rate from file (${ageMinutes} minutes old): Buy ${cachedBuy.toLocaleString()}, Sell ${cachedSell.toLocaleString()} LBP`);
        return { 
          rate: cachedRate, 
          buy: cachedBuy, 
          sell: cachedSell 
        };
      }
    } catch (parseError) {
      console.warn('Failed to parse cached rates file:', parseError.message);
    }
  }

  // Last resort: use a safe default
  console.warn('⚠ No cached data found, using fallback default');
  const fallbackRate = 89500;
  return { rate: fallbackRate, buy: fallbackRate, sell: fallbackRate };
}

/**
 * Fetch official rates (Sayrafa, etc.)
 */
async function fetchOfficialRates() {
  // This would scrape BDL website or use their API if available
  // For now, return placeholder structure
  return {
    sayrafa: 89800,
    customs: 15000,
    official: 15000,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Fetch EUR rate (derived from USD/EUR and USD/LBP)
 */
async function fetchEURRate(usdRate) {
  try {
    // Fetch EUR/USD rate from a public API
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
      timeout: 5000
    });
    const eurUsdRate = response.data.rates.EUR;
    const eurLbpRate = Math.round(usdRate / eurUsdRate);
    console.log(`✓ Calculated EUR rate: ${eurLbpRate} LBP`);
    return eurLbpRate;
  } catch (error) {
    // Fallback calculation
    console.warn('Failed to fetch EUR/USD, using approximate rate');
    return Math.round(usdRate * 1.08); // Approximate
  }
}

/**
 * Fetch fuel prices
 */
async function fetchFuelPrices() {
  // This would scrape Ministry of Energy website or news agency
  // For now, return placeholder structure
  return {
    gasoline95: 1100000, // per 20L
    gasoline98: 1120000,
    diesel: 980000,
    cookingGas: 380000, // per 10kg cylinder
    lastUpdated: new Date().toISOString(),
    nextUpdate: 'Typically updated on Tuesdays and Fridays'
  };
}

/**
 * Fetch gold prices from Lebanor.com (Lebanon real market prices)
 * Uses free JSON endpoint: https://lebanor.com/home/price_ajax
 */
async function fetchGoldPrice(usdLbpRate) {
  // Try Lebanon-specific gold prices first (more accurate for Lebanon market)
  try {
    console.log('Fetching gold prices from Lebanor.com...');
    const response = await axios.get('https://lebanor.com/home/price_ajax', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': 'https://lebanor.com/'
      }
    });
    
    if (response.data && Array.isArray(response.data)) {
      // Parse Lebanor response format
      // Format: [{"name":"We Buy 1g Gold 24 Karat", "itempr":"..."}, ...]
      let price24k = null;
      let price21k = null;
      let price18k = null;
      let price14k = null;
      
      for (const item of response.data) {
        const name = item.name || '';
        const price = item.itempr || item.itemprice || item.price;
        
        if (name.includes('24 Karat') || name.includes('24k')) {
          price24k = parseFloat(price) || null;
        } else if (name.includes('21 Karat') || name.includes('21k')) {
          price21k = parseFloat(price) || null;
        } else if (name.includes('18 Karat') || name.includes('18k')) {
          price18k = parseFloat(price) || null;
        } else if (name.includes('14 Karat') || name.includes('14k')) {
          price14k = parseFloat(price) || null;
        }
      }
      
      if (price24k) {
        console.log(`✓ Fetched Lebanon gold prices from Lebanor.com`);
        return {
      usdPerOz: null, // Not provided by Lebanor
      lbpPerGram24k: Math.round(price24k),
      lbpPerGram21k: price21k ? Math.round(price21k) : Math.round(price24k * 0.875),
      lbpPerGram18k: price18k ? Math.round(price18k) : Math.round(price24k * 0.75),
      lbpPerGram14k: price14k ? Math.round(price14k) : Math.round(price24k * 0.583),
      source: 'Lebanor.com',
      lastUpdated: new Date().toISOString()
        };
      }
    }
  } catch (error) {
    console.warn('Failed to fetch from Lebanor.com:', error.message);
  }
  
  // Fallback to international gold prices
  try {
    console.log('Falling back to international gold prices...');
    // Fetch gold price in USD per ounce
    const response = await axios.get('https://api.metals.live/v1/spot/gold', {
      timeout: 5000
    });
    
    const goldUsdPerOz = response.data[0]?.price || 2000; // fallback
    const goldUsdPerGram = goldUsdPerOz / 31.1035;
    
    return {
      usdPerOz: goldUsdPerOz,
      lbpPerGram24k: Math.round(goldUsdPerGram * usdLbpRate),
      lbpPerGram21k: Math.round(goldUsdPerGram * usdLbpRate * 0.875), // 21/24
      lbpPerGram18k: Math.round(goldUsdPerGram * usdLbpRate * 0.75), // 18/24
      lbpPerGram14k: Math.round(goldUsdPerGram * usdLbpRate * 0.583), // 14/24
      source: 'Metals API',
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.warn('Failed to fetch gold price:', error.message);
    // Fallback calculation
    const goldUsdPerGram = 2000 / 31.1035;
    return {
      usdPerOz: 2000,
      lbpPerGram24k: Math.round(goldUsdPerGram * usdLbpRate),
      lbpPerGram21k: Math.round(goldUsdPerGram * usdLbpRate * 0.875),
      lbpPerGram18k: Math.round(goldUsdPerGram * usdLbpRate * 0.75),
      lbpPerGram14k: Math.round(goldUsdPerGram * usdLbpRate * 0.583),
      source: 'Fallback',
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Main data fetching function
 */
async function fetchAllData() {
  console.log('Fetching latest data...\n');

  try {
    // Fetch USD rate first (needed for other calculations)
    const usdRates = await fetchUSDRate();
    const usdRate = usdRates.rate; // Use buy rate as primary
    const eurRate = await fetchEURRate(usdRate);
    const officialRates = await fetchOfficialRates();
    const fuelPrices = await fetchFuelPrices();
    
    // Fetch both international and Lebanon-specific gold prices
    const [goldPrice, lebanonGold] = await Promise.allSettled([
      fetchGoldPrice(usdRate),
      fetchLebanonGold(false, usdRate).catch(err => {
        console.warn('Lebanon gold fetch failed:', err.message);
        return null;
      })
    ]).then(results => [
      results[0].status === 'fulfilled' ? results[0].value : null,
      results[1].status === 'fulfilled' ? results[1].value : null
    ]);

    // Compile rates data
    const ratesData = {
      usd: {
        rate: usdRate,
        buy: usdRates.buy || usdRate,
        sell: usdRates.sell || usdRate,
        change: 0, // Will calculate from historical data
        lastUpdated: new Date().toISOString()
      },
      eur: {
        rate: eurRate,
        change: 0,
        lastUpdated: new Date().toISOString()
      },
      official: officialRates,
      historical: [] // Will be populated over time
    };

    // Save data files
    await fs.writeJson(RATES_FILE, ratesData, { spaces: 2 });
    await fs.writeJson(FUEL_FILE, fuelPrices, { spaces: 2 });
    if (goldPrice) {
      await fs.writeJson(GOLD_FILE, goldPrice, { spaces: 2 });
    }
    
    // Save Lebanon gold prices separately
    if (lebanonGold) {
      const LEBANON_GOLD_FILE = path.join(DATA_DIR, 'lebanon-gold.json');
      await fs.writeJson(LEBANON_GOLD_FILE, lebanonGold, { spaces: 2 });
      const validItems = lebanonGold.items.filter(i => i.priceLbp !== null);
      console.log(`✓ Lebanon gold prices saved (${validItems.length} items)`);
    }

    console.log('\n✓ All data fetched and saved successfully!');
    console.log(`  USD/LBP: ${usdRate.toLocaleString()}`);
    console.log(`  EUR/LBP: ${eurRate.toLocaleString()}`);
    if (goldPrice) {
      console.log(`  Gold 24k: ${goldPrice.lbpPerGram24k.toLocaleString()} LBP/g`);
    }
    if (lebanonGold) {
      const gold24k = lebanonGold.items.find(i => i.key === 'gold_24k_1g_buy');
      if (gold24k && gold24k.priceLbp) {
        console.log(`  Lebanon Gold 24k: ${gold24k.priceLbp.toLocaleString()} LBP/g`);
      }
    }

    return { ratesData, fuelPrices, goldPrice, lebanonGold };
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fetchAllData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { fetchAllData, fetchUSDRate, fetchEURRate, fetchFuelPrices, fetchGoldPrice };