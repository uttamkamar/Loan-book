const API_BASE = '/api';

async function parseResponse(res, fallbackMsg) {
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(text || fallbackMsg || 'Server returned an invalid response');
  }

  if (!res.ok) {
    throw new Error(data.error || data.details || text || fallbackMsg || 'Request failed');
  }

  return data;
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return await parseResponse(res, 'Failed to fetch health');
}

export async function fetchLoans() {
  const res = await fetch(`${API_BASE}/loans`);
  return await parseResponse(res, 'Failed to load loans');
}

export async function fetchLoanById(id) {
  const res = await fetch(`${API_BASE}/loans/${id}`);
  return await parseResponse(res, 'Failed to load loan details');
}

export async function createLoan(formData) {
  const res = await fetch(`${API_BASE}/loans`, {
    method: 'POST',
    body: formData
  });
  return await parseResponse(res, 'Failed to create loan');
}

export async function updateLoan(id, data) {
  const isFormData = data instanceof FormData;
  const res = await fetch(`${API_BASE}/loans/${id}`, {
    method: 'PUT',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body: isFormData ? data : JSON.stringify(data)
  });
  return await parseResponse(res, 'Failed to update loan');
}

export async function deleteLoan(id) {
  const res = await fetch(`${API_BASE}/loans/${id}`, {
    method: 'DELETE'
  });
  return await parseResponse(res, 'Failed to delete loan');
}

export async function addInstallment(loanId, installmentData) {
  const isFormData = installmentData instanceof FormData;
  const res = await fetch(`${API_BASE}/loans/${loanId}/installments`, {
    method: 'POST',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body: isFormData ? installmentData : JSON.stringify(installmentData)
  });
  return await parseResponse(res, 'Failed to record installment');
}

export async function updateInstallment(installmentId, installmentData) {
  const isFormData = installmentData instanceof FormData;
  const res = await fetch(`${API_BASE}/installments/${installmentId}`, {
    method: 'PUT',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body: isFormData ? installmentData : JSON.stringify(installmentData)
  });
  return await parseResponse(res, 'Failed to update installment');
}

export async function deleteInstallment(installmentId) {
  const res = await fetch(`${API_BASE}/installments/${installmentId}`, {
    method: 'DELETE'
  });
  return await parseResponse(res, 'Failed to delete installment');
}

export async function updateCollateral(collateralId, formData) {
  const res = await fetch(`${API_BASE}/collateral/${collateralId}`, {
    method: 'PUT',
    body: formData
  });
  return await parseResponse(res, 'Failed to update collateral');
}

export async function addCollateralItem(loanId, formData) {
  const res = await fetch(`${API_BASE}/loans/${loanId}/collateral`, {
    method: 'POST',
    body: formData
  });
  return await parseResponse(res, 'Failed to add collateral item');
}

export async function deleteCollateralItem(collateralId) {
  const res = await fetch(`${API_BASE}/collateral/${collateralId}`, {
    method: 'DELETE'
  });
  return await parseResponse(res, 'Failed to delete collateral item');
}

export async function addDocument(loanId, formData) {
  const res = await fetch(`${API_BASE}/loans/${loanId}/documents`, {
    method: 'POST',
    body: formData
  });
  return await parseResponse(res, 'Failed to upload document');
}

export async function deleteDocument(documentId) {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE'
  });
  return await parseResponse(res, 'Failed to delete document');
}

export async function importExcel(file) {
  const formData = new FormData();
  formData.append('excel_file', file);

  const res = await fetch(`${API_BASE}/import/excel`, {
    method: 'POST',
    body: formData
  });
  return await parseResponse(res, 'Import failed');
}

export function getExportUrl() {
  return `${API_BASE}/export/excel`;
}
