const STORAGE_KEY = 'seekerResume';
import api from './api';

function syncUserResumeName(fileName) {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!fileName) {
      delete user.cvFileName;
      localStorage.setItem('user', JSON.stringify(user));
      return;
    }
    localStorage.setItem('user', JSON.stringify({ ...user, cvFileName: fileName }));
  } catch {
    // Ignore storage issues in this frontend-only flow.
  }
}

function metadata(file, fileUrl = '') {
  return { id: `resume-${Date.now()}`, fileName: file.name, fileType: file.name.split('.').pop()?.toUpperCase() || 'FILE', fileSize: file.size, fileUrl, uploadedAt: new Date().toISOString() };
}

export async function getResume() {
  const { data } = await api.get('/cv/current');
  const cv = data.cv;
  if (!cv) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
  const result = {
    id: cv.id,
    fileName: cv.fileName || cv.file_name,
    fileType: (cv.mime_type || '').split('/').pop()?.toUpperCase() || 'FILE',
    fileSize: cv.fileSize || cv.file_size,
    fileUrl: cv.fileUrl || cv.file_url,
    uploadedAt: cv.upload_date,
    ...cv,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  if (cv.skills || cv.experience || cv.education) localStorage.setItem('extracted_cv', JSON.stringify(cv));
  return result;
}
async function saveResumeToApi(formData) {
  const file = formData.get('resume');
  const uploadData = new FormData();
  uploadData.append('cv', file);
  const { data } = await api.post('/cv/upload-and-analyze', uploadData, { headers: { 'Content-Type': 'multipart/form-data' } });
  const analysis = data.data || {};
  const uploaded = data.cv || analysis;
  const result = metadata(file, uploaded.fileUrl || uploaded.file_url || '');
  result.id = uploaded.id || result.id;
  result.fileName = uploaded.fileName || uploaded.file_name || result.fileName;
  result.fileSize = uploaded.fileSize || uploaded.file_size || result.fileSize;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  localStorage.setItem('extracted_cv', JSON.stringify({ ...analysis, fileName: result.fileName, fileUrl: result.fileUrl }));
  syncUserResumeName(result.fileName);
  return result;
}

export async function uploadResume(formData) { return saveResumeToApi(formData); }
export async function replaceResume(formData) { return saveResumeToApi(formData); }
export async function deleteResume(id) { localStorage.removeItem(STORAGE_KEY); syncUserResumeName(''); return { id }; }
export async function downloadResume(fileUrl, fileName) { if (!fileUrl) throw new Error('Resume file is not available for download.'); const anchor = document.createElement('a'); anchor.href = fileUrl; anchor.download = fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove(); }
