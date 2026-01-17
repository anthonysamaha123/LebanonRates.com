const { parseMedcoFuelPrices, normalizeNumber } = require('../src/parseMedco');
const fs = require('fs');
const path = require('path');

describe('parseMedco', () => {
  let fixtureHtml;

  beforeAll(() => {
    const fixturePath = path.join(__dirname, '../fixtures/medco_home.html');
    fixtureHtml = fs.readFileSync(fixturePath, 'utf8');
  });

  describe('normalizeNumber', () => {
    test('should remove commas and parse as integer', () => {
      expect(normalizeNumber('1,312,000')).toBe(1312000);
      expect(normalizeNumber('1,352,000')).toBe(1352000);
      expect(normalizeNumber('1,197,000')).toBe(1197000);
    });

    test('should handle numbers without commas', () => {
      expect(normalizeNumber('1312000')).toBe(1312000);
      expect(normalizeNumber('1000')).toBe(1000);
    });

    test('should return null for invalid input', () => {
      expect(normalizeNumber('')).toBe(null);
      expect(normalizeNumber('abc')).toBe(null);
      expect(normalizeNumber(null)).toBe(null);
      expect(normalizeNumber(undefined)).toBe(null);
    });
  });

  describe('parseMedcoFuelPrices', () => {
    test('should parse all fuel prices from fixture HTML', () => {
      const result = parseMedcoFuelPrices(fixtureHtml);

      expect(result).not.toBeNull();
      expect(result.unl95_lbp).toBe(1312000);
      expect(result.unl98_lbp).toBe(1352000);
      expect(result.lpg10kg_lbp).toBe(1197000);
      expect(result.diesel_note).toBe('Transportation + $627.67 USD/1000 lts');
    });

    test('should return null for empty HTML', () => {
      expect(parseMedcoFuelPrices('')).toBeNull();
      expect(parseMedcoFuelPrices(null)).toBeNull();
      expect(parseMedcoFuelPrices(undefined)).toBeNull();
    });

    test('should handle HTML without fuel prices', () => {
      const html = '<html><body><h1>No prices here</h1></body></html>';
      const result = parseMedcoFuelPrices(html);
      expect(result).toBeNull();
    });

    test('should handle partial matches', () => {
      const html = `
        <html>
          <body>
            <h2>Today fuel prices</h2>
            <p>UNL 95 1,312,000 LBP</p>
            <p>UNL 98 1,352,000 LBP</p>
          </body>
        </html>
      `;
      const result = parseMedcoFuelPrices(html);
      
      expect(result).not.toBeNull();
      expect(result.unl95_lbp).toBe(1312000);
      expect(result.unl98_lbp).toBe(1352000);
      expect(result.lpg10kg_lbp).toBeNull();
      expect(result.diesel_note).toBeNull();
    });

    test('should handle case-insensitive matching', () => {
      const html = `
        <html>
          <body>
            <h2>today fuel prices</h2>
            <p>unl 95 1,312,000 lbp</p>
            <p>unl 98 1,352,000 lbp</p>
            <p>lpg 10 kg 1,197,000 lbp</p>
            <p>diesel oil Transportation + $627.67 USD/1000 lts</p>
          </body>
        </html>
      `;
      const result = parseMedcoFuelPrices(html);
      
      expect(result).not.toBeNull();
      expect(result.unl95_lbp).toBe(1312000);
      expect(result.unl98_lbp).toBe(1352000);
      expect(result.lpg10kg_lbp).toBe(1197000);
      expect(result.diesel_note).toContain('Transportation');
    });

    test('should handle different spacing in fuel type names', () => {
      const html = `
        <html>
          <body>
            <h2>Today fuel prices</h2>
            <p>UNL95 1,312,000 LBP</p>
            <p>UNL 98 1,352,000 LBP</p>
            <p>LPG10KG 1,197,000 LBP</p>
          </body>
        </html>
      `;
      const result = parseMedcoFuelPrices(html);
      
      expect(result).not.toBeNull();
      expect(result.unl95_lbp).toBe(1312000);
      expect(result.unl98_lbp).toBe(1352000);
      expect(result.lpg10kg_lbp).toBe(1197000);
    });
  });
});
