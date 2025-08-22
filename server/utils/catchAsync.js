/**
 * Enveloppe une fonction asynchrone pour capturer automatiquement les erreurs
 * et les transmettre au gestionnaire d'erreurs d'Express
 * 
 * @param {Function} fn - La fonction asynchrone à envelopper
 * @returns {Function} Une fonction middleware qui gère les erreurs
 */
module.exports = fn => {
  return (req, res, next) => {
    // Exécute la fonction asynchrone et attrape toute erreur non capturée
    // puis la transmet au gestionnaire d'erreurs d'Express
    fn(req, res, next).catch(err => {
      // Ajoute des informations supplémentaires à l'erreur si nécessaire
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
  };
};
