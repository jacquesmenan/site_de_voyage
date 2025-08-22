const { validationResult } = require('express-validator');
const AppError = require('../utils/appError');

/**
 * Middleware qui valide les données de la requête selon les règles définies
 * Doit être utilisé après les validateurs express-validator
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));
    
    return next(
      new AppError('Données de requête invalides', 400, {
        errors: errorMessages
      })
    );
  }
  next();
};

// Règles de validation pour la réinitialisation de mot de passe
const passwordResetRules = {
  email: {
    isEmail: {
      errorMessage: 'Veuillez fournir une adresse email valide',
    },
    normalizeEmail: true,
  },
  password: {
    isLength: {
      options: { min: 8 },
      errorMessage: 'Le mot de passe doit contenir au moins 8 caractères',
    },
    matches: {
      options: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      errorMessage: 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial',
    },
  },
  passwordConfirm: {
    custom: {
      options: (value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
        return true;
      },
    },
  },
};

// Règles pour la demande de réinitialisation
const forgotPasswordRules = {
  email: {
    isEmail: {
      errorMessage: 'Veuillez fournir une adresse email valide',
    },
    normalizeEmail: true,
  },
};

// Règles pour la réinitialisation du mot de passe
const resetPasswordRules = {
  password: passwordResetRules.password,
  passwordConfirm: passwordResetRules.passwordConfirm,
};

module.exports = {
  validateRequest,
  passwordResetRules,
  forgotPasswordRules,
  resetPasswordRules,
};
