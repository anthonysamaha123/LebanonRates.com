# LebanonRates.com

A multilingual Lebanon Daily Rates Tracker aggregating real-time Lebanese Lira exchange rates, fuel and gold prices.

## Setup

```bash
npm install
```

## Build

```bash
npm run build
```

This will:
1. Fetch latest data from sources
2. Generate all static pages from templates
3. Output to `dist/` directory

## Development

```bash
npm run dev
```

## Data Sources

- Currency rates: Multiple sources (LiraRate, LIMS, etc.)
- Fuel prices: Ministry of Energy and Water
- Gold prices: International gold price APIs converted to LBP

## Structure

- `templates/` - HTML templates for all page types
- `scripts/` - Data fetching and build scripts
- `src/` - Static assets (CSS, JS)
- `dist/` - Generated static site (deploy this)
- `data/` - Cached data files