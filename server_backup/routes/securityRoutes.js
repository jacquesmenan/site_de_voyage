/**
 * Routes de sécurité
 * 
 * Ce fichier contient les routes liées à la sécurité de l'application,
 * comme la réinitialisation de mot de passe, la vérification de sécurité, etc.
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const securityController = require('../controllers/securityController');
const { rateLimit } = require('express-rate-limit');
const { security } = require('../config/security');

// Configuration du rate limiting pour les routes de sécurité
const securityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limite chaque IP à 5 requêtes par fenêtre
  message: 'Trop de tentatives, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation des données pour la réinitialisation de mot de passe
const validatePasswordReset = [
  body('email').isEmail().withMessage('Veuillez fournir un email valide'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/[0-9]/)
    .withMessage('Le mot de passe doit contenir au moins un chiffre')
    .matches(/[a-z]/)
    .withMessage('Le mot de passe doit contenir au moins une lettre minuscule')
    .matches(/[A-Z]/)
    .withMessage('Le mot de passe doit contenir au moins une lettre majuscule')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Le mot de passe doit contenir au moins un caractère spécial'),
];

// Routes de sécurité
router.post(
  '/request-password-reset',
  securityLimiter,
  [
    body('email').isEmail().withMessage('Veuillez fournir un email valide')
  ],
  securityController.requestPasswordReset
);

router.post(
  '/reset-password/:token',
  securityLimiter,
  validatePasswordReset,
  securityController.resetPassword
);

// Vérification de la force du mot de passe
router.post(
  '/check-password-strength',
  [
    body('password').notEmpty().withMessage('Le mot de passe est requis')
  ],
  securityController.checkPasswordStrength
);

// Vérification de la sécurité du compte
router.get(
  '/account-security/:userId',
  securityController.getAccountSecurityStatus
);

// Mise à jour des paramètres de sécurité
router.put(
  '/account-security/:userId',
  [
    body('enable2FA').isBoolean().optional(),
    body('notifyOnNewDevice').isBoolean().optional(),
    body('sessionLifetime').isInt({ min: 1 }).optional()
  ],
  securityController.updateSecuritySettings
);

// Vérification de la sécurité de l'email
router.post(
  '/verify-email',
  securityLimiter,
  [
    body('email').isEmail().withMessage('Veuillez fournir un email valide')
  ],
  securityController.verifyEmail
);

// Vérification de la sécurité de l'IP
router.get(
  '/check-ip',
  securityLimiter,
  securityController.checkIpReputation
);

// Journalisation des événements de sécurité
router.get(
  '/security-logs',
  securityLimiter,
  securityController.getSecurityLogs
);

// Détection d'activité suspecte
router.post(
  '/report-suspicious-activity',
  [
    body('activityType').notEmpty().withMessage('Le type d\'activité est requis'),
    body('details').optional(),
    body('url').optional().isURL()
  ],
  securityController.reportSuspiciousActivity
);

// Vérification de la sécurité des cookies
router.get(
  '/cookie-security',
  securityController.checkCookieSecurity
);

// Mise à jour des préférences de cookies
router.post(
  '/update-cookie-preferences',
  [
    body('analytics').isBoolean().withMessage('La préférence analytics doit être un booléen'),
    body('marketing').isBoolean().withMessage('La préférence marketing doit être un booléen'),
    body('necessary').isBoolean().withMessage('La préférence nécessaire doit être un booléen')
  ],
  securityController.updateCookiePreferences
);

// Vérification de la sécurité des en-têtes HTTP
router.get(
  '/headers-security',
  securityController.checkHeadersSecurity
);

// Exportation du routeur
module.exports = router;
