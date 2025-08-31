const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');

// Gestion des erreurs non capturées (erreurs synchrones)
process.on('uncaughtException', err => {
  console.error('ERREUR NON CAPTURÉE ! 💥 Arrêt...');
  console.error(err.name, err.message);
  
  // Fermer le serveur et le processus
  server.close(() => {
    process.exit(1);
  });
});

// Chargement des variables d'environnement
dotenv.config({ path: './config.env' });

// Connexion à la base de données MongoDB
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connexion à la base de données réussie !'));

// Démarrage du serveur
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`L'application écoute sur le port ${port}...`);
  console.log(`Environnement: ${process.env.NODE_ENV}`);
});

// Gestion des rejets de promesses non gérés
process.on('unhandledRejection', err => {
  console.error('ERREUR DE REJET NON GÉRÉE ! 💥 Arrêt...');
  console.error(err.name, err.message);
  
  // Fermer le serveur de manière gracieuse
  server.close(() => {
    process.exit(1);
  });
});

// Gestion du signal SIGTERM (pour les arrêts gracieux avec Heroku, etc.)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM REÇU. Arrêt gracieux en cours...');
  server.close(() => {
    console.log('💥 Processus terminé !');
  });
});

// Gestion des avertissements de dépréciation de Mongoose
mongoose.connection.on('warning', warning => {
  console.warn('Avertissement de connexion MongoDB:', warning);
});

// Gestion des erreurs de connexion à la base de données
mongoose.connection.on('error', err => {
  console.error('Erreur de connexion à la base de données:', err);
});

// Gestion de la déconnexion de la base de données
mongoose.connection.on('disconnected', () => {
  console.log('Déconnecté de la base de données MongoDB');
});

// Gestion de la sortie du processus
process.on('exit', code => {
  console.log(`Processus terminé avec le code: ${code}`);
});