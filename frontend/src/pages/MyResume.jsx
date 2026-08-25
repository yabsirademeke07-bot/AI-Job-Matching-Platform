import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BackToDashboard from "../components/BackToDashboard";
import {
  deleteResume,
  downloadResume,
  getResume,
  replaceResume,
  uploadResume,
} from "../services/resumeService";
import ResumeCard from "../components/resume/ResumeCard";
import {
  DeleteResumeModal,
  ReplaceResumeModal,
  UploadResumeModal,
} from "../components/resume/ResumeModals";
import { ResumeEmptyState, ResumeTips } from "../components/resume/ResumeUi";
import ResumeAnalysis from "../components/resume/ResumeAnalysis";
import {
  continueApplicationFlow,
  getPendingApplication,
} from "../utils/applicationFlow";

export default function MyResume() {
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null);
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
    try {
      await downloadResume(resume.fileUrl, resume.fileName);
    } catch (requestError) {
      setError(requestError?.message || "Unable to download your resume.");
    }
  };
  if (loading)
    return (
      <main className="information-page min-h-[70vh] bg-slate-50 px-4 py-10">
        <div className="mx-auto flex max-w-5xl justify-center rounded-3xl bg-white p-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
        </div>
      </main>
    );
  return (
    <main className="information-page min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-deep)]">
              Candidate workspace
            </p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">
              My Resume
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage your resume and get AI-powered insights to improve your job
              readiness.
            </p>
          </div>
          <BackToDashboard />
          <button
            type="button"
            onClick={load}
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        <section aria-labelledby="resume-preview-heading" className="space-y-3">
          <h2
            id="resume-preview-heading"
            className="text-xl font-black text-slate-900"
          >
            Resume Preview
          </h2>
          {resume ? (
            <ResumeCard
              resume={resume}
              onView={() => navigate("/resume/preview", { state: { resume } })}
              onDownload={handleDownload}
              onReplace={() => setModal("replace")}
              onDelete={() => setModal("delete")}
            />
          ) : (
            <ResumeEmptyState onUpload={() => setModal("upload")} />
          )}
        </section>
        <ResumeAnalysis
          key={resume?.id || "empty"}
          resume={resume}
          onUpload={() => setModal("upload")}
        />
        <ResumeTips />
      </div>
      {(modal === "upload" || modal === "replace") && (
        <>
          {modal === "upload" ? (
            <UploadResumeModal
              onClose={() => setModal(null)}
              onSubmit={(formData) => submitFile(formData, uploadResume)}
              isSaving={saving}
            />
          ) : (
            <ReplaceResumeModal
              onClose={() => setModal(null)}
              onSubmit={(formData) => submitFile(formData, replaceResume)}
              isSaving={saving}
            />
          )}
        </>
      )}
      {modal === "delete" && (
        <DeleteResumeModal
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
          isDeleting={saving}
        />
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
