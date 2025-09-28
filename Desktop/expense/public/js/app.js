// Enhanced Expense Tracker App with Framer Motion Animations
(function () {
  const getEl = (id) => document.getElementById(id);

  // Animation utilities using Framer Motion concepts
  const animate = {
    fadeIn: (element, duration = 0.3) => {
      if (!element) return;
      element.style.opacity = '0';
      element.style.transform = 'translateY(10px)';
      element.style.transition = `opacity ${duration}s ease, transform ${duration}s ease`;
      
      requestAnimationFrame(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      });
    },
    
    slideIn: (element, direction = 'right', duration = 0.3) => {
      if (!element) return;
      const transforms = {
        right: 'translateX(20px)',
        left: 'translateX(-20px)',
        up: 'translateY(-20px)',
        down: 'translateY(20px)'
      };
      
      element.style.opacity = '0';
      element.style.transform = transforms[direction];
      element.style.transition = `opacity ${duration}s ease, transform ${duration}s ease`;
      
      requestAnimationFrame(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateX(0) translateY(0)';
      });
    },
    
    scale: (element, fromScale = 0.9, duration = 0.2) => {
      if (!element) return;
      element.style.transform = `scale(${fromScale})`;
      element.style.transition = `transform ${duration}s ease`;
      
      requestAnimationFrame(() => {
        element.style.transform = 'scale(1)';
      });
    },
    
    bounce: (element) => {
      if (!element) return;
      element.style.animation = 'bounce 0.5s ease';
      setTimeout(() => {
        element.style.animation = '';
      }, 500);
    }
  };

  const destroyCharts = () => {
    const charts = window.appState.charts || {};
    Object.keys(charts).forEach((key) => {
      if (charts[key]) {
        charts[key].destroy();
      }
      charts[key] = null;
    });
  };

  const setNavActive = (section) => {
    document.querySelectorAll('[data-section]').forEach((element) => {
      if (element.dataset.section === section) {
        element.classList.add('active');
        animate.scale(element, 0.95, 0.1);
      } else {
        element.classList.remove('active');
      }
    });
  };

  const showSection = (sectionId) => {
    hideLoading();
    document.querySelectorAll('.content-section').forEach((element) => {
      element.classList.add('hidden');
    });

    const targetSection = getEl(sectionId);
    if (targetSection) {
      targetSection.classList.remove('hidden');
      // Add animation to the new section
      setTimeout(() => animateSection(sectionId), 50);
    }

    setNavActive(sectionId);
  };

  const toggleModal = (modalId, show) => {
    const modal = getEl(modalId);
    if (!modal) return;

    if (show) {
      modal.classList.remove('hidden');
      modal.classList.add('open');
      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) {
        animateElement(modalContent, 'scale-in');
      }
    } else {
      modal.classList.remove('open');
      setTimeout(() => modal.classList.add('hidden'), 200);
    }
  };  const showLoading = (message = 'Loading...') => {
    const loader = getEl('loadingIndicator');
    if (!loader) return;
    loader.classList.remove('hidden');
    const text = loader.querySelector('span');
    if (text) {
      text.textContent = message;
    }
  };

  const hideLoading = () => {
    const loader = getEl('loadingIndicator');
    if (!loader) return;
    loader.classList.add('hidden');
  };

    const showAlert = (message, type = 'info', timeout = 5000) => {
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    const alertClass = {
      success: 'bg-green-100 border-green-400 text-green-700',
      error: 'bg-red-100 border-red-400 text-red-700',
      warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
      info: 'bg-blue-100 border-blue-400 text-blue-700'
    }[type];

    const alert = document.createElement('div');
    alert.className = `alert fixed top-4 right-4 px-4 py-3 rounded border z-50 max-w-md shadow-lg ${alertClass}`;
    alert.innerHTML = `
      <div class="flex justify-between items-center">
        <span>${message}</span>
        <button type="button" class="ml-4 text-lg font-bold opacity-70 hover:opacity-100">&times;</button>
      </div>
    `;

    document.body.appendChild(alert);

    // Add entrance animation
    setTimeout(() => animateElement(alert, 'slide-in-right'), 10);

    const removeAlert = () => {
      animateElement(alert, 'slide-in-left');
      setTimeout(() => {
        if (alert.parentNode) {
          alert.parentNode.removeChild(alert);
        }
      }, 300);
    };

    const closeButton = alert.querySelector('button');
    if (closeButton) {
      closeButton.addEventListener('click', removeAlert);
    }
    if (timeout > 0) {
      setTimeout(removeAlert, timeout);
    }
  };

  const updateAuthUI = (isAuthenticated) => {
    const loginBtn = getEl('loginBtn');
    const logoutBtn = getEl('logoutBtn');
    const userInfo = document.querySelector('.user-info');

    if (isAuthenticated) {
      loginBtn?.classList.add('hidden');
      logoutBtn?.classList.remove('hidden');
      userInfo?.classList.remove('hidden');
    } else {
      loginBtn?.classList.remove('hidden');
      logoutBtn?.classList.add('hidden');
      userInfo?.classList.add('hidden');
    }
  };

  const resetUI = () => {
    document.querySelectorAll('.content-section').forEach((element) => {
      element.classList.add('hidden');
    });

    const authRequired = getEl('authRequired');
    if (authRequired) {
      authRequired.classList.remove('hidden');
    }

    const usernameDisplay = getEl('username');
    if (usernameDisplay) {
      usernameDisplay.textContent = '';
    }

    setNavActive('');
    destroyCharts();
    updateAuthUI(false);
  };

  const handleLoginSuccess = (user) => {
    if (!user) return;

    window.appState.user = user;
    if (typeof window.apiClient.setToken === 'function' && window.appState.token) {
      window.apiClient.setToken(window.appState.token, user);
    }

    const usernameDisplay = getEl('username');
    if (usernameDisplay) {
      usernameDisplay.textContent = user.firstName || user.username || 'User';
    }

    updateAuthUI(true);
    if (typeof window.populateExpenseCategoryOptions === 'function') {
      window.populateExpenseCategoryOptions();
    }
    if (typeof window.hydrateExpenseFilters === 'function') {
      window.hydrateExpenseFilters();
    }

    showSection('dashboard');

    if (typeof window.loadCategories === 'function') {
      window.loadCategories();
    }
    if (typeof window.loadExpenses === 'function') {
      window.loadExpenses();
    }
    if (typeof window.loadDashboard === 'function') {
      window.loadDashboard();
    }
  };

  const handleLogout = () => {
    if (typeof window.apiClient.clearToken === 'function') {
      window.apiClient.clearToken();
    }

    window.appState.token = null;
    window.appState.user = null;
    window.appState.categories = [];
    window.appState.expenses = [];
    window.appState.expensesPagination = { current: 1, pages: 1, limit: 20, total: 0 };
    window.appState.expenseFilters = { categoryId: '', startDate: '', endDate: '' };

    if (typeof window.populateExpenseCategoryOptions === 'function') {
      window.populateExpenseCategoryOptions();
    }
    if (typeof window.populateCategoryParentOptions === 'function') {
      window.populateCategoryParentOptions();
    }

    resetUI();
  };

  const handleAuthExpired = () => {
    handleLogout();
    showAlert('Session expired. Please login again.', 'error');
    showLoginModal();
  };

  const initialize = async () => {
    window.appState.charts = window.appState.charts || {};

    document.querySelectorAll('.mobile-nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        const menu = document.querySelector('.mobile-menu');
        if (menu) {
          menu.classList.add('hidden');
        }
      });
    });

    if (window.appState.token) {
      try {
        const user = await window.fetchProfile();
        handleLoginSuccess(user);
      } catch (error) {
        window.apiClient.clearToken();
        handleLogout();
      }
    } else {
      handleLogout();
    }
  };

  const showLoginModal = () => toggleModal('loginModal', true);
  const hideLoginModal = () => toggleModal('loginModal', false);
  const showRegisterModal = () => toggleModal('registerModal', true);
  const hideRegisterModal = () => toggleModal('registerModal', false);
  const showExpenseModal = () => toggleModal('expenseModal', true);
  const hideExpenseModal = () => toggleModal('expenseModal', false);
  const showCategoryModal = () => toggleModal('categoryModal', true);
  const hideCategoryModal = () => toggleModal('categoryModal', false);

  // Animation utilities for enhanced UX
  const animateElement = (element, animation) => {
    element.classList.add('animate-' + animation);
    setTimeout(() => element.classList.remove('animate-' + animation), 500);
  };

  const staggerElements = (elements, animation, delay = 100) => {
    elements.forEach((element, index) => {
      setTimeout(() => {
        element.classList.add('stagger-item', 'animate-' + animation);
        setTimeout(() => {
          element.classList.remove('stagger-item', 'animate-' + animation);
        }, 500);
      }, index * delay);
    });
  };

  const animateSection = (sectionId) => {
    const section = getEl(sectionId);
    if (!section) return;
    
    section.classList.add('animate-fade-in');
    const cards = section.querySelectorAll('.card, .stats-card, .category-card');
    const buttons = section.querySelectorAll('.btn');
    
    // Animate cards with stagger
    if (cards.length) {
      staggerElements(Array.from(cards), 'slide-in-up');
    }
    
    // Add hover effects to buttons
    buttons.forEach(btn => {
      if (!btn.classList.contains('hover-lift')) {
        btn.classList.add('hover-lift', 'transition-all');
      }
    });
  };

  window.showSection = showSection;
  window.showLoading = showLoading;
  window.hideLoading = hideLoading;
  window.showAlert = showAlert;
  window.animateElement = animateElement;
  window.staggerElements = staggerElements;
  window.animateSection = animateSection;
  window.showLoginModal = showLoginModal;
  window.hideLoginModal = hideLoginModal;
  window.showRegisterModal = showRegisterModal;
  window.hideRegisterModal = hideRegisterModal;
  window.showExpenseModal = showExpenseModal;
  window.hideExpenseModal = hideExpenseModal;
  window.showCategoryModal = showCategoryModal;
  window.hideCategoryModal = hideCategoryModal;
  // Aliases to support existing HTML onclick handlers
  window.showAddExpenseModal = showExpenseModal;
  window.showAddCategoryModal = showCategoryModal;
  window.handleLoginSuccess = handleLoginSuccess;
  window.handleLogout = handleLogout;
  window.handleAuthExpired = handleAuthExpired;

  document.addEventListener('DOMContentLoaded', initialize);
})();
