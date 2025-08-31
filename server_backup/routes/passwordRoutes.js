const express = require('express');
const { body } = require('express-validator');
const passwordController = require('../controllers/passwordController');
const authController = require('../controllers/authController');
const { validateRequest } = require('../middleware/validateRequest');
const { passwordResetLimiter, resetPasswordLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Route pour demander une réinitialisation de mot de passe
router.post(
  '/forgot-password',
  [
    body('email')
      .isEmail()
      .withMessage('Veuillez fournir une adresse email valide')
      .normalizeEmail(),
  ],
  passwordResetLimiter, // Limite les tentatives de demande
  validateRequest,
  passwordController.forgotPassword
);

// Route pour réinitialiser le mot de passe avec un token valide
router.patch(
  '/reset-password/:token',
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial'),
    body('passwordConfirm')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
        return true;
      })
  ],
  resetPasswordLimiter, // Limite les tentatives de réinitialisation
  validateRequest,
  passwordController.resetPassword
);

// Protéger toutes les routes suivantes (nécessite une authentification)
router.use(authController.protect);

// Route pour mettre à jour le mot de passe de l'utilisateur connecté
router.patch(
  '/update-my-password',
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Le mot de passe actuel est requis'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial'),
    body('newPasswordConfirm')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
        return true;
      })
  ],
  validateRequest,
  passwordController.updatePassword
);

module.exports = router;
