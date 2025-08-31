const express = require('express');
const bookingController = require('../controllers/bookingController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const contactController = require('../controllers/contactController');

const router = express.Router();

// ====================================
// ROUTES PUBLIQUES
// ====================================

// Authentification
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Paiements Stripe
router.get('/bookings/checkout-session/:tourId', bookingController.getCheckoutSession);

// Webhook Stripe (doit être public et accepter du JSON brut)
router.post(
  '/bookings/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

// Formulaire de contact
router.post('/contact', contactController.sendContactForm);

// ====================================
// ROUTES PROTÉGÉES (authentification requise)
// ====================================
router.use(authController.protect);

// Gestion du compte utilisateur
router.get('/users/me', userController.getMe, userController.getUser);
router.patch('/users/updateMyPassword', authController.updatePassword);
router.patch('/users/updateMe', userController.updateMe);
router.delete('/users/deleteMe', userController.deleteMe);

// Réservations de l'utilisateur connecté
router.get('/bookings/my-bookings', bookingController.getMyBookings);
router.post('/bookings/check-availability/:tourId', bookingController.checkAvailability);

// ====================================
// ROUTES ADMIN (authentification + droits admin requis)
// ====================================
router.use(authController.restrictTo('admin'));

// Gestion des utilisateurs (admin)
router
  .route('/users')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/users/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

// Gestion des réservations (admin)
router
  .route('/bookings')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/bookings/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.cancelBooking);

module.exports = router;
