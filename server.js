// Point d'entrée principal de l'application
require('dotenv').config({ path: './config.env' });
const app = require('./server/app');
const connectDB = require('./server/config/mongoConfig');

// Connexion à la base de données MongoDB
connectDB();

// Démarrage du serveur
const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Application en cours d'exécution sur le port ${port}...`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log('🔗 API disponible à: http://localhost:' + port + '/api/v1');
  console.log('🔗 Testez l\'API à: http://localhost:' + port + '/api/v1/test');
});

// Gestion des erreurs non gérées
process.on('unhandledRejection', (err) => {
  console.error('ERREUR NON GÉRÉE ! 💥 Arrêt...');
  console.error(err.name, err.message);
  
  // Fermer le serveur de manière gracieuse
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Gestion des exceptions non capturées
process.on('uncaughtException', err => {
  console.error('ERREUR NON CAPTURÉE ! 💥 Arrêt...');
  console.error(err.name, err.message);
  
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
