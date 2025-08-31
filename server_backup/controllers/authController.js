const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Fonction utilitaire pour créer un token JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

// Fonction pour envoyer le token JWT dans la réponse
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user.id);
  
  // Options du cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 90) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'lax',
    path: '/',
  };

  // Envoyer le token dans un cookie HTTP-Only
  res.cookie('jwt', token, cookieOptions);

  // Retirer le mot de passe de la sortie
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// Inscription d'un nouvel utilisateur
exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;

  // 1) Vérifier que les mots de passe correspondent
  if (password !== passwordConfirm) {
    return next(new AppError('Les mots de passe ne correspondent pas', 400));
  }

  try {
    // 2) Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          email_confirm: false
        }
      }
    });

    if (signUpError) {
      return next(new AppError(signUpError.message, 400));
    }

    // 3) Créer l'utilisateur dans la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        name,
        email,
        role: 'user',
        active: true,
        email_verified: false
      }])
      .select()
      .single();

    if (userError) {
      // Si l'insertion échoue, essayer de supprimer le compte d'authentification
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error('Erreur lors de la suppression du compte après échec:', deleteError);
      }
      return next(new AppError('Erreur lors de la création du profil utilisateur', 400));
    }

    // 4) Envoyer l'email de vérification
    const { error: emailError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.CLIENT_URL}/verify-email`
      }
    });

    if (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email de vérification:', emailError);
    }

    // 5) Envoyer la réponse
    createSendToken(authData.user, 201, req, res);

  } catch (error) {
    return next(new AppError('Une erreur est survenue lors de l\'inscription', 500));
  }
});

// Connexion utilisateur
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Vérifier si l'email et le mot de passe existent
  if (!email || !password) {
    return next(new AppError('Veuillez fournir un email et un mot de passe', 400));
  }

  // 2) Vérifier si l'utilisateur existe et si le mot de passe est correct
  const { data: user, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return next(new AppError('Email ou mot de passe incorrect', 401));
  }

  // 3) Si tout est correct, envoyer le token au client
  createSendToken(user.user, 200, req, res);
});

// Protection des routes - Vérification du token JWT
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  
  // 1) Récupérer le token
  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('Vous n\'êtes pas connecté. Veuillez vous connecter pour accéder à cette ressource.', 401));
  }

  // 2) Vérifier le token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Vérifier si l'utilisateur existe toujours
  const { data: currentUser, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', decoded.id)
    .single();

  if (error || !currentUser) {
    return next(new AppError('L\'utilisateur appartenant à ce token n\'existe plus.', 401));
  }

  // 4) Vérifier si l'utilisateur a changé son mot de passe après l'émission du token
  if (currentUser.password_changed_at) {
    const changedTimestamp = new Date(currentUser.password_changed_at).getTime() / 1000;
    if (decoded.iat < changedTimestamp) {
      return next(new AppError('L\'utilisateur a récemment changé son mot de passe. Veuillez vous reconnecter.', 401));
    }
  }

  // 5) Accorder l'accès à la route protégée
  req.user = currentUser;
  next();
});

// Restriction des routes en fonction des rôles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Vous n\'avez pas la permission d\'effectuer cette action', 403)
      );
    }
    next();
  };
};

// Réinitialisation du mot de passe - Étape 1: Demande de réinitialisation
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Récupérer l'utilisateur basé sur l'email
  const { email } = req.body;
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (userError || !user) {
    return next(new AppError('Aucun utilisateur avec cette adresse email', 404));
  }

  // 2) Générer un token de réinitialisation
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // 3) Enregistrer le token dans la base de données
  const { error: updateError } = await supabase
    .from('users')
    .update({
      password_reset_token: hashedToken,
      password_reset_expires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    })
    .eq('id', user.id);

  if (updateError) {
    return next(new AppError('Erreur lors de la génération du token de réinitialisation', 500));
  }

  // 4) Envoyer l'email de réinitialisation
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  
  // Ici, vous devriez implémenter l'envoi d'email
  console.log(`Lien de réinitialisation: ${resetUrl}`);

  res.status(200).json({
    status: 'success',
    message: 'Un email de réinitialisation a été envoyé'
  });
});

// Réinitialisation du mot de passe - Étape 2: Mise à jour du mot de passe
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;

  if (password !== passwordConfirm) {
    return next(new AppError('Les mots de passe ne correspondent pas', 400));
  }

  // 1) Vérifier le token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // 2) Vérifier si le token est valide et n'a pas expiré
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('password_reset_token', hashedToken)
    .gt('password_reset_expires', new Date())
    .single();

  if (userError || !user) {
    return next(new AppError('Le token est invalide ou a expiré', 400));
  }

  // 3) Mettre à jour le mot de passe
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: password
  });

  if (updateError) {
    return next(new AppError('Erreur lors de la mise à jour du mot de passe', 500));
  }

  // 4) Supprimer le token de réinitialisation
  await supabase
    .from('users')
    .update({
      password_reset_token: null,
      password_reset_expires: null,
      password_changed_at: new Date().toISOString()
    })
    .eq('id', user.id);

  // 5) Connecter automatiquement l'utilisateur
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: password
  });

  if (signInError) {
    return next(new AppError('Erreur lors de la connexion', 400));
  }

  // 6) Envoyer le token JWT
  createSendToken(authData.user, 200, req, res);
});

// Vérification d'email
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  
  if (!token) {
    return next(new AppError('Token de vérification manquant', 400));
  }

  try {
    // Vérifier le token avec Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      token,
      type: 'signup'
    });

    if (error) {
      return next(new AppError('Lien de vérification invalide ou expiré', 400));
    }

    // Mettre à jour l'utilisateur comme vérifié
    const { error: updateError } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('id', data.user.id);

    if (updateError) {
      return next(new AppError('Erreur lors de la vérification de l\'email', 500));
    }

    res.status(200).json({
      status: 'success',
      message: 'Email vérifié avec succès!'
    });
  } catch (error) {
    return next(new AppError('Erreur lors de la vérification de l\'email', 500));
  }
});

// Mise à jour du mot de passe (pour utilisateur connecté)
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;

  // 1) Vérifier que les nouveaux mots de passe correspondent
  if (newPassword !== newPasswordConfirm) {
    return next(new AppError('Les nouveaux mots de passe ne correspondent pas', 400));
  }

  // 2) Vérifier l'ancien mot de passe
  const { data: { user }, error } = await supabase.auth.signInWithPassword({
    email: req.user.email,
    password: currentPassword
  });

  if (error) {
    return next(new AppError('Le mot de passe actuel est incorrect', 401));
  }

  // 3) Mettre à jour le mot de passe
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword
  });

  if (updateError) {
    return next(new AppError('Erreur lors de la mise à jour du mot de passe', 500));
  }

  // 4) Mettre à jour la date de changement de mot de passe
  await supabase
    .from('users')
    .update({ 
      password_changed_at: new Date().toISOString() 
    })
    .eq('id', user.id);

  // 5) Connecter l'utilisateur avec le nouveau mot de passe
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: newPassword
  });

  // 6) Envoyer le nouveau token JWT
  createSendToken(authData.user, 200, req, res);
});