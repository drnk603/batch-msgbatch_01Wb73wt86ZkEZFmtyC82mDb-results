(function() {
  'use strict';

  const app = {
    initialized: false,
    modules: {},
    observers: new Map(),
    scrollThreshold: 100
  };

  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => { inThrottle = false; }, limit);
      }
    };
  };

  const getHeaderHeight = () => {
    const header = document.querySelector('.l-header');
    return header ? header.offsetHeight : 72;
  };

  const isVisible = (elem) => {
    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
  };

  const sanitizeInput = (value) => {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  };

  class IntersectionObserverManager {
    constructor() {
      this.observers = new Map();
    }

    observe(elements, callback, options = {}) {
      const defaultOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      };
      const observerOptions = { ...defaultOptions, ...options };
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            callback(entry.target);
          }
        });
      }, observerOptions);

      elements.forEach(el => observer.observe(el));
      this.observers.set(callback, observer);
      
      return observer;
    }

    disconnect(callback) {
      const observer = this.observers.get(callback);
      if (observer) {
        observer.disconnect();
        this.observers.delete(callback);
      }
    }

    disconnectAll() {
      this.observers.forEach(observer => observer.disconnect());
      this.observers.clear();
    }
  }

  const observerManager = new IntersectionObserverManager();

  class BurgerMenuModule {
    constructor() {
      this.nav = null;
      this.toggle = null;
      this.navList = null;
      this.isOpen = false;
      this.init();
    }

    init() {
      this.nav = document.querySelector('.navbar-collapse');
      this.toggle = document.querySelector('.navbar-toggler');
      this.navList = document.querySelector('.navbar-nav');

      if (!this.nav || !this.toggle) return;

      this.setupEventListeners();
      this.setupMobileMenu();
    }

    setupMobileMenu() {
      const headerHeight = getHeaderHeight();
      this.nav.style.setProperty('--menu-height', `calc(100vh - ${headerHeight}px)`);
    }

    open() {
      this.isOpen = true;
      this.nav.classList.add('show');
      this.toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('u-no-scroll');
      
      requestAnimationFrame(() => {
        this.nav.style.transform = 'translateX(0)';
        this.nav.style.opacity = '1';
      });
    }

    close() {
      this.isOpen = false;
      this.nav.style.transform = 'translateX(100%)';
      this.nav.style.opacity = '0';
      
      setTimeout(() => {
        this.nav.classList.remove('show');
        this.toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('u-no-scroll');
      }, 250);
    }

    toggle() {
      this.isOpen ? this.close() : this.open();
    }

    setupEventListeners() {
      this.toggle.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });

      document.addEventListener('click', (e) => {
        if (this.isOpen && !this.nav.contains(e.target) && !this.toggle.contains(e.target)) {
          this.close();
        }
      });

      const navLinks = document.querySelectorAll('.c-nav__item, .nav-link');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth < 768) {
            this.close();
          }
        });
      });

      window.addEventListener('resize', debounce(() => {
        if (window.innerWidth >= 768 && this.isOpen) {
          this.close();
        }
      }, 250));
    }
  }

  class ScrollAnimationModule {
    constructor() {
      this.elements = [];
      this.init();
    }

    init() {
      this.collectElements();
      this.setupObserver();
    }

    collectElements() {
      const selectors = [
        '.card',
        '.c-service-card',
        '.hero-section',
        'img:not(.c-logo img)',
        'h1, h2, h3',
        '.btn',
        '.c-button',
        'p',
        'form'
      ];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (!el.hasAttribute('data-animated')) {
            this.elements.push(el);
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
          }
        });
      });
    }

    setupObserver() {
      observerManager.observe(
        this.elements,
        (element) => {
          this.animateElement(element);
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
      );
    }

    animateElement(element) {
      element.setAttribute('data-animated', 'true');
      requestAnimationFrame(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      });
    }
  }

  class MicroInteractionsModule {
    constructor() {
      this.init();
    }

    init() {
      this.setupButtonEffects();
      this.setupLinkEffects();
      this.setupCardEffects();
    }

    createRipple(event, element) {
      const ripple = document.createElement('span');
      const rect = element.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.position = 'absolute';
      ripple.style.borderRadius = '50%';
      ripple.style.background = 'rgba(255, 255, 255, 0.6)';
      ripple.style.transform = 'scale(0)';
      ripple.style.animation = 'ripple 600ms ease-out';
      ripple.style.pointerEvents = 'none';

      const style = document.createElement('style');
      if (!document.querySelector('#ripple-animation')) {
        style.id = 'ripple-animation';
        style.textContent = `
          @keyframes ripple {
            to {
              transform: scale(4);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }

      element.style.position = 'relative';
      element.style.overflow = 'hidden';
      element.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    }

    setupButtonEffects() {
      const buttons = document.querySelectorAll('.btn, .c-button, button[type="submit"]');
      
      buttons.forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
          this.createRipple(e, btn);
        });

        btn.addEventListener('mouseenter', () => {
          requestAnimationFrame(() => {
            btn.style.transform = 'translateY(-2px)';
          });
        });

        btn.addEventListener('mouseleave', () => {
          requestAnimationFrame(() => {
            btn.style.transform = 'translateY(0)';
          });
        });
      });
    }

    setupLinkEffects() {
      const links = document.querySelectorAll('a:not(.btn):not(.c-button)');
      
      links.forEach(link => {
        link.addEventListener('mouseenter', () => {
          requestAnimationFrame(() => {
            link.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
            link.style.transform = 'translateX(2px)';
          });
        });

        link.addEventListener('mouseleave', () => {
          requestAnimationFrame(() => {
            link.style.transform = 'translateX(0)';
          });
        });
      });
    }

    setupCardEffects() {
      const cards = document.querySelectorAll('.card, .c-service-card');
      
      cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
          requestAnimationFrame(() => {
            card.style.transform = 'translateY(-8px) scale(1.02)';
            card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
          });
        });

        card.addEventListener('mouseleave', () => {
          requestAnimationFrame(() => {
            card.style.transform = 'translateY(0) scale(1)';
            card.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
          });
        });
      });
    }
  }

  class FormValidationModule {
    constructor() {
      this.forms = [];
      this.patterns = {
        name: /^[a-zA-ZÀ-ÿ\s-']{2,50}$/,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^[\d\s+\-()]{10,20}$/,
        message: /^.{10,}$/
      };
      this.init();
    }

    init() {
      this.forms = [
        ...document.querySelectorAll('#contact-form'),
        ...document.querySelectorAll('#applicationForm'),
        ...document.querySelectorAll('form.c-form')
      ];

      this.forms.forEach(form => {
        if (form) {
          this.setupForm(form);
        }
      });
    }

    setupForm(form) {
      const honeypot = document.createElement('input');
      honeypot.type = 'text';
      honeypot.name = 'website';
      honeypot.style.position = 'absolute';
      honeypot.style.left = '-9999px';
      honeypot.tabIndex = -1;
      honeypot.setAttribute('autocomplete', 'off');
      form.appendChild(honeypot);

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit(form, honeypot);
      });

      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.addEventListener('blur', () => this.validateField(input));
        input.addEventListener('input', debounce(() => this.validateField(input), 300));
      });
    }

    validateField(field) {
      const value = field.value.trim();
      const fieldName = field.name || field.id;
      let isValid = true;
      let errorMessage = '';

      this.clearError(field);

      if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = 'Dieses Feld ist erforderlich';
      } else if (value) {
        switch (fieldName) {
          case 'name':
          case 'firstName':
          case 'lastName':
            if (!this.patterns.name.test(value)) {
              isValid = false;
              errorMessage = 'Bitte geben Sie einen gültigen Namen ein (2-50 Zeichen)';
            }
            break;

          case 'email':
            if (!this.patterns.email.test(value)) {
              isValid = false;
              errorMessage = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
            }
            break;

          case 'phone':
            if (value && !this.patterns.phone.test(value)) {
              isValid = false;
              errorMessage = 'Bitte geben Sie eine gültige Telefonnummer ein';
            }
            break;

          case 'message':
            if (!this.patterns.message.test(value)) {
              isValid = false;
              errorMessage = 'Die Nachricht muss mindestens 10 Zeichen lang sein';
            }
            break;
        }
      }

      if (field.type === 'checkbox' && field.hasAttribute('required') && !field.checked) {
        isValid = false;
        errorMessage = 'Bitte akzeptieren Sie die Bedingungen';
      }

      if (!isValid) {
        this.showError(field, errorMessage);
      }

      return isValid;
    }

    showError(field, message) {
      field.classList.add('is-invalid');
      field.setAttribute('aria-invalid', 'true');
      
      let errorDiv = field.parentElement.querySelector('.invalid-feedback');
      if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        field.parentElement.appendChild(errorDiv);
      }
      
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }

    clearError(field) {
      field.classList.remove('is-invalid');
      field.removeAttribute('aria-invalid');
      
      const errorDiv = field.parentElement.querySelector('.invalid-feedback');
      if (errorDiv) {
        errorDiv.style.display = 'none';
      }
    }

    async handleSubmit(form, honeypot) {
      if (honeypot.value) {
        return;
      }

      const inputs = form.querySelectorAll('input, textarea, select');
      let isFormValid = true;

      inputs.forEach(input => {
        if (input !== honeypot && input.name !== 'website') {
          if (!this.validateField(input)) {
            isFormValid = false;
          }
        }
      });

      if (!isFormValid) {
        this.showNotification('Bitte korrigieren Sie die Fehler im Formular', 'error');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : '';
      
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Wird gesendet...';
      }

      await new Promise(resolve => setTimeout(resolve, 800));

      try {
        const formData = new FormData(form);
        const jsonData = {};
        
        formData.forEach((value, key) => {
          if (key !== 'website') {
            jsonData[key] = sanitizeInput(value);
          }
        });

        window.location.href = 'thank_you.html';
      } catch (error) {
        this.showNotification('Es gab einen Fehler. Bitte versuchen Sie es später erneut.', 'error');
        
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      }
    }

    showNotification(message, type = 'info') {
      const alertClass = type === 'error' ? 'alert-danger' : type === 'success' ? 'alert-success' : 'alert-info';
      
      let container = document.querySelector('.notification-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '1055';
        container.style.maxWidth = '400px';
        document.body.appendChild(container);
      }

      const alert = document.createElement('div');
      alert.className = `alert ${alertClass} alert-dismissible fade show`;
      alert.setAttribute('role', 'alert');
      alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" aria-label="Schließen"></button>
      `;

      container.appendChild(alert);

      const closeBtn = alert.querySelector('.btn-close');
      closeBtn.addEventListener('click', () => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
      });

      setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
      }, 5000);
    }
  }

  class SmoothScrollModule {
    constructor() {
      this.init();
    }

    init() {
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (href === '#' || href === '#!') return;

        const targetId = href.substring(1);
        const target = document.getElementById(targetId);

        if (target) {
          e.preventDefault();
          const headerHeight = getHeaderHeight();
          const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    }
  }

  class ScrollSpyModule {
    constructor() {
      this.sections = [];
      this.navLinks = [];
      this.init();
    }

    init() {
      this.sections = [...document.querySelectorAll('[id]')].filter(section => {
        return document.querySelector(`a[href="#${section.id}"]`);
      });

      this.navLinks = [...document.querySelectorAll('.c-nav__item, .nav-link')];

      if (this.sections.length === 0) return;

      window.addEventListener('scroll', throttle(() => this.updateActiveLink(), 100));
      this.updateActiveLink();
    }

    updateActiveLink() {
      const scrollPosition = window.scrollY + getHeaderHeight() + 100;

      let currentSection = null;

      this.sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;

        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
          currentSection = section;
        }
      });

      this.navLinks.forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');

        if (currentSection) {
          const href = link.getAttribute('href');
          if (href === `#${currentSection.id}`) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
          }
        }
      });
    }
  }

  class ImageModule {
    constructor() {
      this.init();
    }

    init() {
      const images = document.querySelectorAll('img');
      
      images.forEach(img => {
        if (!img.classList.contains('img-fluid')) {
          img.classList.add('img-fluid');
        }

        if (!img.hasAttribute('loading') && !img.classList.contains('c-logo')) {
          img.setAttribute('loading', 'lazy');
        }

        img.addEventListener('error', () => this.handleImageError(img));
      });
    }

    handleImageError(img) {
      const placeholder = 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
          <rect width="400" height="300" fill="#f5f5f5"/>
          <text x="200" y="150" text-anchor="middle" fill="#9e9e9e" font-family="sans-serif" font-size="18">
            Bild nicht verfügbar
          </text>
        </svg>
      `);

      img.src = placeholder;
      img.style.objectFit = 'contain';
    }
  }

  class CountUpModule {
    constructor() {
      this.counters = [];
      this.init();
    }

    init() {
      const counterElements = document.querySelectorAll('[data-count]');
      
      counterElements.forEach(el => {
        const target = parseInt(el.getAttribute('data-count')) || 0;
        this.counters.push({ element: el, target, current: 0, animated: false });
      });

      if (this.counters.length > 0) {
        observerManager.observe(
          this.counters.map(c => c.element),
          (element) => {
            const counter = this.counters.find(c => c.element === element);
            if (counter && !counter.animated) {
              this.animateCounter(counter);
            }
          },
          { threshold: 0.5 }
        );
      }
    }

    animateCounter(counter) {
      counter.animated = true;
      const duration = 2000;
      const steps = 60;
      const stepValue = counter.target / steps;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        counter.current = Math.min(Math.round(stepValue * currentStep), counter.target);
        counter.element.textContent = counter.current.toLocaleString('de-DE');

        if (currentStep >= steps) {
          clearInterval(interval);
          counter.element.textContent = counter.target.toLocaleString('de-DE');
        }
      }, stepDuration);
    }
  }

  class ScrollToTopModule {
    constructor() {
      this.button = null;
      this.init();
    }

    init() {
      this.createButton();
      this.setupListeners();
    }

    createButton() {
      this.button = document.createElement('button');
      this.button.className = 'scroll-to-top';
      this.button.setAttribute('aria-label', 'Nach oben scrollen');
      this.button.innerHTML = '↑';
      this.button.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background-color: var(--color-accent);
        color: white;
        border: none;
        cursor: pointer;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `;

      document.body.appendChild(this.button);
    }

    setupListeners() {
      window.addEventListener('scroll', throttle(() => {
        if (window.pageYOffset > 300) {
          this.button.style.opacity = '1';
          this.button.style.visibility = 'visible';
        } else {
          this.button.style.opacity = '0';
          this.button.style.visibility = 'hidden';
        }
      }, 100));

      this.button.addEventListener('click', () => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });

      this.button.addEventListener('mouseenter', () => {
        this.button.style.transform = 'scale(1.1)';
      });

      this.button.addEventListener('mouseleave', () => {
        this.button.style.transform = 'scale(1)';
      });
    }
  }

  class ChatWidgetModule {
    constructor() {
      this.widget = null;
      this.panel = null;
      this.toggle = null;
      this.isOpen = false;
      this.init();
    }

    init() {
      this.widget = document.querySelector('.c-chat-widget');
      if (!this.widget) return;

      this.panel = this.widget.querySelector('.c-chat-panel');
      this.toggle = this.widget.querySelector('.c-chat-toggle');
      const closeBtn = this.widget.querySelector('.c-chat-close');

      if (this.toggle) {
        this.toggle.addEventListener('click', () => this.toggleChat());
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeChat());
      }

      const quickButtons = this.widget.querySelectorAll('.btn-outline-primary');
      quickButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          this.handleQuickAction(btn.textContent.trim());
        });
      });
    }

    toggleChat() {
      this.isOpen ? this.closeChat() : this.openChat();
    }

    openChat() {
      if (!this.panel) return;
      this.isOpen = true;
      this.panel.classList.add('is-open');
      this.panel.style.opacity = '0';
      this.panel.style.transform = 'translateY(20px)';
      
      requestAnimationFrame(() => {
        this.panel.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        this.panel.style.opacity = '1';
        this.panel.style.transform = 'translateY(0)';
      });
    }

    closeChat() {
      if (!this.panel) return;
      this.panel.style.opacity = '0';
      this.panel.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        this.panel.classList.remove('is-open');
        this.isOpen = false;
      }, 300);
    }

    handleQuickAction(action) {
      console.log('Quick action:', action);
    }
  }

  class ModalModule {
    constructor() {
      this.init();
    }

    init() {
      const privacyLinks = document.querySelectorAll('a[href*="privacy"]');
      
      privacyLinks.forEach(link => {
        if (link.getAttribute('href') === '#privacy' || link.textContent.includes('Datenschutz')) {
          link.addEventListener('click', (e) => {
            if (!link.getAttribute('href').includes('.html')) {
              e.preventDefault();
              this.showPrivacyModal();
            }
          });
        }
      });
    }

    showPrivacyModal() {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1050;
        padding: 20px;
        opacity: 0;
        transition: opacity 0.3s ease-out;
      `;

      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 12px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        transform: scale(0.9);
        transition: transform 0.3s ease-out;
      `;

      modalContent.innerHTML = `
        <h3 style="margin-bottom: 20px;">Datenschutzerklärung</h3>
        <p>Für ausführliche Informationen besuchen Sie bitte unsere <a href="privacy.html">Datenschutzseite</a>.</p>
        <button class="btn btn-primary mt-3">Schließen</button>
      `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      requestAnimationFrame(() => {
        modal.style.opacity = '1';
        modalContent.style.transform = 'scale(1)';
      });

      const closeModal = () => {
        modal.style.opacity = '0';
        modalContent.style.transform = 'scale(0.9)';
        setTimeout(() => modal.remove(), 300);
      };

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      modalContent.querySelector('button').addEventListener('click', closeModal);
    }
  }

  const initializeApp = () => {
    if (app.initialized) return;
    app.initialized = true;

    app.modules.burgerMenu = new BurgerMenuModule();
    app.modules.scrollAnimation = new ScrollAnimationModule();
    app.modules.microInteractions = new MicroInteractionsModule();
    app.modules.formValidation = new FormValidationModule();
    app.modules.smoothScroll = new SmoothScrollModule();
    app.modules.scrollSpy = new ScrollSpyModule();
    app.modules.images = new ImageModule();
    app.modules.countUp = new CountUpModule();
    app.modules.scrollToTop = new ScrollToTopModule();
    app.modules.chatWidget = new ChatWidgetModule();
    app.modules.modal = new ModalModule();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }

  window.addEventListener('beforeunload', () => {
    observerManager.disconnectAll();
  });

})();