const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Une réservation doit être associée à un voyage']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Une réservation doit être associée à un utilisateur']
  },
  price: {
    type: Number,
    required: [true, 'Une réservation doit avoir un prix']
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  paid: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['en_attente', 'confirmee', 'annulee', 'terminee'],
    default: 'en_attente',
    trim: true
  },
  participants: {
    type: Number,
    required: [true, 'Veuillez spécifier le nombre de participants'],
    min: [1, 'Le nombre de participants doit être d\'au moins 1']
  },
  startDate: {
    type: Date,
    required: [true, 'Veuillez spécifier une date de début']
  },
  endDate: {
    type: Date,
    required: [true, 'Veuillez spécifier une date de fin']
  },
  paymentMethod: {
    type: String,
    enum: ['carte', 'virement', 'paypal', 'autre'],
    required: [true, 'Veuillez spécifier un moyen de paiement']
  },
  paymentId: String,
  paymentReceiptUrl: String,
  specialRequests: {
    type: String,
    trim: true,
    maxlength: [1000, 'Les demandes spéciales ne peuvent pas dépasser 1000 caractères']
  },
  cancellationReason: {
    type: String,
    trim: true,
    select: false
  },
  cancellationDate: Date,
  refundAmount: Number,
  isRefunded: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour améliorer les performances des requêtes
bookingSchema.index({ tour: 1, user: 1 });
bookingSchema.index({ user: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ startDate: 1 });
bookingSchema.index({ endDate: 1 });

// Middleware pour peupler automatiquement les références
bookingSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'tour',
    select: 'name duration price imageCover startLocation' // Champs à récupérer du modèle Tour
  }).populate({
    path: 'user',
    select: 'name email photo' // Champs à récupérer du modèle User
  });
  next();
});

// Méthode pour annuler une réservation
bookingSchema.methods.cancel = function(reason) {
  this.status = 'annulee';
  this.cancellationReason = reason;
  this.cancellationDate = Date.now();
  return this.save({ validateBeforeSave: false });
};

// Méthode pour confirmer une réservation
bookingSchema.methods.confirm = function() {
  this.status = 'confirmee';
  return this.save({ validateBeforeSave: false });
};

// Méthode pour marquer une réservation comme terminée
bookingSchema.methods.complete = function() {
  this.status = 'terminee';
  return this.save({ validateBeforeSave: false });
};

// Méthode pour traiter un remboursement
bookingSchema.methods.processRefund = function(amount, reason) {
  this.refundAmount = amount || this.price;
  this.cancellationReason = reason || this.cancellationReason;
  this.isRefunded = true;
  return this.save({ validateBeforeSave: false });
};

// Middleware pour ne retourner que les réservations actives
bookingSchema.pre(/^find/, function(next) {
  // this pointe vers la requête en cours
  this.find({ isActive: { $ne: false } });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
