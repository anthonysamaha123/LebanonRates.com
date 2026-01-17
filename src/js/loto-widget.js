/**
 * Latest Loto Results Widget
 * Fetches and displays the latest Loto draw results from LLDJ
 */

(function() {
  'use strict';

  const API_ENDPOINT = '/api/loto/latest';
  const CACHE_DURATION = 60000; // 60 seconds
  
  let lastFetchTime = 0;
  let cachedData = null;

  /**
   * Format date string for display
   * @param {string} isoString - ISO date string
   * @returns {string} Formatted date string
   */
  function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format draw date for display
   * @param {string} drawDate - Date string in DD/MM/YYYY format
   * @returns {string} Formatted date string
   */
  function formatDrawDate(drawDate) {
    if (!drawDate) return '';
    // drawDate is in DD/MM/YYYY format
    return drawDate;
  }

  /**
   * Render the loto widget with data
   * @param {Object} data - Loto data object
   */
  function renderLotoWidget(data) {
    const container = document.getElementById('loto-content');
    if (!container) return;

    if (data.error && !data.numbers) {
      // Error state - check if we can show cached file data
      container.innerHTML = `
        <div class="loto-error">
          <p>Unable to fetch latest results.</p>
          ${data.from_cache ? '<p class="loto-note">Showing last saved result.</p>' : ''}
        </div>
      `;
      return;
    }

    if (!data.numbers || data.numbers.length !== 7) {
      // Log the actual data for debugging
      console.warn('Invalid loto data received:', data);
      
      container.innerHTML = `
        <div class="loto-error">
          <p>Unable to load latest draw results.</p>
          ${data.error ? `<p class="loto-note">${data.error}</p>` : ''}
          ${data.from_cache ? '<p class="loto-note">Trying cached data...</p>' : ''}
        </div>
      `;
      return;
    }

    const drawInfo = `Draw #${data.drawNumber} — ${formatDrawDate(data.drawDate)}`;
    const fetchedAt = data.fetchedAt ? formatDate(data.fetchedAt) : '';
    const note = data._note ? `<p class="loto-note">${data._note}</p>` : '';
    const fromCacheNote = data.from_cache ? '<p class="loto-note">Showing cached result</p>' : '';

    // Split numbers: first 6 are main balls, last 1 is extra/red ball
    const mainBalls = data.numbers.slice(0, 6);
    const extraBall = data.numbers[6];

    container.innerHTML = `
      <div class="loto-draw-info">${drawInfo}</div>
      <div class="loto-balls-container">
        <div class="loto-main-balls">
          ${mainBalls.map(num => `<span class="loto-ball loto-ball-main">${num}</span>`).join('')}
        </div>
        <div class="loto-extra-ball">
          <span class="loto-ball loto-ball-extra">${extraBall}</span>
        </div>
      </div>
      <div class="loto-meta">
        ${fetchedAt ? `<span class="loto-updated">Last updated: ${fetchedAt}</span>` : ''}
        ${note || fromCacheNote}
      </div>
    `;
  }

  /**
   * Fetch latest loto results
   * @returns {Promise<Object>} Loto data
   */
  async function fetchLatestLoto() {
    const now = Date.now();
    
    // Use cached data if within cache duration
    if (cachedData && (now - lastFetchTime) < CACHE_DURATION) {
      return cachedData;
    }

    try {
      const response = await fetch(API_ENDPOINT);
      if (!response.ok) {
        // If 404, API endpoint not available (e.g., in static build without Netlify function)
        if (response.status === 404) {
          return {
            error: 'API endpoint not available. In production, this will work via Netlify functions.',
            numbers: [],
            _staticMode: true
          };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Try to parse JSON - handle cases where response might not be JSON
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, try parsing anyway (might be text/html error page)
        try {
          const text = await response.text();
          data = JSON.parse(text);
        } catch (parseError) {
          throw new Error(`Invalid response format: ${contentType || 'unknown'}`);
        }
      }
      
      // Cache successful results
      if (data.numbers && data.numbers.length === 7) {
        cachedData = data;
        lastFetchTime = now;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching loto results:', error);
      
      // Handle 404 specifically (API not available in static builds)
      if (error.message && error.message.includes('404')) {
        // Try to load from file cache if available (for static sites)
        // In production, this would come from Netlify function
        return {
          error: 'API endpoint not available. In production, ensure Netlify function is deployed.',
          numbers: [],
          _staticMode: true
        };
      }
      
      // Return cached data if available, even if expired
      if (cachedData) {
        return { ...cachedData, _note: 'Showing last saved result due to fetch failure' };
      }
      
      return {
        error: error.message || 'Failed to fetch loto results',
        numbers: []
      };
    }
  }

  /**
   * Initialize the loto widget
   */
  function initLotoWidget() {
    const container = document.getElementById('loto-widget');
    if (!container) return;

    // Show loading state
    const contentContainer = document.getElementById('loto-content');
    if (contentContainer) {
      contentContainer.innerHTML = '<div class="loto-loading">Loading latest draw...</div>';
    }

    // Fetch and render
    fetchLatestLoto()
      .then(data => {
        renderLotoWidget(data);
      })
      .catch(error => {
        console.error('Error initializing loto widget:', error);
        const contentContainer = document.getElementById('loto-content');
        if (contentContainer) {
          contentContainer.innerHTML = `
            <div class="loto-error">
              <p>Unable to load latest results.</p>
            </div>
          `;
        }
      });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLotoWidget);
  } else {
    initLotoWidget();
  }
})();
