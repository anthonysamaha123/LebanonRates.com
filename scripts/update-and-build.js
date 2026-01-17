#!/usr/bin/env node
/**
 * Update data and rebuild site
 * This script can be run via cron for automated updates
 */

const { fetchAllData } = require('./fetch-data');
const { build } = require('../build');

async function updateAndBuild() {
  try {
    console.log('Starting update and build process...\n');
    
    // Fetch latest data
    await fetchAllData();
    
    // Build site
    await build();
    
    console.log('\n✓ Update and build complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error during update and build:', error);
    process.exit(1);
  }
}

updateAndBuild();