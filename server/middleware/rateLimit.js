const rateLimit = require('express-rate-limit');
const AppError = require('../utils/appError');

// Limite le nombre de tentatives de connexion
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Bloque après 5 tentatives
  message: 'Trop de tentatives de connexion depuis cette adresse IP. Veuillez réessayer dans 15 minutes',
  handler: (req, res, next, options) => {
    throw new AppError(options.message, 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite le nombre de demandes de réinitialisation de mot de passe
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // Bloque après 3 demandes
  message: 'Trop de demandes de réinitialisation. Veuillez réessayer dans une heure',
  handler: (req, res, next, options) => {
    throw new AppError(options.message, 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite le nombre de tentatives de réinitialisation avec un token
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // Bloque après 5 tentatives
  message: 'Trop de tentatives de réinitialisation. Veuillez réessayer dans une heure',
  handler: (req, res, next, options) => {
    throw new AppError(options.message, 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  passwordResetLimiter,
  resetPasswordLimiter,
};
