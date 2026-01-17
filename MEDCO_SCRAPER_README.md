# MEDCO Fuel Prices Scraper

Production-ready scraper for MEDCO's "Today fuel prices" from [medco.com.lb](https://medco.com.lb/). Returns normalized JSON data with caching, retries, and error handling.

## Features

- ✅ Resilient HTML parsing (DOM-based with regex fallback)
- ✅ 5-minute in-memory and file caching
- ✅ Automatic retries (max 2 attempts)
- ✅ Request timeouts and error handling
- ✅ Never crashes - always returns JSON
- ✅ Custom User-Agent for politeness
- ✅ Unit tests with HTML fixtures

## Installation

```bash
npm install
```

## Running Locally

### Start the API server:

```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `PORT` environment variable).

### Test the endpoint:

```bash
curl http://localhost:3000/api/medco/fuel-prices
```

### Health check:

```bash
curl http://localhost:3000/health
```

## API Endpoint

### `GET /api/medco/fuel-prices`

Returns MEDCO fuel prices in JSON format.

**Query Parameters:**
- `cache` (optional): Set to `false` to bypass cache and force fresh fetch

**Response Format:**

```json
{
  "ok": true,
  "from_cache": false,
  "source_url": "https://medco.com.lb/",
  "fetched_at_iso": "2026-01-17T12:00:00.000Z",
  "unl95_lbp": 1312000,
  "unl98_lbp": 1352000,
  "lpg10kg_lbp": 1197000,
  "diesel_note": "Transportation + $627.67 USD/1000 lts"
}
```

**Fields:**
- `ok`: Boolean indicating success
- `from_cache`: Boolean indicating if response came from cache
- `source_url`: Source website URL
- `fetched_at_iso`: ISO 8601 timestamp of when data was fetched
- `unl95_lbp`: UNL 95 price in LBP (integer, null if not found)
- `unl98_lbp`: UNL 98 price in LBP (integer, null if not found)
- `lpg10kg_lbp`: LPG 10 KG price in LBP (integer, null if not found)
- `diesel_note`: Diesel Oil note text (string, null if not found)

**Error Response:**

```json
{
  "ok": false,
  "from_cache": false,
  "source_url": "https://medco.com.lb/",
  "fetched_at_iso": "2026-01-17T12:00:00.000Z",
  "error": "Error message here",
  "unl95_lbp": null,
  "unl98_lbp": null,
  "lpg10kg_lbp": null,
  "diesel_note": null
}
```

## Testing

Run unit tests:

```bash
npm test
```

Tests use a saved HTML fixture (`fixtures/medco_home.html`) to test parsing logic without hitting the live website.

## Deployment

### Simple Node.js Server

1. **Environment Variables:**
   ```bash
   export PORT=3000
   ```

2. **Start with PM2 (recommended for production):**
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name medco-scraper
   pm2 save
   pm2 startup
   ```

3. **Or use systemd service:**
   Create `/etc/systemd/system/medco-scraper.service`:
   ```ini
   [Unit]
   Description=MEDCO Fuel Prices Scraper
   After=network.target

   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/path/to/LebanonRates.com
   ExecStart=/usr/bin/node src/server.js
   Restart=always
   RestartSec=10
   Environment=PORT=3000

   [Install]
   WantedBy=multi-user.target
   ```

   Then:
   ```bash
   sudo systemctl enable medco-scraper
   sudo systemctl start medco-scraper
   ```

4. **Reverse Proxy (Nginx):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location /api/medco {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3000
CMD ["node", "src/server.js"]
```

Build and run:
```bash
docker build -t medco-scraper .
docker run -p 3000:3000 medco-scraper
```

## Python Alternative

A Python version is available at `scripts/scrape_medco.py`.

**Requirements:**
```bash
pip install requests beautifulsoup4
```

**Usage:**
```bash
python scripts/scrape_medco.py
```

Or use as a module:
```python
from scripts.scrape_medco import fetch_medco_fuel_prices
result = fetch_medco_fuel_prices()
print(result)
```

## Architecture

### File Structure

```
├── src/
│   ├── parseMedco.js      # HTML parsing logic
│   ├── scrapeMedco.js     # Fetching, caching, retries
│   └── server.js          # Express API server
├── test/
│   └── parseMedco.test.js # Unit tests
├── fixtures/
│   └── medco_home.html    # HTML fixture for testing
├── scripts/
│   └── scrape_medco.py    # Python alternative
└── package.json
```

### Parsing Strategy

1. **Primary:** DOM-based parsing using Cheerio
   - Find "Today fuel prices" section
   - Extract values from nearby elements
   
2. **Fallback:** Regex patterns on full text
   - Patterns: `UNL\s*95\s*([0-9,]+)\s*LBP`, etc.
   - Handles variations in spacing and formatting

### Caching

- **In-memory cache:** 5-minute TTL
- **File cache:** Stored in `.cache/medco-fuel-prices.json`
- Cache is checked before fetching
- Expired cache is returned if fresh fetch fails

### Error Handling

- All errors are caught and logged
- Server never crashes
- Always returns JSON (even on errors)
- Falls back to cached data if available
- Retries up to 2 times with 2-second delays

## Example Output

```json
{
  "ok": true,
  "from_cache": false,
  "source_url": "https://medco.com.lb/",
  "fetched_at_iso": "2026-01-17T12:00:00.000Z",
  "unl95_lbp": 1312000,
  "unl98_lbp": 1352000,
  "lpg10kg_lbp": 1197000,
  "diesel_note": "Transportation + $627.67 USD/1000 lts"
}
```

## License

MIT
