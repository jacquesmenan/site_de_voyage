/**
 * Middleware de sécurité pour Express
 * 
 * Ce middleware applique des en-têtes de sécurité HTTP et d'autres mesures de protection
 * pour renforcer la sécurité de l'application.
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const { security } = require('../config/security');

// Fonction pour créer un middleware de sécurité complet
function setupSecurity(app) {
  // 1. Configuration de base avec Helmet
  app.use(helmet(security.helmet));
  
  // 2. Configuration CORS
  const cors = require('cors');
  app.use(cors(security.cors));
  
  // 3. Configuration du rate limiting
  const limiter = rateLimit({
    windowMs: security.rateLimit.windowMs,
    max: security.rateLimit.max,
    message: security.rateLimit.message,
    standardHeaders: true, // Retourne les informations de limite de taux dans les en-têtes `RateLimit-*`
    legacyHeaders: false, // Désactive les en-têtes `X-RateLimit-*`
  });
  
  // Appliquer le rate limiting à toutes les requêtes API
  app.use('/api', limiter);
  
  // 4. Configuration CSRF (à utiliser avec les formulaires)
  const csrfProtection = csrf({
    cookie: security.csrf.cookie
  });
  
  // Ajouter un middleware pour exposer le jeton CSRF aux vues
  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
    next();
  });
  
  // 5. En-têtes de sécurité personnalisés
  app.use((req, res, next) => {
    // En-têtes de sécurité supplémentaires
    res.setHeader('X-Content-Type-Options', security.headers.nosniff);
    res.setHeader('X-Frame-Options', security.headers.xFrameOptions);
    res.setHeader('X-XSS-Protection', security.headers.xssProtection);
    res.setHeader('Referrer-Policy', security.headers.referrerPolicy);
    
    // En-têtes de contrôle de cache
    res.setHeader('Cache-Control', security.headers.cacheControl);
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // En-têtes de sécurité supplémentaires recommandés
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('X-Download-Options', 'noopen');
    
    // En-tête Permissions-Policy (anciennement Feature-Policy)
    const permissionsPolicy = Object.entries(security.headers.permissionsPolicy)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
    
    res.setHeader('Permissions-Policy', permissionsPolicy);
    
    next();
  });
  
  // 6. Gestion des erreurs CSP (Content Security Policy)
  if (process.env.NODE_ENV === 'production') {
    app.post('/api/security/csp-report', express.json({ type: 'application/json' }), (req, res) => {
      console.error('CSP Violation:', req.body);
      res.status(204).end(); // Répondre avec 204 No Content
    });
  }
  
  // 7. Middleware pour la protection contre les attaques par injection
  app.use((req, res, next) => {
    // Protection contre l'injection de code dans les en-têtes
    const xssProtect = (value) => {
      if (!value) return value;
      return value.toString().replace(/[<>]/g, '');
    };
    
    // Nettoyer les en-têtes de requête potentiellement dangereux
    Object.keys(req.headers).forEach(header => {
      req.headers[header] = xssProtect(req.headers[header]);
    });
    
    // Protection contre les attaques par injection dans les paramètres de requête
    const cleanQuery = {};
    Object.entries(req.query).forEach(([key, value]) => {
      cleanQuery[xssProtect(key)] = xssProtect(value);
    });
    req.query = cleanQuery;
    
    next();
  });
  
  // 8. Middleware pour la protection contre les attaques par force brute
  const slowDown = require('express-slow-down');
  
  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // autoriser 50 requêtes par fenêtre, puis...
    delayMs: 100 // ajouter 100ms de délai par requête au-delà du seuil
  });
  
  // Appliquer le ralentissement aux routes d'authentification
  app.use(['/api/auth/login', '/api/auth/register'], speedLimiter);
  
  // 9. Middleware pour la protection contre les attaques par injection NoSQL
  const mongoSanitize = require('express-mongo-sanitize');
  app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`Tentative d'injection NoSQL détectée:`, { 
        url: req.originalUrl, 
        key, 
        ip: req.ip 
      });
    }
  }));
  
  // 10. Middleware pour la protection contre les attaques XSS
  const xss = require('xss-clean');
  app.use(xss());
  
  // 11. Middleware pour la protection contre les attaques par injection de paramètres HTTP
  const hpp = require('hpp');
  app.use(hpp());
  
  // 12. Journalisation des erreurs de sécurité
  app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
      // Gestion des erreurs CSRF
      console.error('Erreur CSRF détectée:', {
        ip: req.ip,
        url: req.originalUrl,
        method: req.method,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer || req.headers.referrer
      });
      
      return res.status(403).json({
        error: 'Accès refusé. Jeton de sécurité invalide.'
      });
    }
    
    // Journalisation des autres erreurs de sécurité
    if (err.status === 401 || err.status === 403) {
      console.error('Tentative d\'accès non autorisée:', {
        ip: req.ip,
        url: req.originalUrl,
        method: req.method,
        userAgent: req.headers['user-agent']
      });
    }
    
    next(err);
  });
  
  return {
    csrfProtection,
    limiter,
    speedLimiter
  };
}

module.exports = {
  setupSecurity
};
