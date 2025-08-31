const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config({ path: './config.env' });

// Configuration de la connexion à la base de données o2switch
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    // Configuration du pool de connexions
    pool: {
      max: 5,          // Nombre maximum de connexions dans le pool
      min: 0,          // Nombre minimum de connexions dans le pool
      acquire: 30000,  // Temps max d'attente pour acquérir une connexion (ms)
      idle: 10000      // Temps max d'inactivité d'une connexion (ms)
    },
    // Options spécifiques à MySQL
    dialectOptions: {
      dateStrings: true,    // Retourne les dates en tant que chaînes
      typeCast: true       // Active le typage fort pour les champs
    },
    timezone: '+01:00',    // Fuseau horaire de Paris (CET/CEST)
    // Journalisation des requêtes en développement uniquement
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    // Configuration des modèles
    define: {
      timestamps: true,     // Active les champs createdAt et updatedAt
      underscored: true,    // Utilise le format snake_case pour les noms de colonnes
      freezeTableName: true // Empêche le pluriel automatique des noms de tables
    }
  }
);

/**
 * Teste la connexion à la base de données o2switch
 * @returns {Promise<boolean>} True si la connexion est établie avec succès
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données o2switch établie avec succès.');
    
    // Vérification de la version de la base de données
    const [results] = await sequelize.query('SELECT VERSION() as version');
    console.log(`📊 Version du serveur MySQL: ${results[0].version}`);
    
    return true;
  } catch (error) {
    console.error('❌ Impossible de se connecter à la base de données o2switch:');
    console.error(`🔍 Erreur détaillée: ${error.message}`);
    
    // Suggestions de dépannage
    if (error.original) {
      console.error('\n🔧 Conseils de dépannage:');
      
      if (error.original.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('- Vérifiez vos identifiants de connexion (utilisateur/mot de passe)');
        console.error('- Vérifiez que l\'utilisateur a les droits nécessaires sur la base de données');
      } else if (error.original.code === 'ENOTFOUND') {
        console.error('- Vérifiez le nom d\'hôte de la base de données');
        console.error('- Vérifiez votre connexion Internet');
      } else if (error.original.code === 'ECONNREFUSED') {
        console.error('- Le serveur de base de données ne répond pas');
        console.error('- Vérifiez que le service MySQL est en cours d\'exécution');
        console.error(`- Vérifiez que le port ${process.env.DB_PORT || 3306} est accessible`);
      }
    }
    
    return false;
  }
}

/**
 * Synchronise les modèles avec la base de données
 * @param {Object} options - Options de synchronisation
 * @returns {Promise<boolean>} True si la synchronisation a réussi
 */
async function syncDatabase(options = {}) {
  try {
    // Options par défaut pour la synchronisation
    const defaultOptions = {
      force: false,  // Ne pas forcer la recréation des tables
      alter: process.env.NODE_ENV === 'development',  // Mise à jour de la structure en développement
      logging: console.log
    };
    
    // Fusion avec les options fournies
    const syncOptions = { ...defaultOptions, ...options };
    
    console.log('🔄 Synchronisation de la base de données...');
    await sequelize.sync(syncOptions);
    
    console.log('✅ Base de données synchronisée avec succès.');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation de la base de données:');
    console.error(`🔍 Erreur détaillée: ${error.message}`);
    
    // Suggestions de dépannage pour les erreurs courantes
    if (error.original) {
      console.error('\n🔧 Conseils de dépannage:');
      
      if (error.original.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('- Vérifiez que l\'utilisateur a les droits nécessaires pour modifier la structure des tables');
      } else if (error.original.code.includes('ER_NO_SUCH_TABLE')) {
        console.error('- La table spécifiée n\'existe pas. Essayez avec l\'option force: true pour la créer');
      } else if (error.original.code.includes('ER_DUP_FIELDNAME')) {
        console.error('- Un champ en double a été détecté. Vérifiez vos modèles');
      }
    }
    
    return false;
  }
}
    console.error('❌ Erreur lors de la synchronisation de la base de données:');
    console.error(error);
    return false;
  }

// Exporter les fonctions et l'instance Sequelize
module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  
  // Fonction utilitaire pour exécuter des requêtes SQL brutes
  async query(sql, options) {
    try {
      const [results] = await sequelize.query(sql, options);
      return results;
    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution de la requête SQL:');
      console.error(`🔍 Requête: ${sql}`);
      console.error(`🔍 Erreur: ${error.message}`);
      throw error;
    }
  },
  
  // Fonction pour démarrer la base de données (connexion + synchronisation)
  async start() {
    const isConnected = await this.testConnection();
    if (!isConnected) {
      return false;
    }
    
    return this.syncDatabase({
      alter: process.env.NODE_ENV === 'development',
      logging: console.log
    });
  }
};
