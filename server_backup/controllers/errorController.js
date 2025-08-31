const AppError = require('../utils/appError');

/**
 * Envoie une réponse d'erreur en mode développement avec des détails complets
 */
const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode || 500).json({
      status: err.status || 'error',
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // Rendu du site web
  console.error('ERROR ', err);
  return res.status(err.statusCode || 500).render('error', {
    title: 'Quelque chose a mal tourné !',
    msg: err.message || 'Une erreur est survenue'
  });
};

/**
 * Envoie une réponse d'erreur en mode production avec des informations limitées
 */
const sendErrorProd = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    // Erreurs opérationnelles, de confiance : envoyer le message au client
    if (err.isOperational) {
      return res.status(err.statusCode || 500).json({
        status: err.status || 'error',
        message: err.message
      });
    }
    
    // 1) Log l'erreur
    console.error('ERROR ', err);

    // 2) Envoyer un message générique
    return res.status(500).json({
      status: 'error',
      message: 'Quelque chose a très mal tourné !'
    });
  }

  // Rendu du site web
  if (err.isOperational) {
    return res.status(err.statusCode || 500).render('error', {
      title: 'Quelque chose a mal tourné !',
      msg: err.message
    });
  }

  // 1) Log l'erreur
  console.error('ERROR ', err);

  // 2) Afficher un message générique
  return res.status(500).render('error', {
    title: 'Quelque chose a très mal tourné !',
    msg: 'Veuillez réessayer plus tard.'
  });
};

/**
 * Gestionnaire d'erreurs global pour Express
 */
module.exports = (err, req, res, next) => {
  // Définir les valeurs par défaut si elles ne sont pas définies
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // Gestion des erreurs spécifiques en production
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

/**
 * Gestionnaires d'erreurs spécifiques (simplifiés pour le moment)
 */

// Gestion des ID MongoDB invalides
const handleCastErrorDB = err => {
  const message = `ID invalide: ${err.value}`;
  return new AppError(message, 400);
};

// Gestion des champs en double
const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const message = `Valeur en double: ${value}. Veuillez utiliser une autre valeur.`;
  return new AppError(message, 400);
};

// Gestion des erreurs de validation
const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Données d'entrée invalides. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Gestion des erreurs de token JWT invalide
const handleJWTError = () =>
  new AppError('Token invalide. Veuillez vous reconnecter !', 401);

// Gestion des erreurs de token JWT expiré
const handleJWTExpiredError = () =>
  new AppError('Votre session a expiré. Veuillez vous reconnecter !', 401);
