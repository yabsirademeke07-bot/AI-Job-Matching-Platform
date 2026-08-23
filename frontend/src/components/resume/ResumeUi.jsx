import { FileText, Lightbulb } from 'lucide-react';

export function ResumeEmptyState({ onUpload }) {
  return <section className="rounded-3xl border-2 border-dashed border-[var(--brand-border)] bg-[var(--brand-soft)] p-10 text-center shadow-sm"><FileText className="mx-auto h-14 w-14 text-[var(--brand-primary)]" /><h2 className="mt-4 text-xl font-black text-slate-900">No Resume Uploaded Yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Upload your resume to apply for jobs and help AI find better job matches.</p><button type="button" onClick={onUpload} className="mt-6 min-h-11 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-white hover:bg-[var(--brand-primary-hover)]">Upload Resume</button></section>;
}

export function ResumeTips() {
  return <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-black text-slate-900"><Lightbulb className="h-5 w-5 text-[var(--brand-deep)]" /> Resume best practices</h2><ul className="mt-4 space-y-3 text-sm text-slate-600"><li>Keep your skills updated.</li><li>Use a professional PDF format.</li><li>Include relevant experience and achievements.</li></ul></aside>;
}
