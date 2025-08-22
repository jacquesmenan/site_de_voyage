const express = require('express');
const viewController = require('../controllers/viewController');
// Temporairement désactivé jusqu'à ce que l'authentification soit configurée
// const authController = require('../controllers/authController');
// const bookingController = require('../controllers/bookingController');

const router = express.Router();

// Middleware pour ajouter des variables locales à toutes les vues
router.use(viewController.alerts);

// Routes accessibles sans authentification
router.get('/', viewController.getOverview);
router.get('/a-propos', viewController.getAbout);
router.get('/contact', viewController.getContact);
router.get('/mentions-legales', viewController.getLegal);
router.get('/politique-confidentialite', viewController.getPrivacy);
router.get('/cgv', viewController.getCGV);
router.get('/faq', viewController.getFAQ);

// Routes nécessitant une authentification (temporairement désactivées)
/*
router.get('/mon-compte', authController.protect, viewController.getAccount);
router.get('/mes-reservations', authController.protect, viewController.getMyBookings);

// Routes de paiement
router.get(
  '/paiement/:packageId',
  authController.protect,
  bookingController.createBookingCheckout,
  viewController.getCheckout
);

// Route de confirmation de paiement
router.get(
  '/confirmation',
  authController.protect,
  viewController.getConfirmation
);

// Route du tableau de bord administrateur
router.get(
  '/admin/dashboard',
  authController.protect,
  authController.restrictTo('admin'),
  viewController.getAdminDashboard
);

// Route de connexion
router.get('/connexion', viewController.getLoginForm);

// Route de déconnexion
router.get('/deconnexion', authController.logout);
*/

// Route pour les pages de forfaits (temporairement simplifiée)
router.get('/forfaits/:slug', viewController.getTour);

// Gestion des erreurs 404 - doit être la dernière route
router.all('*', viewController.get404);

module.exports = router;
