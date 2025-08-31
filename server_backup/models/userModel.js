const crypto = require('crypto');
const { Schema, model } = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Veuillez nous indiquer votre nom'],
      trim: true,
      maxlength: [40, 'Un nom ne peut pas dépasser 40 caractères'],
      minlength: [3, 'Un nom doit faire au moins 3 caractères']
    },
    email: {
      type: String,
      required: [true, 'Veuillez fournir votre email'],
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
    password: {
      type: String,
      required: [true, 'Veuillez fournir un mot de passe'],
      minlength: [8, 'Le mot de passe doit faire au moins 8 caractères'],
      select: false
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Veuillez confirmer votre mot de passe'],
      validate: {
        // Cela ne fonctionne que sur CREATE et SAVE !!!
        validator: function(el) {
          return el === this.password;
        },
        message: 'Les mots de passe ne correspondent pas'
      }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    emailOpened: {
      type: Boolean,
      default: false
    },
    emailOpenedAt: Date
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
  }
);

// Index pour améliorer les performances des requêtes fréquentes
userSchema.index({ email: 1 });
userSchema.index({ passwordResetToken: 1 });

// Middleware pour hacher le mot de passe avant de sauvegarder
userSchema.pre('save', async function(next) {
  // Ne l'exécuter que si le mot de passe a été modifié (ou est nouveau)
  if (!this.isModified('password')) return next();

  // Hacher le mot de passe avec un coût de 12
  this.password = await bcrypt.hash(this.password, 12);

  // Supprimer le champ passwordConfirm
  this.passwordConfirm = undefined;
  next();
});

// Mettre à jour le champ passwordChangedAt lors de la modification du mot de passe
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  
  // S'assurer que le token est créé après que le mot de passe a été changé
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Ne renvoyer que les utilisateurs actifs dans les requêtes find
userSchema.pre(/^find/, function(next) {
  // this pointe vers la requête en cours
  this.find({ active: { $ne: false } });
  next();
});

// Méthode d'instance pour vérifier le mot de passe
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Vérifier si l'utilisateur a changé de mot de passe après l'émission du token
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

// Créer un token de réinitialisation de mot de passe
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Définir l'expiration à 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Créer un token de vérification d'email
userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Définir l'expiration à 24 heures
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

  return verificationToken;
};

// Créer un token JWT pour l'authentification
userSchema.methods.createAuthToken = function() {
  const token = jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  return token;
};

const User = model('User', userSchema);

module.exports = User;
