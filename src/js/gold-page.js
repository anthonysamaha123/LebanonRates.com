/**
 * Gold Page Client-Side Functionality
 * Handles copy, share, screenshot mode, pinned karat, and real-time updates
 */

(function() {
  'use strict';
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    initCopyButtons();
    initShareButtons();
    initScreenshotMode();
    initPinnedKarat();
    initRealTimeUpdates();
  }
  
  /**
   * Copy buttons for each price
   */
  function initCopyButtons() {
    document.querySelectorAll('.copy-price-btn').forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.preventDefault();
        const row = this.closest('tr') || this.closest('.price-row');
        if (!row) return;
        
        const usdPrice = row.querySelector('[data-price-usd]')?.textContent?.trim() || '';
        const lbpPrice = row.querySelector('[data-price-lbp]')?.textContent?.trim() || '';
        const label = row.querySelector('[data-label]')?.textContent?.trim() || '';
        
        const text = `${label}: ${usdPrice} / ${lbpPrice}`;
        
        try {
          await navigator.clipboard.writeText(text);
          showToast('Copied to clipboard!');
          this.classList.add('copied');
          setTimeout(() => this.classList.remove('copied'), 2000);
        } catch (err) {
          // Fallback for older browsers
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            showToast('Copied to clipboard!');
            this.classList.add('copied');
            setTimeout(() => this.classList.remove('copied'), 2000);
          } catch (e) {
            showToast('Failed to copy', 'error');
          }
          document.body.removeChild(textarea);
        }
      });
    });
  }
  
  /**
   * Share buttons (WhatsApp, Telegram, etc.)
   */
  function initShareButtons() {
    // WhatsApp share
    document.querySelectorAll('.whatsapp-share-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const row = this.closest('tr') || this.closest('.price-row');
        if (!row) return;
        
        const usdPrice = row.querySelector('[data-price-usd]')?.textContent?.trim() || '';
        const lbpPrice = row.querySelector('[data-price-lbp]')?.textContent?.trim() || '';
        const label = row.querySelector('[data-label]')?.textContent?.trim() || '';
        const timestamp = document.querySelector('[data-last-updated]')?.textContent?.trim() || '';
        
        const message = encodeURIComponent(
          `💰 ${label}\n` +
          `USD: ${usdPrice}\n` +
          `LBP: ${lbpPrice}\n` +
          `${timestamp}\n` +
          `Source: LebanonRates.com`
        );
        
        window.open(`https://wa.me/?text=${message}`, '_blank');
      });
    });
    
    // Telegram share
    document.querySelectorAll('.telegram-share-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const row = this.closest('tr') || this.closest('.price-row');
        if (!row) return;
        
        const usdPrice = row.querySelector('[data-price-usd]')?.textContent?.trim() || '';
        const lbpPrice = row.querySelector('[data-price-lbp]')?.textContent?.trim() || '';
        const label = row.querySelector('[data-label]')?.textContent?.trim() || '';
        const timestamp = document.querySelector('[data-last-updated]')?.textContent?.trim() || '';
        
        const message = encodeURIComponent(
          `💰 ${label}\n` +
          `USD: ${usdPrice}\n` +
          `LBP: ${lbpPrice}\n` +
          `${timestamp}\n` +
          `Source: LebanonRates.com`
        );
        
        window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${message}`, '_blank');
      });
    });
    
    // Copy clean summary
    document.querySelectorAll('.copy-summary-btn').forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const prices = [];
        document.querySelectorAll('.price-row, .lebanon-gold-row').forEach(row => {
          const label = row.querySelector('[data-label]')?.textContent?.trim() || '';
          const usdPrice = row.querySelector('[data-price-usd]')?.textContent?.trim() || '';
          const lbpPrice = row.querySelector('[data-price-lbp]')?.textContent?.trim() || '';
          if (label && (usdPrice || lbpPrice)) {
            prices.push(`${label}: ${usdPrice} / ${lbpPrice}`);
          }
        });
        
        const timestamp = document.querySelector('[data-last-updated]')?.textContent?.trim() || '';
        const summary = prices.join('\n') + '\n\n' + timestamp;
        
        try {
          await navigator.clipboard.writeText(summary);
          showToast('Summary copied!');
        } catch (err) {
          showToast('Failed to copy', 'error');
        }
      });
    });
  }
  
  /**
   * Screenshot mode toggle
   */
  function initScreenshotMode() {
    const toggle = document.getElementById('screenshot-mode-toggle');
    if (!toggle) return;
    
    toggle.addEventListener('change', function() {
      document.body.classList.toggle('screenshot-mode', this.checked);
      localStorage.setItem('screenshotMode', this.checked ? 'true' : 'false');
    });
    
    // Restore state
    if (localStorage.getItem('screenshotMode') === 'true') {
      toggle.checked = true;
      document.body.classList.add('screenshot-mode');
    }
  }
  
  /**
   * Pinned karat selector
   */
  function initPinnedKarat() {
    const selector = document.getElementById('pinned-karat-selector');
    if (!selector) return;
    
    // Restore from localStorage
    const saved = localStorage.getItem('pinnedKarat') || '21k';
    selector.value = saved;
    updatePinnedKarat(saved);
    
    selector.addEventListener('change', function() {
      const karat = this.value;
      localStorage.setItem('pinnedKarat', karat);
      updatePinnedKarat(karat);
    });
  }
  
  function updatePinnedKarat(karat) {
    // Remove all pinned classes
    document.querySelectorAll('.pinned-karat').forEach(el => {
      el.classList.remove('pinned-karat');
    });
    
    // Add pinned class to matching rows
    const selector = `[data-karat="${karat}"], [data-karat*="${karat}"]`;
    document.querySelectorAll(selector).forEach(el => {
      el.classList.add('pinned-karat');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
  
  /**
   * Real-time LBP conversion updates
   */
  function initRealTimeUpdates() {
    // Fetch latest USD rate and update LBP prices
    const updateInterval = 5 * 60 * 1000; // 5 minutes
    
    function updateRates() {
      // Try to get rate from page data
      const rateData = document.querySelector('[data-usd-rate]');
      if (!rateData) return;
      
      const usdRate = parseFloat(rateData.dataset.usdRate);
      if (!usdRate || isNaN(usdRate)) return;
      
      // Update all USD prices to LBP
      document.querySelectorAll('[data-price-usd]').forEach(el => {
        const usdPrice = parseFloat(el.dataset.priceUsd);
        if (usdPrice && !isNaN(usdPrice)) {
          const lbpPrice = Math.round(usdPrice * usdRate);
          const lbpEl = el.closest('tr')?.querySelector('[data-price-lbp]') || 
                        el.closest('.price-row')?.querySelector('[data-price-lbp]');
          if (lbpEl) {
            lbpEl.textContent = lbpPrice.toLocaleString() + ' LBP';
            lbpEl.dataset.priceLbp = lbpPrice;
          }
        }
      });
    }
    
    // Update on load
    updateRates();
    
    // Update periodically
    setInterval(updateRates, updateInterval);
  }
  
  /**
   * Show toast notification
   */
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
  }
})();
