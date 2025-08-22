import { showAlert } from './alerts.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.form--reset-password');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    const resetToken = window.location.pathname.split('/').pop();
    
    // Vérifier que les mots de passe correspondent
    if (password !== passwordConfirm) {
      return showAlert('error', 'Les mots de passe ne correspondent pas');
    }

    try {
      const res = await fetch(`/api/v1/password/reset-password/${resetToken}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, passwordConfirm }),
      });

      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'Votre mot de passe a été réinitialisé avec succès !');
        // Rediriger vers la page de connexion après un délai
        window.setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else {
        throw new Error(data.message || 'Une erreur est survenue lors de la réinitialisation du mot de passe');
      }
    } catch (err) {
      showAlert('error', err.message);
    }
  });
});
