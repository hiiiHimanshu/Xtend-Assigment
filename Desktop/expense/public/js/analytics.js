(function () {
  const getEl = (id) => document.getElementById(id);

  const ensureChart = (chartId, config) => {
    const ctx = getEl(chartId);
    if (!ctx) return null;

    if (window.appState.charts[chartId]) {
      window.appState.charts[chartId].destroy();
    }

    window.appState.charts[chartId] = new Chart(ctx, config);
    return window.appState.charts[chartId];
  };

  const buildPalette = (count) => {
    const baseColors = [
      '#6366F1', '#22C55E', '#F97316', '#F43F5E', '#0EA5E9',
      '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#3B82F6'
    ];

    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    }

    const colors = [];
    for (let index = 0; index < count; index += 1) {
      const hue = Math.floor((index / count) * 360);
      colors.push(`hsl(${hue}, 70%, 55%)`);
    }
    return colors;
  };

  const defaultRange = (days = 90) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);
    const format = (date) => date.toISOString().slice(0, 10);
    return { startDate: format(start), endDate: format(end) };
  };

  const updateDashboardCards = (summary) => {
    getEl('totalSpent').innerText = window.formatCurrency(summary.totalAmount || 0);
    getEl('totalExpenses').innerText = summary.totalExpenses || 0;
    getEl('avgAmount').innerText = window.formatCurrency(summary.averageAmount || 0);
    getEl('monthlyAmount').innerText = window.formatCurrency(summary.monthlyAmount || 0);
  };

  const renderTopExpenses = (items) => {
    const container = getEl('topExpensesList');
    if (!container) return;

    if (!items.length) {
      container.innerHTML = '<p class="text-gray-500">No top expenses yet.</p>';
      return;
    }

    container.innerHTML = items.map((item) => `
      <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <div>
          <p class="text-sm font-semibold text-gray-800">${item.description}</p>
          <p class="text-xs text-gray-500">${new Date(item.expenseDate).toLocaleDateString()} · ${item.categoryName}</p>
        </div>
        <span class="text-sm font-bold text-gray-900">${window.formatCurrency(item.amount)}</span>
      </div>
    `).join('');
  };

  const renderCategoryChart = (data) => {
    const labels = data.map((item) => item.categoryName);
    const values = data.map((item) => item.totalAmount);
    const colors = buildPalette(labels.length);

    ensureChart('categoryChart', {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  };

  const renderMonthlyChart = (data) => {
    const labels = data.map((item) => new Date(item.month).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }));
    const values = data.map((item) => item.totalAmount);

    ensureChart('monthlyChart', {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Monthly Spending',
          data: values,
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => window.formatCurrency(value)
            }
          }
        }
      }
    });
  };

  const renderAnalyticsCategoryChart = (data) => {
    const labels = data.map((item) => item.categoryName);
    const values = data.map((item) => item.totalAmount);
    const colors = buildPalette(labels.length);

    ensureChart('analyticsCategory', {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors
        }]
      },
      options: {
        plugins: { legend: { position: 'bottom' } }
      }
    });
  };

  const renderAnalyticsPaymentChart = (data) => {
    const labels = data.map((item) => item.paymentMethod.replace(/_/g, ' '));
    const values = data.map((item) => item.totalAmount);
    const colors = buildPalette(labels.length);

    ensureChart('analyticsPayment', {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors }]
      },
      options: {
        plugins: { legend: { position: 'bottom' } }
      }
    });
  };

  const renderAnalyticsTrendChart = (data) => {
    const labels = data.map((item) => new Date(item.date).toLocaleDateString());
    const values = data.map((item) => item.totalAmount);

    ensureChart('analyticsTrend', {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Daily Spending',
          data: values,
          borderColor: '#22C55E',
          tension: 0.3,
          fill: false
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => window.formatCurrency(value)
            }
          }
        }
      }
    });
  };

  const loadDashboard = async () => {
    if (!window.appState.token) return;

    try {
      const range30 = defaultRange(30);
      const range180 = defaultRange(180);

      const [summaryRes, categoryRes, monthlyRes, topExpensesRes] = await Promise.all([
        window.apiClient.get('/expenses/stats/summary'),
        window.apiClient.get('/analytics/category-breakdown', { query: range30 }),
        window.apiClient.get('/analytics/monthly-spending', { query: range180 }),
        window.apiClient.get('/analytics/top-expenses', { query: { limit: 5, period: 'month' } })
      ]);

      updateDashboardCards(summaryRes.summary || {});
      renderCategoryChart(categoryRes.categoryBreakdown || []);
      renderMonthlyChart(monthlyRes.monthlySpending || []);
      renderTopExpenses(topExpensesRes.topExpenses || []);
      if (typeof window.loadRecentExpenses === 'function') {
        window.loadRecentExpenses();
      }
    } catch (error) {
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to load dashboard data', 'error');
      }
    }
  };

  const loadAnalytics = async () => {
    if (!window.appState.token) return;

    const startInput = getEl('analyticsStartDate');
    const endInput = getEl('analyticsEndDate');

    if (!startInput || !endInput) {
      return;
    }

    if (!startInput.value || !endInput.value) {
      const range = defaultRange(90);
      startInput.value = range.startDate;
      endInput.value = range.endDate;
    }

    const query = {
      startDate: startInput.value,
      endDate: endInput.value
    };

    try {
      const [categoryRes, paymentRes, trendRes] = await Promise.all([
        window.apiClient.get('/analytics/category-breakdown', { query }),
        window.apiClient.get('/analytics/payment-methods', { query }),
        window.apiClient.get('/analytics/daily-trend', { query })
      ]);

      renderAnalyticsCategoryChart(categoryRes.categoryBreakdown || []);
      renderAnalyticsPaymentChart(paymentRes.paymentMethods || []);
      renderAnalyticsTrendChart(trendRes.dailyTrend || []);
    } catch (error) {
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to load analytics', 'error');
      }
    }
  };

  window.loadDashboard = loadDashboard;
  window.loadAnalytics = loadAnalytics;
})();
