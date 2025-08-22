const crypto = require('crypto');
const { promisify } = require('util');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const catchAsync = require('../utils/catchAsync');

// Fonction pour créer et envoyer un token de réinitialisation
const createSendToken = (user, statusCode, res) => {
  const token = user.createAuthToken();
  
  // Options du cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Envoyer le cookie
  res.cookie('jwt', token, cookieOptions);

  // Supprimer le mot de passe de la sortie
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

/**
 * Envoie un email de réinitialisation de mot de passe
 */
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Récupérer l'utilisateur basé sur l'email
  const user = await User.findOne({ email: req.body.email });
  
  if (!user) {
    return next(
      new AppError('Aucun utilisateur trouvé avec cette adresse email.', 404)
    );
  }

  // 2) Générer le token de réinitialisation
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Envoyer l'email
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
    
    // Créer une instance d'email avec l'ID utilisateur pour le suivi
    const email = new Email(user, resetURL);
    email.userId = user._id; // Ajouter l'ID utilisateur pour le suivi
    
    await email.sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Un email de réinitialisation a été envoyé à votre adresse email.'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("Une erreur est survenue lors de l'envoi de l'email. Veuillez réessayer plus tard.", 500)
    );
  }
});

/**
 * Réinitialise le mot de passe de l'utilisateur
 */
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Récupérer l'utilisateur basé sur le token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) Si le token n'a pas expiré et qu'il y a un utilisateur, définir le nouveau mot de passe
  if (!user) {
    return next(new AppError('Le token est invalide ou a expiré', 400));
  }

  // 3) Mettre à jour le mot de passe
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  
  await user.save();

  // 4) Connecter l'utilisateur, envoyer le JWT
  createSendToken(user, 200, res);
});

/**
 * Met à jour le mot de passe de l'utilisateur connecté
 */
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Récupérer l'utilisateur
  const user = await User.findById(req.user.id).select('+password');

  // 2) Vérifier si le mot de passe actuel est correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Votre mot de passe actuel est incorrect.', 401));
  }

  // 3) Si c'est bon, mettre à jour le mot de passe
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  await user.save();

  // 4) Connecter l'utilisateur, envoyer le JWT
  createSendToken(user, 200, res);
});
