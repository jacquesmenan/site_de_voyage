const { sequelize, testConnection } = require('../config/database');
const User = require('./user.model');

// Initialisation des modèles
const db = {};

db.User = User;

// Synchronisation des modèles avec la base de données
const syncDatabase = async () => {
  try {
    // Tester d'abord la connexion
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Impossible de se connecter à la base de données');
    }

    // Puis synchroniser les modèles
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Base de données synchronisée en mode développement (alter: true)');
    } else {
      await sequelize.sync();
      console.log('✅ Base de données synchronisée en mode production');
    }
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation de la base de données:');
    console.error(error);
    return false;
  }
};

// Exporter les modèles et les fonctions utilitaires
module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  User
};
