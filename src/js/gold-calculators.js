/**
 * Gold Calculators
 * Handles all calculator widgets: grams to value, budget to grams, holdings, etc.
 */

(function() {
  'use strict';
  
  // Karat purity ratios (relative to 24k)
  const KARAT_RATIOS = {
    '24k': 1.0,
    '22k': 0.9167,
    '21k': 0.875,
    '20k': 0.8333,
    '18k': 0.75,
    '14k': 0.5833
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    initGramCalculator();
    initBudgetCalculator();
    initHoldingsCalculator();
    initKaratCompare();
    initPresetButtons();
  }
  
  /**
   * Gram to value calculator
   */
  function initGramCalculator() {
    const form = document.getElementById('gram-calculator-form');
    if (!form) return;
    
    const gramsInput = form.querySelector('[name="grams"]');
    const karatSelect = form.querySelector('[name="karat"]');
    const resultDiv = form.querySelector('.calculator-result');
    
    function calculate() {
      const grams = parseFloat(gramsInput.value) || 0;
      const karat = karatSelect.value;
      
      if (grams <= 0) {
        resultDiv.innerHTML = '<p>Enter grams > 0</p>';
        return;
      }
      
      // Get current price per gram for this karat
      const pricePerGram = getPricePerGram(karat);
      if (!pricePerGram) {
        resultDiv.innerHTML = '<p>Price data not available</p>';
        return;
      }
      
      const valueUsd = grams * pricePerGram.usd;
      const valueLbp = grams * pricePerGram.lbp;
      
      const usdRate = getUSDRate();
      const valueLbpCalculated = usdRate ? valueUsd * usdRate : valueLbp;
      
      resultDiv.innerHTML = `
        <div class="result-value">
          <div class="result-main">$${valueUsd.toFixed(2)} USD</div>
          <div class="result-secondary">${Math.round(valueLbpCalculated).toLocaleString()} LBP</div>
        </div>
        <div class="result-detail">
          ${grams}g of ${karat} gold
        </div>
      `;
    }
    
    gramsInput.addEventListener('input', calculate);
    karatSelect.addEventListener('change', calculate);
    
    // Initial calculation
    calculate();
  }
  
  /**
   * Budget to grams calculator
   */
  function initBudgetCalculator() {
    const form = document.getElementById('budget-calculator-form');
    if (!form) return;
    
    const amountInput = form.querySelector('[name="amount"]');
    const currencySelect = form.querySelector('[name="currency"]');
    const karatSelect = form.querySelector('[name="karat"]');
    const resultDiv = form.querySelector('.calculator-result');
    
    function calculate() {
      const amount = parseFloat(amountInput.value) || 0;
      const currency = currencySelect.value;
      const karat = karatSelect.value;
      
      if (amount <= 0) {
        resultDiv.innerHTML = '<p>Enter amount > 0</p>';
        return;
      }
      
      const pricePerGram = getPricePerGram(karat);
      if (!pricePerGram) {
        resultDiv.innerHTML = '<p>Price data not available</p>';
        return;
      }
      
      let grams;
      if (currency === 'usd') {
        grams = amount / pricePerGram.usd;
      } else {
        const usdRate = getUSDRate();
        if (!usdRate) {
          resultDiv.innerHTML = '<p>Exchange rate not available</p>';
          return;
        }
        const amountUsd = amount / usdRate;
        grams = amountUsd / pricePerGram.usd;
      }
      
      resultDiv.innerHTML = `
        <div class="result-value">
          <div class="result-main">${grams.toFixed(3)}g</div>
          <div class="result-secondary">${karat} gold</div>
        </div>
        <div class="result-detail">
          You can buy ${grams.toFixed(3)}g with ${currency === 'usd' ? '$' : ''}${amount.toLocaleString()}${currency === 'lbp' ? ' LBP' : ''}
        </div>
      `;
    }
    
    amountInput.addEventListener('input', calculate);
    currencySelect.addEventListener('change', calculate);
    karatSelect.addEventListener('change', calculate);
    
    // Initial calculation
    calculate();
  }
  
  /**
   * Holdings calculator
   */
  function initHoldingsCalculator() {
    const form = document.getElementById('holdings-calculator-form');
    if (!form) return;
    
    const grams21kInput = form.querySelector('[name="grams21k"]');
    const grams18kInput = form.querySelector('[name="grams18k"]');
    const liraCoinsInput = form.querySelector('[name="liraCoins"]');
    const resultDiv = form.querySelector('.calculator-result');
    
    function calculate() {
      const grams21k = parseFloat(grams21kInput.value) || 0;
      const grams18k = parseFloat(grams18kInput.value) || 0;
      const liraCoins = parseFloat(liraCoinsInput.value) || 0;
      
      const price21k = getPricePerGram('21k');
      const price18k = getPricePerGram('18k');
      const priceLira = getLiraPrice();
      
      if (!price21k || !price18k || !priceLira) {
        resultDiv.innerHTML = '<p>Price data not available</p>';
        return;
      }
      
      const value21kUsd = grams21k * price21k.usd;
      const value18kUsd = grams18k * price18k.usd;
      const valueLiraUsd = liraCoins * priceLira.usd;
      
      const totalUsd = value21kUsd + value18kUsd + valueLiraUsd;
      
      const usdRate = getUSDRate();
      const totalLbp = usdRate ? totalUsd * usdRate : 
        (grams21k * price21k.lbp) + (grams18k * price18k.lbp) + (liraCoins * priceLira.lbp);
      
      resultDiv.innerHTML = `
        <div class="result-value">
          <div class="result-main">$${totalUsd.toFixed(2)} USD</div>
          <div class="result-secondary">${Math.round(totalLbp).toLocaleString()} LBP</div>
        </div>
        <div class="result-detail">
          <div>21k: ${grams21k}g = $${value21kUsd.toFixed(2)}</div>
          <div>18k: ${grams18k}g = $${value18kUsd.toFixed(2)}</div>
          <div>Lira coins: ${liraCoins} = $${valueLiraUsd.toFixed(2)}</div>
        </div>
      `;
    }
    
    grams21kInput.addEventListener('input', calculate);
    grams18kInput.addEventListener('input', calculate);
    liraCoinsInput.addEventListener('input', calculate);
    
    // Initial calculation
    calculate();
  }
  
  /**
   * Karat comparison table
   */
  function initKaratCompare() {
    const table = document.getElementById('karat-compare-table');
    if (!table) return;
    
    const price24k = getPricePerGram('24k');
    if (!price24k) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    Object.entries(KARAT_RATIOS).forEach(([karat, ratio]) => {
      const priceUsd = price24k.usd * ratio;
      const usdRate = getUSDRate();
      const priceLbp = usdRate ? priceUsd * usdRate : price24k.lbp * ratio;
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${karat}</strong></td>
        <td>${(ratio * 100).toFixed(2)}%</td>
        <td>$${priceUsd.toFixed(2)}</td>
        <td>${Math.round(priceLbp).toLocaleString()} LBP</td>
      `;
      tbody.appendChild(row);
    });
  }
  
  /**
   * Preset buttons (1g, 5g, 10g, 20g)
   */
  function initPresetButtons() {
    document.querySelectorAll('.preset-gram-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const grams = parseFloat(this.dataset.grams);
        const karat = this.dataset.karat || '21k';
        
        // Set values in gram calculator
        const gramsInput = document.querySelector('#gram-calculator-form [name="grams"]');
        const karatSelect = document.querySelector('#gram-calculator-form [name="karat"]');
        
        if (gramsInput) gramsInput.value = grams;
        if (karatSelect) karatSelect.value = karat;
        
        // Trigger calculation
        if (gramsInput) gramsInput.dispatchEvent(new Event('input'));
      });
    });
  }
  
  /**
   * Get price per gram for a karat
   */
  function getPricePerGram(karat) {
    const key = `gold_${karat}_1g_buy`;
    const item = window.goldData?.items?.find(i => i.key === key);
    
    if (item && item.priceUsd) {
      const usdRate = getUSDRate();
      return {
        usd: item.priceUsd,
        lbp: item.priceLbp || (usdRate ? item.priceUsd * usdRate : null)
      };
    }
    
    // Fallback: calculate from 24k
    const price24k = getPricePerGram('24k');
    if (price24k && KARAT_RATIOS[karat]) {
      const ratio = KARAT_RATIOS[karat];
      const usdRate = getUSDRate();
      return {
        usd: price24k.usd * ratio,
        lbp: usdRate ? price24k.usd * ratio * usdRate : price24k.lbp * ratio
      };
    }
    
    return null;
  }
  
  /**
   * Get lira coin price
   */
  function getLiraPrice() {
    const item = window.goldData?.items?.find(i => i.key === 'gold_lira_8g_buy');
    if (item && item.priceUsd) {
      const usdRate = getUSDRate();
      return {
        usd: item.priceUsd,
        lbp: item.priceLbp || (usdRate ? item.priceUsd * usdRate : null)
      };
    }
    return null;
  }
  
  /**
   * Get USD rate from page
   */
  function getUSDRate() {
    const rateEl = document.querySelector('[data-usd-rate]');
    if (rateEl) {
      return parseFloat(rateEl.dataset.usdRate);
    }
    return null;
  }
  
  // Expose for external use
  window.goldCalculators = {
    getPricePerGram,
    getLiraPrice,
    getUSDRate,
    KARAT_RATIOS
  };
})();
