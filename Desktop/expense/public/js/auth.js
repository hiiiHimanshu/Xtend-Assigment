(function () {
  const getInputValue = (id) => document.getElementById(id)?.value.trim();

  async function login(event) {
    event.preventDefault();

    const email = getInputValue('loginEmail');
    const password = getInputValue('loginPassword');

    if (!email || !password) {
      if (typeof window.showAlert === 'function') {
        window.showAlert('Email and password are required', 'error');
      }
      return;
    }

    try {
      if (typeof window.showLoading === 'function') {
        window.showLoading('Logging in...');
      }

      const data = await window.apiClient.post('/auth/login', { email, password });
      window.apiClient.setToken(data.token, data.user);

      if (typeof window.handleLoginSuccess === 'function') {
        window.handleLoginSuccess(data.user);
      }

      if (typeof window.hideLoginModal === 'function') {
        window.hideLoginModal();
      }

      if (typeof window.showAlert === 'function') {
        window.showAlert('Welcome back!', 'success');
      }
    } catch (error) {
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to login', 'error');
      }
    } finally {
      if (typeof window.hideLoading === 'function') {
        window.hideLoading();
      }
    }
  }

  async function register(event) {
    event.preventDefault();

    const payload = {
      firstName: getInputValue('registerFirstName'),
      lastName: getInputValue('registerLastName'),
      username: getInputValue('registerUsername'),
      email: getInputValue('registerEmail'),
      password: getInputValue('registerPassword')
    };

    try {
      if (typeof window.showLoading === 'function') {
        window.showLoading('Creating your account...');
      }

      await window.apiClient.post('/auth/register', payload);

      if (typeof window.hideRegisterModal === 'function') {
        window.hideRegisterModal();
      }

      if (typeof window.showLoginModal === 'function') {
        window.showLoginModal();
      }

      if (typeof window.showAlert === 'function') {
        window.showAlert('Account created! Please login.', 'success');
      }
    } catch (error) {
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to register', 'error');
      }
    } finally {
      if (typeof window.hideLoading === 'function') {
        window.hideLoading();
      }
    }
  }

  async function logout() {
    try {
      if (window.appState?.token) {
        await window.apiClient.post('/auth/logout');
      }
    } catch (error) {
      // Ignore logout errors but surface message if helpful
      if (typeof window.showAlert === 'function') {
        window.showAlert('Session ended locally.', 'info');
      }
    } finally {
      window.apiClient.clearToken();
      if (typeof window.handleLogout === 'function') {
        window.handleLogout();
      }
    }
  }

  async function fetchProfile() {
    try {
      const result = await window.apiClient.get('/auth/profile');
      window.apiClient.setToken(window.appState.token, result.user);
      return result.user;
    } catch (error) {
      throw error;
    }
  }

  window.login = login;
  window.register = register;
  window.logout = logout;
  window.fetchProfile = fetchProfile;
})();
