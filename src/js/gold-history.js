/**
 * Gold History Calculations
 * Processes historical data and calculates changes, highs, lows, volatility
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
    if (window.goldHistoryData) {
      renderHistoryStats();
    }
  }
  
  /**
   * Render history statistics
   */
  function renderHistoryStats() {
    const container = document.getElementById('gold-history-stats');
    if (!container || !window.goldHistoryData) return;
    
    const itemKey = container.dataset.itemKey || 'gold_21k_1g_buy';
    const history = window.goldHistoryData.items[itemKey];
    
    if (!history || history.length === 0) {
      container.innerHTML = '<p>No history data available</p>';
      return;
    }
    
    const stats = calculateStats(history, itemKey);
    
    container.innerHTML = `
      <div class="history-stats-grid">
        <div class="stat-card">
          <div class="stat-label">24h Change</div>
          <div class="stat-value ${stats.change24h.positive ? 'positive' : 'negative'}">
            ${stats.change24h.positive ? '+' : ''}${stats.change24h.absolute} (${stats.change24h.percent}%)
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">7-Day High</div>
          <div class="stat-value">$${stats.high7d.usd.toFixed(2)}</div>
          <div class="stat-secondary">${stats.high7d.lbp.toLocaleString()} LBP</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">7-Day Low</div>
          <div class="stat-value">$${stats.low7d.usd.toFixed(2)}</div>
          <div class="stat-secondary">${stats.low7d.lbp.toLocaleString()} LBP</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">30-Day High</div>
          <div class="stat-value">$${stats.high30d.usd.toFixed(2)}</div>
          <div class="stat-secondary">${stats.high30d.lbp.toLocaleString()} LBP</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">30-Day Low</div>
          <div class="stat-value">$${stats.low30d.usd.toFixed(2)}</div>
          <div class="stat-secondary">${stats.low30d.lbp.toLocaleString()} LBP</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Today's Range</div>
          <div class="stat-value">$${stats.todayRange.high.usd.toFixed(2)} - $${stats.todayRange.low.usd.toFixed(2)}</div>
          <div class="stat-secondary">${stats.todayRange.low.lbp.toLocaleString()} - ${stats.todayRange.high.lbp.toLocaleString()} LBP</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Volatility</div>
          <div class="stat-value volatility-badge ${stats.volatility.class}">${stats.volatility.label}</div>
        </div>
        ${stats.bestTimeToday ? `
        <div class="stat-card">
          <div class="stat-label">Best Time Today</div>
          <div class="stat-value">${stats.bestTimeToday.time}</div>
          <div class="stat-secondary">$${stats.bestTimeToday.price.usd.toFixed(2)}</div>
        </div>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * Calculate statistics from history
   */
  function calculateStats(history, itemKey) {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const todayStart = new Date().setHours(0, 0, 0, 0);
    
    // Filter by time periods
    const history24h = history.filter(h => new Date(h.timestamp).getTime() >= oneDayAgo);
    const history7d = history.filter(h => new Date(h.timestamp).getTime() >= sevenDaysAgo);
    const history30d = history.filter(h => new Date(h.timestamp).getTime() >= thirtyDaysAgo);
    const historyToday = history.filter(h => new Date(h.timestamp).getTime() >= todayStart);
    
    // Get current price
    const current = history[history.length - 1];
    const price24hAgo = history24h[0] || current;
    
    // Calculate 24h change
    const change24h = {
      absolute: current.priceUsd - price24hAgo.priceUsd,
      percent: price24hAgo.priceUsd > 0 
        ? ((current.priceUsd - price24hAgo.priceUsd) / price24hAgo.priceUsd * 100).toFixed(2)
        : 0,
      positive: current.priceUsd >= price24hAgo.priceUsd
    };
    
    // Calculate highs and lows
    const high7d = history7d.reduce((max, h) => h.priceUsd > max.priceUsd ? h : max, history7d[0] || current);
    const low7d = history7d.reduce((min, h) => h.priceUsd < min.priceUsd ? h : min, history7d[0] || current);
    const high30d = history30d.reduce((max, h) => h.priceUsd > max.priceUsd ? h : max, history30d[0] || current);
    const low30d = history30d.reduce((min, h) => h.priceUsd < min.priceUsd ? h : min, history30d[0] || current);
    
    // Today's range
    const todayHigh = historyToday.reduce((max, h) => h.priceUsd > max.priceUsd ? h : max, historyToday[0] || current);
    const todayLow = historyToday.reduce((min, h) => h.priceUsd < min.priceUsd ? h : min, historyToday[0] || current);
    
    // Volatility (based on 24h movement percentage)
    const volatilityPercent = Math.abs(parseFloat(change24h.percent));
    let volatility = { class: 'low', label: 'Low' };
    if (volatilityPercent > 5) {
      volatility = { class: 'high', label: 'High' };
    } else if (volatilityPercent > 2) {
      volatility = { class: 'medium', label: 'Medium' };
    }
    
    // Best time today (lowest price)
    const bestTimeToday = historyToday.length > 0 ? {
      time: new Date(todayLow.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      price: todayLow
    } : null;
    
    return {
      change24h,
      high7d: { usd: high7d.priceUsd, lbp: high7d.priceLbp },
      low7d: { usd: low7d.priceUsd, lbp: low7d.priceLbp },
      high30d: { usd: high30d.priceUsd, lbp: high30d.priceLbp },
      low30d: { usd: low30d.priceUsd, lbp: low30d.priceLbp },
      todayRange: {
        high: { usd: todayHigh.priceUsd, lbp: todayHigh.priceLbp },
        low: { usd: todayLow.priceUsd, lbp: todayLow.priceLbp }
      },
      volatility,
      bestTimeToday
    };
  }
  
  // Expose for external use
  window.goldHistory = {
    calculateStats,
    renderHistoryStats
  };
})();
