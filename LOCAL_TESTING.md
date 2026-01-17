# Local Testing Guide

## ✅ Yes! You Should See Changes on Localhost

After running the build, you can test all the new features locally.

## 🚀 Quick Start

### Option 1: Using npm dev script (Recommended)
```bash
npm run dev
```
This will:
1. Build the site (`npm run build`)
2. Start a local server (usually on port 3000)
3. Open: http://localhost:3000

### Option 2: Manual Build + Serve
```bash
# Build the site
npm run build

# Serve the dist folder
npx serve dist
# Or use Python
python3 -m http.server 8000 --directory dist
```

## 📍 URLs to Test Locally

### Main Pages:
- **Home:** http://localhost:3000/
- **Gold Page:** http://localhost:3000/gold-price-lebanon.html
- **USD/LBP:** http://localhost:3000/usd-lbp-today.html
- **Fuel:** http://localhost:3000/fuel-prices-today.html

### New SEO Pages (Examples):
- **21K Gold:** http://localhost:3000/gold-price-lebanon-21k.html
- **18K Gold:** http://localhost:3000/gold-price-lebanon-18k.html
- **24K Gold:** http://localhost:3000/gold-price-lebanon-24k.html
- **Gold Calculator:** http://localhost:3000/gold-calculator-lebanon.html

### Arabic Pages:
- **Gold (Arabic):** http://localhost:3000/ar/gold-price-lebanon.html
- **21K (Arabic):** http://localhost:3000/ar/سعر-الذهب-عيار-21.html

### French Pages:
- **Gold (French):** http://localhost:3000/fr/gold-price-lebanon.html
- **21K (French):** http://localhost:3000/fr/prix-or-21-carats-liban.html

## ✅ Features to Test

### On Gold Page (`/gold-price-lebanon.html`):

1. **Answer Snippet** (top of page)
   - Should show: "1g 21k Gold (We Buy) Today: $X.XX USD / X,XXX LBP"

2. **Page Controls**
   - Screenshot mode toggle
   - Pinned karat selector

3. **Gold Price Table**
   - Copy button (📋) - should copy price
   - WhatsApp share (💬) - should open WhatsApp
   - Telegram share (✈️) - should open Telegram
   - Arabic aliases next to karat names

4. **Gold Calculators**
   - Gram to value calculator
   - Budget to grams calculator
   - Holdings calculator
   - Quick preset buttons

5. **Price Units Section**
   - Ounce, 100g, 1kg, Tola prices
   - Half/quarter gram prices
   - Derived estimates (22k/20k)

6. **History Section**
   - 24h change, 7d/30d high/low
   - Volatility badges
   - Best time today

7. **FAQ Section**
   - 5-7 FAQ entries
   - Expandable answers

8. **Cross Links**
   - Links to USD, Fuel, Converter pages

9. **Today Widget**
   - Shows USD/LBP, 21K, Lira, Fuel prices

10. **Price Alerts**
    - Email alert form
    - Telegram channel link
    - Watch 21k button

## 🔍 What to Check

### Browser Console:
- Open DevTools (F12)
- Check for JavaScript errors
- Verify all JS files load:
  - `/js/gold-page.js`
  - `/js/gold-calculators.js`
  - `/js/gold-history.js`
  - `/js/gold-sharing.js`

### Network Tab:
- Verify all assets load (CSS, JS, images)
- Check for 404 errors

### Functionality:
- ✅ Copy buttons work
- ✅ Share buttons open correct URLs
- ✅ Calculators calculate correctly
- ✅ Price units display
- ✅ Screenshot mode hides UI elements
- ✅ Pinned karat highlights correctly

## 🐛 Troubleshooting

### Pages Not Loading:
```bash
# Rebuild
npm run build

# Check dist folder
ls -la dist/
```

### JavaScript Not Working:
- Check browser console for errors
- Verify files exist: `ls -la dist/js/`
- Check file paths in HTML

### Styles Not Loading:
- Verify CSS file exists: `ls -la dist/css/`
- Check browser Network tab

### No Data Showing:
- Run data fetch: `npm run fetch-data`
- Rebuild: `npm run build`

## 📊 Expected Results

After running `npm run dev`:
- ✅ Server starts on port 3000 (or similar)
- ✅ All pages accessible
- ✅ All JavaScript files load
- ✅ All styles apply
- ✅ All features functional

## 🎯 Quick Test Checklist

- [ ] Home page loads
- [ ] Gold page loads with new features
- [ ] Copy button works
- [ ] Share buttons work
- [ ] Calculators work
- [ ] Price units display
- [ ] SEO pages load (21k, 18k, etc.)
- [ ] Arabic pages load
- [ ] French pages load
- [ ] No console errors
- [ ] All assets load

---

**If you see the changes locally, they'll work on Netlify too!**
