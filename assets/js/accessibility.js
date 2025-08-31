// Gestion de l'accessibilité des FAQ
document.addEventListener('DOMContentLoaded', function() {
    // Gestion des FAQ
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach((item, index) => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const answerId = `faq-answer-${index}`;
        const questionId = `faq-question-${index}`;
        
        // Configuration des attributs ARIA
        question.setAttribute('id', questionId);
        question.setAttribute('aria-expanded', 'false');
        question.setAttribute('aria-controls', answerId);
        
        answer.setAttribute('id', answerId);
        answer.setAttribute('aria-labelledby', questionId);
        answer.setAttribute('role', 'region');
        
        // Gestion du clic sur la question
        question.addEventListener('click', () => {
            const isExpanded = question.getAttribute('aria-expanded') === 'true';
            
            // Fermer toutes les autres réponses
            closeAllFaqItems();
            
            // Basculer l'état de la réponse actuelle
            if (!isExpanded) {
                question.setAttribute('aria-expanded', 'true');
                answer.removeAttribute('hidden');
                item.classList.add('active');
            }
        });
        
        // Gestion de la navigation au clavier
        question.addEventListener('keydown', (e) => {
            // Espace ou Entrée pour activer
            if (e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') {
                e.preventDefault();
                question.click();
            }
            
            // Flèche bas/haut pour la navigation entre les questions
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const direction = e.key === 'ArrowDown' ? 1 : -1;
                const nextIndex = index + direction;
                
                if (nextIndex >= 0 && nextIndex < faqItems.length) {
                    faqItems[nextIndex].querySelector('.faq-question').focus();
                }
            }
            
            // Home/Fin pour aller au début/à la fin
            if (e.key === 'Home') {
                e.preventDefault();
                faqItems[0].querySelector('.faq-question').focus();
            }
            
            if (e.key === 'End') {
                e.preventDefault();
                faqItems[faqItems.length - 1].querySelector('.faq-question').focus();
            }
        });
    });
    
    // Fonction pour fermer toutes les réponses FAQ
    function closeAllFaqItems() {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            
            question.setAttribute('aria-expanded', 'false');
            answer.setAttribute('hidden', '');
            item.classList.remove('active');
        });
    }
    
    // Gestion du focus pour la navigation au clavier
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableContent = document.querySelectorAll(focusableElements);
    
    // Premier élément focusable
    const firstFocusableElement = focusableContent[0];
    // Dernier élément focusable
    const lastFocusableElement = focusableContent[focusableContent.length - 1];
    
    // Gestion du focus trap pour les modales (si vous en ajoutez à l'avenir)
    document.addEventListener('keydown', function(e) {
        let isTabPressed = e.key === 'Tab' || e.keyCode === 9;
        
        if (!isTabPressed) {
            return;
        }
        
        // Si Shift + Tab (naviguer en arrière)
        if (e.shiftKey) {
            if (document.activeElement === firstFocusableElement) {
                lastFocusableElement.focus();
                e.preventDefault();
            }
        } 
        // Si Tab (naviguer en avant)
        else {
            if (document.activeElement === lastFocusableElement) {
                firstFocusableElement.focus();
                e.preventDefault();
            }
        }
    });
    
    // Amélioration de la navigation au clavier pour les éléments interactifs
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');
    
    interactiveElements.forEach(element => {
        // Ajouter un indicateur visuel au focus pour les éléments interactifs
        element.addEventListener('focus', function() {
            this.classList.add('focus-visible');
        });
        
        element.addEventListener('blur', function() {
            this.classList.remove('focus-visible');
        });
        
        // Gestion de l'activation au clavier (Espace/Entrée)
        if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
            element.addEventListener('keydown', function(e) {
                if (e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') {
                    e.preventDefault();
                    this.click();
                }
            });
        }
    });
    
    // Amélioration de l'accessibilité des messages d'alerte
    function announceToScreenReader(message, politeness = 'polite') {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', politeness);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.classList.add('sr-only');
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Nettoyer après l'annonce
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    // Exposer la fonction pour une utilisation globale si nécessaire
    window.announceToScreenReader = announceToScreenReader;
});
