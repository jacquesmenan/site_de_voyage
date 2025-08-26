const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Fonction utilitaire pour créer et envoyer le token JWT
};

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

  // Retirer les champs sensibles de la réponse
  const { password, ...userWithoutPassword } = user;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: userWithoutPassword
    }
  });
};

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
          email_confirm: false // Marquer l'email comme non vérifié
        }
      }
    });

    if (signUpError) {
      return next(new AppError(signUpError.message, 400));
    }

    // 3) Créer l'utilisateur dans la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          name,
          email,
          role: 'user',
          active: true,
          email_verified: false
        }
      ])
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

    // 5) Connecter automatiquement l'utilisateur
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (sessionError) {
      return next(new AppError('Inscription réussie mais échec de la connexion automatique', 201));
    }

    // 6) Envoyer la réponse avec le token JWT
    createSendToken(sessionData.user, 201, req, res);

  } catch (error) {
    console.error('Erreur inattendue lors de l\'inscription:', error);
    return next(new AppError('Une erreur est survenue lors de l\'inscription', 500));
  }
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Vérifier si l'email et le mot de passe existent
  if (!email || !password) {
    return next(new AppError('Veuillez fournir un email et un mot de passe', 400));
  }

  try {
    // 2) Authentifier l'utilisateur avec Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return next(new AppError('Email ou mot de passe incorrect', 401));
    }

    // 3) Vérifier si l'email est vérifié
    if (!data.user.email_confirmed_at) {
      return next(
        new AppError(
          'Votre compte n\'a pas encore été vérifié. Veuillez vérifier votre boîte email.',
          401
        )
      );
    }

    // 4) Récupérer les informations supplémentaires de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError || !userData) {
      return next(new AppError('Erreur lors de la récupération du profil utilisateur', 404));
    }

    // 5) Vérifier si le compte est actif
    if (userData.active === false) {
      return next(
        new AppError(
          'Votre compte a été désactivé. Veuillez contacter le support pour plus d\'informations.',
          401
        )
      );
    }

    // 6) Créer et envoyer le token JWT
    createSendToken(userData, 200, req, res);

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return next(new AppError('Une erreur est survenue lors de la connexion', 500));
  }
});

exports.logout = catchAsync(async (req, res) => {
  // Déconnecter l'utilisateur de Supabase
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Erreur lors de la déconnexion:', error);
  }
  
  // Supprimer le cookie JWT
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    path: '/'
  });
  
  res.status(200).json({ status: 'success' });
});

// Middleware pour protéger les routes
// Vérifie si l'utilisateur est connecté et valide le token JWT
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Récupérer le token et vérifier s'il existe
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token || token === 'loggedout') {
    return next(
      new AppError('Vous devez être connecté pour accéder à cette ressource', 401)
    );
  }

  try {
    // 2) Vérifier le token JWT
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // 3) Vérifier si l'utilisateur existe toujours
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();
    
    if (userError || !currentUser) {
      return next(
        new AppError('L\'utilisateur associé à ce token n\'existe plus.', 401)
      );
    }

    // 4) Vérifier si l'utilisateur a changé son mot de passe après l'émission du token
    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt(
        currentUser.passwordChangedAt.getTime() / 1000,
        10
      );

      if (decoded.iat < changedTimestamp) {
        return next(
          new AppError('Le mot de passe a été modifié récemment. Veuillez vous reconnecter.', 401)
        );
      }
    }

    // 5) Accorder l'accès à la route protégée
    req.user = currentUser;
    res.locals.user = currentUser;
    return next();
  } catch (err) {
    return next(new AppError('Session expirée. Veuillez vous reconnecter.', 401));
  }
});

// Vérifier si l'utilisateur est connecté (uniquement pour les pages rendues)
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) Vérifier le token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Vérifier si l'utilisateur existe toujours
      const { data: currentUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.id)
        .single();

      if (error || !currentUser) {
        return next();
      }

      // 3) Vérifier si l'utilisateur a changé son mot de passe après l'émission du token
      if (currentUser.passwordChangedAt) {
        const changedTimestamp = parseInt(
          currentUser.passwordChangedAt.getTime() / 1000,
          10
        );
        if (decoded.iat < changedTimestamp) {
          return next();
        }
      }

      // IL Y A UN UTILISATEUR CONNECTÉ
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
});

// Restreindre l'accès à certains rôles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles est un tableau ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Vous n\'avez pas la permission d\'effectuer cette action', 403)
      );
    }
    next();
  };
};

// Réinitialisation du mot de passe
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Récupérer l'utilisateur basé sur l'email
  const { email } = req.body;
  
  if (!email) {
    return next(new AppError('Veuillez fournir une adresse email', 400));
  }
  
  // 2) Générer le token de réinitialisation avec Supabase
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.CLIENT_URL}/reset-password`
  });
  
  if (error) {
    // Ne pas révéler si l'email existe ou non pour des raisons de sécurité
    console.error('Erreur lors de la demande de réinitialisation:', error);
    return next(
      new AppError(
        'Si un compte avec cet email existe, un email de réinitialisation a été envoyé.',
        200
      )
    );
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Un email de réinitialisation a été envoyé à votre adresse email.'
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Récupérer l'utilisateur basé sur le token
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;
  
  if (!password || !passwordConfirm) {
    return next(new AppError('Veuillez fournir un mot de passe et une confirmation', 400));
  }
  
  if (password !== passwordConfirm) {
    return next(new AppError('Les mots de passe ne correspondent pas', 400));
  }
  
  // 2) Vérifier le token et mettre à jour le mot de passe
  try {
    // Dans une application réelle, vous devrez implémenter la vérification du token
    // et la mise à jour du mot de passe via Supabase Auth
    // Ceci est un exemple simplifié
    
    // Supposons que le token contient l'email de l'utilisateur
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // Mettre à jour le mot de passe dans Supabase Auth
    const { data, error } = await supabase.auth.updateUser({
      password: req.body.password
    });
    
    if (error) {
      return next(new AppError('Erreur lors de la réinitialisation du mot de passe', 400));
    }
    
    // Mettre à jour le champ passwordChangedAt dans la table users
    await supabase
      .from('users')
      .update({ 
        password_changed_at: new Date().toISOString() 
      })
      .eq('id', data.user.id);
    
    // 3) Connecter l'utilisateur, envoyer le JWT
    const token = signToken(data.user.id);
    
    res.status(200).json({
      status: 'success',
      token
    });
    
  } catch (err) {
    return next(new AppError('Le lien de réinitialisation est invalide ou a expiré', 400));
  }
});

// Mise à jour du mot de passe pour un utilisateur connecté
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, passwordConfirm } = req.body;
  
  // 1) Vérifier que l'utilisateur est connecté
  if (!req.user || !req.user.id) {
    return next(new AppError('Vous devez être connecté pour effectuer cette action', 401));
  }
  
  // 2) Vérifier les champs obligatoires
  if (!currentPassword || !newPassword || !passwordConfirm) {
    return next(new AppError('Veuillez fournir tous les champs requis', 400));
  }
  
  if (newPassword !== passwordConfirm) {
    return next(new AppError('Les nouveaux mots de passe ne correspondent pas', 400));
  }
  
  try {
    // 3) Vérifier l'ancien mot de passe
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword
    });
    
    if (signInError) {
      return next(new AppError('Le mot de passe actuel est incorrect', 401));
    }
    
    // 4) Mettre à jour le mot de passe
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (updateError) {
      return next(new AppError('Erreur lors de la mise à jour du mot de passe', 400));
    }
    
    // 5) Mettre à jour le champ passwordChangedAt dans la table users
    await supabase
      .from('users')
      .update({ 
        password_changed_at: new Date().toISOString() 
      })
      .eq('id', req.user.id);
    
    // 6) Connecter l'utilisateur, envoyer le JWT
    createSendToken(updateData.user, 200, req, res);
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe:', error);
    return next(new AppError('Une erreur est survenue lors de la mise à jour du mot de passe', 500));
  }
});

// Vérification d'email
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  
  try {
    // Dans une application réelle, vous devrez implémenter la vérification du token
    // Ceci est un exemple simplifié
    
    // Supposons que le token contient l'ID de l'utilisateur
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_EMAIL_VERIFICATION_SECRET || process.env.JWT_SECRET);
    
    // Mettre à jour le statut de vérification d'email
    const { data, error } = await supabase
      .from('users')
      .update({ 
        email_verified: true,
        email_verified_at: new Date().toISOString()
      })
      .eq('id', decoded.id);
    
    if (error) {
      return next(new AppError('Erreur lors de la vérification de l\'email', 400));
    }
    
    // Rediriger vers la page de confirmation
    res.redirect(`${process.env.CLIENT_URL}/email-verified`);
    
  } catch (err) {
    return next(new AppError('Le lien de vérification est invalide ou a expiré', 400));
  }
});

// Renvoyer l'email de vérification
exports.resendVerificationEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return next(new AppError('Veuillez fournir une adresse email', 400));
  }
  
  try {
    // Vérifier si l'utilisateur existe et n'a pas encore vérifié son email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email_verified')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      // Ne pas révéler si l'email existe ou non
      return res.status(200).json({
        status: 'success',
        message: 'Si un compte avec cet email existe, un email de vérification a été envoyé.'
      });
    }
    
    if (user.email_verified) {
      return next(new AppError('Cet email a déjà été vérifié', 400));
    }
    
    // Envoyer l'email de vérification
    const { error: emailError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.CLIENT_URL}/verify-email`
      }
    });
    
    if (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email de vérification:', emailError);
      return next(new AppError('Erreur lors de l\'envoi de l\'email de vérification', 500));
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Un email de vérification a été envoyé à votre adresse email.'
    });
    
  } catch (error) {
    console.error('Erreur lors de la demande de renvoi d\'email de vérification:', error);
    return next(new AppError('Une erreur est survenue', 500));
  }
});

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

// Réinitialisation du mot de passe avec un token valide
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;
  
  // 1) Vérifier que les mots de passe sont fournis et correspondent
  if (!password || !passwordConfirm) {
    return next(new AppError('Veuillez fournir un mot de passe et une confirmation', 400));
  }
  
  if (password !== passwordConfirm) {
    return next(new AppError('Les mots de passe ne correspondent pas', 400));
  }
  
  try {
    // 2) Vérifier le token JWT
    const decoded = await promisify(jwt.verify)(
      token,
      process.env.JWT_PASSWORD_RESET_SECRET || process.env.JWT_SECRET
    );
    
    if (!decoded || !decoded.sub) {
      return next(new AppError('Token invalide ou expiré', 400));
    }
    
    // 3) Mettre à jour le mot de passe dans Supabase Auth
    const { data, error: updateError } = await supabase.auth.updateUser({
      password: password
    });
    
    if (updateError) {
      console.error('Erreur lors de la réinitialisation du mot de passe:', updateError);
      return next(new AppError('Erreur lors de la réinitialisation du mot de passe', 400));
    }
    
    // 4) Mettre à jour la date de changement de mot de passe dans la table users
    await supabase
      .from('users')
      .update({ 
        password_changed_at: new Date().toISOString() 
      })
      .eq('id', decoded.sub);
    
    // 5) Connecter l'utilisateur et envoyer le token JWT
    createSendToken(data.user, 200, req, res);
    
  } catch (err) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', err);
    return next(new AppError('Le lien de réinitialisation est invalide ou a expiré', 400));
  }
});

// Mise à jour du mot de passe pour un utilisateur connecté
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, passwordConfirm } = req.body;
  
  // 1) Vérifier que l'utilisateur est connecté
  if (!req.user || !req.user.id) {
    return next(new AppError('Vous devez être connecté pour effectuer cette action', 401));
  }
  
  // 2) Vérifier les champs obligatoires
  if (!currentPassword || !newPassword || !passwordConfirm) {
    return next(new AppError('Veuillez fournir tous les champs requis', 400));
  }
  
  if (newPassword !== passwordConfirm) {
    return next(new AppError('Les nouveaux mots de passe ne correspondent pas', 400));
  }
  
  try {
    // 3) Vérifier l'ancien mot de passe
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword
    });
    
    if (signInError) {
      return next(new AppError('Le mot de passe actuel est incorrect', 401));
    }
    
    // 4) Mettre à jour le mot de passe
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (updateError) {
      return next(new AppError('Erreur lors de la mise à jour du mot de passe', 400));
    }
    
    // 5) Mettre à jour le champ password_changed_at dans la table users
    await supabase
      .from('users')
      .update({ 
        password_changed_at: new Date().toISOString() 
      })
      .eq('id', req.user.id);
    
    // 6) Connecter l'utilisateur et envoyer le nouveau token JWT
    createSendToken(updateData.user, 200, req, res);
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe:', error);
    return next(new AppError('Une erreur est survenue lors de la mise à jour du mot de passe', 500));
  }
});

// Vérification d'email via un lien
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  
  if (!token) {
    return next(new AppError('Token de vérification manquant', 400));
  }
  
  try {
    // 1) Vérifier le token JWT
    const decoded = await promisify(jwt.verify)(
      token,
      process.env.JWT_EMAIL_VERIFICATION_SECRET || process.env.JWT_SECRET
    );
    
    if (!decoded || !decoded.id) {
      return next(new AppError('Token de vérification invalide', 400));
    }
    
    // 2) Mettre à jour le statut de vérification d'email dans la table users
    const { data: user, error: updateError } = await supabase
      .from('users')
      .update({ 
        email_verified: true,
        email_verified_at: new Date().toISOString()
      })
      .eq('id', decoded.id)
      .select()
      .single();
    
    if (updateError || !user) {
      console.error('Erreur lors de la vérification de l\'email:', updateError);
      return next(new AppError('Erreur lors de la vérification de l\'email', 400));
    }
    
    // 3) Rediriger vers la page de confirmation
    res.redirect(`${process.env.CLIENT_URL || '/'}?emailVerified=true`);
    
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'email:', error);
    return next(new AppError('Le lien de vérification est invalide ou a expiré', 400));
  }
});

// Renvoyer l'email de vérification
exports.resendVerificationEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return next(new AppError('Veuillez fournir une adresse email', 400));
  }
  
  try {
    // 1) Vérifier si l'utilisateur existe et n'a pas encore vérifié son email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email_verified')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      // Ne pas révéler si l'email existe ou non
      return res.status(200).json({
        status: 'success',
        message: 'Si un compte avec cet email existe, un email de vérification a été envoyé.'
      });
    }
    
    if (user.email_verified) {
      return next(new AppError('Cet email a déjà été vérifié', 400));
    }
    
    // 2) Envoyer l'email de vérification
    const { error: emailError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.CLIENT_URL}/verify-email`
      }
    });
    
    if (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email de vérification:', emailError);
      return next(new AppError('Erreur lors de l\'envoi de l\'email de vérification', 500));
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Un email de vérification a été envoyé à votre adresse email.'
    });
    
  } catch (error) {
    console.error('Erreur lors de la demande de renvoi d\'email de vérification:', error);
    return next(new AppError('Une erreur est survenue', 500));
  }
});
