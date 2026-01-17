# 🚀 Deploy from GitHub - Quick Guide

## Your Code is on GitHub - Now Deploy It!

### 📍 Repository: `anthonysamaha123/LebanonRates.com`

---

## 🎯 Option 1: Deploy to Netlify (Easiest)

### Steps:

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com
   - Sign up/Login (free account)

2. **Import Your Project**
   - Click "Add new site" → "Import an existing project"
   - Click "Deploy with GitHub"
   - Authorize Netlify to access your GitHub account
   - Select repository: `anthonysamaha123/LebanonRates.com`

3. **Configure Build Settings**
   ```
   Build command:    npm install && npm run build
   Publish directory: dist
   Node version:     18
   ```
   - These settings should auto-detect from `netlify.toml`
   - If not, enter them manually

4. **Deploy**
   - Click "Deploy site"
   - Wait 2-3 minutes for build to complete
   - Your site will be live!

5. **Get Your URL**
   - Netlify will assign a URL like: `your-site-name.netlify.app`
   - You can customize it in Site Settings → Domain

### ✅ Test After Deployment:

- **API:** `https://your-site-name.netlify.app/api/lebanon-gold`
- **UI:** `https://your-site-name.netlify.app/gold-price-lebanon`

---

## 🎯 Option 2: Deploy to Vercel

### Steps:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/new
   - Sign up/Login (free account)

2. **Import Your Project**
   - Click "Import Git Repository"
   - Sign in with GitHub
   - Select repository: `anthonysamaha123/LebanonRates.com`

3. **Configure Project**
   ```
   Framework Preset: Other
   Build Command:     npm run build
   Output Directory:  dist
   Install Command:   npm install (default)
   ```
   - Click "Deploy"

4. **Wait for Deployment**
   - Vercel will build your site (1-2 minutes)
   - Your site will be live!

5. **Get Your URL**
   - Vercel will assign a URL like: `your-site-name.vercel.app`
   - You can customize it in Project Settings → Domains

### ✅ Test After Deployment:

- **API:** `https://your-site-name.vercel.app/api/lebanon-gold`
- **UI:** `https://your-site-name.vercel.app/gold-price-lebanon`

---

## 📊 What Happens After Deployment

### Automatic Features:

✅ **Auto-Deploy on Push**
   - Every time you push to GitHub, your site rebuilds automatically
   - No manual deployment needed

✅ **API Endpoint Live**
   - `/api/lebanon-gold` will work immediately
   - Returns Lebanon gold prices with caching

✅ **UI Live**
   - `/gold-price-lebanon` page will display gold prices
   - Table shows all 6 items from Lebanor.com

✅ **GitHub Actions**
   - Your workflow (`.github/workflows/update-rates.yml`) will run every 30 minutes
   - Automatically fetches fresh data and updates your site

---

## 🧪 Testing After Deployment

### 1. Test API Endpoint

```bash
# Replace YOUR-SITE-URL with your actual URL
curl https://YOUR-SITE-URL/api/lebanon-gold
```

**Expected Response:**
```json
{
  "source": "lebanor",
  "fetchedAt": "2026-01-17T...",
  "items": [
    {
      "key": "gold_14k_1g_buy",
      "label": "We Buy 1g Gold 14 Karat",
      "priceLbp": 86,
      ...
    },
    // ... 5 more items
  ]
}
```

### 2. Test UI Page

Visit: `https://YOUR-SITE-URL/gold-price-lebanon`

**Expected:**
- Page loads with Lebanon gold prices table
- Shows 6 items (14k, 18k, 21k, 24k, Lira coin, Silver)
- Displays prices in LBP
- Shows "Source: Lebanor.com"

### 3. Test Cache Headers

```bash
curl -I https://YOUR-SITE-URL/api/lebanon-gold
```

**Expected Header:**
```
Cache-Control: public, max-age=60, stale-while-revalidate=600
```

---

## 🔧 Troubleshooting

### Build Fails

**Check:**
- Build logs in Netlify/Vercel dashboard
- Ensure `netlify.toml` has correct settings
- Verify Node.js version is 18

**Fix:**
- Check build logs for specific errors
- Most issues are dependency-related
- Try clearing cache and rebuilding

### API Returns 500 Error

**Check:**
- Function logs in Netlify/Vercel dashboard
- Verify `data/lebanon-gold.json` exists
- Check network connectivity to Lebanor.com

**Fix:**
- First deployment may take a moment to fetch data
- Wait 1-2 minutes and try again
- Check function logs for details

### UI Not Showing Gold Prices

**Check:**
- Verify build completed successfully
- Check if `data/lebanon-gold.json` was included in build
- Inspect browser console for errors

**Fix:**
- Rebuild the site
- Verify data file exists in repository
- Check template rendering in build logs

---

## 📚 Need Help?

- **Netlify Docs:** https://docs.netlify.com
- **Vercel Docs:** https://vercel.com/docs
- **Repository:** https://github.com/anthonysamaha123/LebanonRates.com

---

**That's it! Just choose Netlify or Vercel and follow the steps above. Your site will be live in minutes!** 🎉
