const STORAGE_KEY = 'seekerResume';

function storedResume() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function metadata(file, fileUrl = '') {
  return { id: `resume-${Date.now()}`, fileName: file.name, fileType: file.name.split('.').pop()?.toUpperCase() || 'FILE', fileSize: file.size, fileUrl, uploadedAt: new Date().toISOString() };
}

export async function getResume() { return storedResume(); }
export async function uploadResume(formData) { const file = formData.get('resume'); const result = metadata(file, URL.createObjectURL(file)); localStorage.setItem(STORAGE_KEY, JSON.stringify(result)); return result; }
export async function replaceResume(formData) { const file = formData.get('resume'); const result = metadata(file, URL.createObjectURL(file)); localStorage.setItem(STORAGE_KEY, JSON.stringify(result)); return result; }
export async function deleteResume(id) { localStorage.removeItem(STORAGE_KEY); return { id }; }
export async function downloadResume(fileUrl, fileName) { if (!fileUrl) throw new Error('Resume file is not available for download.'); const anchor = document.createElement('a'); anchor.href = fileUrl; anchor.download = fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove(); }
