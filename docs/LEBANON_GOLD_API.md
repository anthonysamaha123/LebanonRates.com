# Lebanon Gold Prices API

Production-ready data fetch layer and API for Lebanon-local gold prices from Lebanor.com.

## Architecture

### Components

1. **Fetcher Module** (`scripts/fetch-lebanon-gold.js`)
   - Standalone module for fetching and normalizing gold prices
   - Built-in caching with stale-while-revalidate
   - Retry logic and error handling

2. **API Endpoint** (`netlify/functions/lebanon-gold.js`)
   - Serverless function for Netlify/Vercel
   - GET `/api/lebanon-gold`
   - Proper cache headers

3. **UI Component** (`templates/components/lebanon-gold-table.html`)
   - Standalone component for displaying gold prices
   - Supports both static (build-time) and dynamic (API) rendering

## API Endpoint

### GET `/api/lebanon-gold`

Returns normalized Lebanon gold prices.

**Query Parameters:**
- `refresh=true` - Force fresh fetch (ignores cache)

**Response Schema:**
```json
{
  "source": "lebanor",
  "fetchedAt": "2026-01-17T12:00:00.000Z",
  "items": [
    {
      "key": "gold_14k_1g_buy",
      "label": "We Buy 1g Gold 14 Karat",
      "priceLbp": 52000,
      "priceUsd": 0.58,
      "rawName": "We Buy 1g Gold 14 Karat",
      "rawPrice": "52,000"
    },
    {
      "key": "gold_18k_1g_buy",
      "label": "We Buy 1g Gold 18 karat",
      "priceLbp": 67000,
      "priceUsd": 0.75,
      "rawName": "We Buy 1g Gold 18 karat",
      "rawPrice": "67,000"
    },
    {
      "key": "gold_21k_1g_buy",
      "label": "We Buy 1g Gold 21 Karat",
      "priceLbp": 78000,
      "priceUsd": 0.87,
      "rawName": "We Buy 1g Gold 21 Karat",
      "rawPrice": "78,000"
    },
    {
      "key": "gold_24k_1g_buy",
      "label": "We Buy 1g Gold 24 Karat",
      "priceLbp": 89000,
      "priceUsd": 0.99,
      "rawName": "We Buy 1g Gold 24 Karat",
      "rawPrice": "89,000"
    },
    {
      "key": "gold_lira_8g_buy",
      "label": "We Buy Gold Coin 8g (LIRA)",
      "priceLbp": 712000,
      "priceUsd": 7.95,
      "rawName": "We Buy Gold Coin 8g (LIRA)",
      "rawPrice": "712,000"
    },
    {
      "key": "silver_999_1g_buy",
      "label": "We Buy 1g Silver 999",
      "priceLbp": 1200,
      "priceUsd": 0.01,
      "rawName": "We Buy 1g Silver 999",
      "rawPrice": "1,200"
    }
  ]
}
```

**Response Headers:**
```
Cache-Control: public, max-age=60, stale-while-revalidate=600
Content-Type: application/json
Access-Control-Allow-Origin: *
```

## Usage

### Command Line

```bash
# Fetch and display gold prices
node scripts/fetch-lebanon-gold.js

# Fetch and save to cache
node scripts/fetch-lebanon-gold.js > /dev/null
```

### In Code

```javascript
const { fetchLebanonGold, getCachedLebanonGold } = require('./scripts/fetch-lebanon-gold');

// Fetch fresh data (respects cache)
const data = await fetchLebanonGold(false, usdRate);

// Get cached data only (no fetch)
const cached = getCachedLebanonGold();
```

### API Call

```javascript
// Fetch from API endpoint
const response = await fetch('/api/lebanon-gold');
const data = await response.json();

// Force refresh
const response = await fetch('/api/lebanon-gold?refresh=true');
const data = await response.json();
```

### UI Component

Include in template:
```html
<!-- Static version (requires lebanonGold data in build) -->
{{> lebanon-gold-table lebanonGold=lebanonGold }}

<!-- Dynamic version (fetches from API) -->
<div id="lebanon-gold-dynamic"></div>
<script src="/components/lebanon-gold-table.html"></script>
```

## Caching Strategy

### Cache TTL
- **Fresh cache**: 60 seconds
- **Stale cache**: 600 seconds (10 minutes)
- **Cache file**: `data/lebanon-gold.json`

### Stale-While-Revalidate
1. If cache is fresh (< 60s), return immediately
2. If cache is stale (< 600s), return stale data and refresh in background
3. If cache is expired (> 600s), fetch fresh data

## Error Handling

### Retry Logic
- **Max attempts**: 3 (initial + 2 retries)
- **Retry delay**: 2s, 4s (exponential backoff)
- **Timeout**: 15 seconds

### Fallback Behavior
1. Try to fetch fresh data
2. If all retries fail, return stale cache (if available)
3. If no cache, return 503 error

## Rate Limiting Considerations

### Headers Sent
- `User-Agent`: Browser-like user agent
- `Referer`: `https://lebanor.com/`
- `Origin`: `https://lebanor.com/`
- `X-Requested-With`: `XMLHttpRequest`

### Recommendations
- **Respect minimum 60-second cache** (already enforced)
- **Use stale-while-revalidate** to minimize requests
- **Monitor for 429/503 responses** and adjust rate limiting

## Monitoring

### Metrics to Track
1. **API response time**
2. **Cache hit/miss ratio**
3. **Error rate** (timeouts, 429s, 503s)
4. **Data freshness** (time since last successful fetch)

### Logging
- Success: `✓ Successfully fetched Lebanon gold prices`
- Cache hits: `✓ Using fresh cached Lebanon gold data`
- Errors: `❌ All attempts failed`

## Deployment

### Netlify
1. Ensure `netlify/functions/` directory exists
2. Function will be available at `/api/lebanon-gold`
3. Set timeout: 10 seconds (default)
4. Set memory: 128 MB (default)

### Vercel
1. Move function to `api/lebanon-gold.js`
2. Update export to default export
3. Function will be available at `/api/lebanon-gold`

### Other Platforms
- Adapt serverless function to platform's format
- Ensure Node.js 18+ runtime
- Set appropriate timeout and memory limits

## Testing

### Manual Test
```bash
# Test fetcher directly
node scripts/fetch-lebanon-gold.js

# Test API locally (requires Netlify CLI)
netlify dev
curl http://localhost:8888/api/lebanon-gold
```

### Integration Test
```javascript
const { fetchLebanonGold } = require('./scripts/fetch-lebanon-gold');

test('fetches and normalizes gold prices', async () => {
  const data = await fetchLebanonGold(true); // Force fresh
  
  expect(data.source).toBe('lebanor');
  expect(data.items).toHaveLength(6);
  expect(data.items[0].key).toBe('gold_14k_1g_buy');
  expect(data.items[0].priceLbp).toBeGreaterThan(0);
});
```

## Data Schema

### Item Keys
- `gold_14k_1g_buy` - 14 Karat gold per gram
- `gold_18k_1g_buy` - 18 Karat gold per gram
- `gold_21k_1g_buy` - 21 Karat gold per gram
- `gold_24k_1g_buy` - 24 Karat gold per gram
- `gold_lira_8g_buy` - 8g Lira gold coin
- `silver_999_1g_buy` - 999 Silver per gram

### Price Fields
- `priceLbp`: Price in Lebanese Pounds (integer)
- `priceUsd`: Price in USD (float, 2 decimals, null if USD rate unavailable)
- `rawName`: Original name from API
- `rawPrice`: Original price string from API
