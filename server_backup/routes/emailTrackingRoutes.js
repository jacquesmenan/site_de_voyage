const express = require('express');
const emailTrackingController = require('../controllers/emailTrackingController');
const authController = require('../controllers/authController');

const router = express.Router();

// Route pour suivre l'ouverture d'un email
router.get(
  '/track-email/:userId',
  emailTrackingController.trackEmailOpen
);

// Protéger toutes les routes suivantes (nécessite une authentification)
router.use(authController.protect);

// Route pour vérifier si un email a été ouvert
router.get(
  '/email-status/:userId',
  authController.restrictTo('admin'),
  emailTrackingController.checkEmailOpenStatus
);

module.exports = router;
