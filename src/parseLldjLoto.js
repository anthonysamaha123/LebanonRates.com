/**
 * Parse LLDJ Loto results from HTML
 * @param {string} html - HTML content from lldj.com
 * @returns {Object|null} Parsed loto data or null if parsing fails
 * 
 * Expected structure:
 * - Draw number: "Draw #2384" or similar
 * - Draw date: "15/01/2026" or "15 January, 2026" or similar
 * - 7 numbers: 6 main balls + 1 extra/red ball in <ul class="loto ballslist"> or similar
 */
function parseLldjLoto(html) {
  if (!html || typeof html !== 'string') {
    return null;
  }

  const cheerio = require('cheerio');
  const $ = cheerio.load(html);

  const result = {
    drawNumber: null,
    drawDate: null,
    numbers: []
  };

  // Strategy 1: Look for "LOTO & ZEED LATEST RESULTS" section (homepage pattern)
  // This is more robust than relying on specific class selectors that might change
  let foundSection = false;
  
  // Search for the section header text (case-insensitive, allows for variations)
  $('h2, h3, .hometitle, .titleinfo, .drawinfo, .draw').each(function() {
    const text = $(this).text();
    const normalizedText = text.toLowerCase().trim();
    
    // Match patterns like "LOTO & ZEED LATEST RESULTS", "LOTO LATEST RESULTS", etc.
    if (/loto.*latest.*results?/i.test(normalizedText) || 
        /results?.*of.*draw/i.test(normalizedText)) {
      foundSection = true;
      
      // Get the container context - search in parent/siblings
      const container = $(this).closest('div, section, article, main') || $(this).parent();
      
      // Try to extract draw number from text in the section
      // Patterns: "Draw #2384", "Draw 2384", "Draw#2384", etc.
      const sectionText = container.text();
      const drawNumberMatch = sectionText.match(/draw\s*#?\s*(\d+)/i);
      if (drawNumberMatch && !result.drawNumber) {
        result.drawNumber = parseInt(drawNumberMatch[1], 10);
      }
      
      // Try to extract date from text in the section
      // Patterns: "15/01/2026", "15 January, 2026", "15 Jan 2026", etc.
      // First try DD/MM/YYYY format
      const dateMatch1 = sectionText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dateMatch1) {
        result.drawDate = `${dateMatch1[1]}/${dateMatch1[2]}/${dateMatch1[3]}`;
      } else {
        // Try "15 January, 2026" format
        const dateMatch2 = sectionText.match(/(\d{1,2})\s+([a-z]+),?\s+(\d{4})/i);
        if (dateMatch2) {
          // Convert month name to number
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                             'july', 'august', 'september', 'october', 'november', 'december'];
          const monthIndex = monthNames.findIndex(m => m.toLowerCase().startsWith(dateMatch2[2].toLowerCase()));
          if (monthIndex !== -1) {
            const monthNum = String(monthIndex + 1).padStart(2, '0');
            result.drawDate = `${dateMatch2[1].padStart(2, '0')}/${monthNum}/${dateMatch2[3]}`;
          }
        }
      }
      
      // Look for loto ball numbers in this section
      // Try multiple selectors to be resilient to HTML changes
      const ballSelectors = [
        'ul.loto.ballslist li.ball',
        'ul.ballslist.loto li.ball',
        '.loto.ballslist li.ball',
        'ul.loto li.ball',
        '.homelotoresults li.ball',
        '.loto li.ball'
      ];
      
      for (const selector of ballSelectors) {
        const balls = container.find(selector);
        if (balls.length > 0) {
          balls.each(function() {
            const ballText = $(this).text().trim();
            const ballNum = parseInt(ballText, 10);
            // Only add valid integers (1-49 typically for loto)
            if (!isNaN(ballNum) && ballNum > 0 && ballNum <= 49) {
              result.numbers.push(ballNum);
            }
          });
          
          // If we found numbers, break (don't try other selectors)
          if (result.numbers.length > 0) {
            break;
          }
        }
      }
      
      // If we found the section with numbers, break outer loop
      if (result.numbers.length > 0) {
        return false; // Break cheerio each loop
      }
    }
  });

  // Strategy 2: If not found via section header, try direct selector search
  // This handles the Latest Results page pattern
  if (!foundSection || result.numbers.length === 0) {
    // Try to find draw number from input field or text
    if (!result.drawNumber) {
      const drawInput = $('input#resultdateinput.loto, input.loto#resultdateinput');
      if (drawInput.length) {
        result.drawNumber = parseInt(drawInput.val(), 10);
      } else {
        // Try text pattern in the page
        const fullText = $('body').text();
        const drawMatch = fullText.match(/draw\s*#?\s*(\d+)/i);
        if (drawMatch) {
          result.drawNumber = parseInt(drawMatch[1], 10);
        }
      }
    }
    
    // Try to find date from input field or text
    if (!result.drawDate) {
      const dateInput = $('input#chooseresultdrawdate');
      if (dateInput.length) {
        const dateValue = dateInput.val() || '';
        // Extract date from "Draw # 2384 - 15 January, 2026"
        const dateMatch = dateValue.match(/(\d{1,2})\s+([a-z]+),?\s+(\d{4})/i);
        if (dateMatch) {
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                             'july', 'august', 'september', 'october', 'november', 'december'];
          const monthIndex = monthNames.findIndex(m => m.toLowerCase().startsWith(dateMatch[2].toLowerCase()));
          if (monthIndex !== -1) {
            const monthNum = String(monthIndex + 1).padStart(2, '0');
            result.drawDate = `${dateMatch[1].padStart(2, '0')}/${monthNum}/${dateMatch[3]}`;
          }
        }
      }
      
      // Also try finding date in text like "Draw 2384 On 15/01/2026"
      if (!result.drawDate) {
        const fullText = $('body').text();
        const dateMatch = fullText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateMatch) {
          result.drawDate = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
        }
      }
    }
    
    // Try to find ball numbers using various selectors
    if (result.numbers.length === 0) {
      const ballSelectors = [
        'ul.loto.ballslist li.ball',
        'ul.ballslist.loto li.ball',
        '.loto.ballslist li.ball',
        'ul.loto li.ball',
        'ul.ballslist.pseudoclear li.ball',
        '.drawresultheader ul.ballslist li.ball'
      ];
      
      for (const selector of ballSelectors) {
        const balls = $(selector);
        if (balls.length > 0) {
          balls.each(function() {
            const ballText = $(this).text().trim();
            const ballNum = parseInt(ballText, 10);
            if (!isNaN(ballNum) && ballNum > 0 && ballNum <= 49) {
              result.numbers.push(ballNum);
            }
          });
          
          if (result.numbers.length > 0) {
            break;
          }
        }
      }
    }
  }

  // Validation: Must have exactly 7 numbers (6 main + 1 extra/red ball)
  if (result.numbers.length !== 7) {
    // Return null to indicate parsing failure
    // Error details will be logged by caller
    return null;
  }

  // Validate draw number and date
  if (!result.drawNumber || !result.drawDate) {
    return null;
  }

  return result;
}

module.exports = {
  parseLldjLoto
};
