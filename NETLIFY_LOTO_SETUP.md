# Netlify Setup Guide: Latest Loto Results Feature

This guide explains how to deploy the Latest Loto Results feature on Netlify.

## Prerequisites

✅ **Already Configured:**
- Netlify function created: `netlify/functions/loto-latest.js`
- API redirect configured in `netlify.toml`
- Functions directory configured in `netlify.toml`

## Step-by-Step Setup

### 1. Ensure Dependencies Are Installed

The Netlify function requires these npm packages. Check that `netlify/functions/package.json` includes:

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "fs-extra": "^11.2.0"
  }
}
```

**Note:** Netlify will automatically install dependencies from the root `package.json` during build, but ensure these are listed there.

### 2. Verify Netlify Configuration

Your `netlify.toml` should already have:

```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/loto/latest"
  to = "/.netlify/functions/loto-latest"
  status = 200
  force = false
```

✅ This is already configured!

### 3. Deploy to Netlify

#### Option A: Automatic Deployment (Recommended)

1. **Connect your GitHub repository to Netlify:**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repository
   - Netlify will detect `netlify.toml` and use your settings

2. **Build settings (auto-detected from `netlify.toml`):**
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

3. **Deploy:**
   - Click "Deploy site"
   - Netlify will run the build and deploy

#### Option B: Manual Deployment via Netlify CLI

```bash
# Install Netlify CLI globally (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site (first time only)
netlify init

# Deploy
netlify deploy --prod
```

### 4. Verify Deployment

After deployment, test the API endpoint:

```bash
# Replace YOUR_SITE_URL with your Netlify site URL
curl https://YOUR_SITE_URL.netlify.app/api/loto/latest
```

**Expected Response:**
```json
{
  "drawNumber": 2384,
  "drawDate": "15/01/2026",
  "numbers": [1, 20, 27, 29, 31, 37, 4],
  "sourceUrl": "https://www.lldj.com/",
  "fetchedAt": "2026-01-17T17:53:16.265Z"
}
```

### 5. Test the Widget

1. Visit your site: `https://YOUR_SITE_URL.netlify.app`
2. Scroll to the "Latest Loto Results" widget on the homepage
3. The widget should:
   - Show "Loading latest draw..." initially
   - Display draw number, date, and 7 numbers
   - Show "Last updated: [timestamp]"

## Troubleshooting

### Issue: "Invalid data received" or "API endpoint not available"

**Cause:** The Netlify function may not be deployed or accessible.

**Solution:**
1. Check Netlify function logs:
   - Go to Netlify Dashboard → Your Site → Functions
   - Look for `loto-latest` function
   - Check the "Logs" tab for errors

2. Verify the function is working:
   ```bash
   curl https://YOUR_SITE_URL.netlify.app/.netlify/functions/loto-latest
   ```

3. If the function exists but returns 404:
   - Check `netlify.toml` has the redirect rule
   - Redeploy the site

### Issue: Function fails with dependency errors

**Cause:** Missing npm packages in function dependencies.

**Solution:**
1. Ensure all dependencies are in root `package.json`:
   ```json
   {
     "dependencies": {
       "axios": "^1.6.0",
       "cheerio": "^1.0.0-rc.12",
       "fs-extra": "^11.2.0"
     }
   }
   ```

2. Netlify will install these during build.

### Issue: Function timeout

**Cause:** Fetching from LLDJ website takes too long (> 10 seconds).

**Solution:**
1. Check Netlify function logs for timeout errors
2. The function has retry logic built-in
3. Consider increasing timeout (default is 10 seconds):
   ```toml
   [functions.loto-latest]
     timeout = 30  # seconds
   ```

### Issue: CORS errors in browser console

**Cause:** Missing CORS headers in function response.

**Solution:**
✅ Already handled! The function includes CORS headers:
```javascript
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  // ...
};
```

## File Structure

```
LebanonRates.com/
├── netlify/
│   ├── functions/
│   │   ├── loto-latest.js      # ✅ Netlify function
│   │   └── package.json          # Function dependencies
├── src/
│   ├── services/
│   │   └── lldjLoto.js         # ✅ Service logic
│   ├── js/
│   │   └── loto-widget.js      # ✅ Client-side widget
│   └── parseLldjLoto.js        # ✅ HTML parser
├── templates/
│   └── components/
│       └── loto-latest.html    # ✅ Widget HTML
├── netlify.toml                # ✅ Netlify config with redirect
└── package.json                # ✅ Root dependencies
```

## Deployment Checklist

- [x] Netlify function created: `netlify/functions/loto-latest.js`
- [x] API redirect configured in `netlify.toml`
- [x] Functions directory set in `netlify.toml`
- [x] Widget HTML component created
- [x] Client-side JavaScript created
- [x] CSS styles added
- [x] Widget added to homepage template
- [x] Build process copies JS files
- [ ] **Deploy to Netlify** (you need to do this)
- [ ] **Test API endpoint** after deployment
- [ ] **Test widget on homepage** after deployment

## Environment Variables

No environment variables are required for this feature. All configuration is in code.

## Monitoring

After deployment, monitor:
- **Function logs:** Netlify Dashboard → Functions → loto-latest → Logs
- **Function invocations:** Netlify Dashboard → Functions → loto-latest → Metrics
- **Error rate:** Check for failed requests in logs

## Next Steps

1. **Deploy to Netlify** using one of the methods above
2. **Test the API endpoint** to ensure it's working
3. **Check the homepage** to see the widget in action
4. **Monitor function logs** for any issues

## Support

If you encounter issues:
1. Check Netlify function logs for errors
2. Test the API endpoint directly with `curl`
3. Check browser console for client-side errors
4. Verify all files are committed and pushed to your repository

---

**Status:** ✅ All code is ready. You just need to deploy to Netlify!
