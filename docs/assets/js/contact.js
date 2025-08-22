document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Récupération des valeurs du formulaire
            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                subject: document.getElementById('subject').value.trim(),
                message: document.getElementById('message').value.trim()
            };
            
            // Validation des champs requis
            if (!formData.name || !formData.email || !formData.message) {
                showAlert('Veuillez remplir tous les champs obligatoires.', 'error');
                return;
            }
            
            // Validation de l'email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                showAlert('Veuillez entrer une adresse email valide.', 'error');
                return;
            }
            
            // Désactiver le bouton d'envoi
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = 'Envoi en cours...';
            
            // Simulation d'envoi (à remplacer par un appel API réel)
            setTimeout(() => {
                // Ici, vous devriez faire un appel à votre backend pour envoyer l'email
                console.log('Formulaire soumis avec succès:', formData);
                
                // Réinitialiser le formulaire
                contactForm.reset();
                
                // Afficher un message de succès
                showAlert('Votre message a été envoyé avec succès ! Nous vous répondrons dès que possible.', 'success');
                
                // Réactiver le bouton
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }, 1500);
            
        });
    }
    
    // Fonction pour afficher les messages d'alerte
    function showAlert(message, type = 'info') {
        // Supprimer les alertes existantes
        const existingAlert = document.querySelector('.alert-message');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Créer l'élément d'alerte
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-message alert-${type}`;
        alertDiv.textContent = message;
        
        // Ajouter l'alerte avant le formulaire
        const form = document.querySelector('.contact-form');
        if (form) {
            form.insertBefore(alertDiv, form.firstChild);
            
            // Supprimer l'alerte après 5 secondes
            setTimeout(() => {
                alertDiv.style.opacity = '0';
                setTimeout(() => {
                    alertDiv.remove();
                }, 300);
            }, 5000);
        }
    }
    
    // Ajout des styles pour les messages d'alerte
    const style = document.createElement('style');
    style.textContent = `
        .alert-message {
            padding: 15px 20px;
            margin-bottom: 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            animation: slideDown 0.3s ease-out;
            opacity: 1;
            transition: opacity 0.3s ease;
        }
        
        .alert-success {
            background-color: #4CAF50;
        }
        
        .alert-error {
            background-color: #f44336;
        }
        
        .alert-info {
            background-color: #2196F3;
        }
        
        @keyframes slideDown {
            from {
                transform: translateY(-20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
});
