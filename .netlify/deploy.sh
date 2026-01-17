#!/bin/bash
# Pre-deploy script for Netlify
# Ensures data files exist before deployment

echo "📦 Preparing for Netlify deployment..."

# Create data directory if it doesn't exist
mkdir -p data

# Ensure lebanon-gold.json exists (even if empty)
if [ ! -f "data/lebanon-gold.json" ]; then
  echo '{"source":"lebanor","fetchedAt":"'"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"'","items":[]}' > data/lebanon-gold.json
  echo "✅ Created data/lebanon-gold.json"
fi

# Ensure rates.json exists (needed for USD conversion)
if [ ! -f "data/rates.json" ]; then
  echo '{"usd":{"rate":89550,"buy":89700,"sell":89400},"eur":{"rate":103886}}' > data/rates.json
  echo "✅ Created data/rates.json"
fi

echo "✅ Pre-deployment setup complete!"
