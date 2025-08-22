const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');
const AppError = require('./appError');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Cédric Dubai Solutions <${process.env.EMAIL_FROM}>`;
  }

  // Créer un transporteur différent selon l'environnement
  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Utiliser SendGrid en production
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    // Utiliser Mailtrap en développement
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Méthode pour envoyer l'email
  async send(template, subject) {
    try {
      // 1) Rendre le HTML basé sur un template Pug
      const trackingPixel = this.url && this.userId 
        ? `<img src="${process.env.APP_URL}/api/v1/email/track-email/${this.userId}" alt="" style="width:1px;height:1px;display:none;" />`
        : '';
      
      const html = pug.renderFile(`${__dirname}/../views/emails/${template}.pug`, {
        firstName: this.firstName,
        url: this.url,
        subject,
        trackingPixel
      });
   
      // 2) Définir les options de l'email
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject: subject,
        html: html,
        text: htmlToText(html, {
          wordwrap: 130
        })
      };

      // 3) Créer un transport et envoyer l'email
      await this.newTransport().sendMail(mailOptions);
    } catch (err) {
      console.error('Erreur lors de l\'envoi de l\'email:', err);
      throw new AppError(
        'Une erreur est survenue lors de l\'envoi de l\'email. Veuillez réessayer plus tard.',
        500
      );
    }
  }

  // Méthode pour envoyer un email de bienvenue
  async sendWelcome() {
    await this.send('welcome', 'Bienvenue dans la famille Cédric Dubai Solutions !');
  }

  // Méthode pour envoyer un email de réinitialisation de mot de passe
  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Votre lien de réinitialisation de mot de passe (valable 10 minutes)'
    );
  }

  // Méthode pour envoyer un email de confirmation de commande
  async sendBookingConfirmation(booking) {
    await this.send(
      'bookingConfirmation',
      'Confirmation de votre réservation chez Cédric Dubai Solutions'
    );
  }

  // Méthode pour envoyer un email de contact
  async sendContactForm(message) {
    await this.send(
      'contact',
      'Nouveau message de contact sur Cédric Dubai Solutions'
    );
  }
};
