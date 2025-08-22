require('dotenv').config({ path: '.env' });
const nodemailer = require('nodemailer');

const testEmail = async () => {
  // 1. Créer un transporteur de test avec Mailtrap
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true pour le port 465, false pour les autres ports
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      // Ne pas échouer sur des certificats invalides
      rejectUnauthorized: false
    }
  });

  // 2. Options de l'email
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: 'votre@email.com', // Remplacez par votre email de test
    subject: 'Test d\'envoi depuis Cédric Dubai Solutions',
    text: 'Ceci est un email de test envoyé depuis le serveur de Cédric Dubai Solutions.',
    html: `
      <h1>Test d'envoi d'email</h1>
      <p>Bonjour,</p>
      <p>Ceci est un email de test envoyé depuis le serveur de <strong>Cédric Dubai Solutions</strong>.</p>
      <p>Si vous recevez ce message, cela signifie que la configuration d'envoi d'emails fonctionne correctement.</p>
      <p>Cordialement,<br>L'équipe Cédric Dubai Solutions</p>
    `
  };

  // 3. Envoyer l'email
  try {
    console.log('Tentative d\'envoi de l\'email...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Message envoyé avec succès !');
    console.log('Message ID:', info.messageId);
    console.log('URL de prévisualisation:', nodemailer.getTestMessageUrl(info));
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:');
    console.error(error);
    
    if (error.response) {
      console.error('Réponse du serveur SMTP:');
      console.error(error.response);
    }
    
    return false;
  }
};

// Exécuter le test
console.log('Démarrage du test d\'envoi d\'email...');
testEmail()
  .then(success => {
    console.log(success ? 'Test réussi !' : 'Test échoué.');
    if (!success) process.exit(1);
  })
  .catch(err => {
    console.error('Erreur inattendue:', err);
    process.exit(1);
  });
