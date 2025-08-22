/**
 * Fichier de configuration pour les outils d'analyse (Google Analytics, Facebook Pixel, etc.)
 * 
 * Instructions d'utilisation :
 * 1. Remplacez 'G-VOTRE_ID' par votre ID de suivi Google Analytics
 * 2. Remplacez 'VOTRE_ID_PIXEL' par votre ID de pixel Facebook
 * 3. Décommentez les sections souhaitées
 * 4. Incluez ce fichier dans votre template de base avant la fermeture de la balise </head>
 */

// Configuration des outils d'analyse
const analyticsConfig = {
  // Activer/désactiver le mode développement (désactive l'envoi des données)
  debug: false,
  
  // Configuration Google Analytics 4 (GA4)
  googleAnalytics: {
    enabled: true,
    measurementId: 'G-VOTRE_ID', // À remplacer par votre ID de mesure GA4
    
    // Paramètres personnalisés (optionnel)
    customDimensions: {
      // Exemple: 'dimension1': 'user_type'
    },
    
    // Événements personnalisés (optionnel)
    customEvents: {
      // Exemple: 'signup': 'sign_up'
    }
  },
  
  // Configuration Facebook Pixel
  facebookPixel: {
    enabled: true,
    pixelId: 'VOTRE_ID_PIXEL', // À remplacer par votre ID de pixel Facebook
    
    // Événements standards à suivre (optionnel)
    trackEvents: [
      'PageView',
      'ViewContent',
      'Search',
      'AddToCart',
      'InitiateCheckout',
      'AddPaymentInfo',
      'Purchase',
      'Lead',
      'CompleteRegistration'
    ]
  }
};

/**
 * Initialisation de Google Analytics 4
 */
function initGoogleAnalytics() {
  if (!analyticsConfig.googleAnalytics.enabled || !analyticsConfig.googleAnalytics.measurementId) {
    if (analyticsConfig.debug) {
      console.log('Google Analytics est désactivé ou aucun ID de mesure n\'est défini');
    }
    return;
  }

  // Script de chargement asynchrone de Google Analytics
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtag/js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer', analyticsConfig.googleAnalytics.measurementId);

  // Configuration de base
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  
  // Configuration supplémentaire (optionnel)
  gtag('config', analyticsConfig.googleAnalytics.measurementId, {
    'anonymize_ip': true,
    'cookie_domain': window.location.hostname,
    'cookie_flags': 'SameSite=None;Secure',
    'send_page_view': true
  });
  
  // Fonction utilitaire pour suivre les événements
  window.trackGAEvent = function(eventName, eventParams = {}) {
    if (window.gtag) {
      gtag('event', eventName, eventParams);
    } else if (analyticsConfig.debug) {
      console.log('Événement GA non envoyé (gtag non chargé):', eventName, eventParams);
    }
  };
  
  if (analyticsConfig.debug) {
    console.log('Google Analytics initialisé avec l\'ID:', analyticsConfig.googleAnalytics.measurementId);
  }
}

/**
 * Initialisation de Facebook Pixel
 */
function initFacebookPixel() {
  if (!analyticsConfig.facebookPixel.enabled || !analyticsConfig.facebookPixel.pixelId) {
    if (analyticsConfig.debug) {
      console.log('Facebook Pixel est désactivé ou aucun ID de pixel n\'est défini');
    }
    return;
  }
  
  // Script de chargement de Facebook Pixel
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  
  // Initialisation du pixel
  fbq('init', analyticsConfig.facebookPixel.pixelId);
  
  // Suivi de la vue de page
  fbq('track', 'PageView');
  
  // Configuration des événements standards
  analyticsConfig.facebookPixel.trackEvents.forEach(event => {
    if (event !== 'PageView') {
      fbq('track', event);
    }
  });
  
  // Fonction utilitaire pour suivre les événements personnalisés
  window.trackFbEvent = function(eventName, eventData = {}) {
    if (window.fbq) {
      fbq('track', eventName, eventData);
    } else if (analyticsConfig.debug) {
      console.log('Événement Facebook non envoyé (fbq non chargé):', eventName, eventData);
    }
  };
  
  if (analyticsConfig.debug) {
    console.log('Facebook Pixel initialisé avec l\'ID:', analyticsConfig.facebookPixel.pixelId);
  }
}

/**
 * Initialisation des outils d'analyse
 */
function initAnalytics() {
  // Vérifier si le mode debug est activé
  if (analyticsConfig.debug) {
    console.log('Initialisation des outils d\'analyse en mode debug');
  }
  
  // Désactiver le suivi pour les utilisateurs en mode navigation privée ou avec le DNT activé
  const doNotTrack = navigator.doNotTrack === '1' || 
                    window.doNotTrack === '1' || 
                    navigator.msDoNotTrack === '1';
                    
  if (doNotTrack) {
    if (analyticsConfig.debug) {
      console.log('Le suivi est désactivé (Do Not Track est activé)');
    }
    return;
  }
  
  // Initialiser Google Analytics
  if (analyticsConfig.googleAnalytics.enabled) {
    initGoogleAnalytics();
  }
  
  // Initialiser Facebook Pixel
  if (analyticsConfig.facebookPixel.enabled) {
    initFacebookPixel();
  }
  
  // Suivre les événements de navigation (optionnel)
  trackPageView();
}

/**
 * Suivi des vues de page
 */
function trackPageView() {
  // Envoyer un événement de vue de page personnalisé
  if (window.trackGAEvent) {
    trackGAEvent('page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  }
  
  // Envoyer un événement de vue de contenu à Facebook
  if (window.trackFbEvent) {
    trackFbEvent('ViewContent', {
      content_name: document.title,
      content_category: 'page_view',
      content_ids: [window.location.pathname],
      content_type: 'product',
      value: 0.00,
      currency: 'EUR'
    });
  }
}

// Démarrer l'initialisation lorsque le DOM est chargé
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnalytics);
} else {
  initAnalytics();
}

// Exporter les fonctions pour une utilisation dans d'autres fichiers
window.analytics = {
  trackEvent: function(provider, eventName, eventData) {
    if (provider === 'ga' && window.trackGAEvent) {
      trackGAEvent(eventName, eventData);
    } else if (provider === 'fb' && window.trackFbEvent) {
      trackFbEvent(eventName, eventData);
    } else if (analyticsConfig.debug) {
      console.log(`Impossible d'envoyer l'événement ${eventName} au fournisseur ${provider}`);
    }
  },
  
  // Exemple de fonction pour suivre les conversions
  trackConversion: function(value, currency = 'EUR') {
    if (window.trackGAEvent) {
      trackGAEvent('purchase', {
        value: value,
        currency: currency,
        transaction_id: 'T' + Math.floor(Math.random() * 1000000000)
      });
    }
    
    if (window.trackFbEvent) {
      trackFbEvent('Purchase', {
        value: value,
        currency: currency,
        content_ids: ['purchase_' + Date.now()],
        content_type: 'product'
      });
    }
  },
  
  // Exemple de fonction pour suivre les inscriptions
  trackSignup: function(method = 'form') {
    if (window.trackGAEvent) {
      trackGAEvent('sign_up', { method: method });
    }
    
    if (window.trackFbEvent) {
      trackFbEvent('CompleteRegistration', {
        content_name: 'Inscription',
        content_category: 'user_engagement',
        value: 0.00,
        currency: 'EUR'
      });
    }
  }
};

// Exemple d'utilisation :
// analytics.trackEvent('ga', 'button_click', { button_id: 'cta_contact' });
// analytics.trackConversion(49.99, 'EUR');
// analytics.trackSignup('email');
