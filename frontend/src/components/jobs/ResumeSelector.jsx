import { FileText, Plus } from 'lucide-react';

export default function ResumeSelector({ resumes = [], selectedResumeId, onSelect, onUploadNew }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700">Resume</label>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <FileText className="h-5 w-5" />
          </div>
          <select
            value={selectedResumeId || ''}
            onChange={(event) => onSelect(event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            aria-label="Select resume"
          >
            {resumes.length === 0 ? (
              <option value="">No resume uploaded yet</option>
            ) : (
              resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.name || resume.fileName || 'Resume'}
                </option>
              ))
            )}
          </select>
        </div>

        <button type="button" onClick={onUploadNew} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100">
          <Plus className="h-4 w-4" />
          Upload New Resume
        </button>
      </div>
    </div>
  );
}
