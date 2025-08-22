/**
 * Cédric Dubai Solutions - Main JavaScript
 * Handles navigation, animations, and interactive elements
 */

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const navLinksItems = document.querySelectorAll('.nav-links a');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
        });
        
        // Close mobile menu when clicking on a link
        navLinksItems.forEach(link => {
            link.addEventListener('click', function() {
                if (navLinks.classList.contains('active')) {
                    hamburger.classList.remove('active');
                    navLinks.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                }
            });
        });
    }
    
    // FAQ Accordion Functionality
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            
            // Close all answers by default
            answer.style.maxHeight = '0';
            answer.style.padding = '0 25px';
            
            question.addEventListener('click', function() {
                // Toggle active class on the clicked item
                const isActive = item.classList.contains('active');
                
                // Close all items
                faqItems.forEach(faqItem => {
                    faqItem.classList.remove('active');
                    const faqAnswer = faqItem.querySelector('.faq-answer');
                    faqAnswer.style.maxHeight = '0';
                    faqAnswer.style.padding = '0 25px';
                });
                
                // If the clicked item was not active, open it
                if (!isActive) {
                    item.classList.add('active');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    answer.style.padding = '0 25px 20px';
                    
                    // Smooth scroll to the question if it's not fully visible
                    const headerOffset = 120;
                    const elementPosition = item.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
            
            // Keyboard navigation for accessibility
            question.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    question.click();
                }
            });
        });
        
        // Open first FAQ item by default
        if (faqItems.length > 0) {
            const firstFaq = faqItems[0];
            firstFaq.classList.add('active');
            const firstAnswer = firstFaq.querySelector('.faq-answer');
            firstAnswer.style.maxHeight = firstAnswer.scrollHeight + 'px';
            firstAnswer.style.padding = '0 25px 20px';
        }
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        if (anchor.classList.contains('faq-question')) return; // Skip FAQ questions
        
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                
                // If it's a FAQ link, open the corresponding item
                if (targetId.startsWith('#faq-')) {
                    const faqItem = document.querySelector(`[data-faq="${targetId.substring(1)}"]`);
                    if (faqItem) {
                        faqItem.querySelector('.faq-question').click();
                        return;
                    }
                }
                
                // Regular smooth scrolling
                const headerOffset = 100;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add animation class to elements when they come into view
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.feature-card, .section-header, .cta-content, .faq-item');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;
            
            if (elementPosition < screenPosition) {
                element.classList.add('animate-fade-in-up');
            }
        });
    };
    
    // Run once on page load
    animateOnScroll();
    
    // Run on scroll
    window.addEventListener('scroll', animateOnScroll);
    
    // Add active class to current section in navigation
    const sections = document.querySelectorAll('section[id]');
    
    const highlightNavigation = function() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinksItems.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    };
    
    // Run on scroll
    window.addEventListener('scroll', highlightNavigation);
    
    // Initialize tooltips if any
    const initTooltips = function() {
        const tooltips = document.querySelectorAll('[data-tooltip]');
        
        tooltips.forEach(tooltip => {
            tooltip.addEventListener('mouseenter', function() {
                const tooltipText = this.getAttribute('data-tooltip');
                const tooltipElement = document.createElement('div');
                tooltipElement.className = 'tooltip';
                tooltipElement.textContent = tooltipText;
                
                // Position the tooltip
                const rect = this.getBoundingClientRect();
                tooltipElement.style.top = `${rect.top - 40}px`;
                tooltipElement.style.left = `${rect.left + (rect.width / 2) - (tooltipText.length * 4)}px`;
                
                document.body.appendChild(tooltipElement);
                
                // Remove tooltip on mouse leave
                this.addEventListener('mouseleave', function() {
                    document.body.removeChild(tooltipElement);
                });
            });
        });
    };
    
    // Initialize tooltips
    initTooltips();
    
    // Handle contact form submission
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const formObject = {};
            
            formData.forEach((value, key) => {
                formObject[key] = value;
            });
            
            // Here you would typically send the form data to a server
            console.log('Form submitted:', formObject);
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'alert alert-success';
            successMessage.textContent = 'Votre message a été envoyé avec succès ! Nous vous répondrons dès que possible.';
            
            // Insert before form
            contactForm.parentNode.insertBefore(successMessage, contactForm);
            
            // Scroll to success message
            successMessage.scrollIntoView({ behavior: 'smooth' });
            
            // Reset form
            contactForm.reset();
            
            // Remove success message after 5 seconds
            setTimeout(() => {
                successMessage.style.opacity = '0';
                setTimeout(() => {
                    successMessage.remove();
                }, 300);
            }, 5000);
        });
    }
    
    // Add animation to elements when they come into view
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    
    const checkIfInView = function() {
        animateElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('active');
            }
        });
    };
    
    // Run on load and scroll
    window.addEventListener('load', checkIfInView);
    window.addEventListener('scroll', checkIfInView);
    
    // Back to top button
    const backToTopButton = document.createElement('button');
    backToTopButton.className = 'back-to-top';
    backToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTopButton.setAttribute('aria-label', 'Retour en haut de la page');
    document.body.appendChild(backToTopButton);
    
    // Show/hide back to top button
    const toggleBackToTop = function() {
        if (window.pageYOffset > 300) {
            backToTopButton.classList.add('show');
        } else {
            backToTopButton.classList.remove('show');
        }
    };
    
    // Scroll to top when clicked
    backToTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Toggle back to top button on scroll
    window.addEventListener('scroll', toggleBackToTop);
    
    // Initialize AOS (Animate On Scroll) if needed
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true
        });
    }
});
