// Site Configuration
module.exports = {
  site: {
    name: 'LebanonRates.com',
    domain: 'https://lebanonrates.com',
    defaultLang: 'en'
  },
  
  // URL slugs for each language
  slugs: {
    en: {
      home: '/',
      usd: '/usd-lbp-today',
      eur: '/eur-lbp-today',
      official: '/official-rates',
      converter: '/convert',
      fuel: '/fuel-prices-today',
      gold: '/gold-price-lebanon',
      about: '/about-faq',
      privacy: '/privacy'
    },
    ar: {
      home: '/ar/',
      usd: '/ar/سعر-الدولار-اليوم',
      eur: '/ar/سعر-اليورو-لبنان',
      official: '/ar/الأسعار-الرسمية',
      converter: '/ar/حاسبة-تحويل',
      fuel: '/ar/أسعار-الوقود-اليوم',
      gold: '/ar/سعر-الذهب-لبنان',
      about: '/ar/حول-الموقع',
      privacy: '/ar/الخصوصية'
    },
    fr: {
      home: '/fr/',
      usd: '/fr/taux-dollar-liban',
      eur: '/fr/taux-euro-liban',
      official: '/fr/taux-officiels',
      converter: '/fr/convertisseur',
      fuel: '/fr/prix-carburants-liban',
      gold: '/fr/prix-or-liban',
      about: '/fr/a-propos',
      privacy: '/fr/confidentialite'
    }
  },
  
  // SEO Gold Pages Configuration (Features 28-55)
  seoGoldPages: {
    // Karat-specific pages (28-33)
    karat: [
      { key: '21k', en: '/gold-price-lebanon-21k', ar: '/ar/سعر-الذهب-عيار-21', fr: '/fr/prix-or-21-carats-liban' },
      { key: '18k', en: '/gold-price-lebanon-18k', ar: '/ar/سعر-الذهب-عيار-18', fr: '/fr/prix-or-18-carats-liban' },
      { key: '24k', en: '/gold-price-lebanon-24k', ar: '/ar/سعر-الذهب-عيار-24', fr: '/fr/prix-or-24-carats-liban' },
      { key: '14k', en: '/gold-price-lebanon-14k', ar: '/ar/سعر-الذهب-عيار-14', fr: '/fr/prix-or-14-carats-liban' },
      { key: 'lira', en: '/gold-lira-8g-price', ar: '/ar/سعر-ليرة-الذهب-8-غرام', fr: '/fr/prix-lira-or-8g' },
      { key: 'silver', en: '/silver-999-price-lebanon', ar: '/ar/سعر-الفضة-999-لبنان', fr: '/fr/prix-argent-999-liban' }
    ],
    // Currency-specific variants (34-36)
    currency: [
      { karat: '21k', currency: 'usd', en: '/gold-21k-price-usd', ar: '/ar/سعر-الذهب-21-بالدولار', fr: '/fr/prix-or-21k-usd' },
      { karat: '21k', currency: 'lbp', en: '/gold-21k-price-lbp', ar: '/ar/سعر-الذهب-21-بالليرة', fr: '/fr/prix-or-21k-lbp' },
      { karat: '18k', currency: 'usd', en: '/gold-18k-price-usd', ar: '/ar/سعر-الذهب-18-بالدولار', fr: '/fr/prix-or-18k-usd' },
      { karat: '18k', currency: 'lbp', en: '/gold-18k-price-lbp', ar: '/ar/سعر-الذهب-18-بالليرة', fr: '/fr/prix-or-18k-lbp' },
      { karat: '24k', currency: 'usd', en: '/gold-24k-price-usd', ar: '/ar/سعر-الذهب-24-بالدولار', fr: '/fr/prix-or-24k-usd' },
      { karat: '24k', currency: 'lbp', en: '/gold-24k-price-lbp', ar: '/ar/سعر-الذهب-24-بالليرة', fr: '/fr/prix-or-24k-lbp' }
    ],
    // Intent keyword variants (37-41)
    intent: [
      { key: 'today', en: '/gold-price-today-lebanon', ar: '/ar/سعر-الذهب-اليوم-لبنان', fr: '/fr/prix-or-aujourd-hui-liban' },
      { key: 'now', en: '/gold-price-now-lebanon', ar: '/ar/سعر-الذهب-الآن-لبنان', fr: '/fr/prix-or-maintenant-liban' },
      { key: 'live', en: '/gold-price-live-lebanon', ar: '/ar/سعر-الذهب-مباشر-لبنان', fr: '/fr/prix-or-en-direct-liban' },
      { key: 'scrap', en: '/scrap-gold-price-lebanon', ar: '/ar/سعر-ذهب-الخردة-لبنان', fr: '/fr/prix-or-de-recuperation-liban' },
      { key: 'calculator', en: '/gold-calculator-lebanon', ar: '/ar/حاسبة-الذهب-لبنان', fr: '/fr/calculateur-or-liban' }
    ],
    // Question pages (42-45)
    questions: [
      { key: '1g-21k', en: '/how-much-is-1g-21k-gold-lebanon-today', ar: '/ar/كم-سعر-غرام-21-ذهب-لبنان-اليوم', fr: '/fr/combien-coute-1g-or-21k-liban-aujourd-hui' },
      { key: '5g-21k', en: '/how-much-is-5g-21k-today', ar: '/ar/كم-سعر-5-غرام-21-ذهب-اليوم', fr: '/fr/combien-coute-5g-or-21k-aujourd-hui' },
      { key: 'ounce', en: '/how-much-is-ounce-gold-lebanon', ar: '/ar/كم-سعر-أونصة-الذهب-لبنان', fr: '/fr/combien-coute-once-or-liban' },
      { key: 'lira', en: '/how-much-is-gold-lira-lebanon-today', ar: '/ar/كم-سعر-ليرة-الذهب-لبنان-اليوم', fr: '/fr/combien-coute-lira-or-liban-aujourd-hui' }
    ],
    // City pages (46-50)
    cities: [
      { key: 'beirut', en: '/gold-price-beirut', ar: '/ar/سعر-الذهب-بيروت', fr: '/fr/prix-or-beyrouth' },
      { key: 'tripoli', en: '/gold-price-tripoli', ar: '/ar/سعر-الذهب-طرابلس', fr: '/fr/prix-or-tripoli' },
      { key: 'saida', en: '/gold-price-saida', ar: '/ar/سعر-الذهب-صيدا', fr: '/fr/prix-or-saida' },
      { key: 'zahle', en: '/gold-price-zahle', ar: '/ar/سعر-الذهب-زحلة', fr: '/fr/prix-or-zahle' },
      { key: 'jounieh', en: '/gold-price-jounieh', ar: '/ar/سعر-الذهب-جونيه', fr: '/fr/prix-or-jounieh' }
    ],
    // Use-case pages (51-55)
    usecases: [
      { key: 'ring', en: '/gold-ring-price-lebanon', ar: '/ar/سعر-خاتم-الذهب-لبنان', fr: '/fr/prix-bague-or-liban' },
      { key: 'wedding', en: '/wedding-gold-lebanon', ar: '/ar/ذهب-الزفاف-لبنان', fr: '/fr/or-mariage-liban' },
      { key: 'budget200', en: '/gold-gift-budget-200', ar: '/ar/هدية-ذهب-ميزانية-200', fr: '/fr/cadeau-or-budget-200' },
      { key: 'budget500', en: '/gold-gift-budget-500', ar: '/ar/هدية-ذهب-ميزانية-500', fr: '/fr/cadeau-or-budget-500' },
      { key: 'budget1000', en: '/gold-gift-budget-1000', ar: '/ar/هدية-ذهب-ميزانية-1000', fr: '/fr/cadeau-or-budget-1000' }
    ]
  },
  
  // Translations
  translations: {
    en: {
      siteName: 'LebanonRates.com',
      siteTagline: 'Lebanon\'s Daily Rates Tracker - Currency, Fuel & Gold Prices',
      navHome: 'Home',
      navUSD: 'USD Rate',
      navEUR: 'EUR Rate',
      navOfficial: 'Official Rates',
      navConverter: 'Converter',
      navFuel: 'Fuel Prices',
      navGold: 'Gold Price',
      navAbout: 'About',
      footerText: '© 2024 LebanonRates.com - Real-time Lebanese financial indicators',
      footerAbout: 'About',
      footerPrivacy: 'Privacy Policy'
    },
    ar: {
      siteName: 'أسعار لبنان',
      siteTagline: 'متتبع الأسعار اليومية في لبنان - العملات والوقود والذهب',
      navHome: 'الرئيسية',
      navUSD: 'سعر الدولار',
      navEUR: 'سعر اليورو',
      navOfficial: 'الأسعار الرسمية',
      navConverter: 'حاسبة التحويل',
      navFuel: 'أسعار الوقود',
      navGold: 'سعر الذهب',
      navAbout: 'حول الموقع',
      footerText: '© 2024 أسعار لبنان - المؤشرات المالية اللبنانية مباشرة',
      footerAbout: 'حول الموقع',
      footerPrivacy: 'سياسة الخصوصية'
    },
    fr: {
      siteName: 'LebanonRates.com',
      siteTagline: 'Suivi des tarifs quotidiens au Liban - Devises, Carburants et Or',
      navHome: 'Accueil',
      navUSD: 'Taux USD',
      navEUR: 'Taux EUR',
      navOfficial: 'Taux Officiels',
      navConverter: 'Convertisseur',
      navFuel: 'Prix Carburants',
      navGold: 'Prix de l\'Or',
      navAbout: 'À Propos',
      footerText: '© 2024 LebanonRates.com - Indicateurs financiers libanais en temps réel',
      footerAbout: 'À Propos',
      footerPrivacy: 'Politique de Confidentialité'
    }
  }
};