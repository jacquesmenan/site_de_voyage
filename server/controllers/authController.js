const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const catchAsync = require('../utils/catchAsync');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  
  // Options du cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'lax'
  };

  // Envoyer le token dans un cookie HTTP-Only
  res.cookie('jwt', token, cookieOptions);

  // Retirer le mot de passe de la sortie
  user.password = undefined;
  user.active = undefined;
  user.role = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // Créer un nouvel utilisateur avec les données validées
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: 'user'
  });

  // Générer le token de vérification d'email
  const verificationToken = newUser.createEmailVerificationToken();
  await newUser.save({ validateBeforeSave: false });

  try {
    // Envoyer l'email de bienvenue
    const verificationURL = `${req.protocol}://${req.get('host')}/api/v1/users/verify-email/${verificationToken}`;
    await new Email(newUser, verificationURL).sendWelcome();
  } catch (err) {
    // En cas d'échec d'envoi d'email, supprimer l'utilisateur créé
    await User.findByIdAndDelete(newUser._id);
    return next(
      new AppError(
        'Une erreur est survenue lors de l\'envoi de l\'email de bienvenue. Veuillez réessayer plus tard.',
        500
      )
    );
  }

  // Connecter automatiquement l'utilisateur après l'inscription
  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Vérifier si l'email et le mot de passe existent
  if (!email || !password) {
    return next(new AppError('Veuillez fournir un email et un mot de passe', 400));
  }
  
  // 2) Vérifier si l'utilisateur existe et que le mot de passe est correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Email ou mot de passe incorrect', 401));
  }

  // 3) Vérifier si le compte est vérifié
  if (!user.emailVerified) {
    return next(
      new AppError(
        'Votre compte n\'a pas encore été vérifié. Veuillez vérifier votre boîte email.',
        401
      )
    );
  }

  // 4) Si tout est bon, envoyer le token au client
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Récupérer le token et vérifier s'il existe
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('Vous n\'êtes pas connecté. Veuillez vous connecter pour accéder à cette page.', 401)
    );
  }

  // 2) Vérifier le token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Vérifier si l'utilisateur existe toujours
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('L\'utilisateur associé à ce token n\'existe plus.', 401)
    );
  }

  // 4) Vérifier si l'utilisateur a changé de mot de passe après l'émission du token
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('Le mot de passe a été modifié récemment. Veuillez vous reconnecter.', 401)
    );
  }

  // ACCÈS ACCORDÉ
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Vérification des rôles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles est un tableau ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Vous n\'avez pas les droits pour effectuer cette action', 403)
      );
    }
    next();
  };
};

exports.restrictTo = restrictTo;

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
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Un email de réinitialisation a été envoyé à votre adresse email.'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('Une erreur est survenue lors de l\'envoi de l\'email. Veuillez réessayer plus tard.', 500)
    );
  }
});

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
  
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Mettre à jour le champ changedPasswordAt pour l'utilisateur
  // Géré par le middleware dans le modèle User

  // 4) Connecter l'utilisateur, envoyer le JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Récupérer l'utilisateur depuis la collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Vérifier si le mot de passe actuel est correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Votre mot de passe actuel est incorrect.', 401));
  }

  // 3) Si c'est le cas, mettre à jour le mot de passe
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate ne fonctionnera pas car les validateurs et les middlewares ne s'exécuteront pas

  // 4) Connecter l'utilisateur, envoyer le JWT
  createSendToken(user, 200, req, res);
});

// Vérification de l'email
exports.verifyEmail = catchAsync(async (req, res, next) => {
  // 1) Récupérer l'utilisateur basé sur le token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });

  // 2) Si le token n'a pas expiré et qu'il y a un utilisateur, vérifier l'email
  if (!user) {
    return next(new AppError('Le lien de vérification est invalide ou a expiré. Veuillez vous inscrire à nouveau.', 400));
  }
  
  // 3) Marquer l'email comme vérifié et supprimer le token
  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // 4) Connecter l'utilisateur, envoyer le JWT
  createSendToken(user, 200, req, res);
});
