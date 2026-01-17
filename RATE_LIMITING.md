# Rate Limiting & Automation Setup

## ✅ Fully Automated with Multiple Rate Limit Protections

Your site is now set up for **automatic periodic fetching** while **respecting all rate limits** to avoid being blocked.

## Rate Limiting Layers

### 1. **File-Based Rate Limiting** (Primary Protection)
- Checks `data/rates.json` file modification time
- **Minimum 60 seconds** between fetches (even across different processes)
- Prevents hitting the source site too frequently
- Works across different runs, servers, and automated systems

### 2. **In-Memory Cache** (Same Process Protection)
- For multiple calls within the same Node.js process
- **60-second cache** prevents redundant requests
- Useful during development/testing

### 3. **Retry Logic with Exponential Backoff**
- Maximum **3 retry attempts** on failure
- **Exponential backoff**: 2s, 4s delays between retries
- Prevents overwhelming the server on temporary failures
- Gracefully falls back to cached data

### 4. **GitHub Actions Time Check**
- Checks file age before running fetch
- Skips fetch if data is less than 60 seconds old
- Prevents duplicate work if multiple workflows run

### 5. **Random Delays**
- **0-30 second random delay** before each fetch
- Spreads out automated requests
- Prevents all instances from hitting simultaneously

## Automation Schedule

- **GitHub Actions**: Runs every **30 minutes** automatically
- Can also be **manually triggered** from GitHub Actions tab
- Schedule can be adjusted in `.github/workflows/update-rates.yml`

## How It Works

1. **GitHub Actions** triggers every 30 minutes
2. Checks if `data/rates.json` exists and is older than 60 seconds
3. If yes, adds random 0-30s delay, then fetches
4. Scraper checks file timestamp again (double protection)
5. If fetch fails, retries up to 3 times with exponential backoff
6. Updates data file and builds site
7. Commits and pushes changes if data updated

## Rate Limit Settings

All settings are in `scripts/fetch-data.js`:

```javascript
const MIN_CACHE_SECONDS = 60;      // Minimum between requests
const MAX_FETCH_ATTEMPTS = 3;      // Max retries
const RETRY_DELAY_MS = 2000;       // Base retry delay (2s, 4s, 8s...)
```

## Adjusting Frequency

### Change GitHub Actions Schedule

Edit `.github/workflows/update-rates.yml`:

```yaml
schedule:
  - cron: '*/15 * * * *'   # Every 15 minutes
  - cron: '0 * * * *'      # Every hour
  - cron: '0 */2 * * *'    # Every 2 hours
```

### Change Minimum Cache Time

Edit `scripts/fetch-data.js`:

```javascript
const MIN_CACHE_SECONDS = 120;  // 2 minutes instead of 60 seconds
```

## Monitoring

- Check GitHub Actions tab for run logs
- Look for messages:
  - `⏭ Skipping fetch` = Rate limit protection working
  - `✓ Successfully fetched` = Data updated
  - `⚠ Using cached` = Fallback to old data (expected if fetch fails)

## Best Practices

✅ **Current Setup:**
- 30-minute schedule is reasonable (48 requests/day)
- 60-second minimum prevents rapid-fire requests
- Multiple fallback layers ensure data is always available

⚠️ **Recommendations:**
- Don't set schedule faster than 15 minutes
- Don't reduce `MIN_CACHE_SECONDS` below 60 seconds
- Monitor for any blocking/rate limit errors in logs

## Troubleshooting

**If you see rate limit errors:**
1. Increase `MIN_CACHE_SECONDS` to 120 or 300
2. Increase GitHub Actions schedule interval
3. Check LiraRate.org for any announced rate limits

**If automation isn't running:**
1. Check GitHub Actions tab for workflow runs
2. Ensure repository is pushed to GitHub
3. Verify workflow file is in `.github/workflows/` directory

## Manual Override

To force a fetch (ignoring rate limits):

```bash
# Edit fetch-data.js temporarily to add forceRefresh = true
# Or manually delete data/rates.json and run:
npm run fetch-data
```
