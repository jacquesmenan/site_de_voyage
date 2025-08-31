const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

// Routes d'authentification (publiques)
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// Vérifier que le middleware protect existe avant de l'utiliser
if (typeof authController.protect === 'function') {
  // Protéger toutes les routes après ce middleware
  router.use(authController.protect);
} else {
  console.error('authController.protect is not a function');
}

// Routes protégées (nécessitent une authentification)
router.patch('/update-my-password', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
router.patch('/update-me', userController.updateMe);
router.delete('/delete-me', userController.deleteMe);

// Restreindre les routes suivantes aux administrateurs
router.use(authController.restrictTo('admin'));

// Routes d'administration des utilisateurs
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

// Routes supplémentaires pour l'administration
router.patch('/:id/toggle-status', userController.toggleUserStatus);
router.patch('/:id/update-role', userController.updateUserRole);

module.exports = router;
