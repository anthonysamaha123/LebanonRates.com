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