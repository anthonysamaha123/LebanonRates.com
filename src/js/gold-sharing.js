/**
 * Gold Sharing Functionality
 * Handles WhatsApp, Telegram, and copy summary sharing
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
    // Sharing is handled in gold-page.js, this file is for additional sharing features
    initArabicWhatsApp();
  }
  
  /**
   * Arabic WhatsApp message template
   */
  function initArabicWhatsApp() {
    document.querySelectorAll('.whatsapp-share-ar-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const row = this.closest('tr') || this.closest('.price-row');
        if (!row) return;
        
        const usdPrice = row.querySelector('[data-price-usd]')?.textContent?.trim() || '';
        const lbpPrice = row.querySelector('[data-price-lbp]')?.textContent?.trim() || '';
        const label = row.querySelector('[data-label]')?.textContent?.trim() || '';
        const timestamp = document.querySelector('[data-last-updated]')?.textContent?.trim() || '';
        
        // Arabic message template
        const message = encodeURIComponent(
          `💰 ${label}\n` +
          `دولار: ${usdPrice}\n` +
          `ليرة: ${lbpPrice}\n` +
          `${timestamp}\n` +
          `المصدر: LebanonRates.com`
        );
        
        window.open(`https://wa.me/?text=${message}`, '_blank');
      });
    });
  }
})();
