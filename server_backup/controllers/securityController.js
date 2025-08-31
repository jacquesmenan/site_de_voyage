/**
 * Contrôleur de sécurité
 * 
 * Ce contrôleur gère les fonctionnalités liées à la sécurité de l'application,
 * comme la réinitialisation de mot de passe, la vérification de sécurité, etc.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const Email = require('../utils/email');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { security } = require('../config/security');

// Génère un jeton de réinitialisation de mot de passe
const createPasswordResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  const passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return { resetToken, passwordResetToken, passwordResetExpires };
};

// Envoie un email de réinitialisation de mot de passe
exports.requestPasswordReset = catchAsync(async (req, res, next) => {
  // 1. Vérifier si l'utilisateur existe avec l'email fourni
  const user = await User.findOne({ email: req.body.email });
  
  if (!user) {
    return next(new AppError('Aucun utilisateur trouvé avec cette adresse email.', 404));
  }
  
  // 2. Générer un jeton de réinitialisation
  const { resetToken, passwordResetToken, passwordResetExpires } = createPasswordResetToken();
  
  // 3. Enregistrer le jeton haché dans la base de données
  user.passwordResetToken = passwordResetToken;
  user.passwordResetExpires = passwordResetExpires;
  await user.save({ validateBeforeSave: false });
  
  try {
    // 4. Envoyer l'email de réinitialisation
    const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
    
    await new Email(user, resetURL).sendPasswordReset();
    
    res.status(200).json({
      status: 'success',
      message: 'Un email de réinitialisation a été envoyé à votre adresse email.'
    });
  } catch (err) {
    // En cas d'erreur d'envoi d'email, réinitialiser les champs
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    
    return next(
      new AppError(
        'Une erreur est survenue lors de l\'envoi de l\'email. Veuillez réessayer plus tard!',
        500
      )
    );
  }
});

// Réinitialise le mot de passe de l'utilisateur
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Récupérer l'utilisateur en fonction du jeton
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
    
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
  
  // 2. Si le jeton n'a pas expiré et qu'il y a un utilisateur, définir le nouveau mot de passe
  if (!user) {
    return next(new AppError('Le jeton est invalide ou a expiré', 400));
  }
  
  // 3. Mettre à jour le mot de passe
  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  
  // 4. Connecter l'utilisateur, envoyer le JWT
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
  
  // 5. Envoyer la réponse
  res.status(200).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  });
});

// Vérifie la force du mot de passe
exports.checkPasswordStrength = (req, res) => {
  const { password } = req.body;
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  // Calculer un score de force
  let strength = 0;
  let feedback = [];
  
  if (password.length >= minLength) strength += 1;
  else feedback.push(`Le mot de passe doit contenir au moins ${minLength} caractères`);
  
  if (hasUpperCase) strength += 1;
  else feedback.push('Ajoutez des lettres majuscules');
  
  if (hasLowerCase) strength += 1;
  else feedback.push('Ajoutez des lettres minuscules');
  
  if (hasNumbers) strength += 1;
  else feedback.push('Ajoutez des chiffres');
  
  if (hasSpecialChars) strength += 1;
  else feedback.push('Ajoutez des caractères spéciaux');
  
  // Déterminer le niveau de force
  let strengthLevel = 'faible';
  if (strength >= 4) strengthLevel = 'moyen';
  if (strength >= 5) strengthLevel = 'fort';
  
  res.status(200).json({
    status: 'success',
    data: {
      strength: strengthLevel,
      score: strength,
      maxScore: 5,
      feedback: feedback.length > 0 ? feedback : 'Mot de passe fort!'
    }
  });
};

// Récupère le statut de sécurité du compte
exports.getAccountSecurityStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.userId).select('+activeDevices +loginHistory');
  
  if (!user) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }
  
  // Vérifier si l'utilisateur a activé l'authentification à deux facteurs
  const has2FA = user.twoFactorEnabled || false;
  
  // Vérifier les appareils actifs
  const activeDevices = user.activeDevices || [];
  const hasSuspiciousDevices = activeDevices.some(device => device.isSuspicious);
  
  // Vérifier l'historique de connexion pour des activités suspectes
  const recentLogins = user.loginHistory
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);
  
  // Vérifier si le mot de passe est ancien (plus de 90 jours)
  const passwordAge = Math.floor((new Date() - user.passwordChangedAt) / (1000 * 60 * 60 * 24));
  const isPasswordOld = passwordAge > 90;
  
  res.status(200).json({
    status: 'success',
    data: {
      securityStatus: {
        has2FA,
        hasSuspiciousDevices,
        recentLogins,
        passwordAge,
        isPasswordOld,
        lastPasswordChange: user.passwordChangedAt,
        accountCreated: user.createdAt,
        lastLogin: user.lastLogin
      }
    }
  });
});

// Met à jour les paramètres de sécurité du compte
exports.updateSecuritySettings = catchAsync(async (req, res, next) => {
  const updates = {};
  const { enable2FA, notifyOnNewDevice, sessionLifetime } = req.body;
  
  if (typeof enable2FA === 'boolean') {
    updates.twoFactorEnabled = enable2FA;
  }
  
  if (typeof notifyOnNewDevice === 'boolean') {
    updates.notifyOnNewDevice = notifyOnNewDevice;
  }
  
  if (sessionLifetime) {
    updates.sessionLifetime = sessionLifetime;
  }
  
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { $set: updates },
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!user) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        twoFactorEnabled: user.twoFactorEnabled,
        notifyOnNewDevice: user.notifyOnNewDevice,
        sessionLifetime: user.sessionLifetime
      }
    }
  });
});

// Vérifie la réputation d'une adresse IP
exports.checkIpReputation = catchAsync(async (req, res) => {
  // Dans une implémentation réelle, vous pourriez utiliser un service comme AbuseIPDB ou IPQualityScore
  // Ceci est une implémentation factice pour l'exemple
  const clientIp = req.ip || req.connection.remoteAddress;
  
  // Simuler une vérification de réputation
  const isSuspicious = Math.random() < 0.1; // 10% de chance d'être suspect
  
  res.status(200).json({
    status: 'success',
    data: {
      ip: clientIp,
      isSuspicious,
      riskScore: isSuspicious ? Math.floor(Math.random() * 50) + 50 : Math.floor(Math.random() * 30),
      vpn: isSuspicious && Math.random() > 0.7,
      proxy: isSuspicious && Math.random() > 0.8,
      tor: isSuspicious && Math.random() > 0.9,
      recentAbuse: isSuspicious && Math.random() > 0.6,
      country: isSuspicious ? 'XX' : 'FR',
      isp: isSuspicious ? 'Réseau suspect' : 'Fournisseur Internet Fiable',
      lastSeen: new Date().toISOString()
    }
  });
});

// Récupère les journaux de sécurité
exports.getSecurityLogs = catchAsync(async (req, res) => {
  // Dans une implémentation réelle, vous récupéreriez cela à partir d'une base de données
  // Ceci est un exemple factice
  const logs = [
    {
      id: 1,
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      type: 'login',
      status: 'success',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'Paris, FR',
      device: 'Desktop, Windows 10',
      details: 'Connexion réussie'
    },
    // Ajoutez plus de logs factices si nécessaire
  ];
  
  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: {
      logs
    }
  });
});

// Signale une activité suspecte
exports.reportSuspiciousActivity = catchAsync(async (req, res) => {
  const { activityType, details, url } = req.body;
  
  // Ici, vous pourriez enregistrer l'activité suspecte dans une base de données
  // ou envoyer une alerte à l'administrateur
  
  res.status(200).json({
    status: 'success',
    message: 'Activité suspecte signalée avec succès',
    data: {
      activityType,
      reportedAt: new Date().toISOString(),
      reference: `REPORT-${Date.now()}`
    }
  });
});

// Vérifie la sécurité des cookies
exports.checkCookieSecurity = (req, res) => {
  // Vérifie si les cookies sont correctement configurés avec les attributs de sécurité
  const cookies = req.cookies || {};
  const secureCookies = [];
  
  // Vérifier chaque cookie pour les attributs de sécurité
  Object.entries(cookies).forEach(([name, value]) => {
    const cookie = req.signedCookies[name] ? req.signedCookies : req.cookies;
    const cookieHeader = req.get('Cookie') || '';
    
    const isSecure = cookieHeader.includes(`${name}=`) && 
                    (cookieHeader.includes('Secure') || cookieHeader.includes('secure'));
                    
    const isHttpOnly = cookieHeader.includes('HttpOnly') || cookieHeader.includes('httponly');
    const hasSameSite = cookieHeader.includes('SameSite') || cookieHeader.includes('samesite');
    
    secureCookies.push({
      name,
      secure: isSecure,
      httpOnly: isHttpOnly,
      sameSite: hasSameSite,
      signed: !!req.signedCookies[name]
    });
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      cookies: secureCookies,
      recommendations: secureCookies.length === 0 ? [
        'Aucun cookie détecté. Assurez-vous que les cookies sont correctement configurés avec les attributs Secure, HttpOnly et SameSite.'
      ] : [
        'Tous les cookies doivent avoir les attributs Secure et HttpOnly activés.',
        'Utilisez l\'attribut SameSite pour protéger contre les attaques CSRF.',
        'Signez les cookies sensibles pour prévenir la falsification.'
      ]
    }
  });
};

// Met à jour les préférences de cookies
exports.updateCookiePreferences = (req, res) => {
  const { analytics, marketing, necessary } = req.body;
  
  // Ici, vous pourriez enregistrer les préférences dans la base de données
  // ou dans un cookie sécurisé
  
  // Définir les cookies avec les préférences
  res.cookie('cookie_preferences', {
    analytics,
    marketing,
    necessary,
    updatedAt: new Date().toISOString()
  }, {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 an
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  res.status(200).json({
    status: 'success',
    message: 'Préférences de cookies mises à jour avec succès',
    data: {
      preferences: {
        analytics,
        marketing,
        necessary,
        updatedAt: new Date().toISOString()
      }
    }
  });
};

// Vérifie la sécurité des en-têtes HTTP
exports.checkHeadersSecurity = (req, res) => {
  const headers = req.headers;
  const securityHeaders = [
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'strict-transport-security'
  ];
  
  const missingHeaders = [];
  const presentHeaders = [];
  
  // Vérifier les en-têtes de sécurité manquants
  securityHeaders.forEach(header => {
    const headerValue = headers[header] || headers[header.toLowerCase()];
    
    if (!headerValue) {
      missingHeaders.push(header);
    } else {
      presentHeaders.push({
        name: header,
        value: headerValue
      });
    }
  });
  
  // Vérifier d'autres en-têtes de sécurité importants
  const otherSecurityChecks = [
    {
      name: 'X-XSS-Protection',
      present: !!headers['x-xss-protection'],
      recommended: '1; mode=block',
      description: 'Active la protection XSS dans les navigateurs plus anciens.'
    },
    {
      name: 'X-Content-Type-Options',
      present: !!headers['x-content-type-options'],
      recommended: 'nosniff',
      description: 'Empêche le navigateur de détecter automatiquement le type MIME.'
    },
    {
      name: 'X-Frame-Options',
      present: !!headers['x-frame-options'],
      recommended: 'DENY',
      description: 'Empêche le chargement de la page dans une iframe (protection contre le clickjacking).'
    },
    {
      name: 'Strict-Transport-Security',
      present: !!headers['strict-transport-security'],
      recommended: 'max-age=31536000; includeSubDomains; preload',
      description: 'Force l\'utilisation de HTTPS et active HSTS.'
    },
    {
      name: 'Content-Security-Policy',
      present: !!headers['content-security-policy'],
      recommended: 'Voir la documentation CSP pour une configuration détaillée',
      description: 'Définit une politique de sécurité du contenu pour atténuer les attaques XSS et d\'injection.'
    }
  ];
  
  res.status(200).json({
    status: 'success',
    data: {
      securityChecks: otherSecurityChecks,
      missingHeaders,
      presentHeaders,
      recommendations: [
        'Ajoutez tous les en-têtes de sécurité manquants.',
        'Configurez une politique de sécurité du contenu (CSP) stricte.',
        'Activez HSTS avec une durée de vie longue (au moins 1 an).',
        'Utilisez l\'attribut SameSite pour les cookies.',
        'Désactivez la mise en cache pour les pages sensibles.'
      ]
    }
  });
};
