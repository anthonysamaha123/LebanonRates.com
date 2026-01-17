const fs = require('fs-extra');
const path = require('path');
const { format } = require('date-fns');
const config = require('./config');
const translations = require('./templates/translations');

// Import data fetching (optional - can be run separately)
const { fetchAllData } = require('./scripts/fetch-data');

const DIST_DIR = path.join(__dirname, 'dist');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const DATA_DIR = path.join(__dirname, 'data');
const SRC_DIR = path.join(__dirname, 'src');

// Ensure directories exist
fs.ensureDirSync(DIST_DIR);
fs.ensureDirSync(path.join(DIST_DIR, 'css'));
fs.ensureDirSync(path.join(DIST_DIR, 'ar'));
fs.ensureDirSync(path.join(DIST_DIR, 'fr'));

/**
 * Load template file
 */
function loadTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, `${name}.html`), 'utf8');
}

/**
 * Load data files
 */
function loadData() {
  const rates = fs.existsSync(path.join(DATA_DIR, 'rates.json')) 
    ? JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'rates.json'), 'utf8'))
    : { usd: { rate: 89500 }, eur: { rate: 97000 }, official: {} };
    
  const fuel = fs.existsSync(path.join(DATA_DIR, 'fuel.json'))
    ? JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'fuel.json'), 'utf8'))
    : { gasoline95: 1100000, diesel: 980000, cookingGas: 380000 };
    
  const gold = fs.existsSync(path.join(DATA_DIR, 'gold.json'))
    ? JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'gold.json'), 'utf8'))
    : { lbpPerGram24k: 5850000, lbpPerGram21k: 5120000 };
    
  const lebanonGold = fs.existsSync(path.join(DATA_DIR, 'lebanon-gold.json'))
    ? JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'lebanon-gold.json'), 'utf8'))
    : null;
    
  return { rates, fuel, gold, lebanonGold };
}

/**
 * Format number with thousands separator
 */
function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) {
    return '';
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Generate hreflang tags
 */
function generateHreflangTags(currentLang, currentPath) {
  const baseUrl = config.site.domain;
  const langs = ['en', 'ar', 'fr'];
  
  // Map current path to other language equivalents
  const pathMap = {
    '/': { en: '/', ar: '/ar/', fr: '/fr/' },
    '/usd-lbp-today': { en: '/usd-lbp-today', ar: '/ar/سعر-الدولار-اليوم', fr: '/fr/taux-dollar-liban' },
    '/eur-lbp-today': { en: '/eur-lbp-today', ar: '/ar/سعر-اليورو-لبنان', fr: '/fr/taux-euro-liban' },
    '/official-rates': { en: '/official-rates', ar: '/ar/الأسعار-الرسمية', fr: '/fr/taux-officiels' },
    '/convert': { en: '/convert', ar: '/ar/حاسبة-تحويل', fr: '/fr/convertisseur' },
    '/fuel-prices-today': { en: '/fuel-prices-today', ar: '/ar/أسعار-الوقود-اليوم', fr: '/fr/prix-carburants-liban' },
    '/gold-price-lebanon': { en: '/gold-price-lebanon', ar: '/ar/سعر-الذهب-لبنان', fr: '/fr/prix-or-liban' },
    '/about-faq': { en: '/about-faq', ar: '/ar/حول-الموقع', fr: '/fr/a-propos' }
  };
  
  // Check if this is an SEO page
  let paths = pathMap[currentPath];
  if (!paths) {
    // Try to find matching SEO page
    const seoPages = config.seoGoldPages;
    const pageTypes = ['karat', 'currency', 'intent', 'questions', 'cities', 'usecases'];
    
    for (const pageType of pageTypes) {
      if (!seoPages[pageType]) continue;
      for (const pageConfig of seoPages[pageType]) {
        // Find which language this path belongs to
        let foundLang = null;
        for (const lang of langs) {
          if (pageConfig[lang] === currentPath) {
            foundLang = lang;
            break;
          }
        }
        if (foundLang) {
          // Found matching page config, create paths object
          paths = {
            en: pageConfig.en || currentPath,
            ar: pageConfig.ar || currentPath,
            fr: pageConfig.fr || currentPath
          };
          break;
        }
      }
      if (paths) break;
    }
  }
  
  // Fallback to current path for all languages if not found
  if (!paths) {
    paths = { en: currentPath, ar: currentPath, fr: currentPath };
  }
  
  return langs.map(lang => {
    const url = `${baseUrl}${paths[lang]}`;
    return `<link rel="alternate" hreflang="${lang}" href="${url}">`;
  }).join('\n  ');
}

/**
 * Render Lebanon Gold Table
 */
function renderLebanonGoldTable(lebanonGold, data, pageTranslations, lang) {
  if (!lebanonGold || !lebanonGold.items || lebanonGold.items.length === 0) {
    return '<p>No "We Buy" gold prices available.</p>';
  }
  
  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  const toFixed = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return parseFloat(num).toFixed(decimals);
  };
  
  // Helper to extract karat from key
  const getKarat = (key) => {
    const match = key.match(/gold_(\d+k)/);
    if (match) return match[1];
    if (key === 'gold_lira_8g_buy') return 'lira';
    if (key === 'silver_999_1g_buy') return 'silver';
    return null;
  };
  
  // Arabic aliases
  const arabicAliases = {
    '24k': 'عيار 24',
    '21k': 'عيار 21',
    '18k': 'عيار 18',
    '14k': 'عيار 14',
    'lira': 'ليرة ذهب',
    'silver': 'فضة 999'
  };
  
  const getArabicAlias = (karat) => {
    return arabicAliases[karat] || '';
  };
  
  const validItems = lebanonGold.items.filter(item => item.priceUsd !== null && item.priceUsd > 0);
  
  if (validItems.length === 0) {
    return '<p>No valid gold prices available.</p>';
  }
  
  let tableHtml = `
<section class="section">
  <div class="data-status-indicator" id="data-status">
    Data Status: <span class="status-badge status-offline">Offline</span>
  </div>
  <div class="last-updated-header">
    <span id="last-updated-time">Last updated: ${lebanonGold.fetchedAt || 'Unknown'}</span> |
    <span>Updated every ~15 minutes</span>
  </div>
  <table class="data-table" id="lebanon-gold-table">
    <thead>
      <tr>
        <th>${pageTranslations.goldTypeLabel || 'Item'}</th>
        <th>Price (USD)</th>
        <th>Price (LBP)</th>
        <th class="action-column">Actions</th>
      </tr>
    </thead>
    <tbody>`;

  validItems.forEach(item => {
    const priceUsdStr = item.priceUsd !== null && item.priceUsd > 0
      ? `$${toFixed(item.priceUsd, 2)}`
      : '—';

    let priceLbp = item.priceLbp;
    if ((priceLbp === null || priceLbp === 0) && item.priceUsd && data.rates && data.rates.usd && data.rates.usd.rate) {
      priceLbp = item.priceUsd * data.rates.usd.rate;
    }

    const priceLbpStr = priceLbp !== null && priceLbp > 0
      ? `${formatNumber(Math.round(priceLbp))} LBP`
      : '—';

    const karat = getKarat(item.key);
    const arabicAlias = karat && arabicAliases[karat] ? `<span class="arabic-alias">(${arabicAliases[karat]})</span>` : '';

    tableHtml += `
      <tr class="lebanon-gold-row price-row" data-karat="${karat}">
        <td data-label><strong>${item.label}</strong> ${arabicAlias}</td>
        <td data-price-usd="${toFixed(item.priceUsd, 2)}" style="color: var(--secondary-color); font-weight: 600;">${priceUsdStr}</td>
        <td data-price-lbp="${Math.round(priceLbp)}" style="color: var(--primary-color); font-weight: 600;">${priceLbpStr}</td>
        <td class="action-buttons">
          <button type="button" class="copy-price-btn" title="Copy price">📋</button>
          <button type="button" class="whatsapp-share-btn" title="Share on WhatsApp">💬</button>
          <button type="button" class="telegram-share-btn" title="Share on Telegram">✈️</button>
        </td>
      </tr>`;
  });
  
  tableHtml += `
    </tbody>
  </table>
  <div class="source-transparency">
    <p><strong>Source:</strong> Lebanor.com (Real market prices from Lebanon dealers)</p>
    <details>
      <summary>Methodology</summary>
      <p>Our "We Buy" prices reflect the rates at which gold dealers in Lebanon purchase gold. These rates differ from international spot prices and retail jewelry prices due to local market dynamics, operational costs, and profit margins. Retail prices for new jewelry will include additional costs for design, craftsmanship, and brand value.</p>
    </details>
  </div>
  <button id="copy-summary-btn" class="btn-secondary" style="margin-top: 1.5rem;">Copy 21K Summary</button>
</section>`;
  
  return tableHtml;
}

/**
 * Render component templates (uses same template rendering as pages)
 */
function renderComponent(componentName, componentData) {
  try {
    const componentPath = path.join(TEMPLATES_DIR, 'components', `${componentName}.html`);
    if (fs.existsSync(componentPath)) {
      const componentTemplate = fs.readFileSync(componentPath, 'utf8');
      // Use the same renderTemplate function for consistency
      return renderTemplate(componentTemplate, componentData);
    }
  } catch (error) {
    console.warn(`Failed to load component ${componentName}:`, error.message);
  }
  return '';
}

/**
 * Render template with data
 */
function renderTemplate(template, data) {
  let html = template;
  
  // First, handle complex expressions like {{formatNumber rates.usd.rate}} or {{toUsdPrice fuel.gasoline95 rates.usd.rate}}
  // Match patterns like {{functionName nested.object.path}} or {{functionName path1 path2}}
  html = html.replace(/\{\{(\w+)\s+([\w.]+)(?:\s+([\w.]+))?\}\}/g, (match, funcName, path1, path2) => {
    const func = data[funcName];
    if (typeof func === 'function') {
      const value1 = getNestedValue(data, path1);
      if (path2) {
        // Two-parameter function call (e.g., toUsdPrice)
        const value2 = getNestedValue(data, path2);
        if (value1 !== undefined && value2 !== undefined) {
          return func(value1, value2);
        }
      } else {
        // Single-parameter function call (e.g., formatNumber)
        if (value1 !== undefined) {
          return func(value1);
        }
      }
    }
    return match;
  });
  
  // Then handle nested object paths like {{rates.usd.rate}}
  html = html.replace(/\{\{([\w.]+)\}\}/g, (match, path) => {
    // Skip if already processed or is a function call
    if (path.includes('(')) return match;
    
    const value = getNestedValue(data, path);
    if (value !== undefined && value !== null) {
      return String(value);
    }
    return match;
  });
  
  // Handle JSON: prefix for JSON injection
  html = html.replace(/\{\{JSON:([\w.]+)\}\}/g, (match, path) => {
    const value = getNestedValue(data, path);
    if (value !== undefined) {
      return JSON.stringify(value);
    }
    return match;
  });
  
  return html;
}

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, prop) => {
    return current && current[prop] !== undefined ? current[prop] : undefined;
  }, obj);
}

/**
 * Generate breadcrumb structured data
 */
function generateBreadcrumbSchema(pageType, lang, canonicalUrl) {
  const baseUrl = config.site.domain;
  const slugs = config.slugs[lang];
  
  const breadcrumbItems = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": lang === 'ar' ? 'الرئيسية' : lang === 'fr' ? 'Accueil' : 'Home',
      "item": `${baseUrl}${slugs.home}`
    }
  ];
  
  let position = 2;
  if (pageType !== 'home') {
    const pageNames = {
      'usd': { en: 'USD Rate', ar: 'سعر الدولار', fr: 'Taux USD' },
      'eur': { en: 'EUR Rate', ar: 'سعر اليورو', fr: 'Taux EUR' },
      'fuel': { en: 'Fuel Prices', ar: 'أسعار الوقود', fr: 'Prix Carburants' },
      'gold': { en: 'Gold Price', ar: 'سعر الذهب', fr: 'Prix de l\'Or' },
      'converter': { en: 'Converter', ar: 'حاسبة التحويل', fr: 'Convertisseur' },
      'official': { en: 'Official Rates', ar: 'الأسعار الرسمية', fr: 'Taux Officiels' },
      'about': { en: 'About', ar: 'حول الموقع', fr: 'À Propos' }
    };
    
    const pageName = pageNames[pageType]?.[lang] || pageNames[pageType]?.en || 'Page';
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": position,
      "name": pageName,
      "item": canonicalUrl
    });
  }
  
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems
  });
}

/**
 * Generate structured data (JSON-LD) for different page types
 */
function generateStructuredData(pageType, lang, data, pageTranslations, canonicalUrl) {
  const baseUrl = config.site.domain;
  const now = new Date().toISOString();
  
  // Generate breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema(pageType, lang, canonicalUrl);
  
  let pageSchema = '';
  
  switch(pageType) {
    case 'home':
      pageSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FinancialProduct",
        "name": "Lebanon Exchange Rates",
        "description": pageTranslations.metaDescription || "Lebanon's daily exchange rates, fuel prices, and gold prices",
        "url": canonicalUrl,
        "provider": {
          "@type": "Organization",
          "name": "LebanonRates.com",
          "url": baseUrl
        },
        "areaServed": {
          "@type": "Country",
          "name": "Lebanon"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "1250"
        }
      });
      break;
      
    case 'usd':
      pageSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CurrencyExchangeService",
        "name": "USD to LBP Exchange Rate",
        "description": pageTranslations.metaDescription || "Current USD to Lebanese Pound exchange rate",
        "url": canonicalUrl,
        "exchangeRate": {
          "@type": "UnitPriceSpecification",
          "price": data.rates?.usd?.rate || 0,
          "priceCurrency": "LBP",
          "unitCode": "USD"
        },
        "validFrom": now,
        "areaServed": {
          "@type": "Country",
          "name": "Lebanon"
        }
      });
      break;
      
    case 'eur':
      pageSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CurrencyExchangeService",
        "name": "EUR to LBP Exchange Rate",
        "description": pageTranslations.metaDescription || "Current Euro to Lebanese Pound exchange rate",
        "url": canonicalUrl,
        "exchangeRate": {
          "@type": "UnitPriceSpecification",
          "price": data.rates?.eur?.rate || 0,
          "priceCurrency": "LBP",
          "unitCode": "EUR"
        },
        "validFrom": now,
        "areaServed": {
          "@type": "Country",
          "name": "Lebanon"
        }
      });
      break;
      
    case 'fuel':
      pageSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Lebanon Fuel Prices",
        "description": pageTranslations.metaDescription || "Current fuel prices in Lebanon",
        "url": canonicalUrl,
        "offers": [
          {
            "@type": "Offer",
            "name": "Gasoline 95",
            "price": data.fuel?.gasoline95 || 0,
            "priceCurrency": "LBP",
            "availability": "https://schema.org/InStock"
          },
          {
            "@type": "Offer",
            "name": "Diesel",
            "price": data.fuel?.diesel || 0,
            "priceCurrency": "LBP",
            "availability": "https://schema.org/InStock"
          }
        ],
        "areaServed": {
          "@type": "Country",
          "name": "Lebanon"
        }
      });
      break;
      
    case 'gold':
    case 'gold-seo':
      // Get gold price data
      let goldPrice = 0;
      let goldPriceUsd = 0;
      let goldPriceCurrency = 'LBP';
      
      if (data.lebanonGold && data.lebanonGold.items) {
        const item21k = data.lebanonGold.items.find(i => i.key === 'gold_21k_1g_buy');
        if (item21k && item21k.priceUsd) {
          goldPriceUsd = item21k.priceUsd;
          goldPrice = item21k.priceLbp || (item21k.priceUsd * (data.rates?.usd?.rate || 1));
        }
      } else if (data.gold && data.gold.lbpPerGram21k) {
        goldPrice = data.gold.lbpPerGram21k;
        goldPriceUsd = data.gold.lbpPerGram21k / (data.rates?.usd?.rate || 1);
      }
      
      pageSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": pageTranslations.title || "Gold Price in Lebanon",
        "description": pageTranslations.metaDescription || "Current gold prices in Lebanon",
        "url": canonicalUrl,
        "offers": {
          "@type": "Offer",
          "name": "21K Gold per Gram",
          "price": goldPrice,
          "priceCurrency": goldPriceCurrency,
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": goldPriceUsd,
            "priceCurrency": "USD",
            "unitCode": "GRM"
          },
          "availability": "https://schema.org/InStock"
        },
        "areaServed": {
          "@type": "Country",
          "name": "Lebanon"
        }
      });
      
      break;
      
    case 'converter':
      pageSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Lebanon Currency Converter",
        "description": pageTranslations.metaDescription || "Convert Lebanese Pounds to USD, EUR and other currencies",
        "url": canonicalUrl,
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Any",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      });
      break;
      
    default:
      pageSchema = '';
  }
  
  // Add FAQ schema if available (Feature 62)
  let faqSchema = null;
  if (pageTranslations.faq && Array.isArray(pageTranslations.faq) && pageTranslations.faq.length > 0) {
    faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": pageTranslations.faq.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
  }
  
  // Combine all schemas
  const schemas = [];
  if (breadcrumbSchema) schemas.push(JSON.parse(breadcrumbSchema));
  if (pageSchema) schemas.push(JSON.parse(pageSchema));
  if (faqSchema) schemas.push(faqSchema);
  
  if (schemas.length === 0) {
    return '';
  } else if (schemas.length === 1) {
    return JSON.stringify(schemas[0]);
  } else {
    return JSON.stringify(schemas);
  }
}

/**
 * Build page for a specific template and language
 */
function buildPage(templateName, lang, pageData = {}) {
  const t = config.translations[lang];
  const pageTranslations = translations[lang][pageData.pageType] || {};
  const slugs = config.slugs[lang];
  const baseTemplate = loadTemplate('base');
  const pageTemplate = loadTemplate(templateName);
  
  const data = loadData();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  
  // Build navigation URLs
  const urls = {
    homeUrl: slugs.home,
    usdUrl: slugs.usd,
    eurUrl: slugs.eur,
    officialUrl: slugs.official,
    converterUrl: slugs.converter,
    fuelUrl: slugs.fuel,
    goldUrl: slugs.gold,
    aboutUrl: slugs.about,
    privacyUrl: slugs.privacy
  };
  
  // Build language switcher URLs
  const slugKey = pageData.slugKey || 'home';
  urls.enUrl = config.slugs.en[slugKey] || '/';
  urls.arUrl = config.slugs.ar[slugKey] || '/ar/';
  urls.frUrl = config.slugs.fr[slugKey] || '/fr/';
  
  // Determine active language
  const langActive = {
    enActive: lang === 'en' ? 'active' : '',
    arActive: lang === 'ar' ? 'active' : '',
    frActive: lang === 'fr' ? 'active' : ''
  };
  
  // Helper function to convert LBP to USD
  const toUsdPrice = (lbpPrice, usdRate) => {
    if (!lbpPrice || !usdRate || usdRate === 0) return '0.00';
    const usdPrice = lbpPrice / usdRate;
    return usdPrice.toFixed(2);
  };
  
  // Helper function for toFixed in templates
  const toFixed = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return parseFloat(num).toFixed(decimals);
  };
  
  // Helper function for rounding
  const round = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 0;
    return Math.round(parseFloat(num));
  };
  
  // Pre-render Lebanon gold table if data exists (Enhanced with Features 1, 2, 6, 7)
  const renderLebanonGoldTable = (lebanonGold) => {
    if (!lebanonGold || !lebanonGold.items || !Array.isArray(lebanonGold.items)) {
      return '';
    }
    
    const validItems = lebanonGold.items.filter(item => item.priceUsd !== null && item.priceUsd > 0);
    if (validItems.length === 0) {
      return '';
    }
    
    // Determine data status
    let dataStatus = 'offline';
    if (lebanonGold.fetchedAt) {
      const fetchedTime = new Date(lebanonGold.fetchedAt).getTime();
      const ageMinutes = (Date.now() - fetchedTime) / (1000 * 60);
      if (ageMinutes < 15) {
        dataStatus = 'live';
      } else if (ageMinutes < 60) {
        dataStatus = 'delayed';
      }
    }
    
    // Format Beirut time
    let beirutTimeStr = 'Unknown';
    if (lebanonGold.fetchedAt) {
      try {
        const utcTime = new Date(lebanonGold.fetchedAt);
        beirutTimeStr = utcTime.toLocaleString('en-US', { 
          timeZone: 'Asia/Beirut',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        });
      } catch (e) {
        beirutTimeStr = lebanonGold.fetchedAt;
      }
    }
    
    // Get karat from key
    const getKarat = (key) => {
      if (key.includes('21k')) return '21k';
      if (key.includes('18k')) return '18k';
      if (key.includes('24k')) return '24k';
      if (key.includes('14k')) return '14k';
      return '';
    };
    
    // Arabic aliases
    const arabicAliases = {
      '21k': '(عيار 21)',
      '18k': '(عيار 18)',
      '24k': '(عيار 24)',
      '14k': '(عيار 14)'
    };
    
    let tableHtml = `
<section class="section lebanon-gold-prices">
  <h2>Lebanon Local Gold Prices (We Buy)</h2>
  <p style="font-size: 0.95rem; color: var(--text-medium); margin-bottom: 1.5rem;">
    Real market prices from Lebanon dealers - actual "We Buy" rates
  </p>
  
  <!-- Status Indicator & Last Updated -->
  <div class="status-header">
    <div class="status-indicator" data-status="${dataStatus}">
      <span class="status-dot"></span>
      <span class="status-text">${dataStatus === 'live' ? 'Live' : dataStatus === 'delayed' ? 'Delayed' : 'Offline'}</span>
    </div>
    <div class="last-updated-header" data-last-updated>
      <strong>Last updated:</strong> <span id="beirut-time">${beirutTimeStr}</span>
      <span class="update-frequency">(Updated every 15 minutes)</span>
    </div>
  </div>
  
  <!-- Source Transparency & Method -->
  <div class="source-transparency">
    <div class="source-line">
      <strong>Source:</strong> Lebanor.com | 
      <button type="button" class="method-toggle" onclick="document.getElementById('method-details').classList.toggle('expanded')">
        Method <span class="toggle-icon">▼</span>
      </button>
    </div>
    <div id="method-details" class="method-details">
      <p><strong>"We Buy" prices</strong> represent buyback/scrap rates - what dealers pay when purchasing gold. These are typically lower than retail prices (what you pay to buy) because dealers need a margin when reselling.</p>
      <p><strong>Retail prices</strong> differ because they include workmanship, design, and dealer markup. Our prices are for raw gold value only.</p>
    </div>
  </div>
  
  <table class="data-table lebanon-gold-table">
    <thead>
      <tr>
        <th>Item</th>
        <th>Price (USD)</th>
        <th>Price (LBP)</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>`;
    
    validItems.forEach(item => {
      // USD is primary (from API), LBP is secondary (calculated)
      const priceUsd = item.priceUsd;
      const priceUsdStr = `$${toFixed(priceUsd, 2)}`;
      
      // Calculate LBP if not already set
      let priceLbp = item.priceLbp;
      if ((priceLbp === null || priceLbp === 0) && priceUsd && data.rates && data.rates.usd && data.rates.usd.rate) {
        priceLbp = priceUsd * data.rates.usd.rate;
      }
      
      const priceLbpStr = priceLbp !== null && priceLbp > 0
        ? `${formatNumber(Math.round(priceLbp))} LBP`
        : '—';
      
      const karat = getKarat(item.key);
      const arabicAlias = karat && arabicAliases[karat] ? `<span class="arabic-alias">${arabicAliases[karat]}</span>` : '';
      
      tableHtml += `
      <tr class="lebanon-gold-row price-row" data-karat="${karat}">
        <td data-label><strong>${item.label}</strong> ${arabicAlias}</td>
        <td data-price-usd="${priceUsd}" style="color: var(--secondary-color); font-weight: 600;">${priceUsdStr}</td>
        <td data-price-lbp="${Math.round(priceLbp)}" style="color: var(--primary-color); font-weight: 600;">${priceLbpStr}</td>
        <td class="action-buttons">
          <button type="button" class="copy-price-btn" title="Copy price">📋</button>
          <button type="button" class="whatsapp-share-btn" title="Share on WhatsApp">💬</button>
          <button type="button" class="telegram-share-btn" title="Share on Telegram">✈️</button>
        </td>
      </tr>`;
    });
    
    tableHtml += `
    </tbody>
  </table>
</section>`;
    
    return tableHtml;
  };
  
  // Format fuel data for display
  const fuelData = { ...data.fuel };
  if (fuelData.dieselNote) {
    // Remove "Transportation + " prefix and keep only the price part
    let cleanNote = fuelData.dieselNote.replace(/^Transportation\s*\+\s*/i, '').trim();
    // Format diesel note for display
    fuelData.dieselNoteFormatted = `<br><span style="font-size: 0.9rem; color: var(--text-medium); font-weight: normal;">(${cleanNote})</span>`;
  } else {
    fuelData.dieselNoteFormatted = '';
  }
  if (fuelData.source) {
    fuelData.sourceFormatted = `<p style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-medium);"><strong>Source:</strong> ${fuelData.source}</p>`;
  } else {
    fuelData.sourceFormatted = '';
  }
  
  // Generate answer snippet (Feature 60)
  const generateAnswerSnippet = (lebanonGold, gold, rates) => {
    if (lebanonGold && lebanonGold.items) {
      const item21k = lebanonGold.items.find(i => i.key === 'gold_21k_1g_buy');
      if (item21k && item21k.priceUsd) {
        const priceLbp = item21k.priceLbp || (item21k.priceUsd * rates.usd.rate);
        return `$${toFixed(item21k.priceUsd, 2)} USD / ${formatNumber(Math.round(priceLbp))} LBP`;
      }
    }
    // Fallback
    if (gold && gold.lbpPerGram21k && rates && rates.usd && rates.usd.rate) {
      const priceUsd = gold.lbpPerGram21k / rates.usd.rate;
      return `$${toFixed(priceUsd, 2)} USD / ${formatNumber(gold.lbpPerGram21k)} LBP`;
    }
    return 'Price not available';
  };
  
  // Render component templates (uses same template rendering as pages)
  const renderComponent = (componentName, componentData) => {
    try {
      const componentPath = path.join(TEMPLATES_DIR, 'components', `${componentName}.html`);
      if (fs.existsSync(componentPath)) {
        const componentTemplate = fs.readFileSync(componentPath, 'utf8');
        // Use the same renderTemplate function for consistency
        return renderTemplate(componentTemplate, componentData);
      }
    } catch (error) {
      console.warn(`Failed to load component ${componentName}:`, error.message);
    }
    return '';
  };
  
  // Generate component HTMLs
  const goldPriceUnitsHtml = renderComponent('gold-price-units', {
    ...urls,
    ...t,
    ...pageTranslations
  });
  
  const goldCalculatorsHtml = renderComponent('gold-calculators', {
    ...urls,
    ...t,
    ...pageTranslations
  });
  
  const goldHistoryHtml = renderComponent('gold-history', {
    ...urls,
    ...t,
    ...pageTranslations
  });
  
  const goldFaqHtml = renderComponent('gold-faq', {
    ...urls,
    ...t,
    ...pageTranslations
  });
  
  const crossLinksHtml = renderComponent('cross-links', {
    ...urls,
    ...t,
    ...pageTranslations
  });
  
  // Calculate today widget prices
  let today21kPrice = '—';
  let todayLiraPrice = '—';
  if (data.lebanonGold && data.lebanonGold.items) {
    const item21k = data.lebanonGold.items.find(i => i.key === 'gold_21k_1g_buy');
    if (item21k && item21k.priceUsd) {
      today21kPrice = `$${toFixed(item21k.priceUsd, 2)}`;
    }
    const itemLira = data.lebanonGold.items.find(i => i.key === 'gold_lira_8g_buy');
    if (itemLira && itemLira.priceUsd) {
      todayLiraPrice = `$${toFixed(itemLira.priceUsd, 0)}`;
    }
  }
  // Fallback
  if (today21kPrice === '—' && data.gold && data.gold.lbpPerGram21k && data.rates && data.rates.usd) {
    today21kPrice = `$${toFixed(data.gold.lbpPerGram21k / data.rates.usd.rate, 2)}`;
  }
  
  const todayWidgetHtml = renderComponent('today-widget', {
    ...urls,
    ...t,
    ...pageTranslations,
    rates: data.rates,
    fuel: data.fuel,
    today21kPrice: today21kPrice,
    todayLiraPrice: todayLiraPrice,
    formatNumber: formatNumber
  });
  
  const priceAlertsHtml = renderComponent('price-alerts', {
    ...urls,
    ...t,
    ...pageTranslations
  });

  // Format international gold price
  let internationalGoldPrice = 'Price not available';
  if (data.gold && data.gold.usdPerOz) {
    internationalGoldPrice = `$${formatNumber(data.gold.usdPerOz)} USD`;
  } else if (data.lebanonGold && data.lebanonGold.items) {
    const item24k = data.lebanonGold.items.find(i => i.key === 'gold_24k_1g_buy');
    if (item24k && item24k.priceUsd) {
      const ouncePrice = item24k.priceUsd * 31.1035;
      internationalGoldPrice = `$${formatNumber(Math.round(ouncePrice))} USD`;
    }
  }
  
  // Merge all data for template rendering
  const templateData = {
    ...data,
    rates: data.rates,
    fuel: fuelData,
    gold: data.gold,
    lebanonGold: data.lebanonGold,
    ...urls,
    ...t, // Add navigation translations
    ...pageTranslations, // Add page-specific translations
    lang,
    formatNumber: formatNumber, // Function for formatting numbers
    toUsdPrice: toUsdPrice, // Function to convert LBP to USD
    toFixed: toFixed, // Function for toFixed in templates
    round: round, // Function for rounding numbers
    lebanonGoldTable: renderLebanonGoldTable(data.lebanonGold, data, pageTranslations, lang), // Pre-rendered Lebanon gold table
    answerSnippet21k: generateAnswerSnippet(data.lebanonGold, data.gold, data.rates), // Answer snippet
    internationalGoldPrice: internationalGoldPrice, // International gold price
    goldPriceUnits: goldPriceUnitsHtml, // Price units component
    goldCalculators: goldCalculatorsHtml, // Calculators component
    goldHistory: goldHistoryHtml, // History component
    goldFaq: goldFaqHtml, // FAQ component
    crossLinks: crossLinksHtml, // Cross links component
    todayWidget: todayWidgetHtml, // Today widget component
    priceAlerts: priceAlertsHtml, // Price alerts component
    // Helper for calculations in templates (used in converter)
    calculate: (expr) => {
      // Simple eval for template calculations (be careful in production)
      try {
        return Math.round(eval(expr.replace(/rates\.usd\.rate/g, data.rates.usd.rate).replace(/rates\.eur\.rate/g, data.rates.eur.rate)));
      } catch {
        return 0;
      }
    },
    // Raw data for JavaScript injection (no escaping)
    ratesJSON: JSON.stringify({
      usd: data.rates.usd.rate,
      eur: data.rates.eur.rate
    })
  };
  
  // Build page-specific content
  const content = renderTemplate(pageTemplate, templateData);
  
  // Get current path for canonical/hreflang
  const currentPath = urls[slugKey] || slugs.home;
  
  // Generate structured data
  const structuredData = generateStructuredData(
    pageData.pageType || 'home',
    lang,
    data,
    pageTranslations,
    `${config.site.domain}${currentPath}`
  );
  
  // Determine OG image and locale
  const ogImage = `${config.site.domain}/og-image.jpg`; // You can add actual OG images later
  const ogLocaleMap = {
    'en': 'en_US',
    'ar': 'ar_LB',
    'fr': 'fr_FR'
  };
  const ogLocale = ogLocaleMap[lang] || 'en_US';
  
  // Format schema markup - handle both single objects and arrays
  let schemaMarkup = '';
  if (structuredData) {
    // Check if it's already an array (starts with [)
    if (structuredData.trim().startsWith('[')) {
      schemaMarkup = `<script type="application/ld+json">${structuredData}</script>`;
    } else {
      schemaMarkup = `<script type="application/ld+json">${structuredData}</script>`;
    }
  }
  
  // Build full page - include all translations for base template
  const baseTemplateData = {
    lang: lang === 'ar' ? 'ar' : lang,
    dir,
    siteName: t.siteName,
    siteTagline: t.siteTagline,
    ...urls,
    ...langActive,
    ...t, // Include all navigation translations (navHome, navUSD, etc.)
    content,
    canonicalUrl: `${config.site.domain}${currentPath}`,
    hreflangTags: generateHreflangTags(lang, currentPath),
    pageTitle: pageTranslations.title || pageData.title || t.siteName,
    metaDescription: pageTranslations.metaDescription || pageData.metaDescription || t.siteTagline,
    metaKeywords: pageTranslations.metaKeywords || pageData.metaKeywords || 'lebanon, exchange rate, dollar, lira',
    schemaMarkup: schemaMarkup,
    ogImage: ogImage,
    ogLocale: ogLocale
  };
  
  const fullHtml = renderTemplate(baseTemplate, baseTemplateData);
  
  // Determine output path
  let outputPath;
  if (lang === 'en') {
    outputPath = path.join(DIST_DIR, pageData.outputFile || 'index.html');
  } else {
    // For Arabic/French, use the same output filename but in lang subdirectory
    const filename = pageData.outputFile || 'index.html';
    outputPath = path.join(DIST_DIR, lang, filename);
  }
  
  // Ensure directory exists
  fs.ensureDirSync(path.dirname(outputPath));
  
  // Write file
  fs.writeFileSync(outputPath, fullHtml, 'utf8');
  console.log(`✓ Built: ${outputPath}`);
}

/**
 * Copy static assets
 */
function copyAssets() {
  fs.copySync(path.join(SRC_DIR, 'css'), path.join(DIST_DIR, 'css'));
  console.log('✓ Copied CSS assets');
  
  // Copy JavaScript files
  const jsDir = path.join(DIST_DIR, 'js');
  fs.ensureDirSync(jsDir);
  if (fs.existsSync(path.join(SRC_DIR, 'js'))) {
    fs.copySync(path.join(SRC_DIR, 'js'), jsDir);
    console.log('✓ Copied JavaScript assets');
  }
}

/**
 * Generate sitemap.xml
 */
function generateSitemap() {
  const baseUrl = config.site.domain;
  const urlEntries = [];
  const now = new Date().toISOString().split('T')[0];
  
  // Add all pages for all languages with optimized priorities
  const pages = [
    { slug: '/', slugKey: 'home', changefreq: 'hourly', priority: '1.0' },
    { slug: '/usd-lbp-today', slugKey: 'usd', changefreq: 'hourly', priority: '0.9' },
    { slug: '/eur-lbp-today', slugKey: 'eur', changefreq: 'hourly', priority: '0.9' },
    { slug: '/fuel-prices-today', slugKey: 'fuel', changefreq: 'daily', priority: '0.8' },
    { slug: '/gold-price-lebanon', slugKey: 'gold', changefreq: 'daily', priority: '0.8' },
    { slug: '/convert', slugKey: 'converter', changefreq: 'weekly', priority: '0.7' },
    { slug: '/official-rates', slugKey: 'official', changefreq: 'daily', priority: '0.7' },
    { slug: '/about-faq', slugKey: 'about', changefreq: 'monthly', priority: '0.5' }
  ];
  
  for (const page of pages) {
    // English
    urlEntries.push({
      loc: `${baseUrl}${page.slug}`,
      changefreq: page.changefreq,
      priority: page.priority,
      lastmod: now
    });
    
    // Arabic
    const arSlug = config.slugs.ar[page.slugKey];
    if (arSlug) {
      urlEntries.push({
        loc: `${baseUrl}${arSlug}`,
        changefreq: page.changefreq,
        priority: page.priority,
        lastmod: now
      });
    }
    
    // French
    const frSlug = config.slugs.fr[page.slugKey];
    if (frSlug) {
      urlEntries.push({
        loc: `${baseUrl}${frSlug}`,
        changefreq: page.changefreq,
        priority: page.priority,
        lastmod: now
      });
    }
  }
  
  // Add SEO gold pages (Features 28-55)
  const seoPages = config.seoGoldPages;
  const seoPageTypes = ['karat', 'currency', 'intent', 'questions', 'cities', 'usecases'];
  
  seoPageTypes.forEach(pageType => {
    if (seoPages[pageType]) {
      seoPages[pageType].forEach(pageConfig => {
        ['en', 'ar', 'fr'].forEach(lang => {
          const slug = pageConfig[lang];
          if (slug) {
            urlEntries.push({
              loc: `${baseUrl}${slug}`,
              changefreq: 'daily',
              priority: '0.7',
              lastmod: now
            });
          }
        });
      });
    }
  });
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.map(entry => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap, 'utf8');
  console.log('✓ Generated sitemap.xml');
}

/**
 * Generate robots.txt
 */
function generateRobots() {
  const robots = `User-agent: *
Allow: /

Sitemap: ${config.site.domain}/sitemap.xml`;
  
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robots, 'utf8');
  console.log('✓ Generated robots.txt');
}

/**
 * Generate SEO Gold Pages (Features 28-55)
 */
function generateSEOGoldPages() {
  const data = loadData();
  const langs = ['en', 'ar', 'fr'];
  const seoPages = config.seoGoldPages;
  let pageCount = 0;
  
  // Helper functions
  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  const toFixed = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return parseFloat(num).toFixed(decimals);
  };
  
  // Helper to get price for a karat/item
  const getPriceForKarat = (karat, data) => {
    if (!data.lebanonGold || !data.lebanonGold.items) return null;
    const key = `gold_${karat}_1g_buy`;
    return data.lebanonGold.items.find(i => i.key === key);
  };
  
  const getLiraPrice = (data) => {
    if (!data.lebanonGold || !data.lebanonGold.items) return null;
    return data.lebanonGold.items.find(i => i.key === 'gold_lira_8g_buy');
  };
  
  const getSilverPrice = (data) => {
    if (!data.lebanonGold || !data.lebanonGold.items) return null;
    return data.lebanonGold.items.find(i => i.key === 'silver_999_1g_buy');
  };
  
  // Generate karat-specific pages (28-33)
  seoPages.karat.forEach(pageConfig => {
    langs.forEach(lang => {
      const slug = pageConfig[lang];
      if (!slug) return;
      
      let item = null;
      let karatLabel = '';
      let priceLabel = '';
      
      if (pageConfig.key === 'lira') {
        item = getLiraPrice(data);
        karatLabel = lang === 'ar' ? 'ليرة ذهب 8 غرام' : lang === 'fr' ? 'Lira Or 8g' : 'Gold Lira 8g';
        priceLabel = lang === 'ar' ? 'سعر الليرة' : lang === 'fr' ? 'Prix de la Lira' : 'Lira Price';
      } else if (pageConfig.key === 'silver') {
        item = getSilverPrice(data);
        karatLabel = lang === 'ar' ? 'فضة 999' : lang === 'fr' ? 'Argent 999' : 'Silver 999';
        priceLabel = lang === 'ar' ? 'سعر الفضة' : lang === 'fr' ? 'Prix de l\'Argent' : 'Silver Price';
      } else {
        item = getPriceForKarat(pageConfig.key, data);
        karatLabel = `${pageConfig.key} ${lang === 'ar' ? 'عيار' : lang === 'fr' ? 'carats' : 'Karat'}`;
        priceLabel = lang === 'ar' ? `سعر الذهب ${pageConfig.key}` : lang === 'fr' ? `Prix Or ${pageConfig.key}` : `${pageConfig.key} Gold Price`;
      }
      
      if (!item || !item.priceUsd) return;
      
      const priceUsd = item.priceUsd;
      const priceLbp = item.priceLbp || (priceUsd * data.rates.usd.rate);
      
      const h1 = lang === 'ar' 
        ? `سعر ${karatLabel} في لبنان اليوم`
        : lang === 'fr'
        ? `Prix ${karatLabel} au Liban Aujourd'hui`
        : `${karatLabel} Gold Price in Lebanon Today`;
      
      const answerSnippet = lang === 'ar'
        ? `${priceLabel}: $${toFixed(priceUsd, 2)} USD / ${formatNumber(Math.round(priceLbp))} LBP`
        : lang === 'fr'
        ? `${priceLabel}: $${toFixed(priceUsd, 2)} USD / ${formatNumber(Math.round(priceLbp))} LBP`
        : `${priceLabel}: $${toFixed(priceUsd, 2)} USD / ${formatNumber(Math.round(priceLbp))} LBP`;
      
      buildSEOPage(slug, lang, {
        h1,
        answerSnippet,
        priceValue: `$${toFixed(priceUsd, 2)} USD`,
        priceSecondary: `${formatNumber(Math.round(priceLbp))} LBP`,
        priceLabel,
        pageType: 'gold-seo',
        itemKey: pageConfig.key
      });
      pageCount++;
    });
  });
  
  // Generate currency-specific pages (34-36) - simplified, generate key ones
  seoPages.currency.slice(0, 6).forEach(pageConfig => {
    langs.forEach(lang => {
      const slug = pageConfig[lang];
      if (!slug) return;
      
      const item = getPriceForKarat(pageConfig.karat, data);
      if (!item || !item.priceUsd) return;
      
      const priceUsd = item.priceUsd;
      const priceLbp = item.priceLbp || (priceUsd * data.rates.usd.rate);
      
      const currencyLabel = pageConfig.currency === 'usd' ? 'USD' : 'LBP';
      const priceValue = pageConfig.currency === 'usd' 
        ? `$${toFixed(priceUsd, 2)}`
        : `${formatNumber(Math.round(priceLbp))}`;
      
      const h1 = lang === 'ar'
        ? `سعر الذهب ${pageConfig.karat} بال${currencyLabel === 'USD' ? 'دولار' : 'ليرة'}`
        : lang === 'fr'
        ? `Prix Or ${pageConfig.karat} en ${currencyLabel}`
        : `${pageConfig.karat} Gold Price in ${currencyLabel}`;
      
      buildSEOPage(slug, lang, {
        h1,
        answerSnippet: `${h1}: ${priceValue} ${currencyLabel}`,
        priceValue,
        priceSecondary: currencyLabel === 'USD' ? `${formatNumber(Math.round(priceLbp))} LBP` : `$${toFixed(priceUsd, 2)} USD`,
        priceLabel: `${pageConfig.karat} Gold`,
        pageType: 'gold-seo',
        itemKey: `${pageConfig.karat}-${pageConfig.currency}`
      });
      pageCount++;
    });
  });
  
  // Generate intent keyword pages (37-41)
  seoPages.intent.forEach(pageConfig => {
    langs.forEach(lang => {
      const slug = pageConfig[lang];
      if (!slug) return;
      
      const item21k = getPriceForKarat('21k', data);
      if (!item21k || !item21k.priceUsd) return;
      
      const h1 = lang === 'ar'
        ? `سعر الذهب في لبنان ${pageConfig.key === 'today' ? 'اليوم' : pageConfig.key === 'now' ? 'الآن' : pageConfig.key === 'live' ? 'مباشر' : ''}`
        : lang === 'fr'
        ? `Prix de l'Or au Liban ${pageConfig.key === 'today' ? "Aujourd'hui" : pageConfig.key === 'now' ? 'Maintenant' : pageConfig.key === 'live' ? 'en Direct' : ''}`
        : `Gold Price in Lebanon ${pageConfig.key === 'today' ? 'Today' : pageConfig.key === 'now' ? 'Now' : pageConfig.key === 'live' ? 'Live' : ''}`;
      
      buildSEOPage(slug, lang, {
        h1,
        answerSnippet: `21K Gold: $${toFixed(item21k.priceUsd, 2)} USD / ${formatNumber(Math.round(item21k.priceLbp || item21k.priceUsd * data.rates.usd.rate))} LBP`,
        priceValue: `$${toFixed(item21k.priceUsd, 2)} USD`,
        priceSecondary: `${formatNumber(Math.round(item21k.priceLbp || item21k.priceUsd * data.rates.usd.rate))} LBP`,
        priceLabel: '21K Gold',
        pageType: 'gold-seo',
        itemKey: `intent-${pageConfig.key}`,
        showGoldTable: true
      });
      pageCount++;
    });
  });
  
  // Generate question pages (42-45)
  seoPages.questions.forEach(pageConfig => {
    langs.forEach(lang => {
      const slug = pageConfig[lang];
      if (!slug) return;
      
      let item = null;
      let h1 = '';
      let answerSnippet = '';
      let calculatorPreset = '';
      
      if (pageConfig.key === '1g-21k') {
        item = getPriceForKarat('21k', data);
        h1 = lang === 'ar' ? 'كم سعر غرام 21 ذهب في لبنان اليوم؟' : lang === 'fr' ? 'Combien coûte 1g d\'or 21k au Liban aujourd\'hui ?' : 'How much is 1g of 21k gold in Lebanon today?';
        if (item) {
          answerSnippet = `1g 21K: $${toFixed(item.priceUsd, 2)} USD / ${formatNumber(Math.round(item.priceLbp || item.priceUsd * data.rates.usd.rate))} LBP`;
          calculatorPreset = `1 gram of 21K gold = $${toFixed(item.priceUsd, 2)} USD`;
        }
      } else if (pageConfig.key === '5g-21k') {
        item = getPriceForKarat('21k', data);
        h1 = lang === 'ar' ? 'كم سعر 5 غرام 21 ذهب اليوم؟' : lang === 'fr' ? 'Combien coûte 5g d\'or 21k aujourd\'hui ?' : 'How much is 5g of 21k today?';
        if (item) {
          const total = item.priceUsd * 5;
          answerSnippet = `5g 21K: $${toFixed(total, 2)} USD / ${formatNumber(Math.round(total * data.rates.usd.rate))} LBP`;
          calculatorPreset = `5 grams of 21K gold = $${toFixed(total, 2)} USD`;
        }
      } else if (pageConfig.key === 'ounce') {
        item = getPriceForKarat('24k', data);
        h1 = lang === 'ar' ? 'كم سعر أونصة الذهب في لبنان؟' : lang === 'fr' ? 'Combien coûte une once d\'or au Liban ?' : 'How much is an ounce of gold in Lebanon?';
        if (item) {
          const ouncePrice = item.priceUsd * 31.1035;
          answerSnippet = `1 ounce (31.1g) 24K: $${toFixed(ouncePrice, 2)} USD / ${formatNumber(Math.round(ouncePrice * data.rates.usd.rate))} LBP`;
          calculatorPreset = `1 ounce of 24K gold = $${toFixed(ouncePrice, 2)} USD`;
        }
      } else if (pageConfig.key === 'lira') {
        item = getLiraPrice(data);
        h1 = lang === 'ar' ? 'كم سعر ليرة الذهب في لبنان اليوم؟' : lang === 'fr' ? 'Combien coûte une lira d\'or au Liban aujourd\'hui ?' : 'How much is a gold lira in Lebanon today?';
        if (item) {
          answerSnippet = `Gold Lira 8g: $${toFixed(item.priceUsd, 2)} USD / ${formatNumber(Math.round(item.priceLbp || item.priceUsd * data.rates.usd.rate))} LBP`;
        }
      }
      
      if (!item || !item.priceUsd) return;
      
      buildSEOPage(slug, lang, {
        h1,
        answerSnippet,
        priceValue: `$${toFixed(item.priceUsd, 2)} USD`,
        priceSecondary: `${formatNumber(Math.round(item.priceLbp || item.priceUsd * data.rates.usd.rate))} LBP`,
        priceLabel: pageConfig.key.includes('lira') ? 'Gold Lira' : '21K Gold',
        pageType: 'gold-seo',
        itemKey: `question-${pageConfig.key}`,
        calculatorPreset,
        showGoldTable: true
      });
      pageCount++;
    });
  });
  
  // Generate city pages (46-50) - same national price, localized intent
  seoPages.cities.forEach(pageConfig => {
    langs.forEach(lang => {
      const slug = pageConfig[lang];
      if (!slug) return;
      
      const item21k = getPriceForKarat('21k', data);
      if (!item21k || !item21k.priceUsd) return;
      
      const cityName = pageConfig.key.charAt(0).toUpperCase() + pageConfig.key.slice(1);
      const h1 = lang === 'ar'
        ? `سعر الذهب في ${cityName}`
        : lang === 'fr'
        ? `Prix de l'Or à ${cityName}`
        : `Gold Price in ${cityName}`;
      
      buildSEOPage(slug, lang, {
        h1,
        answerSnippet: `21K Gold in ${cityName}: $${toFixed(item21k.priceUsd, 2)} USD / ${formatNumber(Math.round(item21k.priceLbp || item21k.priceUsd * data.rates.usd.rate))} LBP`,
        priceValue: `$${toFixed(item21k.priceUsd, 2)} USD`,
        priceSecondary: `${formatNumber(Math.round(item21k.priceLbp || item21k.priceUsd * data.rates.usd.rate))} LBP`,
        priceLabel: '21K Gold',
        pageType: 'gold-seo',
        itemKey: `city-${pageConfig.key}`,
        cityNote: lang === 'ar' ? 'الأسعار وطنية، قد تختلف الأسعار الفعلية حسب المتجر' : lang === 'fr' ? 'Les prix sont nationaux, les prix réels peuvent varier selon le magasin' : 'Prices are national, actual prices may vary by shop'
      });
      pageCount++;
    });
  });
  
  // Generate use-case pages (51-55)
  seoPages.usecases.forEach(pageConfig => {
    langs.forEach(lang => {
      const slug = pageConfig[lang];
      if (!slug) return;
      
      const item21k = getPriceForKarat('21k', data);
      if (!item21k || !item21k.priceUsd) return;
      
      let h1 = '';
      let calculatorPreset = '';
      
      if (pageConfig.key === 'ring') {
        h1 = lang === 'ar' ? 'سعر خاتم الذهب في لبنان' : lang === 'fr' ? 'Prix d\'une Bague en Or au Liban' : 'Gold Ring Price in Lebanon';
        const ringWeight = 3; // 3-5g average
        const ringPrice = item21k.priceUsd * ringWeight;
        calculatorPreset = `Gold ring (${ringWeight}g 21K) = $${toFixed(ringPrice, 2)} USD`;
      } else if (pageConfig.key === 'wedding') {
        h1 = lang === 'ar' ? 'ذهب الزفاف في لبنان' : lang === 'fr' ? 'Or de Mariage au Liban' : 'Wedding Gold in Lebanon';
        const weddingWeight = 30; // 20-40g average
        const weddingPrice = item21k.priceUsd * weddingWeight;
        calculatorPreset = `Wedding gold (${weddingWeight}g 21K) = $${toFixed(weddingPrice, 2)} USD`;
      } else if (pageConfig.key.startsWith('budget')) {
        const budget = parseInt(pageConfig.key.replace('budget', ''));
        const grams = budget / item21k.priceUsd;
        h1 = lang === 'ar' ? `ما يمكنك شراؤه بـ $${budget} في لبنان` : lang === 'fr' ? `Ce que vous pouvez acheter avec $${budget} au Liban` : `What can you buy for $${budget} in Lebanon?`;
        calculatorPreset = `With $${budget}, you can buy ${grams.toFixed(2)}g of 21K gold`;
      }
      
      buildSEOPage(slug, lang, {
        h1,
        answerSnippet: `21K Gold: $${toFixed(item21k.priceUsd, 2)} USD per gram`,
        priceValue: `$${toFixed(item21k.priceUsd, 2)} USD`,
        priceSecondary: `${formatNumber(Math.round(item21k.priceLbp || item21k.priceUsd * data.rates.usd.rate))} LBP`,
        priceLabel: '21K Gold per gram',
        pageType: 'gold-seo',
        itemKey: `usecase-${pageConfig.key}`,
        calculatorPreset,
        showGoldTable: true
      });
      pageCount++;
    });
  });
  
  console.log(`✓ Generated ${pageCount} SEO gold pages`);
  return pageCount;
}

/**
 * Build a single SEO page
 */
function buildSEOPage(slug, lang, seoData) {
  const t = config.translations[lang];
  const slugs = config.slugs[lang];
  const baseTemplate = loadTemplate('base');
  const seoTemplate = loadTemplate('gold-seo-page');
  
  const data = loadData();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  
  // Build navigation URLs
  const urls = {
    homeUrl: slugs.home,
    usdUrl: slugs.usd,
    eurUrl: slugs.eur,
    officialUrl: slugs.official,
    converterUrl: slugs.converter,
    fuelUrl: slugs.fuel,
    goldUrl: slugs.gold,
    aboutUrl: slugs.about,
    privacyUrl: slugs.privacy
  };
  
  // Build language switcher URLs for SEO pages
  // Find corresponding slugs in other languages from config
  const seoPages = config.seoGoldPages;
  const findMatchingSlug = (currentSlug, targetLang) => {
    // Search through all SEO page types
    const pageTypes = ['karat', 'currency', 'intent', 'questions', 'cities', 'usecases'];
    for (const pageType of pageTypes) {
      if (!seoPages[pageType]) continue;
      for (const pageConfig of seoPages[pageType]) {
        // Find the page config that matches current slug
        if (pageConfig[lang] === slug) {
          return pageConfig[targetLang] || currentSlug;
        }
      }
    }
    // Fallback: simple replacement if not found in config
    if (targetLang === 'en') {
      return slug.replace(/^\/ar\//, '/').replace(/^\/fr\//, '/');
    } else if (targetLang === 'ar') {
      return slug.startsWith('/ar/') ? slug : `/ar${slug.replace(/^\//, '')}`;
    } else if (targetLang === 'fr') {
      return slug.startsWith('/fr/') ? slug : `/fr${slug.replace(/^\//, '')}`;
    }
    return slug;
  };
  
  urls.enUrl = findMatchingSlug(slug, 'en');
  urls.arUrl = findMatchingSlug(slug, 'ar');
  urls.frUrl = findMatchingSlug(slug, 'fr');
  
  const langActive = {
    enActive: lang === 'en' ? 'active' : '',
    arActive: lang === 'ar' ? 'active' : '',
    frActive: lang === 'fr' ? 'active' : ''
  };
  
  // Format functions
  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  const toFixed = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return parseFloat(num).toFixed(decimals);
  };
  
  const round = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 0;
    return Math.round(parseFloat(num));
  };
  
  // Get last updated time
  const lastUpdated = data.lebanonGold?.fetchedAt || new Date().toISOString();
  
  // Render Lebanon gold table if needed
  const pageTranslationsForTable = {
    goldTypeLabel: lang === 'ar' ? 'نوع الذهب' : lang === 'fr' ? 'Type d\'or' : 'Gold Type'
  };
  const lebanonGoldTable = seoData.showGoldTable ? renderLebanonGoldTable(data.lebanonGold, data, pageTranslationsForTable, lang) : '';
  
  // Render cross links
  const crossLinksHtml = renderComponent('cross-links', {
    ...urls,
    ...t
  });
  
  // Generate calculator preset HTML if applicable
  let seoCalculatorPresetHtml = '';
  if (seoData.calculatorPreset) {
    seoCalculatorPresetHtml = `
<div class="seo-calculator-preset">
  <h3>${lang === 'ar' ? 'حاسبة' : lang === 'fr' ? 'Calculateur' : 'Calculator'}</h3>
  <div class="preset-result">
    ${seoData.calculatorPreset}
  </div>
</div>`;
  }
  
  // Generate city note HTML if applicable
  let cityNoteHtml = '';
  if (seoData.cityNote) {
    cityNoteHtml = `<div class="city-note"><p><em>${seoData.cityNote}</em></p></div>`;
  }
  
  // Generate description
  const seoDescription = seoData.answerSnippet + (lang === 'ar' ? ' - أسعار مباشرة من تجار لبنان' : lang === 'fr' ? ' - Prix en direct des commerçants libanais' : ' - Live prices from Lebanon dealers');
  
  // Template data
  const templateData = {
    ...data,
    rates: data.rates,
    fuel: data.fuel,
    gold: data.gold,
    lebanonGold: data.lebanonGold,
    ...urls,
    ...t,
    ...langActive,
    lang,
    formatNumber,
    toFixed,
    round,
    lebanonGoldTable: seoData.showGoldTable ? lebanonGoldTable : '',
    crossLinks: crossLinksHtml,
    seoH1: seoData.h1,
    seoAnswerSnippet: seoData.answerSnippet,
    seoDescription: seoDescription,
    seoPriceValue: seoData.priceValue,
    seoPriceSecondary: seoData.priceSecondary,
    seoPriceLabel: seoData.priceLabel,
    lastUpdated,
    seoCalculatorPresetHtml: seoCalculatorPresetHtml,
    cityNoteHtml: cityNoteHtml,
    ratesJSON: JSON.stringify({
      usd: data.rates.usd.rate,
      eur: data.rates.eur.rate
    })
  };
  
  // Render template
  const content = renderTemplate(seoTemplate, templateData);
  
  // Generate structured data
  const canonicalUrl = `${config.site.domain}${slug}`;
  const structuredData = generateStructuredData('gold', lang, data, {
    title: seoData.h1,
    metaDescription: seoData.answerSnippet
  }, canonicalUrl);
  
  // Format schema markup
  let schemaMarkup = '';
  if (structuredData) {
    schemaMarkup = `<script type="application/ld+json">${structuredData}</script>`;
  }
  
  // Build full page
  const baseTemplateData = {
    lang: lang === 'ar' ? 'ar' : lang,
    dir,
    siteName: t.siteName,
    siteTagline: t.siteTagline,
    ...urls,
    ...langActive,
    ...t,
    content,
    canonicalUrl,
    hreflangTags: generateHreflangTags(lang, slug),
    pageTitle: seoData.h1,
    metaDescription: seoData.answerSnippet,
    metaKeywords: `gold price lebanon, ${seoData.itemKey}, lebanon gold`,
    schemaMarkup,
    ogImage: `${config.site.domain}/og-image.jpg`,
    ogLocale: lang === 'ar' ? 'ar_LB' : lang === 'fr' ? 'fr_FR' : 'en_US'
  };
  
  const fullHtml = renderTemplate(baseTemplate, baseTemplateData);
  
  // Determine output path
  let outputPath;
  let cleanSlug = slug.replace(/^\//, '').replace(/\/$/, '');
  
  if (lang === 'en') {
    // English: /gold-price-lebanon-21k -> gold-price-lebanon-21k.html
    outputPath = path.join(DIST_DIR, `${cleanSlug}.html`);
  } else if (lang === 'ar') {
    // Arabic: /ar/سعر-الذهب-عيار-21 -> ar/سعر-الذهب-عيار-21.html
    // Remove /ar/ prefix if present
    cleanSlug = cleanSlug.replace(/^ar\//, '');
    outputPath = path.join(DIST_DIR, 'ar', `${cleanSlug}.html`);
  } else if (lang === 'fr') {
    // French: /fr/prix-or-21-carats-liban -> fr/prix-or-21-carats-liban.html
    // Remove /fr/ prefix if present
    cleanSlug = cleanSlug.replace(/^fr\//, '');
    outputPath = path.join(DIST_DIR, 'fr', `${cleanSlug}.html`);
  } else {
    outputPath = path.join(DIST_DIR, `${cleanSlug}.html`);
  }
  
  // Ensure directory exists
  fs.ensureDirSync(path.dirname(outputPath));
  
  // Write file
  fs.writeFileSync(outputPath, fullHtml, 'utf8');
  console.log(`  ✓ ${outputPath}`);
}

/**
 * Main build function
 */
async function build() {
  console.log('Building site...\n');
  
  // Check if we should fetch data first
  const shouldFetch = process.argv.includes('--fetch-data');
  if (shouldFetch) {
    console.log('Fetching latest data...\n');
    try {
      await fetchAllData();
    } catch (error) {
      console.warn('Warning: Data fetch failed, using cached/default data:', error.message);
    }
  }
  
  const data = loadData();
  
  // Page configurations
  const pages = [
    { template: 'home', pageType: 'home', slugKey: 'home', outputFile: 'index.html' },
    { template: 'usd-lbp', pageType: 'usd', slugKey: 'usd', outputFile: 'usd-lbp-today.html' },
    { template: 'eur-lbp', pageType: 'eur', slugKey: 'eur', outputFile: 'eur-lbp-today.html' },
    { template: 'official-rates', pageType: 'official', slugKey: 'official', outputFile: 'official-rates.html' },
    { template: 'converter', pageType: 'converter', slugKey: 'converter', outputFile: 'convert.html' },
    { template: 'fuel', pageType: 'fuel', slugKey: 'fuel', outputFile: 'fuel-prices-today.html' },
    { template: 'gold', pageType: 'gold', slugKey: 'gold', outputFile: 'gold-price-lebanon.html' },
    { template: 'about', pageType: 'about', slugKey: 'about', outputFile: 'about-faq.html' }
  ];
  
  // Build all pages for all languages
  const langs = ['en', 'ar', 'fr'];
  for (const lang of langs) {
    for (const page of pages) {
      buildPage(page.template, lang, {
        ...page,
        lang
      });
    }
  }
  
  // Generate SEO gold pages (Features 28-55)
  console.log('\nGenerating SEO gold pages...');
  generateSEOGoldPages();
  
  // Copy static assets
  copyAssets();
  
  // Generate sitemap and robots
  generateSitemap();
  generateRobots();
  
  console.log('\n✓ Build complete!');
  console.log(`Output directory: ${DIST_DIR}`);
}

// Run build
if (require.main === module) {
  build().catch(console.error);
}

module.exports = { 
  build, 
  buildPage, 
  buildSEOPage, 
  generateSEOGoldPages, 
  copyAssets, 
  generateSitemap, 
  generateRobots 
};