require('dotenv').config({ path: './config.env' });
const { testConnection } = require('./config/database');

async function testDatabaseConnection() {
  console.log('🔍 Test de connexion à la base de données o2switch...');
  
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('\n✅ Test de connexion réussi !');
      console.log('La configuration de la base de données est correcte.');
      process.exit(0);
    } else {
      console.error('\n❌ Échec de la connexion à la base de données.');
      console.log('\nConseils :');
      console.log('1. Vérifiez vos identifiants dans le fichier .env');
      console.log('2. Vérifiez que le serveur MySQL est en cours d\'exécution');
      console.log('3. Vérifiez que le pare-feu autorise les connexions sur le port MySQL (par défaut 3306)');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Une erreur inattendue est survenue :');
    console.error(error);
    process.exit(1);
  }
}

// Exécuter le test
testDatabaseConnection();
