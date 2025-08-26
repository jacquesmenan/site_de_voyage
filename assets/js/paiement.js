document.addEventListener('DOMContentLoaded', function() {
    // Initialisation de Stripe avec votre clé publique
    const stripe = Stripe('pk_test_your_public_key_here');
    
    // Récupérer les éléments du DOM
    const cardElement = document.getElementById('card-element');
    const cardErrors = document.getElementById('card-errors');
    const submitButton = document.getElementById('submit-payment');
    const spinner = document.getElementById('spinner');
    const buttonText = document.getElementById('button-text');
    const paymentMessage = document.getElementById('payment-message');
    const paymentForm = document.getElementById('payment-form');

    // Vérifier si les éléments nécessaires existent
    if (!cardElement || !cardErrors || !submitButton || !spinner || !buttonText || !paymentMessage || !paymentForm) {
        console.error('Un ou plusieurs éléments du formulaire de paiement sont manquants');
        return;
    }

    // Récupérer l'ID du forfait depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const tourId = urlParams.get('tourId');

    // Vérifier si nous revenons d'un paiement réussi
    if (window.location.search.includes('session_id')) {
        // Afficher un message de confirmation
        paymentMessage.textContent = 'Paiement réussi ! Merci pour votre achat.';
        paymentMessage.style.color = '#4CAF50';
        paymentMessage.classList.remove('hidden');
        
        // Masquer le formulaire
        paymentForm.style.display = 'none';
        return; // Arrêter l'exécution du reste du script
    }

    // Style personnalisé pour les champs de carte
    const style = {
        base: {
            color: '#0A1A2F',
            fontFamily: '"Open Sans", sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
                color: '#aab7c4'
            }
        },
        invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
        }
    };

    // Créer et monter l'élément de carte Stripe
    const elements = stripe.elements();
    const card = elements.create('card', { style: style });
    card.mount('#card-element');

    // Gérer les erreurs de saisie de la carte
    card.on('change', function(event) {
        if (event.error) {
            showError(event.error.message);
        } else {
            clearError();
        }
    });

    // Gérer la soumission du formulaire
    paymentForm.addEventListener('submit', handleFormSubmit);

    // Fonction pour gérer la soumission du formulaire
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        if (!tourId) {
            showError('Aucun forfait sélectionné. Veuillez réessayer.');
            return;
        }
        
        // Désactiver le bouton pour éviter les soumissions multiples
        setFormSubmitting(true);
        
        try {
            // Créer une session de paiement sur le serveur
            const response = await fetch(`/api/v1/bookings/checkout-session/${tourId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Erreur réseau lors de la communication avec le serveur');
            }
            
            const session = await response.json();
            
            if (session && session.status === 'success' && session.session) {
                // Rediriger vers la page de paiement Stripe
                const result = await stripe.redirectToCheckout({
                    sessionId: session.session.id
                });
                
                if (result.error) {
                    throw new Error(result.error.message);
                }
            } else {
                throw new Error(session.message || 'Erreur lors de la création de la session de paiement');
            }
        } catch (err) {
            console.error('Erreur de paiement:', err);
            showError(err.message || 'Une erreur est survenue lors du traitement de votre paiement');
            setFormSubmitting(false);
        }
    }

    // Fonction pour afficher les erreurs
    function showError(message) {
        paymentMessage.textContent = message;
        paymentMessage.style.color = '#e74c3c';
        paymentMessage.classList.remove('hidden');
        
        cardErrors.textContent = message;
        cardErrors.style.display = 'block';
    }
    
    // Fonction pour effacer les messages d'erreur
    function clearError() {
        paymentMessage.textContent = '';
        paymentMessage.classList.add('hidden');
        
        cardErrors.textContent = '';
        cardErrors.style.display = 'none';
    }
    
    // Fonction pour gérer l'état du formulaire lors de la soumission
    function setFormSubmitting(isSubmitting) {
        submitButton.disabled = isSubmitting;
        spinner.classList.toggle('hidden', !isSubmitting);
        buttonText.textContent = isSubmitting ? 'Traitement...' : 'Payer maintenant';
    }
});
