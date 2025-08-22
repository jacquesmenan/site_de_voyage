document.addEventListener('DOMContentLoaded', function() {
    // Récupérer les paramètres d'URL pour le produit sélectionné
    const urlParams = new URLSearchParams(window.location.search);
    const product = urlParams.get('product') || 'voyage';
    
    // Définir les détails du produit
    let productDetails = {
        'voyage': {
            name: 'Pack Voyage Dubaï',
            price: 49,
            description: 'Guide complet pour votre voyage à Dubaï',
            priceId: 'price_voyage_123' // À remplacer par votre Price ID Stripe
        },
        'expatriation': {
            name: 'Pack Expatriation Dubaï',
            price: 79,
            description: 'Guide complet pour votre expatriation à Dubaï',
            priceId: 'price_expat_456' // À remplacer par votre Price ID Stripe
        }
    };

    // Mettre à jour l'interface avec les détails du produit
    const selectedProduct = productDetails[product] || productDetails['voyage'];
    document.getElementById('produit-nom').textContent = selectedProduct.name;
    document.getElementById('produit-prix').textContent = `${selectedProduct.price} €`;
    document.getElementById('total-commande').textContent = `${selectedProduct.price} €`;

    // Initialiser Stripe avec votre clé publique
    const stripe = Stripe('pk_test_votre_cle_publique_stripe');
    const elements = stripe.elements();
    
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

    // Créer les éléments de formulaire Stripe
    const card = elements.create('card', { style: style });
    card.mount('#card-element');

    // Gérer les erreurs de validation de la carte
    card.on('change', function(event) {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
        } else {
            displayError.textContent = '';
        }
    });

    // Gérer la soumission du formulaire
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const submitButton = document.getElementById('submit-button');
        const spinner = document.getElementById('spinner');
        const buttonText = document.getElementById('button-text');
        
        // Désactiver le bouton et afficher le spinner
        submitButton.disabled = true;
        buttonText.textContent = 'Traitement...';
        spinner.classList.remove('hidden');
        
        try {
            // Créer un paiement avec Stripe
            const { error, paymentMethod } = await stripe.createPaymentMethod({
                type: 'card',
                card: card,
                billing_details: {
                    name: document.getElementById('name').value
                }
            });
            
            if (error) {
                throw error;
            }
            
            // Envoyer le paiement à votre serveur
            const response = await fetch('/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paymentMethodId: paymentMethod.id,
                    amount: selectedProduct.price * 100, // Montant en centimes
                    currency: 'eur',
                    productId: selectedProduct.priceId
                })
            });
            
            const paymentResponse = await response.json();
            
            if (paymentResponse.error) {
                throw new Error(paymentResponse.error);
            }
            
            // Rediriger vers la page de confirmation en cas de succès
            window.location.href = `/confirmation.html?payment_intent=${paymentResponse.paymentIntentId}`;
            
        } catch (error) {
            // Afficher les erreurs
            const errorElement = document.getElementById('card-errors');
            errorElement.textContent = error.message || 'Une erreur est survenue lors du traitement du paiement.';
            
            // Réactiver le bouton
            submitButton.disabled = false;
            buttonText.textContent = 'Payer maintenant';
            spinner.classList.add('hidden');
        }
    });
    
    // Gérer le changement de méthode de paiement
    document.querySelectorAll('.paiement-methodes > div').forEach(method => {
        method.addEventListener('click', function() {
            // Mettre à jour l'interface utilisateur
            document.querySelectorAll('.paiement-methodes > div').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
            
            // Si PayPal est sélectionné, rediriger vers PayPal
            if (this.classList.contains('paypal')) {
                // À implémenter: Redirection vers PayPal
                alert('Redirection vers PayPal...');
            }
        });
    });
});
