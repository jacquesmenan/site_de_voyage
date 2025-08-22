// Fichier de test minimal - test-server.js
console.log('Démarrage du serveur de test...');

// Importer uniquement le strict nécessaire
const http = require('http');

// Créer un serveur HTTP simple
const server = http.createServer((req, res) => {
  console.log(`Requête reçue: ${req.method} ${req.url}`);
  
  // Configurer les en-têtes de la réponse
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  
  // Envoyer la réponse
  res.end('Le serveur de test fonctionne !');
});

// Démarrer le serveur sur le port 3002
const PORT = 3002;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serveur de test en cours d'exécution sur http://127.0.0.1:${PORT}/`);
  console.log('Appuyez sur Ctrl+C pour arrêter le serveur');
});

// Gestion de l'arrêt propre du serveur
process.on('SIGINT', () => {
  console.log('\nArrêt du serveur...');
  server.close(() => {
    console.log('Serveur arrêté.');
    process.exit(0);
  });
});
