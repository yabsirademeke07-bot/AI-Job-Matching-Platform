import React from "react";
import { Download, X, FileText, Calendar, Briefcase } from "lucide-react";

export default function ResumeModal({ open = false, onClose = () => {} }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-500/15 p-3 text-indigo-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Resume
              </p>
              <h3 className="text-xl font-bold text-white">Download Portfolio Resume</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800"
            aria-label="Close resume modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-indigo-300" />
              <span className="text-sm text-slate-300">Updated: 2026</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-indigo-300" />
              <span className="text-sm text-slate-300">
                Product Engineer • Full Stack • AI-enabled workflows
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-400"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-600 px-4 py-2.5 font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
