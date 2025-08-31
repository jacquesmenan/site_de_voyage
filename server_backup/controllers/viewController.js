const Tour = require('../models/tourModel');
const User = require('../models/userModel');
// Temporairement désactivé jusqu'à ce que le modèle soit prêt
// const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Middleware pour ajouter des variables locales à toutes les vues
exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking') {
    res.locals.alert = 'Votre réservation a été effectuée avec succès ! Un email de confirmation vous a été envoyé.';
  }
  next();
};

// Page d'accueil
exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Récupérer les données des forfaits depuis la collection
  const tours = await Tour.find();

  // 2) Rendre le template en utilisant les données
  res.status(200).render('overview', {
    title: 'Découvrez Dubaï avec Cédric Dubai Solutions',
    tours
  });
});

// Page d'un forfait spécifique
exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Récupérer les données pour le forfait demandé (y compris les avis et les guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  });

  if (!tour) {
    return next(new AppError('Aucun forfait trouvé avec ce nom.', 404));
  }

  // 2) Rendre le template en utilisant les données
  res.status(200).render('tour', {
    title: `${tour.name} | Cédric Dubai Solutions`,
    tour
  });
});

// Page de connexion
exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Connexion à votre compte'
  });
};

// Page du compte utilisateur
exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Mon compte'
  });
};

// Page des réservations de l'utilisateur
exports.getMyBookings = catchAsync(async (req, res, next) => {
  // Cette fonction est temporairement désactivée jusqu'à ce que le modèle Booking soit prêt
  /*
  // 1) Trouver toutes les réservations de l'utilisateur
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Trouver les forfaits avec les IDs des réservations
  const tourIDs = bookings.map(el => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'Mes réservations',
    tours
  });
  */
  res.status(200).render('overview', {
    title: 'Mes réservations',
    tours: []
  });
});

// Page de paiement
exports.getCheckout = catchAsync(async (req, res, next) => {
  // 1) Récupérer le forfait actuel depuis la base de données
  const tour = await Tour.findOne({ slug: req.params.slug });
  
  if (!tour) {
    return next(new AppError('Aucun forfait trouvé avec ce nom.', 404));
  }

  // 2) Rendre le template de paiement
  res.status(200).render('checkout', {
    title: 'Finalisez votre réservation',
    tour
  });
});

// Page de confirmation de commande
exports.getConfirmation = (req, res) => {
  res.status(200).render('confirmation', {
    title: 'Confirmation de commande'
  });
};

// Page de contact
exports.getContact = (req, res) => {
  res.status(200).render('contact', {
    title: 'Contactez-nous',
    activePage: 'contact'
  });
};

// Page À propos
exports.getAbout = (req, res) => {
  res.status(200).render('about', {
    title: 'À propos de nous',
    activePage: 'about'
  });
};

// Page CGV
exports.getCGV = (req, res) => {
  res.status(200).render('cgv', {
    title: 'Conditions Générales de Vente',
    activePage: 'cgv'
  });
};

// Page Mentions Légales
exports.getLegal = (req, res) => {
  res.status(200).render('legal', {
    title: 'Mentions Légales',
    activePage: 'legal'
  });
};

// Page Politique de Confidentialité
exports.getPrivacy = (req, res) => {
  res.status(200).render('privacy', {
    title: 'Politique de Confidentialité',
    activePage: 'privacy'
  });
};

// Page FAQ
exports.getFAQ = (req, res) => {
  res.status(200).render('faq', {
    title: 'Foire Aux Questions',
    activePage: 'faq'
  });
};

// Tableau de bord administrateur
exports.getAdminDashboard = catchAsync(async (req, res, next) => {
  // Cette fonction est temporairement désactivée jusqu'à ce que le modèle Booking soit prêt
  /*
  // 1) Récupérer les statistiques
  const stats = await Booking.aggregate([
    {
      $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        numBookings: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        totalRevenue: { $sum: '$price' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  
  // 2) Récupérer les réservations récentes
  const recentBookings = await Booking.find()
    .sort('-createdAt')
    .limit(10)
    .populate('user tour');
    
  // 3) Récupérer les statistiques des forfaits les plus populaires
  const popularTours = await Booking.aggregate([
    {
      $group: {
        _id: '$tour',
        numBookings: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    },
    {
      $sort: { numBookings: -1 }
    },
    {
      $limit: 5
    },
    {
      $lookup: {
        from: 'tours',
        localField: '_id',
        foreignField: '_id',
        as: 'tour'
      }
    },
    {
      $unwind: '$tour'
    }
  ]);
  */
  
  // Version simplifiée pour le moment
  res.status(200).render('admin/dashboard', {
    title: 'Tableau de bord administrateur',
    stats: [],
    recentBookings: [],
    popularTours: []
  });
});

// Gestion des erreurs 404
exports.get404 = (req, res) => {
  res.status(404).render('error', {
    title: 'Page non trouvée',
    statusCode: 404,
    message: 'Désolé, la page que vous recherchez est introuvable.'
  });
};

// Mise à jour des données utilisateur via le formulaire
// (Gestion des données de formulaire)
// Note: La gestion des fichiers est gérée séparément
// La validation côté client est recommandée
