(function () {
  const API_BASE = '/api';
  const TOKEN_KEY = 'expenseTracker.token';
  const USER_KEY = 'expenseTracker.user';

  const storedToken = localStorage.getItem(TOKEN_KEY);
  let storedUser = null;
  try {
    storedUser = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch (error) {
    storedUser = null;
    localStorage.removeItem(USER_KEY);
  }

  const appState = window.appState || {
    token: storedToken,
    user: storedUser,
    categories: [],
    expenses: [],
    expensesPagination: { current: 1, pages: 1, limit: 20, total: 0 },
    expenseFilters: { categoryId: '', startDate: '', endDate: '' },
    charts: {}
  };

  window.appState = appState;

  const setToken = (token, user) => {
    appState.token = token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }

    if (user) {
      appState.user = user;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  };

  const clearToken = () => {
    appState.token = null;
    appState.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const buildUrl = (path, query = {}) => {
    const url = new URL(`${API_BASE}${path}`, window.location.origin);
    Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => url.searchParams.append(key, item));
        } else {
          url.searchParams.append(key, value);
        }
      });
    return url.toString();
  };

  const request = async (path, options = {}) => {
    const {
      method = 'GET',
      body,
      query,
      headers = {},
      rawResponse = false,
      signal
    } = options;

    const url = query ? buildUrl(path, query) : `${API_BASE}${path}`;

    const fetchOptions = {
      method,
      headers: new Headers(headers),
      signal
    };

    if (appState.token) {
      fetchOptions.headers.set('Authorization', `Bearer ${appState.token}`);
    }

    if (body instanceof FormData) {
      fetchOptions.body = body;
    } else if (body !== undefined && body !== null) {
      fetchOptions.headers.set('Content-Type', 'application/json');
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (rawResponse) {
      if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (error) {
          errorMessage = response.statusText || errorMessage;
        }

        if (response.status === 401 || response.status === 403) {
          clearToken();
          if (typeof window.handleAuthExpired === 'function') {
            window.handleAuthExpired();
          }
        }

        throw new Error(errorMessage);
      }
      return response;
    }

    const contentType = response.headers.get('content-type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearToken();
        if (typeof window.handleAuthExpired === 'function') {
          window.handleAuthExpired();
        }
      }

      const message = data?.message || data?.error || response.statusText || 'Request failed';
      throw new Error(message);
    }

    return data;
  };

  const get = (path, options = {}) => request(path, { ...options, method: 'GET' });
  const post = (path, body, options = {}) => request(path, { ...options, method: 'POST', body });
  const put = (path, body, options = {}) => request(path, { ...options, method: 'PUT', body });
  const del = (path, options = {}) => request(path, { ...options, method: 'DELETE' });
  const upload = (path, formData, options = {}) => request(path, {
    ...options,
    method: options.method || 'POST',
    body: formData
  });

  window.apiClient = {
    request,
    get,
    post,
    put,
    delete: del,
    upload,
    setToken,
    clearToken,
    buildUrl
  };

  // Utility helpers exposed globally
  window.formatCurrency = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
})();
