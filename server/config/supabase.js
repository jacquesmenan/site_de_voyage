const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Charger les variables d'environnement depuis config.env
dotenv.config({ path: path.resolve(__dirname, '../../config.env') });

// Vérification des variables d'environnement requises
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Configuration Supabase manquante. Assurez-vous que SUPABASE_URL et SUPABASE_ANON_KEY sont définis dans votre fichier .env');
}

// Configuration du client Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Nous gérons les sessions manuellement avec JWT
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey
    }
  }
});

// Test de connexion au démarrage
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.warn('Attention: Problème de connexion à Supabase:', error.message);
    } else {
      console.log('✅ Connexion à Supabase établie avec succès');
    }
  } catch (error) {
    console.error('❌ Erreur de connexion à Supabase:', error.message);
  }
}

// Exécuter le test de connexion au démarrage
if (process.env.NODE_ENV !== 'test') {
  testConnection();
}

module.exports = supabase;
