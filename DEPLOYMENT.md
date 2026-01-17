# Deployment Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Fetch Data and Build**
   ```bash
   npm run fetch-data
   npm run build
   ```

3. **Deploy**
   - The `dist/` folder contains the static site
   - Deploy to any static hosting service (Netlify, Vercel, GitHub Pages, etc.)

## Automated Updates

**✅ GitHub Actions workflow is already configured!** 

The `.github/workflows/update-rates.yml` file will automatically:
- Fetch latest rates every 30 minutes
- Rebuild the site
- Commit and push updates if data changed

**To activate:**
1. Push the repository to GitHub
2. The workflow will automatically start running on schedule
3. You can also manually trigger it from the "Actions" tab in GitHub

**Note:** If `data/` is in `.gitignore`, the workflow will force-add it to track rate updates. If you prefer to keep data files tracked normally, remove `data/` from `.gitignore`.

### Option 2: Netlify Scheduled Functions

If deploying to Netlify, you can use scheduled functions:

```javascript
// netlify/functions/update-data.js
exports.handler = async (event, context) => {
  // Trigger build with --fetch-data flag
  // This would require a build hook or API call
};
```

### Option 3: Cron Job on VPS

```bash
# Add to crontab (crontab -e)
*/30 * * * * cd /path/to/LebanonRates.com && /usr/bin/node scripts/update-and-build.js
```

This will run every 30 minutes. Adjust the schedule as needed.

## Data Sources Configuration

Update `scripts/fetch-data.js` with your actual data sources:

- **Currency rates**: Configure scrapers for lirarate.org or other sources
- **Fuel prices**: Scrape Ministry of Energy website or news sources
- **Gold prices**: Use metals-api.com or similar API

## Environment Variables

Create a `.env` file for API keys (if needed):

```
METALS_API_KEY=your_key_here
```

## Testing Locally

```bash
# Build and serve
npm run build
npx serve dist

# Or use the dev command
npm run dev
```

## Google AdSense Setup

1. Apply for AdSense approval
2. Replace `ca-pub-XXXXXXXXXXXXXXXX` in `templates/base.html` with your AdSense client ID
3. AdSense will automatically serve ads in the placeholder containers

## SEO Checklist

- [x] Sitemap.xml generated
- [x] Robots.txt configured
- [x] Hreflang tags for multi-language
- [x] Meta descriptions for all pages
- [ ] Submit sitemap to Google Search Console
- [ ] Set up Google Analytics (optional)
- [ ] Verify structured data in Google's Rich Results Test

## Monitoring

Set up monitoring for:
- Data fetch failures (check logs)
- Build failures
- Site uptime
- Traffic analytics

## Customization

- Edit `config.js` to change site name, domain, URLs
- Edit `templates/translations.js` for content updates
- Edit `src/css/style.css` for styling changes
- Templates are in `templates/*.html`