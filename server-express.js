const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Express fonctionne !');
});

app.listen(3003, () => {
  console.log('Serveur Express sur http://localhost:3003');
});