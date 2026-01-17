# Quick Start Guide

## Setup (5 minutes)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the site:**
   ```bash
   npm run build
   ```
   This creates the static site in the `dist/` folder.

3. **Preview locally:**
   ```bash
   npm run dev
   ```
   Opens at http://localhost:3000

## Structure

```
LebanonRates.com/
├── templates/          # HTML page templates
│   ├── base.html      # Base layout
│   ├── home.html      # Homepage
│   ├── usd-lbp.html   # USD rate page
│   └── ...
├── src/
│   └── css/
│       └── style.css  # Main stylesheet
├── scripts/
│   └── fetch-data.js  # Data fetching logic
├── config.js          # Site configuration
├── build.js           # Build script
└── dist/              # Generated static site (output)

```

## Key Features Implemented

✅ **Multi-language support** (English, Arabic, French)
✅ **Responsive design** (mobile-first)
✅ **8 core page templates** (Home, USD, EUR, Official, Converter, Fuel, Gold, About)
✅ **SEO optimized** (meta tags, hreflang, sitemap)
✅ **AdSense ready** (placeholder containers)
✅ **Automated data fetching** (scripts ready)
✅ **Static site generation** (fast, deployable anywhere)

## Next Steps

1. **Configure data sources** in `scripts/fetch-data.js`
   - Add scrapers for currency rates
   - Configure fuel price source
   - Set up gold price API

2. **Customize content:**
   - Edit `templates/translations.js` for text changes
   - Edit `config.js` for site name/domain
   - Edit `src/css/style.css` for styling

3. **Deploy:**
   - Netlify: Connect GitHub repo, auto-deploys
   - Vercel: `vercel deploy`
   - Or upload `dist/` folder to any static host

4. **Set up automation:**
   - Use GitHub Actions (`.github/workflows/update.yml`)
   - Or cron job for hourly data updates

## Page Templates Created

1. **Homepage** (`/`) - Dashboard with key rates
2. **USD Rate** (`/usd-lbp-today`) - Black market dollar rate
3. **EUR Rate** (`/eur-lbp-today`) - Euro to LBP rate
4. **Official Rates** (`/official-rates`) - Central Bank rates
5. **Converter** (`/convert`) - Currency converter tool
6. **Fuel Prices** (`/fuel-prices-today`) - Gasoline & diesel prices
7. **Gold Prices** (`/gold-price-lebanon`) - Gold per gram
8. **About/FAQ** (`/about-faq`) - Site info and FAQs

All pages available in EN, AR, FR with proper hreflang tags.

## Data Sources

Currently uses placeholder data. Update `scripts/fetch-data.js` to:
- Scrape lirarate.org for USD rates
- Fetch official Sayrafa rate from BDL
- Scrape fuel prices from Ministry website
- Get gold prices from API and convert to LBP

## Customization

- **Colors**: Edit CSS variables in `src/css/style.css`
- **Content**: Edit translations in `templates/translations.js`
- **URLs**: Edit slugs in `config.js`
- **Templates**: Modify HTML in `templates/*.html`

## Notes

- Site is fully static - no server required
- Data updates require rebuild (automated via cron/GitHub Actions)
- AdSense placeholders ready - replace with your client ID
- SEO optimized - submit sitemap to Google Search Console