# Site de Voyage

Application web de réservation de voyages avec interface utilisateur moderne et système de paiement sécurisé.

## 🚀 Fonctionnalités

- Recherche et réservation de voyages
- Système d'authentification utilisateur
- Paiement sécurisé
- Gestion des profils utilisateurs
- Tableau de bord administrateur
- Système de messagerie

## 🛠️ Prérequis

- Node.js (version 18 ou supérieure)
- npm (version 9 ou supérieure)
- MongoDB (version 5.0 ou supérieure)

## 🚀 Installation

1. Cloner le dépôt :
   ```bash
   git clone [URL_DU_DEPOT]
   cd site-de-voyage
   ```

2. Installer les dépendances :
   ```bash
   npm install
   ```

3. Configurer les variables d'environnement :
   - Copier `.env.example` vers `.env`
   - Remplir les variables nécessaires

4. Démarrer l'application :
   ```bash
   # Mode développement
   npm run dev
   
   # Mode production
   npm start
   ```

## 🌍 Variables d'Environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```
PORT=3000
MONGODB_URI=votre_uri_mongodb
JWT_SECRET=votre_secret_jwt
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES=90
NODE_ENV=development
EMAIL_USERNAME=votre_email
EMAIL_PASSWORD=votre_mot_de_passe
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
```

## 📦 Dépendances Principales

- **Backend** :
  - Express.js
  - Mongoose
  - JSON Web Tokens
  - Bcrypt
  - Nodemailer

- **Frontend** :
  - HTML5, CSS3, JavaScript
  - (Ajoutez vos frameworks frontend ici)

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

1. Forkez le projet
2. Créez votre branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Poussez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📞 Contact

Votre Nom - [@votretwitter](https://twitter.com/votretwitter) - email@example.com

Lien du projet : [https://github.com/votrecompte/site-de-voyage](https://github.com/votrecompte/site-de-voyage)
