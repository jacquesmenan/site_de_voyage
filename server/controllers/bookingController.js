const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Fonction pour créer une session de paiement Stripe
const createBookingCheckout = async session => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.amount_total / 100; // Convertir en euros
  
  await Booking.create({ tour, user, price });
};

// Middleware pour créer une session de paiement
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // 1) Récupérer le forfait actuellement réservé
  const tour = await Tour.findById(req.params.tourId);
  
  // 2) Créer la session de paiement
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/mes-reservations?alert=booking`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${tour.name} - Forfait`,
            description: tour.summary,
            images: [`https://www.cedricdubaisolutions.com/img/tours/${tour.imageCover}`],
          },
          unit_amount: tour.price * 100, // en centimes
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
  });

  // 3) Envoyer la session comme réponse
  res.status(200).json({
    status: 'success',
    session
  });
});

// Gestion du webhook Stripe (pour les paiements réussis)
exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    createBookingCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
};

// Créer une réservation (pour les réservations manuelles via l'admin)
exports.createBooking = catchAsync(async (req, res, next) => {
  // Permet des réservations sans payer (pour les offres spéciales, etc.)
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  
  const booking = await Booking.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      data: booking
    }
  });
});

// Récupérer toutes les réservations (admin)
exports.getAllBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find();
  
  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: {
      bookings
    }
  });
});

// Récupérer une réservation spécifique
exports.getBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id).populate('user').populate('tour');
  
  if (!booking) {
    return next(new AppError('Aucune réservation trouvée avec cet ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      booking
    }
  });
});

// Mettre à jour une réservation (statut, notes, etc.)
exports.updateBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  if (!booking) {
    return next(new AppError('Aucune réservation trouvée avec cet ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      booking
    }
  });
});

// Annuler une réservation (soft delete)
exports.cancelBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { status: 'annulée' },
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!booking) {
    return next(new AppError('Aucune réservation trouvée avec cet ID', 404));
  }
  
  // Envoyer un email de confirmation d'annulation
  // (à implémenter avec le service d'email)
  
  res.status(200).json({
    status: 'success',
    data: {
      booking
    }
  });
});

// Récupérer les réservations de l'utilisateur connecté
exports.getMyBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });
  
  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: {
      bookings
    }
  });
});

// Vérifier la disponibilité d'un forfait pour des dates données
exports.checkAvailability = catchAsync(async (req, res, next) => {
  const { startDate, endDate, participants } = req.body;
  
  // Vérifier si le forfait existe
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) {
    return next(new AppError('Aucun forfait trouvé avec cet ID', 404));
  }
  
  // Vérifier la capacité maximale
  if (participants > tour.maxGroupSize) {
    return next(
      new AppError(
        `La capacité maximale pour ce forfait est de ${tour.maxGroupSize} participants`,
        400
      )
    );
  }
  
  // Vérifier les réservations existantes pour ces dates
  const existingBookings = await Booking.find({
    tour: req.params.tourId,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
    status: { $ne: 'annulée' }
  });
  
  // Calculer le nombre total de participants déjà inscrits
  const totalParticipants = existingBookings.reduce(
    (sum, booking) => sum + booking.participants,
    0
  );
  
  // Vérifier s'il y a assez de place
  const isAvailable = totalParticipants + participants <= tour.maxGroupSize;
  
  res.status(200).json({
    status: 'success',
    data: {
      isAvailable,
      availableSpots: tour.maxGroupSize - totalParticipants
    }
  });
});
