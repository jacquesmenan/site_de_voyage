// Version ultra-simplifiée du serveur
const express = require('express');

// Création de l'application Express
const app = express();

// Middleware de base
app.use(express.json());

// Route de test simple
app.get('/test', (req, res) => {
  res.send('Le serveur fonctionne !');
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).send('Page non trouvée');
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  res.status(500).send('Une erreur est survenue');
});

// Démarrer le serveur sur le port 3001 (au cas où le port 3000 serait occupé)
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log('Testez en accédant à http://localhost:3001/test');
});
