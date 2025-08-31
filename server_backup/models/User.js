const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Schéma de l'utilisateur
const userSchema = new mongoose.Schema(
  {
    // Informations de base
    name: {
      type: String,
      required: [true, 'Veuillez fournir un nom'],
      trim: true,
      maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères'],
      minlength: [2, 'Le nom doit contenir au moins 2 caractères']
    },
    email: {
      type: String,
      required: [true, 'Veuillez fournir un email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Veuillez fournir un email valide']
    },
    photo: {
      type: String,
      default: 'default.jpg'
    },
    role: {
      type: String,
      enum: ['user', 'guide', 'lead-guide', 'admin'],
      default: 'user'
    },
    
    // Authentification
    password: {
      type: String,
      required: [true, 'Veuillez fournir un mot de passe'],
      minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
      select: false
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Veuillez confirmer votre mot de passe'],
      validate: {
        // Ne fonctionne que sur SAVE et CREATE !
        validator: function(el) {
          return el === this.password;
        },
        message: 'Les mots de passe ne correspondent pas'
      }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Authentification à deux facteurs
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: String,
    twoFactorRecoveryCodes: [String],
    
    // Gestion des sessions et de la sécurité
    active: {
      type: Boolean,
      default: true,
      select: false
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    lockUntil: {
      type: Date,
      select: false
    },
    lastLogin: Date,
    loginHistory: [
      {
        timestamp: Date,
        ip: String,
        userAgent: String,
        location: {
          type: {
            type: String,
            default: 'Point',
            enum: ['Point']
          },
          coordinates: [Number],
          address: String,
          description: String
        },
        status: {
          type: String,
          enum: ['success', 'failed', 'suspicious'],
          default: 'success'
        },
        deviceInfo: {
          os: String,
          browser: String,
          device: String
        }
      }
    ],
    activeDevices: [
      {
        deviceId: String,
        ip: String,
        userAgent: String,
        lastActive: Date,
        isCurrentDevice: Boolean,
        isTrusted: {
          type: Boolean,
          default: false
        },
        isSuspicious: {
          type: Boolean,
          default: false
        },
        location: {
          type: {
            type: String,
            default: 'Point',
            enum: ['Point']
          },
          coordinates: [Number],
          address: String
        },
        deviceInfo: {
          os: String,
          browser: String,
          device: String
        }
      }
    ],
    
    // Préférences de sécurité
    securityQuestions: [
      {
        question: String,
        answer: String
      }
    ],
    notifyOnNewDevice: {
      type: Boolean,
      default: true
    },
    sessionLifetime: {
      type: Number,
      default: 7 * 24 * 60 * 60 * 1000, // 7 jours en millisecondes
      min: 15 * 60 * 1000 // 15 minutes minimum
    },
    
    // Données de profil
    phone: {
      type: String,
      validate: {
        validator: function(v) {
          return /^\+?[1-9]\d{1,14}$/.test(v); // Format E.164
        },
        message: 'Veuillez fournir un numéro de téléphone valide avec l\'indicatif du pays'
      }
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say'],
      lowercase: true
    },
    
    // Préférences utilisateur
    language: {
      type: String,
      default: 'fr',
      enum: ['fr', 'en', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ar']
    },
    timezone: {
      type: String,
      default: 'Europe/Paris'
    },
    currency: {
      type: String,
      default: 'EUR',
      enum: ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD', 'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'INR', 'RUB', 'BRL', 'ZAR', 'AED']
    },
    
    // Statistiques et métriques
    loginCount: {
      type: Number,
      default: 0
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lastFailedLogin: Date,
    accountLocked: {
      type: Boolean,
      default: false
    },
    accountLockedUntil: Date,
    
    // Champs techniques
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    lastPasswordChange: Date,
    lastProfileUpdate: Date,
    lastActivity: Date,
    
    // Champs pour la suppression de compte
    deletionRequested: {
      type: Boolean,
      default: false
    },
    deletionRequestedAt: Date,
    deletionReason: String,
    accountScheduledForDeletion: Date,
    
    // Champs pour l'audit
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    deletedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    deletedAt: Date
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index pour les recherches fréquentes
userSchema.index({ email: 1 });
userSchema.index({ 'activeDevices.deviceId': 1 });
userSchema.index({ 'loginHistory.timestamp': -1 });

// Middleware de pré-sauvegarde : hacher le mot de passe
userSchema.pre('save', async function(next) {
  // Ne l'exécuter que si le mot de passe a été modifié (ou est nouveau)
  if (!this.isModified('password')) return next();
  
  // Hacher le mot de passe avec un coût de 12
  this.password = await bcrypt.hash(this.password, 12);
  
  // Supprimer le champ passwordConfirm
  this.passwordConfirm = undefined;
  
  // Mettre à jour la date de changement de mot de passe
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // 1 seconde dans le passé pour s'assurer que le jeton est valide
  }
  
  next();
});

// Méthode pour vérifier le mot de passe
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Méthode pour vérifier si le mot de passe a été changé après l'émission du jeton
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  
  // False signifie que le mot de passe n'a pas été changé
  return false;
};

// Méthode pour créer un jeton de réinitialisation de mot de passe
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Méthode pour créer un jeton de vérification d'email
userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 heures
  
  return verificationToken;
};

// Méthode pour vérifier le jeton de réinitialisation de mot de passe
userSchema.methods.verifyPasswordResetToken = function(token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
    
  return (
    this.passwordResetToken === hashedToken &&
    this.passwordResetExpires > Date.now()
  );
};

// Méthode pour vérifier le jeton de vérification d'email
userSchema.methods.verifyEmailToken = function(token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
    
  return (
    this.emailVerificationToken === hashedToken &&
    this.emailVerificationExpires > Date.now()
  );
};

// Méthode pour ajouter une tentative de connexion échouée
userSchema.methods.addFailedLoginAttempt = async function(ip, userAgent, location) {
  this.failedLoginAttempts += 1;
  this.lastFailedLogin = Date.now();
  
  // Verrouiller le compte après 5 tentatives échouées pendant 30 minutes
  if (this.failedLoginAttempts >= 5) {
    this.accountLocked = true;
    this.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }
  
  // Ajouter à l'historique de connexion
  this.loginHistory.push({
    timestamp: new Date(),
    ip,
    userAgent,
    location,
    status: 'failed',
    deviceInfo: this.extractDeviceInfo(userAgent)
  });
  
  await this.save({ validateBeforeSave: false });
};

// Méthode pour réinitialiser les tentatives de connexion échouées
userSchema.methods.resetFailedLoginAttempts = async function() {
  if (this.failedLoginAttempts > 0 || this.accountLocked) {
    this.failedLoginAttempts = 0;
    this.accountLocked = false;
    this.accountLockedUntil = undefined;
    await this.save({ validateBeforeSave: false });
  }
};

// Méthode pour extraire les informations sur l'appareil à partir du user-agent
userSchema.methods.extractDeviceInfo = function(userAgent) {
  // Cette méthode est simplifiée et devrait utiliser une bibliothèque comme 'ua-parser-js' en production
  const ua = userAgent || '';
  let os = 'Inconnu';
  let browser = 'Inconnu';
  let device = 'Ordinateur';
  
  // Détection du système d'exploitation
  if (ua.match(/windows/i)) os = 'Windows';
  else if (ua.match(/macintosh|mac os x/i)) os = 'macOS';
  else if (ua.match(/linux/i)) os = 'Linux';
  else if (ua.match(/android/i)) os = 'Android';
  else if (ua.match(/iphone|ipad|ipod/i)) os = 'iOS';
  
  // Détection du navigateur
  if (ua.match(/edg/i)) browser = 'Microsoft Edge';
  else if (ua.match(/opr|opera/i)) browser = 'Opera';
  else if (ua.match(/chrome|chromium|crios/i)) browser = 'Chrome';
  else if (ua.match(/firefox|fxios/i)) browser = 'Firefox';
  else if (ua.match(/safari/i)) browser = 'Safari';
  else if (ua.match(/msie|trident/i)) browser = 'Internet Explorer';
  
  // Détection du type d'appareil
  if (ua.match(/mobile/i)) device = 'Mobile';
  else if (ua.match(/tablet|ipad|playbook|silk/i)) device = 'Tablette';
  
  return { os, browser, device };
};

// Méthode pour ajouter un appareil actif
userSchema.methods.addActiveDevice = function(deviceId, ip, userAgent, location) {
  const deviceInfo = this.extractDeviceInfo(userAgent);
  const deviceIndex = this.activeDevices.findIndex(device => device.deviceId === deviceId);
  
  const deviceData = {
    deviceId,
    ip,
    userAgent,
    lastActive: new Date(),
    isCurrentDevice: true,
    isTrusted: false, // L'utilisateur devra confirmer qu'il s'agit d'un appareil de confiance
    isSuspicious: this.checkIfSuspicious(ip, location, deviceInfo),
    location,
    deviceInfo
  };
  
  if (deviceIndex === -1) {
    // Nouvel appareil
    this.activeDevices.push(deviceData);
  } else {
    // Mise à jour d'un appareil existant
    this.activeDevices[deviceIndex] = {
      ...this.activeDevices[deviceIndex].toObject(),
      ...deviceData,
      isTrusted: this.activeDevices[deviceIndex].isTrusted // Conserver le statut de confiance
    };
  }
  
  // Marquer les autres appareils comme non actuels
  this.activeDevices.forEach(device => {
    if (device.deviceId !== deviceId) {
      device.isCurrentDevice = false;
    }
  });
  
  return deviceData;
};

// Méthode pour vérifier si une connexion est suspecte
userSchema.methods.checkIfSuspicious = function(ip, location, deviceInfo) {
  // Vérifier si l'IP est dans une plage connue de VPN/Tor
  // Note: Dans une application réelle, utilisez un service comme ipinfo.io ou ipapi.co
  const vpnRanges = [
    // Exemple de plages IP connues (à remplacer par des données réelles)
    '185.107.56.0/24',
    '103.10.197.0/24'
  ];
  
  const isVpn = vpnRanges.some(range => {
    // Logique de vérification de plage IP (simplifiée)
    return ip.startsWith(range.split('/')[0]);
  });
  
  // Vérifier les changements de localisation inhabituels
  let locationChanged = false;
  if (this.loginHistory.length > 0) {
    const lastLogin = this.loginHistory[0];
    if (lastLogin.location && location) {
      // Vérifier si la localisation a changé de manière significative
      // (par exemple, connexion depuis un autre pays en peu de temps)
      locationChanged = lastLogin.location.country !== location.country;
    }
  }
  
  // Vérifier les changements d'appareil inhabituels
  let deviceChanged = false;
  if (this.loginHistory.length > 0) {
    const lastDevice = this.loginHistory[0].deviceInfo;
    if (lastDevice) {
      deviceChanged = lastDevice.os !== deviceInfo.os || 
                     lastDevice.browser !== deviceInfo.browser ||
                     lastDevice.device !== deviceInfo.device;
    }
  }
  
  // Marquer comme suspect si l'une des conditions est remplie
  return isVpn || locationChanged || deviceChanged;
};

// Middleware pour les requêtes find qui ne renvoient que les utilisateurs actifs
userSchema.pre(/^find/, function(next) {
  // this pointe vers la requête en cours
  this.find({ active: { $ne: false } });
  next();
});

// Création du modèle
const User = mongoose.model('User', userSchema);

module.exports = User;
