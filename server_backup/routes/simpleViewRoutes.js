const express = require('express');
const viewController = require('../controllers/viewController');

const router = express.Router();

// Basic routes without any middleware
router.get('/', (req, res) => {
  res.status(200).render('base', {
    title: 'Accueil',
    message: 'Bienvenue sur le site de voyage'
  });
});

// Simple test route
router.get('/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Simple view route is working!'
  });
});

module.exports = router;
