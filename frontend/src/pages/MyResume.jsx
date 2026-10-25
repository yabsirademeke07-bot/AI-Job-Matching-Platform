import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Download, Eye, FileText, Lightbulb, Loader2, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  deleteResume,
  downloadResume,
  getResume,
  replaceResume,
  uploadResume,
} from "../services/resumeService";
import {
  DeleteResumeModal,
  ReplaceResumeModal,
  UploadResumeModal,
} from "../components/resume/ResumeModals";
import {
  continueApplicationFlow,
  getPendingApplication,
} from "../utils/applicationFlow";

function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "Size unavailable";
  return size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}

function formatUploadDate(value) {
  if (!value) return "Upload date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Upload date unavailable";
  return `Uploaded ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function MyResume() {
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResume(await getResume());
    } catch (requestError) {
      setError(requestError?.message || "Unable to load your resume.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const submitFile = async (formData, action) => {
    setSaving(true);
    setError("");
    try {
      const result = await action(formData);
      setResume(result);
      setModal(null);
      setToast(
        action === uploadResume
          ? "Resume uploaded successfully"
          : "Resume replaced successfully",
      );
      const pending = getPendingApplication();
      if (pending?.jobId)
        continueApplicationFlow(navigate, { jobId: pending.jobId });
    } catch (requestError) {
      setError(requestError?.message || "Unable to save your resume.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!resume) return;
    setSaving(true);
    try {
      await deleteResume(resume.id);
      localStorage.removeItem('generatedCv');
      setResume(null);
      setModal(null);
      setToast("Resume deleted successfully");
    } catch (requestError) {
      setError(requestError?.message || "Unable to delete your resume.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!resume) {
      setError("No CV uploaded yet.");
      return;
    }
    try {
      await downloadResume(resume.fileUrl, resume.fileName);
    } catch (requestError) {
      setError(requestError?.message || "Unable to download your resume.");
    }
  };

  const handleViewResume = () => {
    if (!resume) {
      setError("No CV uploaded yet.");
      return;
    }
    setPreviewOpen(true);
  };

  const handleReplaceCv = () => {
    setModal('replace');
  };

  const openUpload = () => setModal('upload');

  if (loading)
    return (
      <main className="information-page min-h-[70vh] bg-slate-50 px-4 py-10">
        <div className="mx-auto flex max-w-5xl justify-center rounded-3xl bg-white p-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
        </div>
      </main>
    );

  const hasResume = Boolean(resume);
  const resumeSkills = Array.isArray(resume?.skills) ? resume.skills.filter(Boolean) : [];
  const fileType = String(resume?.fileType || resume?.mime_type?.split("/")?.pop() || "FILE").toUpperCase();
  const atsCompatibleFormat = ["PDF", "DOCX"].includes(fileType);

  return (
    <main className="information-page min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-10 pb-12">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight text-slate-900 sm:text-4xl">My Resume</h1>
          <p className="mt-1.5 max-w-2xl text-xs italic leading-relaxed text-slate-500 sm:text-sm">
            Your uploaded CV is synced with our matching engine and used for 1-Click job applications. Keep it updated with your latest skills, certifications, and experience to maximize interview shortlists.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex min-h-[300px] flex-col justify-between space-y-8 rounded-3xl border border-slate-200/90 border-t-4 border-t-sky-500 bg-gradient-to-br from-white via-white to-sky-50/30 p-8 py-10 shadow-[0_12px_35px_-8px_rgba(2,132,199,0.1),0_4px_16px_rgba(0,0,0,0.03)] sm:p-10 sm:py-12">
          {hasResume ? (
            <div>
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-600 shadow-xs">
                    <FileText className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{resume.fileName || "Resume file"}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">{fileType} document</span>
                      <span>{formatFileSize(resume.fileSize || resume.file_size)}</span>
                      <span>{formatUploadDate(resume.uploadedAt || resume.upload_date)}</span>
                    </div>
                  </div>
                </div>
                <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Active CV
                </span>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-8 sm:gap-5">
                <button
                  type="button"
                  onClick={handleViewResume}
                  className="inline-flex items-center gap-2.5 rounded-xl border border-sky-300 bg-sky-100 px-5 py-3 text-xs font-bold text-sky-700 shadow-xs transition hover:bg-sky-200"
                >
                  <Eye className="h-4 w-4 text-sky-600" aria-hidden="true" />
                  View Resume
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2.5 rounded-xl border-2 border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-800 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download Resume
                </button>
                <button
                  type="button"
                  onClick={handleReplaceCv}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-sky-600 px-5 py-3 text-xs font-bold text-white shadow-sm shadow-sky-600/25 transition hover:bg-sky-500"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Replace CV
                </button>
                <button
                  type="button"
                  onClick={() => setModal('delete')}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 sm:ml-auto"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete Resume
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <h3 className="text-lg font-black text-slate-900">No resume uploaded yet</h3>
              <p className="mt-2 text-sm text-slate-600">
                Upload your current CV to keep your resume and job applications in one place.
              </p>
              <button type="button" onClick={openUpload} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-white hover:bg-[var(--brand-primary-hover)]">
                <FileText className="h-4 w-4" /> Upload Resume
              </button>
            </div>
          )}
        </div>

        <section className="grid grid-cols-1 gap-7 md:grid-cols-2" aria-label="Resume insights and tips">
          <article className="rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">ATS Profile Health</h2>
                <p className="mt-1 text-xs text-slate-500">Resume readiness and application status</p>
              </div>
              <span className="rounded-xl border border-sky-100 bg-sky-50 p-2.5 text-sky-600">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-600">Status</span>
                <span className={`inline-flex items-center gap-1.5 font-semibold ${hasResume ? "text-emerald-700" : "text-slate-500"}`}>
                  {hasResume && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                  {hasResume ? "Verified & Parsed" : "No CV uploaded"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Skills extracted</span>
                <span className="font-bold text-slate-900">{hasResume ? resumeSkills.length : "—"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">File format</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${atsCompatibleFormat ? "text-sky-700" : "text-slate-500"}`}>
                  {atsCompatibleFormat && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  {hasResume ? (atsCompatibleFormat ? `${fileType} Supported` : `${fileType} format`) : "No CV uploaded"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-600">Usage</span>
                <span className={`font-semibold ${hasResume ? "text-sky-700" : "text-slate-500"}`}>
                  {hasResume ? "Active for 1-Click Apply" : "Not active"}
                </span>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start gap-3">
              <span className="rounded-xl border border-amber-100 bg-amber-50 p-2.5 text-amber-600">
                <Lightbulb className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Tips for Higher Shortlisting</h2>
                <p className="mt-1 text-xs text-slate-500">A few ways to make your resume easier to review</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-slate-600">
              <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /><span>Keep your resume concise and focused, ideally under two pages.</span></li>
              <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /><span>Describe achievements with clear outcomes and measurable results.</span></li>
              <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /><span>Use a readable PDF or DOCX and tailor skills to each role.</span></li>
            </ul>
          </article>
        </section>
      </div>

      {modal === 'delete' && (
        <DeleteResumeModal
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
          isDeleting={saving}
        />
      )}

      {modal === 'upload' && (
        <UploadResumeModal
          onClose={() => setModal(null)}
          onSubmit={(formData) => submitFile(formData, uploadResume)}
          isSaving={saving}
        />
      )}

      {modal === 'replace' && (
        <ReplaceResumeModal
          onClose={() => setModal(null)}
          onSubmit={(formData) => submitFile(formData, replaceResume)}
          isSaving={saving}
        />
      )}

      {previewOpen && resume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Resume Preview</h3>
                <p className="text-sm text-slate-500">{resume.fileName}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
                aria-label="Close resume preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-slate-50 p-4">
              {resume.fileType === 'PDF' ? (
                <iframe
                  title="Resume PDF preview"
                  src={resume.fileUrl}
                  className="h-[70vh] w-full rounded-2xl border border-slate-200 bg-white"
                />
              ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                  <FileText className="h-12 w-12 text-slate-400" />
                  <p className="text-base font-bold text-slate-700">This file type cannot be previewed here.</p>
                  <p className="text-sm text-slate-500">You can still download the current CV.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          {toast}
        </div>
      )}
    </main>
  );
}
