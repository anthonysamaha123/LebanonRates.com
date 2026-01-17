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
  
  const paths = pathMap[currentPath] || pathMap['/'];
  
  return langs.map(lang => {
    const url = `${baseUrl}${paths[lang]}`;
    return `<link rel="alternate" hreflang="${lang}" href="${url}">`;
  }).join('\n  ');
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
  
  // Pre-render Lebanon gold table if data exists
  const renderLebanonGoldTable = (lebanonGold) => {
    if (!lebanonGold || !lebanonGold.items || !Array.isArray(lebanonGold.items)) {
      return '';
    }
    
    const validItems = lebanonGold.items.filter(item => item.priceLbp !== null);
    if (validItems.length === 0) {
      return '';
    }
    
    let tableHtml = `
<section class="section">
  <h2>Lebanon Local Gold Prices (We Buy)</h2>
  <p style="font-size: 0.95rem; color: var(--text-medium); margin-bottom: 1.5rem;">
    Real market prices from Lebanon dealers - actual "We Buy" rates
  </p>
  
  <table class="data-table">
    <thead>
      <tr>
        <th>Item</th>
        <th>Price (LBP)</th>
        <th>Price (USD)</th>
      </tr>
    </thead>
    <tbody>`;
    
    validItems.forEach(item => {
      // Calculate USD price if not already set or if it's 0
      let priceUsd = item.priceUsd;
      if ((priceUsd === null || priceUsd === 0) && item.priceLbp && data.rates && data.rates.usd && data.rates.usd.rate) {
        priceUsd = item.priceLbp / data.rates.usd.rate;
      }
      
      const priceUsdStr = priceUsd !== null && priceUsd !== 0 && priceUsd >= 0.01
        ? `$${toFixed(priceUsd, 2)}` 
        : '—';
      
      tableHtml += `
      <tr>
        <td><strong>${item.label}</strong></td>
        <td><strong style="color: var(--primary-color);">${formatNumber(item.priceLbp)} LBP</strong></td>
        <td><strong style="color: var(--secondary-color);">${priceUsdStr}</strong></td>
      </tr>`;
    });
    
    tableHtml += `
    </tbody>
  </table>
  
  <div class="last-updated" style="margin-top: 1rem;">
    <strong>Source:</strong> Lebanor.com | <strong>Last updated:</strong> ${lebanonGold.fetchedAt || 'Unknown'}
  </div>
</section>`;
    
    return tableHtml;
  };
  
  // Format fuel data for display
  const fuelData = { ...data.fuel };
  if (fuelData.dieselNote) {
    // Format diesel note for display
    fuelData.dieselNoteFormatted = `<br><span style="font-size: 0.9rem; color: var(--text-medium); font-weight: normal;">(${fuelData.dieselNote})</span>`;
  } else {
    fuelData.dieselNoteFormatted = '';
  }
  if (fuelData.source) {
    fuelData.sourceFormatted = `<p style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-medium);"><strong>Source:</strong> ${fuelData.source}</p>`;
  } else {
    fuelData.sourceFormatted = '';
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
    lebanonGoldTable: renderLebanonGoldTable(data.lebanonGold), // Pre-rendered Lebanon gold table
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
    metaKeywords: pageData.metaKeywords || 'lebanon, exchange rate, dollar, lira',
    schemaMarkup: pageData.schemaMarkup || ''
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
}

/**
 * Generate sitemap.xml
 */
function generateSitemap() {
  const baseUrl = config.site.domain;
  const urls = [];
  
  // Add all pages for all languages
  const pages = [
    { slug: '/', changefreq: 'daily', priority: '1.0' },
    { slug: '/usd-lbp-today', changefreq: 'hourly', priority: '0.9' },
    { slug: '/eur-lbp-today', changefreq: 'hourly', priority: '0.8' },
    { slug: '/official-rates', changefreq: 'daily', priority: '0.7' },
    { slug: '/convert', changefreq: 'daily', priority: '0.8' },
    { slug: '/fuel-prices-today', changefreq: 'daily', priority: '0.8' },
    { slug: '/gold-price-lebanon', changefreq: 'daily', priority: '0.7' },
    { slug: '/about-faq', changefreq: 'monthly', priority: '0.5' }
  ];
  
  for (const page of pages) {
    // English
    urls.push(`${baseUrl}${page.slug}`);
    // Arabic
    const arSlug = config.slugs.ar[page.slug === '/' ? 'home' : Object.keys(config.slugs.en).find(k => config.slugs.en[k] === page.slug)];
    if (arSlug) urls.push(`${baseUrl}${arSlug}`);
    // French
    const frSlug = config.slugs.fr[page.slug === '/' ? 'home' : Object.keys(config.slugs.fr).find(k => config.slugs.fr[k] === page.slug)];
    if (frSlug) urls.push(`${baseUrl}${frSlug}`);
  }
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
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

module.exports = { build, buildPage, copyAssets, generateSitemap, generateRobots };