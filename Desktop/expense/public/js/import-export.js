(function () {
  const getEl = (id) => document.getElementById(id);

  const parseFilename = (header) => {
    if (!header) return null;
    const match = /filename="?([^";]+)"?/i.exec(header);
    return match ? match[1] : null;
  };

  const importCSV = async () => {
    const input = getEl('csvImport');
    if (!input || !input.files.length) {
      if (typeof window.showAlert === 'function') {
        window.showAlert('Select a CSV file to import.', 'error');
      }
      return;
    }

    const formData = new FormData();
    formData.append('file', input.files[0]);

    try {
      if (typeof window.showLoading === 'function') {
        window.showLoading('Importing expenses...');
      }

      const result = await window.apiClient.upload('/import-export/import', formData);

      if (typeof window.showAlert === 'function') {
        window.showAlert(`Import completed: ${result.inserted} added, ${result.failed} failed.`, 'success');
      }

      input.value = '';

      if (typeof window.loadExpenses === 'function') {
        window.loadExpenses();
      }
      if (typeof window.loadDashboard === 'function') {
        window.loadDashboard();
      }
    } catch (error) {
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to import CSV', 'error');
      }
    } finally {
      if (typeof window.hideLoading === 'function') {
        window.hideLoading();
      }
    }
  };

  const exportCSV = async (range = 'all') => {
    try {
      if (typeof window.showLoading === 'function') {
        window.showLoading('Generating CSV export...');
      }

      const response = await window.apiClient.request('/import-export/export', {
        method: 'GET',
        query: { range },
        rawResponse: true
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const filename = parseFilename(response.headers.get('content-disposition')) || `expenses_${range}.csv`;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 500);

      if (typeof window.showAlert === 'function') {
        window.showAlert('Export ready. Download started.', 'success');
      }
    } catch (error) {
      if (typeof window.showAlert === 'function') {
        window.showAlert(error.message || 'Unable to export CSV', 'error');
      }
    } finally {
      if (typeof window.hideLoading === 'function') {
        window.hideLoading();
      }
    }
  };

  window.importCSV = importCSV;
  window.exportCSV = exportCSV;
})();
