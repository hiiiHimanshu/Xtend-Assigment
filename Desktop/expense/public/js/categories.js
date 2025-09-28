(function () {
  const getEl = (id) => document.getElementById(id);

  const renderCategories = () => {
    const container = getEl('categoriesList');
    if (!container) return;

    const categories = window.appState.categories || [];

    if (!categories.length) {
      container.innerHTML = '<p class="text-gray-500">No categories yet. Create one to get started.</p>';
      return;
    }

    const items = categories.map((category) => `
      <div class="category-card">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-lg font-semibold text-gray-800">${category.name}</h4>
            <p class="text-sm text-gray-500">${category.parentName || 'Root category'}</p>
          </div>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style="background-color: ${category.color}; color: #111827;">
            <i class="fas fa-${category.icon} mr-1"></i>${category.icon.replace(/_/g, ' ')}
          </span>
        </div>
        <p class="mt-3 text-sm text-gray-600">${category.description || 'No description provided.'}</p>
        <div class="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>${category.expenseCount} expenses</span>
          <span>${window.formatCurrency(category.totalSpent)}</span>
        </div>
        <div class="mt-4 flex space-x-2">
          <button class="btn-secondary flex-1" onclick="window.editCategory('${category.id}')">
            <i class="fas fa-edit mr-1"></i>Edit
          </button>
          <button class="btn-danger flex-1" onclick="window.deleteCategory('${category.id}')">
            <i class="fas fa-trash mr-1"></i>Delete
          </button>
        </div>
      </div>
    `).join('');

    container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${items}</div>`;
  };

  const populateCategoryParentOptions = () => {
    const select = getEl('categoryParent');
    if (!select) return;

    const categories = window.appState.categories || [];
    const options = categories
      .filter((category) => category.isActive)
      .map((category) => `<option value="${category.id}">${category.parentName ? `${category.parentName} › ` : ''}${category.name}</option>`)
      .join('');

    select.innerHTML = `<option value="">None (Root Category)</option>${options}`;
  };

  const loadCategories = async () => {
    const container = getEl('categoriesList');
    if (container) {
      container.innerHTML = '<p class="text-gray-500">Loading categories...</p>';
    }

    try {
      const data = await window.apiClient.get('/categories');
      window.appState.categories = data.categories || [];
      renderCategories();
      populateCategoryParentOptions();
      if (typeof window.populateExpenseCategoryOptions === 'function') {
        window.populateExpenseCategoryOptions();
      }
    } catch (error) {
      if (container) {
        container.innerHTML = '<p class="text-red-500">Unable to load categories.</p>';
      }
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to load categories', 'error');
      }
    }
  };

  const resetCategoryForm = () => {
    const form = getEl('categoryForm');
    if (form) {
      form.reset();
    }
    if (getEl('categoryId')) getEl('categoryId').value = '';
    if (getEl('categoryColor')) getEl('categoryColor').value = '#6366f1';
    if (getEl('categoryIcon')) getEl('categoryIcon').value = 'folder';
  };

  const showAddCategoryModal = () => {
    resetCategoryForm();
    if (getEl('categoryModalTitle')) {
      getEl('categoryModalTitle').innerText = 'Add Category';
    }
    if (typeof window.showCategoryModal === 'function') {
      window.showCategoryModal();
    }
  };

  const fillCategoryForm = (category) => {
    if (!category) return;
    if (getEl('categoryModalTitle')) {
      getEl('categoryModalTitle').innerText = 'Edit Category';
    }

    getEl('categoryId').value = category.id;
    getEl('categoryName').value = category.name;
    getEl('categoryDescription').value = category.description || '';
    getEl('categoryColor').value = category.color || '#6366f1';
    getEl('categoryIcon').value = category.icon || 'folder';
    getEl('categoryParent').value = category.parentId || '';
  };

  const editCategory = async (categoryId) => {
    try {
      const category = window.appState.categories.find((item) => item.id === categoryId);
      if (!category) {
        const response = await window.apiClient.get(`/categories/${categoryId}`);
        fillCategoryForm(response.category);
      } else {
        fillCategoryForm(category);
      }
      if (typeof window.showCategoryModal === 'function') {
        window.showCategoryModal();
      }
    } catch (error) {
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to load category', 'error');
      }
    }
  };

  const saveCategory = async (event) => {
    event.preventDefault();

    const categoryId = getEl('categoryId').value;
    const payload = {
      name: getEl('categoryName').value.trim(),
      description: getEl('categoryDescription').value.trim(),
      parentId: getEl('categoryParent').value || null,
      color: getEl('categoryColor').value,
      icon: getEl('categoryIcon').value
    };

    try {
      const method = categoryId ? 'put' : 'post';
      const url = categoryId ? `/categories/${categoryId}` : '/categories';

      await window.apiClient[method](url, payload);

      if (typeof window.hideCategoryModal === 'function') {
        window.hideCategoryModal();
      }

      if (typeof window.showAlert === 'function') {
        window.showAlert(`Category ${categoryId ? 'updated' : 'created'} successfully.`, 'success');
      }

      await loadCategories();
      if (typeof window.loadDashboard === 'function') {
        window.loadDashboard();
      }
    } catch (error) {
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to save category', 'error');
      }
    }
  };

  const deleteCategory = async (categoryId) => {
    const confirmed = window.confirm('Delete this category? Make sure it has no expenses or child categories.');
    if (!confirmed) return;

    try {
      await window.apiClient.delete(`/categories/${categoryId}`);
      if (typeof window.showAlert === 'function') {
        window.showAlert('Category deleted.', 'success');
      }
      await loadCategories();
      if (typeof window.populateExpenseCategoryOptions === 'function') {
        window.populateExpenseCategoryOptions();
      }
    } catch (error) {
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to delete category', 'error');
      }
    }
  };

  window.loadCategories = loadCategories;
  window.showAddCategoryModal = showAddCategoryModal;
  window.editCategory = editCategory;
  window.saveCategory = saveCategory;
  window.deleteCategory = deleteCategory;
  window.populateCategoryParentOptions = populateCategoryParentOptions;
})();
