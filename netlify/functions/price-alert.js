/**
 * Netlify Serverless Function: Price Alert
 * POST /api/price-alert
 * 
 * Stores price alert preferences (email + target price)
 * In production, this would integrate with an email service
 */

const fs = require('fs-extra');
const path = require('path');

// In production, use a proper database or storage service
// For now, store in a JSON file (not recommended for production)
const ALERTS_FILE = path.join(process.cwd(), 'data', 'price-alerts.json');

/**
 * Load alerts from storage
 */
function loadAlerts() {
  try {
    if (fs.existsSync(ALERTS_FILE)) {
      return JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('Failed to load alerts:', error.message);
  }
  return { alerts: [] };
}

/**
 * Save alerts to storage
 */
function saveAlerts(alertsData) {
  try {
    fs.ensureDirSync(path.dirname(ALERTS_FILE));
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alertsData, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save alerts:', error.message);
    throw error;
  }
}

/**
 * Add new alert
 */
function addAlert(alertData) {
  const alertsData = loadAlerts();
  
  // Check for duplicate
  const exists = alertsData.alerts.some(a => 
    a.email === alertData.email && 
    a.karat === alertData.karat && 
    a.target === parseFloat(alertData.target)
  );
  
  if (exists) {
    return { success: false, message: 'Alert already exists' };
  }
  
  // Add alert
  alertsData.alerts.push({
    id: Date.now().toString(),
    email: alertData.email,
    karat: alertData.karat,
    target: parseFloat(alertData.target),
    direction: alertData.direction || 'either',
    createdAt: new Date().toISOString(),
    active: true
  });
  
  saveAlerts(alertsData);
  
  return { success: true, message: 'Alert created successfully' };
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };
  
  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }
  
  // Handle GET (list alerts - for admin/testing)
  if (event.httpMethod === 'GET') {
    try {
      const alertsData = loadAlerts();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(alertsData)
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }
  
  // Handle POST (create alert)
  if (event.httpMethod === 'POST') {
    try {
      const alertData = JSON.parse(event.body);
      
      // Validate
      if (!alertData.email || !alertData.karat || !alertData.target) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields' })
        };
      }
      
      // Add alert
      const result = addAlert(alertData);
      
      if (result.success) {
        // In production, send confirmation email here
        // await sendEmail(alertData.email, 'Price Alert Confirmation', ...);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
        };
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify(result)
        };
      }
    } catch (error) {
      console.error('Error processing alert:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to process alert' })
      };
    }
  }
  
  // Method not allowed
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
