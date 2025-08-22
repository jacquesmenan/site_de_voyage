import { showAlert } from './alerts.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.form--forgot-password');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    
    try {
      const res = await fetch('/api/v1/password/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'Un email de réinitialisation a été envoyé à votre adresse email.');
        // Rediriger vers la page de confirmation
        window.setTimeout(() => {
          window.location.href = '/reset-email-sent';
        }, 1500);
      } else {
        throw new Error(data.message || 'Une erreur est survenue lors de la demande de réinitialisation');
      }
    } catch (err) {
      showAlert('error', err.message);
    }
  });
});
