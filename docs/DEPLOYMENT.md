# Deployment Guide: Lebanon Gold Prices API

## 🚀 Deployment Steps

### Option 1: Netlify (Recommended)

#### Prerequisites
1. Netlify account
2. GitHub repository connected to Netlify
3. Netlify CLI installed (optional, for local testing)

#### Deployment via Netlify Dashboard

1. **Go to Netlify Dashboard**
   - Visit https://app.netlify.com
   - Select your site (or create new site from Git)

2. **Configure Build Settings**
   ```
   Build command: npm run build
   Publish directory: dist
   ```

3. **Configure Environment Variables** (if needed)
   - Go to Site Settings → Environment Variables
   - Add any required variables

4. **Deploy**
   - Netlify will auto-deploy on every push to `main`
   - Or manually trigger deployment

#### Test Deployment

Once deployed, test the API endpoint:

```bash
# Replace YOUR_SITE_URL with your Netlify site URL
curl https://YOUR_SITE_URL.netlify.app/api/lebanon-gold

# Test with refresh
curl "https://YOUR_SITE_URL.netlify.app/api/lebanon-gold?refresh=true"
```

#### Netlify Function Configuration

The function is already configured in `netlify.toml`:

```toml
[[redirects]]
  from = "/api/lebanon-gold"
  to = "/.netlify/functions/lebanon-gold"
  status = 200
  force = false
```

#### Local Testing with Netlify Dev

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Test locally
netlify dev

# In another terminal, test the endpoint
curl http://localhost:8888/api/lebanon-gold
```

---

### Option 2: Vercel

#### Prerequisites
1. Vercel account
2. Vercel CLI installed (optional)

#### Deployment via Vercel Dashboard

1. **Import Project**
   - Go to https://vercel.com/new
   - Import your GitHub repository

2. **Configure Build Settings**
   ```
   Framework Preset: Other
   Build Command: npm run build
   Output Directory: dist
   ```

3. **Add API Route**
   - Create `api/lebanon-gold.js` (or move from `netlify/functions/`)
   - Vercel automatically detects API routes in `/api` directory

#### Convert Netlify Function to Vercel API Route

The Netlify function needs minor changes for Vercel:

```javascript
// api/lebanon-gold.js (Vercel)
const { fetchLebanonGold } = require('../scripts/fetch-lebanon-gold');
const { fetchUSDRate } = require('../scripts/fetch-data');

module.exports = async (req, res) => {
  try {
    const usdRates = await fetchUSDRate();
    const usdLbpRate = usdRates.rate;
    
    const refresh = req.query.refresh === 'true';
    const goldData = await fetchLebanonGold(refresh, usdLbpRate);
    
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(goldData);
  } catch (error) {
    console.error('Error fetching Lebanon gold data:', error);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(500).json({ 
      error: 'Failed to fetch Lebanon gold prices', 
      details: error.message 
    });
  }
};
```

#### Deploy via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Test
curl https://YOUR_SITE_URL.vercel.app/api/lebanon-gold
```

---

## 🧪 Testing

### Local Testing

Before deploying, test locally:

```bash
# Test the API endpoint handler
npm run test-api

# Monitor API performance
npm run monitor-api

# Or manually test
node -e "const func = require('./netlify/functions/lebanon-gold'); func.handler({httpMethod:'GET',queryStringParameters:{}},{}).then(r=>console.log(JSON.stringify(JSON.parse(r.body),null,2)))"
```

### Production Testing

After deployment:

```bash
# Basic test
curl https://YOUR_SITE_URL/api/lebanon-gold

# Test with refresh
curl "https://YOUR_SITE_URL/api/lebanon-gold?refresh=true"

# Test CORS
curl -H "Origin: https://example.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://YOUR_SITE_URL/api/lebanon-gold

# Test cache headers
curl -I https://YOUR_SITE_URL/api/lebanon-gold
```

### Automated Testing Script

Use the monitoring script:

```bash
# Monitor production API
API_URL=https://YOUR_SITE_URL/api/lebanon-gold npm run monitor-api

# Monitor with custom interval (30 seconds)
API_URL=https://YOUR_SITE_URL/api/lebanon-gold INTERVAL_MS=30000 npm run monitor-api

# Limited requests (10 requests then stop)
API_URL=https://YOUR_SITE_URL/api/lebanon-gold MAX_REQUESTS=10 npm run monitor-api
```

---

## 📊 Monitoring

### Key Metrics to Monitor

1. **Response Times**
   - Target: < 500ms (cached), < 2000ms (fresh)
   - Alert if: > 5000ms

2. **Cache Hit Rate**
   - Target: > 80%
   - Alert if: < 50%

3. **Error Rate**
   - Target: < 1%
   - Alert if: > 5%

4. **Success Rate**
   - Target: > 99%
   - Alert if: < 95%

### Monitoring Tools

#### 1. Built-in Monitoring Script

```bash
npm run monitor-api
```

#### 2. Netlify Analytics

- Go to Site Settings → Analytics
- View function invocations, duration, errors

#### 3. Vercel Analytics

- Built-in function analytics in dashboard
- View invocations, duration, errors

#### 4. Custom Monitoring

Set up external monitoring (e.g., UptimeRobot, Pingdom):

```
URL: https://YOUR_SITE_URL/api/lebanon-gold
Method: GET
Expected Status: 200
Check Interval: 5 minutes
```

---

## 🔧 Configuration

### Environment Variables

Currently no environment variables are required, but you can add:

```bash
# Netlify
netlify env:set CACHE_TTL_SECONDS 60
netlify env:set STALE_TTL_SECONDS 600

# Vercel
vercel env add CACHE_TTL_SECONDS
```

### Rate Limiting

The function respects:
- 60-second minimum between fetches (file-based cache)
- 600-second stale-while-revalidate window
- 3 retry attempts with exponential backoff

### Function Timeout

- **Netlify**: 10 seconds (default), can be increased to 26 seconds (Pro plan)
- **Vercel**: 10 seconds (Hobby), up to 60 seconds (Pro)

If your function times out frequently, consider:
1. Reducing retry attempts
2. Increasing cache TTL
3. Using edge functions (Vercel)

---

## 🐛 Troubleshooting

### API Returns 500 Error

**Check:**
1. Function logs (Netlify/Vercel dashboard)
2. Data file exists: `data/lebanon-gold.json`
3. Network connectivity to `lebanor.com`

**Fix:**
```bash
# Ensure data file exists
node scripts/fetch-lebanon-gold.js

# Check logs
netlify functions:log lebanon-gold  # Netlify
vercel logs YOUR_SITE_URL --follow  # Vercel
```

### API Returns Empty Items

**Check:**
1. API response format from Lebanor.com
2. Mapping logic in `fetch-lebanon-gold.js`
3. USD rate availability

**Fix:**
- Verify API endpoint is accessible
- Check mapping in `scripts/fetch-lebanon-gold.js`
- Ensure USD rate is fetched before gold prices

### Slow Response Times

**Check:**
1. Cache hit rate
2. Upstream API latency (`lebanor.com`)
3. Function cold starts

**Fix:**
- Increase cache TTL
- Use edge functions (Vercel)
- Add warm-up requests (keep-alive)

### CORS Issues

**Check:**
- `Access-Control-Allow-Origin` header
- Request method (should be GET)

**Fix:**
- Verify CORS headers in function
- Check `netlify.toml` redirect configuration

---

## ✅ Deployment Checklist

- [ ] Code committed and pushed to GitHub
- [ ] Build passes locally (`npm run build`)
- [ ] API test passes locally (`npm run test-api`)
- [ ] Netlify/Vercel site configured
- [ ] Build settings configured
- [ ] Deployed to production
- [ ] API endpoint accessible
- [ ] Cache headers verified
- [ ] CORS working
- [ ] Monitoring set up
- [ ] Documentation updated

---

## 📚 Additional Resources

- **API Documentation**: `docs/LEBANON_GOLD_API.md`
- **Implementation Guide**: `docs/LEBANON_GOLD_IMPLEMENTATION.md`
- **End-to-End Setup**: `docs/END_TO_END_SETUP.md`
- **Netlify Functions Docs**: https://docs.netlify.com/functions/overview/
- **Vercel Functions Docs**: https://vercel.com/docs/functions

---

**Last Updated:** 2026-01-17
**Status:** Ready for Deployment ✅
