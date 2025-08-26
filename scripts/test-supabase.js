const path = require('path');
const dotenv = require('dotenv');

// Charger les variables d'environnement depuis config.env
dotenv.config({ path: path.resolve(__dirname, '../config.env') });

// Vérifier que les variables d'environnement sont chargées
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Erreur: Les variables d\'environnement SUPABASE_URL et SUPABASE_ANON_KEY sont requises');
  console.log('Assurez-vous d\'avoir configuré correctement le fichier config.env');
  process.exit(1);
}

console.log('🔗 URL Supabase:', process.env.SUPABASE_URL);
console.log('🔑 Clé anonyme:', process.env.SUPABASE_ANON_KEY ? 'définie' : 'non définie');

const supabase = require('../server/config/supabase');

async function testSupabaseConnection() {
  console.log('🔍 Test de connexion à Supabase...');
  
  try {
    // Test de connexion à la table 'users'
    console.log('\n1. Test de la table "users"...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) {
      console.error('❌ Erreur lors de la lecture de la table users:', usersError.message);
    } else {
      console.log(`✅ Table "users" accessible. ${users.length} enregistrement(s) trouvé(s).`);
    }

    // Test d'authentification
    console.log('\n2. Test d\'authentification...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password-invalide-pour-test'
    });

    // On s'attend à une erreur 400 (mauvais identifiants)
    if (authError && authError.status === 400) {
      console.log('✅ Authentification: Le service répond correctement (erreur attendue avec des identifiants invalides)');
    } else if (authError) {
      console.error('❌ Erreur inattendue lors de l\'authentification:', authError.message);
    } else {
      console.log('⚠️  Authentification réussie (ce n\'est pas normal avec des identifiants invalides)');
    }

    // Test d'insertion (si nécessaire)
    // console.log('\n3. Test d\'insertion...');
    // const { data: insertData, error: insertError } = await supabase
    //   .from('test_table')
    //   .insert([{ name: 'Test Supabase' }])
    //   .select();
    // if (insertError) {
    //   console.error('❌ Erreur lors de l\'insertion:', insertError.message);
    // } else {
    //   console.log('✅ Insertion réussie:', insertData);
    // }

  } catch (error) {
    console.error('❌ Erreur lors du test de connexion à Supabase:', error.message);
  }
}

// Exécuter le test
testSupabaseConnection();
