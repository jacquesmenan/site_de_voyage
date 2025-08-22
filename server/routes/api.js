const express = require('express');
const bookingController = require('../controllers/bookingController');
const userController = require('../controllers/userController');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const contactController = require('../controllers/contactController');

const router = express.Router();

// Routes d'authentification
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Routes protégées (nécessite une authentification)
router.use(authController.protect);

// Routes pour les utilisateurs
router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMyPassword', authController.updatePassword);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

// Routes pour les réservations
router.get('/bookings/checkout-session/:packageId', bookingController.getCheckoutSession);
router.get('/my-bookings', bookingController.getMyBookings);

// Routes pour le formulaire de contact
router.post('/contact', contactController.sendContactForm);

// Routes protégées et restreintes aux administrateurs
router.use(authController.restrictTo('admin'));

// Routes d'administration pour les utilisateurs
router
  .route('/users')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/users/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

// Routes d'administration pour les réservations
router
  .route('/bookings')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/bookings/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
