/**
 * Configuration de sécurité pour l'application
 * 
 * Ce fichier contient les paramètres de sécurité pour l'application,
 * notamment la politique de sécurité du contenu (CSP) et d'autres en-têtes de sécurité.
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Configuration de la politique de sécurité du contenu (CSP)
 * 
 * La CSP définit les sources de contenu de confiance pour divers types de ressources.
 * Cela permet de prévenir les attaques XSS en limitant les sources de contenu.
 */
const cspConfig = {
  directives: {
    // Sources par défaut pour tout type de contenu non spécifié ci-dessous
    defaultSrc: ["'self'"],
    
    // Sources pour les scripts JavaScript
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://www.googletagmanager.com",
      "https://connect.facebook.net",
      "https://kit.fontawesome.com",
      "https://cdn.jsdelivr.net"
    ],
    
    // Sources pour les feuilles de style CSS
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com"
    ],
    
    // Sources pour les images
    imgSrc: [
      "'self'",
      "data:",
      "https://www.googletagmanager.com",
      "https://www.facebook.com",
      "https://stats.g.doubleclick.net",
      "https://www.google-analytics.com"
    ],
    
    // Sources pour les polices
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "https://kit.fontawesome.com"
    ],
    
    // Sources pour les iframes
    frameSrc: [
      "'self'",
      "https://www.googletagmanager.com",
      "https://www.facebook.com"
    ],
    
    // Sources pour les connexions (XHR, WebSocket, EventSource, etc.)
    connectSrc: [
      "'self'",
      "https://www.google-analytics.com",
      "https://region1.google-analytics.com",
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.facebook.com",
      "https://*.facebook.net",
      "https://*.fbcdn.net"
    ],
    
    // Sources pour les médias (audio, vidéo)
    mediaSrc: [
      "'self'"
    ],
    
    // Sources pour les objets (object, embed, applet)
    objectSrc: ["'none'"],
    
    // Sources pour les formulaires
    formAction: ["'self'"],
    
    // Sources pour les frames intégrés
    childSrc: ["'self'"],
    
    // Sources pour les workers et scripts partagés
    workerSrc: ["'self'"],
    
    // Sources pour les frames ancêtres
    frameAncestors: ["'none'"],
    
    // URL de rapport de violation de la CSP (à activer en production)
    reportUri: isProduction ? '/api/security/csp-report' : null,
    
    // Mode rapport uniquement (désactive la CSP, ne fait que rapporter les violations)
    reportOnly: !isProduction
  },
  
  // Désactiver la CSP dans l'environnement de développement
  disableAndroid: !isProduction,
  browserSniff: false
};

/**
 * Configuration des en-têtes de sécurité HTTP
 */
const securityHeaders = {
  // Empêche le navigateur de détecter automatiquement le type MIME
  nosniff: 'nosniff',
  
  // Empêche le chargement de la page dans une iframe
  xFrameOptions: 'DENY',
  
  // Active la protection XSS dans les navigateurs qui la prennent en charge
  xssProtection: '1; mode=block',
  
  // Désactive la mise en cache côté client
  cacheControl: 'no-store',
  
  // Empêche le navigateur de deviner le type MIME
  xContentTypeOptions: 'nosniff',
  
  // Politique de référenceur (referrer)
  referrerPolicy: 'strict-origin-when-cross-origin',
  
  // Options de permissions (API Permissions Policy)
  permissionsPolicy: {
    camera: '()',
    geolocation: '()',
    microphone: '()',
    payment: '()',
    usb: '()',
    fullscreen: '()',
    autoplay: '()',
    'document-domain': '()',
    'encrypted-media': '()',
    'picture-in-picture': '()',
    accelerometer: '()',
    gyroscope: '()',
    magnetometer: '()',
    midi: '()',
    'sync-xhr': '()',
    vr: '()',
    speaker: '()',
    vibrate: '()',
    notifications: '()',
    push: '()',
    'web-share': '()'
  },
  
  // En-têtes supplémentaires pour la sécurité
  contentSecurityPolicy: cspConfig,
  
  // HSTS (Strict-Transport-Security)
  hsts: {
    maxAge: 15552000, // 180 jours en secondes
    includeSubDomains: true,
    preload: true
  },
  
  // Configuration CORS
  cors: {
    origin: isProduction ? 'https://www.cedricdubaisolutions.com' : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 heures
  }
};

/**
 * Configuration du middleware de sécurité Helmet
 */
const helmetConfig = {
  // Active la protection contre le détournement de clics (clickjacking)
  frameguard: { action: 'deny' },
  
  // Désactive la mise en cache pour les anciennes versions d'IE
  ieNoOpen: true,
  
  // Active la protection contre le reniflage MIME
  noSniff: true,
  
  // Protège contre les attaques XSS
  xssFilter: true,
  
  // Configure la politique de sécurité du contenu (CSP)
  contentSecurityPolicy: cspConfig,
  
  // Active HSTS (Strict-Transport-Security)
  hsts: securityHeaders.hsts,
  
  // Désactive la mise en cache côté client
  noCache: true
};

module.exports = {
  csp: cspConfig,
  headers: securityHeaders,
  helmet: helmetConfig,
  cors: securityHeaders.cors,
  
  // Clé secrète pour les sessions (à remplacer par une valeur aléatoire sécurisée)
  sessionSecret: process.env.SESSION_SECRET || 'votre-clé-secrète-très-longue-et-aléatoire',
  
  // Configuration du taux limite (rate limiting)
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limite chaque IP à 100 requêtes par fenêtre
    message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.'
  },
  
  // Configuration de la protection CSRF
  csrf: {
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 heures
    }
  },
  
  // Configuration de la sécurité des en-têtes
  secureHeaders: {
    // Désactive l'en-tête X-Powered-By
    hidePoweredBy: true,
    
    // Empêche l'ouverture de la page dans une iframe
    frameguard: { action: 'deny' },
    
    // Active la protection XSS dans les navigateurs plus anciens
    xssFilter: true,
    
    // Empêche le navigateur de détecter automatiquement le type MIME
    noSniff: true,
    
    // Désactive la mise en cache pour les anciennes versions d'IE
    ieNoOpen: true,
    
    // Active HSTS (Strict-Transport-Security)
    hsts: securityHeaders.hsts,
    
    // Désactive la mise en cache côté client
    noCache: true
  }
};
