#!/usr/bin/env python3
"""
MEDCO Fuel Prices Scraper (Python Alternative)
Scrapes fuel prices from medco.com.lb and returns JSON output.
"""

import requests
from bs4 import BeautifulSoup
import re
import json
import sys
from datetime import datetime
from typing import Dict, Optional

SOURCE_URL = 'https://medco.com.lb/'
REQUEST_TIMEOUT = 10
MAX_RETRIES = 2
RETRY_DELAY = 2

# Simple in-memory cache (5 minutes TTL)
_cache = {
    'data': None,
    'timestamp': None
}
CACHE_TTL_SECONDS = 5 * 60


def normalize_number(num_str: str) -> Optional[int]:
    """Remove commas and parse as integer."""
    if not num_str:
        return None
    try:
        cleaned = re.sub(r'[,.\s]', '', str(num_str))
        return int(cleaned)
    except (ValueError, TypeError):
        return None


def parse_medco_fuel_prices(html: str) -> Optional[Dict]:
    """Parse MEDCO fuel prices from HTML."""
    if not html:
        return None

    soup = BeautifulSoup(html, 'html.parser')
    text = soup.get_text()

    result = {
        'unl95_lbp': None,
        'unl98_lbp': None,
        'lpg10kg_lbp': None,
        'diesel_note': None
    }

    # Strategy 1: Try to find "Today fuel prices" section
    found_section = False
    for element in soup.find_all(string=re.compile(r'today\s+fuel\s+prices', re.I)):
        found_section = True
        # Get parent container
        container = element.find_parent(['div', 'section', 'article', 'main'])
        if container:
            area_text = container.get_text()
        else:
            area_text = text

        # Extract values
        unl95_match = re.search(r'UNL\s*95\s*([0-9,]+)\s*LBP', area_text, re.I)
        unl98_match = re.search(r'UNL\s*98\s*([0-9,]+)\s*LBP', area_text, re.I)
        lpg_match = re.search(r'LPG\s*10\s*KG\s*([0-9,]+)\s*LBP', area_text, re.I)
        diesel_match = re.search(r'Diesel\s*Oil\s*([^LPGUNL]+?)(?=\s*(?:LPG|UNL|HOW CAN WE HELP|$))', area_text, re.I)

        if unl95_match:
            result['unl95_lbp'] = normalize_number(unl95_match.group(1))
        if unl98_match:
            result['unl98_lbp'] = normalize_number(unl98_match.group(1))
        if lpg_match:
            result['lpg10kg_lbp'] = normalize_number(lpg_match.group(1))
        if diesel_match:
            result['diesel_note'] = diesel_match.group(1).strip()

        if any([result['unl95_lbp'], result['unl98_lbp'], result['lpg10kg_lbp'], result['diesel_note']]):
            break

    # Strategy 2: Regex on full text if section not found or values missing
    if not found_section or not any([result['unl95_lbp'], result['unl98_lbp'], result['lpg10kg_lbp'], result['diesel_note']]):
        patterns = {
            'unl95': re.compile(r'UNL\s*95\s*([0-9,]+)\s*LBP', re.I),
            'unl98': re.compile(r'UNL\s*98\s*([0-9,]+)\s*LBP', re.I),
            'lpg10kg': re.compile(r'LPG\s*10\s*KG\s*([0-9,]+)\s*LBP', re.I),
            'diesel': re.compile(r'Diesel\s*Oil\s*([^LPGUNL]+?)(?=\s*(?:LPG|UNL|HOW CAN WE HELP|$))', re.I)
        }

        unl95_match = patterns['unl95'].search(text)
        unl98_match = patterns['unl98'].search(text)
        lpg_match = patterns['lpg10kg'].search(text)
        diesel_match = patterns['diesel'].search(text)

        if unl95_match and not result['unl95_lbp']:
            result['unl95_lbp'] = normalize_number(unl95_match.group(1))
        if unl98_match and not result['unl98_lbp']:
            result['unl98_lbp'] = normalize_number(unl98_match.group(1))
        if lpg_match and not result['lpg10kg_lbp']:
            result['lpg10kg_lbp'] = normalize_number(lpg_match.group(1))
        if diesel_match and not result['diesel_note']:
            result['diesel_note'] = diesel_match.group(1).strip()

    # Return None if nothing found
    if not any([result['unl95_lbp'], result['unl98_lbp'], result['lpg10kg_lbp'], result['diesel_note']]):
        return None

    return result


def fetch_medco_fuel_prices(use_cache: bool = True) -> Dict:
    """Fetch MEDCO fuel prices with retries and caching."""
    import time

    # Check cache
    if use_cache and _cache['data'] and _cache['timestamp']:
        cache_age = time.time() - _cache['timestamp']
        if cache_age < CACHE_TTL_SECONDS:
            result = _cache['data'].copy()
            result['from_cache'] = True
            result['ok'] = True
            return result

    # Fetch with retries
    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            response = requests.get(SOURCE_URL, headers=headers, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()

            parsed = parse_medco_fuel_prices(response.text)
            if not parsed:
                raise ValueError('Failed to parse fuel prices from HTML')

            result = {
                'ok': True,
                'from_cache': False,
                'source_url': SOURCE_URL,
                'fetched_at_iso': datetime.utcnow().isoformat() + 'Z',
                'unl95_lbp': parsed.get('unl95_lbp'),
                'unl98_lbp': parsed.get('unl98_lbp'),
                'lpg10kg_lbp': parsed.get('lpg10kg_lbp'),
                'diesel_note': parsed.get('diesel_note')
            }

            # Update cache
            _cache['data'] = result.copy()
            _cache['timestamp'] = time.time()

            return result

        except Exception as error:
            last_error = error
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY)

    # Return cached data if available
    if use_cache and _cache['data']:
        result = _cache['data'].copy()
        result['from_cache'] = True
        result['ok'] = True
        return result

    # Error response
    return {
        'ok': False,
        'from_cache': False,
        'source_url': SOURCE_URL,
        'fetched_at_iso': datetime.utcnow().isoformat() + 'Z',
        'error': str(last_error) if last_error else 'Failed to fetch fuel prices',
        'unl95_lbp': None,
        'unl98_lbp': None,
        'lpg10kg_lbp': None,
        'diesel_note': None
    }


def main():
    """CLI entry point."""
    use_cache = '--no-cache' not in sys.argv
    result = fetch_medco_fuel_prices(use_cache=use_cache)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
