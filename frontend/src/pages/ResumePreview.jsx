import { useEffect, useState } from 'react';
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import { downloadResume } from '../services/resumeService';

function getStoredResume() {
  try { return JSON.parse(localStorage.getItem('seekerResume') || 'null'); } catch { return null; }
}

export default function ResumePreview() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const resume = state?.resume || getStoredResume();
  const [docxHtml, setDocxHtml] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    let active = true;
    if (!resume || resume.fileType === 'PDF' || !resume.fileUrl) return undefined;
    setIsExtracting(true);
    setPreviewError('');
    fetch(resume.fileUrl)
      .then((response) => { if (!response.ok) throw new Error('Unable to read document'); return response.arrayBuffer(); })
      .then((buffer) => mammoth.convertToHtml({ arrayBuffer: buffer }))
      .then((result) => { if (active) setDocxHtml(result.value); })
      .catch(() => { if (active) setPreviewError('The document text could not be previewed in the browser. You can still download the original file.'); })
      .finally(() => { if (active) setIsExtracting(false); });
    return () => { active = false; };
  }, [resume]);

  if (!resume) return <main className="information-page min-h-[70vh] bg-slate-50 p-8 text-center"><p className="text-slate-500">No resume is available to preview.</p><button type="button" onClick={() => navigate('/resume')} className="mt-4 rounded-xl bg-[var(--brand-primary)] px-5 py-3 font-bold text-white">Back to Resume</button></main>;

  return <main className="information-page min-h-screen bg-slate-900 px-4 py-6 sm:px-8"><div className="mx-auto flex max-w-6xl flex-col gap-4"><div className="flex flex-wrap items-center justify-between gap-3 text-white"><button type="button" onClick={() => navigate('/resume')} className="inline-flex min-h-11 items-center gap-2 font-bold"><ArrowLeft className="h-4 w-4" /> Back to Resume</button><div className="flex flex-wrap items-center gap-3"><span className="font-semibold">{resume.fileName}</span><button type="button" onClick={() => downloadResume(resume.fileUrl, resume.fileName)} className="min-h-11 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-bold"><Download className="mr-1 inline h-4 w-4" /> Download Resume</button></div></div><div className="min-h-[70vh] rounded-2xl bg-slate-100 p-4 sm:p-8">{resume.fileType === 'PDF' ? <iframe title="Resume document preview" src={resume.fileUrl} className="h-[70vh] w-full rounded-xl bg-white shadow-xl" /> : <article className="mx-auto min-h-[65vh] max-w-4xl rounded-xl bg-white p-8 shadow-xl sm:p-12">{isExtracting ? <div className="flex min-h-[55vh] items-center justify-center gap-3 text-slate-500"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" /> Preparing document preview...</div> : docxHtml ? <div className="resume-document-preview prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: docxHtml }} /> : <div className="flex min-h-[55vh] flex-col items-center justify-center text-center"><FileText className="h-16 w-16 text-[var(--brand-primary)]" /><h1 className="mt-4 text-xl font-black text-slate-900">{resume.fileName}</h1><p className="mt-3 max-w-md text-slate-600">{previewError || 'This document is ready to download.'}</p><button type="button" onClick={() => downloadResume(resume.fileUrl, resume.fileName)} className="mt-5 rounded-xl bg-[var(--brand-primary)] px-5 py-3 font-bold text-white">Download to view</button></div>}</article>}</div></div></main>;
}
