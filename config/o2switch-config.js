// Configuration pour la base de données o2switch
module.exports = {
  // Paramètres de connexion à la base de données
  database: {
    // Ces variables devront être configurées dans votre panel o2switch
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'votre_utilisateur',
    password: process.env.DB_PASSWORD || 'votre_mot_de_passe',
    database: process.env.DB_NAME || 'votre_base_de_donnees',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    // Options de connexion
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  
  // Test de connexion
  testConnection: async function(sequelize) {
    try {
      await sequelize.authenticate();
      console.log('✅ Connexion à la base de données établie avec succès.');
      return true;
    } catch (error) {
      console.error('❌ Impossible de se connecter à la base de données:', error);
      return false;
    }
  },
  
  // Synchronisation de la base de données (optionnel)
  syncDatabase: async function(sequelize, options = {}) {
    try {
      await sequelize.sync(options);
      console.log('✅ Base de données synchronisée avec succès.');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation de la base de données:', error);
      return false;
    }
  }
};
