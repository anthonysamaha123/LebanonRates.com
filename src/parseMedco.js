/**
 * Parse MEDCO fuel prices from HTML
 * @param {string} html - HTML content from medco.com.lb
 * @returns {Object|null} Parsed fuel prices or null if parsing fails
 */
function parseMedcoFuelPrices(html) {
  if (!html || typeof html !== 'string') {
    return null;
  }

  const cheerio = require('cheerio');
  const $ = cheerio.load(html);

  const result = {
    unl95_lbp: null,
    unl98_lbp: null,
    lpg10kg_lbp: null,
    diesel_note: null
  };

  // Strategy 1: Try DOM-based parsing
  // Find "Today fuel prices" section and extract nearby values
  let foundSection = false;
  
  // Look for "Today fuel prices" text (case-insensitive)
  $('*').each(function() {
    const text = $(this).text();
    if (text && /today\s+fuel\s+prices/i.test(text)) {
      foundSection = true;
      
      // Search within a bounded region (parent container and siblings)
      const container = $(this).closest('div, section, article, main');
      const searchArea = container.length ? container : $(this).parent();
      
      // Extract text from the search area
      const areaText = searchArea.text();
      
      // Try to find each fuel type in the area
      // Handle cases with or without spaces: "UNL 95 1,312,000 LBP" or "UNL 951,312,000 LBP"
      const unl95Match = areaText.match(/UNL\s*95\s*([0-9,]+)\s*LBP/i) || areaText.match(/UNL\s*95([0-9,]+)\s*LBP/i);
      const unl98Match = areaText.match(/UNL\s*98\s*([0-9,]+)\s*LBP/i) || areaText.match(/UNL\s*98([0-9,]+)\s*LBP/i);
      const lpgMatch = areaText.match(/LPG\s*10\s*KG\s*([0-9,]+)\s*LBP/i) || areaText.match(/LPG\s*10\s*KG([0-9,]+)\s*LBP/i);
      
      // For diesel, try to find the element containing "Diesel Oil" and get the note
      let dieselNote = null;
      searchArea.find('*').each(function() {
        const elemText = $(this).text();
        if (/Diesel\s*Oil/i.test(elemText)) {
          // Look for fuel-note class or next sibling with the note
          const noteElem = $(this).find('.fuel-note, [class*="note"]').first();
          if (noteElem.length) {
            dieselNote = noteElem.text().trim();
          } else {
            // Try to extract from the same element's text after "Diesel Oil"
            const match = elemText.match(/Diesel\s*Oil\s*(.+?)(?:\s*(?:LPG|UNL|HOW CAN WE HELP|$))/i);
            if (match) {
              dieselNote = match[1].trim();
            }
          }
          return false; // Break
        }
      });
      
      // If not found via DOM, try regex on area text
      // Handle cases with or without spaces: "Diesel Oil Transportation..." or "Diesel OilTransportation..."
      if (!dieselNote) {
        const dieselMatch = areaText.match(/Diesel\s*Oil\s*(.+?)(?=\s*(?:LPG|UNL|HOW CAN WE HELP|$))/i) ||
                           areaText.match(/Diesel\s*Oil(.+?)(?=\s*(?:LPG|UNL|HOW CAN WE HELP|$))/i);
        if (dieselMatch) {
          dieselNote = dieselMatch[1].trim();
        }
      }
      
      if (unl95Match) {
        result.unl95_lbp = normalizeNumber(unl95Match[1]);
      }
      if (unl98Match) {
        result.unl98_lbp = normalizeNumber(unl98Match[1]);
      }
      if (lpgMatch) {
        result.lpg10kg_lbp = normalizeNumber(lpgMatch[1]);
      }
      if (dieselNote) {
        result.diesel_note = dieselNote;
      }
      
      // If we found at least one value, return early
      if (result.unl95_lbp || result.unl98_lbp || result.lpg10kg_lbp || result.diesel_note) {
        return false; // Break the loop
      }
    }
  });

  // Strategy 2: If DOM parsing didn't work, try regex on full text
  if (!foundSection || (!result.unl95_lbp && !result.unl98_lbp && !result.lpg10kg_lbp && !result.diesel_note)) {
    const fullText = $.text();
    
    // More robust regex patterns - handle cases with or without spaces
    const patterns = {
      unl95: /UNL\s*95\s*([0-9,]+)\s*LBP/i,
      unl95NoSpace: /UNL\s*95([0-9,]+)\s*LBP/i,
      unl98: /UNL\s*98\s*([0-9,]+)\s*LBP/i,
      unl98NoSpace: /UNL\s*98([0-9,]+)\s*LBP/i,
      lpg10kg: /LPG\s*10\s*KG\s*([0-9,]+)\s*LBP/i,
      lpg10kgNoSpace: /LPG\s*10\s*KG([0-9,]+)\s*LBP/i,
      diesel: /Diesel\s*Oil\s*(.+?)(?=\s*(?:LPG|UNL|HOW CAN WE HELP|$))/i,
      dieselNoSpace: /Diesel\s*Oil(.+?)(?=\s*(?:LPG|UNL|HOW CAN WE HELP|$))/i
    };

    const unl95Match = fullText.match(patterns.unl95) || fullText.match(patterns.unl95NoSpace);
    const unl98Match = fullText.match(patterns.unl98) || fullText.match(patterns.unl98NoSpace);
    const lpgMatch = fullText.match(patterns.lpg10kg) || fullText.match(patterns.lpg10kgNoSpace);
    const dieselMatch = fullText.match(patterns.diesel) || fullText.match(patterns.dieselNoSpace);

    if (unl95Match && !result.unl95_lbp) {
      result.unl95_lbp = normalizeNumber(unl95Match[1]);
    }
    if (unl98Match && !result.unl98_lbp) {
      result.unl98_lbp = normalizeNumber(unl98Match[1]);
    }
    if (lpgMatch && !result.lpg10kg_lbp) {
      result.lpg10kg_lbp = normalizeNumber(lpgMatch[1]);
    }
    if (dieselMatch && !result.diesel_note) {
      result.diesel_note = dieselMatch[1].trim();
    }
  }

  // Return null if we didn't find anything
  if (!result.unl95_lbp && !result.unl98_lbp && !result.lpg10kg_lbp && !result.diesel_note) {
    return null;
  }

  return result;
}

/**
 * Normalize number string by removing commas and parsing as integer
 * @param {string} numStr - Number string like "1,312,000"
 * @returns {number|null} Parsed integer or null
 */
function normalizeNumber(numStr) {
  if (!numStr) return null;
  
  // Remove all commas and whitespace, then parse
  const cleaned = numStr.toString().replace(/[,.\s]/g, '');
  const parsed = parseInt(cleaned, 10);
  
  return isNaN(parsed) ? null : parsed;
}

module.exports = {
  parseMedcoFuelPrices,
  normalizeNumber
};
