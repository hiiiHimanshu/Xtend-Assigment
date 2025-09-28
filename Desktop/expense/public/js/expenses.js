(function () {
  const getEl = (id) => document.getElementById(id);

  const renderLoading = (container) => {
    if (!container) return;
    container.innerHTML = '<p class="text-gray-500 text-center">Loading expenses...</p>';
  };

  const renderEmptyState = (container) => {
    if (!container) return;
    container.innerHTML = '<p class="text-gray-500 text-center">No expenses found for the selected filters.</p>';
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) {
      return value;
    }
    return date.toLocaleDateString();
  };

  const getTagsDisplay = (tags) => {
    if (!Array.isArray(tags) || tags.length === 0) {
      return '<span class="text-gray-400 text-sm">No tags</span>';
    }
    return tags.map((tag) => `<span class="tag">${tag}</span>`).join('');
  };

  const renderExpenses = () => {
    const container = getEl('expensesList');
    if (!container) return;

    const expenses = window.appState.expenses || [];

    if (!expenses.length) {
      renderEmptyState(container);
      renderPagination();
      return;
    }

    const rows = expenses.map((expense) => `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 font-medium text-gray-900">${window.formatCurrency(expense.amount)}</td>
        <td class="px-4 py-3 text-gray-700">${expense.description}</td>
        <td class="px-4 py-3 text-gray-600">${formatDate(expense.expenseDate)}</td>
        <td class="px-4 py-3">
          <div class="flex items-center space-x-2">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold" style="background-color: ${expense.category?.color || '#e0e7ff'}; color: #111827;">${expense.category?.name || 'Uncategorized'}</span>
          </div>
        </td>
        <td class="px-4 py-3 text-gray-600 capitalize">${(expense.paymentMethod || 'cash').replace(/_/g, ' ')}</td>
        <td class="px-4 py-3">${getTagsDisplay(expense.tags)}</td>
        <td class="px-4 py-3 text-right">
          <button class="btn-icon" title="Edit" onclick="window.editExpense('${expense.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon btn-icon-danger" title="Delete" onclick="window.deleteExpense('${expense.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-head">Amount</th>
              <th class="table-head">Description</th>
              <th class="table-head">Date</th>
              <th class="table-head">Category</th>
              <th class="table-head">Payment</th>
              <th class="table-head">Tags</th>
              <th class="table-head text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${rows}
          </tbody>
        </table>
      </div>
    `;

    renderPagination();
  };

  const renderPagination = () => {
    const paginationContainer = getEl('expensesPagination');
    if (!paginationContainer) return;

    const pagination = window.appState.expensesPagination;
    if (!pagination || pagination.pages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    const buttons = [];
    for (let page = 1; page <= pagination.pages; page += 1) {
      const isActive = page === pagination.current;
      buttons.push(`
        <button class="pagination-btn ${isActive ? 'active' : ''}" onclick="window.loadExpenses(${page})">
          ${page}
        </button>
      `);
    }

    paginationContainer.innerHTML = `<div class="space-x-2">${buttons.join('')}</div>`;
  };

  const populateExpenseCategoryOptions = () => {
    const categories = window.appState.categories || [];

    const selects = [getEl('expenseCategory'), getEl('filterCategory')];
    selects.forEach((select, index) => {
      if (!select) return;
      const isFilter = select.id === 'filterCategory';
      const defaultOption = isFilter
        ? '<option value="">All Categories</option>'
        : '<option value="">Select Category</option>';

      const options = categories.map((category) => `
        <option value="${category.id}">${category.parentName ? `${category.parentName} › ` : ''}${category.name}</option>
      `).join('');

      select.innerHTML = defaultOption + options;
    });
  };

  const hydrateFiltersFromState = () => {
    const filters = window.appState.expenseFilters || {};
    if (getEl('filterCategory')) {
      getEl('filterCategory').value = filters.categoryId || '';
    }
    if (getEl('filterStartDate')) {
      getEl('filterStartDate').value = filters.startDate || '';
    }
    if (getEl('filterEndDate')) {
      getEl('filterEndDate').value = filters.endDate || '';
    }
  };

  const loadExpenses = async (page = 1) => {
    if (!window.appState.token) {
      return;
    }

    const container = getEl('expensesList');
    renderLoading(container);

    const filters = window.appState.expenseFilters || {};
    const limit = window.appState.expensesPagination?.limit || 20;

    try {
      const data = await window.apiClient.get('/expenses', {
        query: {
          page,
          limit,
          categoryId: filters.categoryId,
          startDate: filters.startDate,
          endDate: filters.endDate
        }
      });

      window.appState.expenses = data.expenses || [];
      window.appState.expensesPagination = data.pagination || {
        current: page,
        limit,
        total: data.expenses?.length || 0,
        pages: 1
      };

      renderExpenses();
    } catch (error) {
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to load expenses', 'error');
      }
      renderEmptyState(container);
    }
  };

  const filterExpenses = () => {
    const filters = window.appState.expenseFilters || {};
    filters.categoryId = getEl('filterCategory')?.value || '';
    filters.startDate = getEl('filterStartDate')?.value || '';
    filters.endDate = getEl('filterEndDate')?.value || '';

    window.appState.expenseFilters = filters;
    loadExpenses(1);
  };

  const resetExpenseForm = () => {
    const form = getEl('expenseForm');
    if (form) {
      form.reset();
    }
    if (getEl('expenseId')) getEl('expenseId').value = '';
    if (getEl('expenseCategory')) getEl('expenseCategory').value = '';
    if (getEl('expensePaymentMethod')) getEl('expensePaymentMethod').value = 'cash';
  };

  const showAddExpenseModal = () => {
    resetExpenseForm();
    if (getEl('expenseModalTitle')) {
      getEl('expenseModalTitle').innerText = 'Add Expense';
    }
    if (typeof window.showExpenseModal === 'function') {
      window.showExpenseModal();
    }
  };

  const fillExpenseForm = (expense) => {
    if (!expense) return;
    if (getEl('expenseModalTitle')) {
      getEl('expenseModalTitle').innerText = 'Edit Expense';
    }

    getEl('expenseId').value = expense.id;
    getEl('expenseAmount').value = expense.amount;
    getEl('expenseDescription').value = expense.description;
    getEl('expenseDate').value = expense.expenseDate ? expense.expenseDate.slice(0, 10) : '';
    getEl('expensePaymentMethod').value = expense.paymentMethod || 'cash';
    getEl('expenseCategory').value = expense.category?.id || '';
    getEl('expenseTags').value = Array.isArray(expense.tags) ? expense.tags.join(', ') : '';
    getEl('expenseNotes').value = expense.notes || '';
  };

  const editExpense = async (expenseId) => {
    try {
      let expense = window.appState.expenses.find((item) => item.id === expenseId);

      if (!expense) {
        const response = await window.apiClient.get(`/expenses/${expenseId}`);
        expense = response.expense;
      }

      fillExpenseForm(expense);
      if (typeof window.showExpenseModal === 'function') {
        window.showExpenseModal();
      }
    } catch (error) {
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to load expense', 'error');
      }
    }
  };

  const saveExpense = async (event) => {
    event.preventDefault();

    const expenseId = getEl('expenseId').value;
    const payload = {
      amount: parseFloat(getEl('expenseAmount').value),
      description: getEl('expenseDescription').value.trim(),
      expenseDate: getEl('expenseDate').value,
      paymentMethod: getEl('expensePaymentMethod').value,
      categoryId: getEl('expenseCategory').value,
      tags: (getEl('expenseTags').value || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: getEl('expenseNotes').value.trim()
    };

    if (!payload.categoryId) {
      if (typeof window.showAlert === 'function') {
        window.showAlert('Please select a category before saving.', 'error');
      }
      return;
    }

    try {
      const method = expenseId ? 'put' : 'post';
      const url = expenseId ? `/expenses/${expenseId}` : '/expenses';

      await window.apiClient[method](url, payload);

      if (typeof window.hideExpenseModal === 'function') {
        window.hideExpenseModal();
      }

      if (typeof window.showAlert === 'function') {
        window.showAlert(`Expense ${expenseId ? 'updated' : 'created'} successfully.`, 'success');
      }

      await loadExpenses(expenseId ? window.appState.expensesPagination.current : 1);

      if (typeof window.loadDashboard === 'function') {
        window.loadDashboard();
      }
    } catch (error) {
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to save expense', 'error');
      }
    }
  };

  const deleteExpense = async (expenseId) => {
    const confirmed = window.confirm('Delete this expense? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await window.apiClient.delete(`/expenses/${expenseId}`);
      if (typeof window.showAlert === 'function') {
        window.showAlert('Expense deleted.', 'success');
      }
      await loadExpenses(window.appState.expensesPagination.current || 1);
      if (typeof window.loadDashboard === 'function') {
        window.loadDashboard();
      }
    } catch (error) {
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to delete expense', 'error');
      }
    }
  };

  const loadRecentExpenses = async () => {
    const container = getEl('recentExpenses');
    if (!container) return;

    try {
      const data = await window.apiClient.get('/expenses', { query: { page: 1, limit: 5 } });
      const expenses = data.expenses || [];

      if (!expenses.length) {
        container.innerHTML = '<p class="text-gray-500">No recent expenses yet.</p>';
        return;
      }

      container.innerHTML = expenses.map((expense) => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <div>
            <p class="text-sm font-semibold text-gray-800">${expense.description}</p>
            <p class="text-xs text-gray-500">${formatDate(expense.expenseDate)} · ${expense.category?.name || 'Uncategorized'}</p>
          </div>
          <span class="text-sm font-bold text-gray-900">${window.formatCurrency(expense.amount)}</span>
        </div>
      `).join('');
    } catch (error) {
      container.innerHTML = '<p class="text-red-500 text-sm">Unable to load recent expenses.</p>';
    }
  };

  window.loadExpenses = loadExpenses;
  window.renderExpenses = renderExpenses;
  window.filterExpenses = filterExpenses;
  window.showAddExpenseModal = showAddExpenseModal;
  window.editExpense = editExpense;
  window.saveExpense = saveExpense;
  window.deleteExpense = deleteExpense;
  window.populateExpenseCategoryOptions = populateExpenseCategoryOptions;
  window.hydrateExpenseFilters = hydrateFiltersFromState;
  window.loadRecentExpenses = loadRecentExpenses;
})();
