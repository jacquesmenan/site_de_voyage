const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');
const { security } = require('./config/security');
const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');

// Importation des routeurs
const viewRouter = require('./routes/viewRoutes');
const passwordRouter = require('./routes/passwordRoutes');
const emailTrackingRouter = require('./routes/emailTrackingRoutes');

// Routes temporairement désactivées jusqu'à ce que l'authentification soit configurée
// const userRouter = require('./routes/userRoutes');
// const authRouter = require('./routes/authRoutes');
// const securityRouter = require('./routes/securityRoutes');

// Démarrer l'application Express
const app = express();

// 1) MIDDLEWARES GLOBAUX

// Configuration du moteur de vue (Pug)
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Configuration CORS simplifiée pour le développement
const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Configuration Helmet pour la sécurité des en-têtes HTTP
app.use(helmet());

// Développement logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limiter les requêtes depuis une même API (simplifié pour le développement)
const limiter = rateLimit({
  max: 1000, // Augmenté pour le développement
  windowMs: 60 * 60 * 1000,
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer dans une heure!',
  standardHeaders: true,
  legacyHeaders: false
});

// Appliquer le rate limiting aux routes API
app.use('/api', limiter);

// Body parser, lecture des données du corps dans req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Nettoyage des données contre les attaques NoSQL injection
app.use(mongoSanitize());

// Nettoyage des données contre les attaques XSS
app.use(xss());

// Protection contre la pollution des paramètres HTTP
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// Compression des réponses HTTP
app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 2) ROUTES
// Routes de vues
app.use('/', viewRouter);

// Routes API
app.use('/api/v1/password', passwordRouter);
app.use('/api/v1/email', emailTrackingRouter);

// Routes API d'authentification et d'utilisateurs
app.use('/api/v1', require('../routes/authRoutes'));

// Routes de sécurité - Temporairement désactivées
// app.use('/api/v1/security', require('../routes/securityRoutes'));

// Route de test pour vérifier que l'API fonctionne
app.get('/api/v1/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is working!',
    time: req.requestTime
  });
});

// Gestion des routes non trouvées
app.all('*', (req, res, next) => {
  next(new AppError(`Impossible de trouver ${req.originalUrl} sur ce serveur!`, 404));
});

// Gestionnaire d'erreurs global
app.use(globalErrorHandler);

module.exports = app;