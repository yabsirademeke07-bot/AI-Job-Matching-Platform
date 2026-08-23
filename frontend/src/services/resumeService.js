const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const USE_MOCKS = import.meta.env.VITE_USE_RESUME_MOCKS !== 'false';
const STORAGE_KEY = 'seekerResume';

function storedResume() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

async function request(path, options, fallback) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { Accept: 'application/json', ...(options?.headers || {}) } });
    if (!response.ok) throw new Error(`Resume request failed with status ${response.status}`);
    return await response.json();
  } catch (error) {
    if (USE_MOCKS) return typeof fallback === 'function' ? fallback() : fallback;
    throw error instanceof Error ? error : new Error('Resume request failed');
  }
}

function metadata(file, fileUrl = '') {
  return { id: `resume-${Date.now()}`, fileName: file.name, fileType: file.name.split('.').pop()?.toUpperCase() || 'FILE', fileSize: file.size, fileUrl, uploadedAt: new Date().toISOString() };
}

export async function getResume() { return request('/resume', undefined, storedResume); }
export async function uploadResume(formData) { return request('/resume', { method: 'POST', body: formData }, () => { const file = formData.get('resume'); const result = metadata(file, URL.createObjectURL(file)); localStorage.setItem(STORAGE_KEY, JSON.stringify(result)); return result; }); }
export async function replaceResume(formData) { return request('/resume', { method: 'PUT', body: formData }, () => { const file = formData.get('resume'); const result = metadata(file, URL.createObjectURL(file)); localStorage.setItem(STORAGE_KEY, JSON.stringify(result)); return result; }); }
export async function deleteResume(id) { return request(`/resume/${id}`, { method: 'DELETE' }, () => { localStorage.removeItem(STORAGE_KEY); return { id }; }); }
export async function downloadResume(fileUrl, fileName) { if (!fileUrl) throw new Error('Resume file is not available for download.'); const response = await fetch(fileUrl); const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }
