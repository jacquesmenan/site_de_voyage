const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

// Routes d'authentification
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Protéger toutes les routes qui suivent (nécessite d'être connecté)
router.use(authController.protect);

// Routes protégées
router.get('/me', userController.getMe);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

// Restreindre les routes suivantes aux administrateurs
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
