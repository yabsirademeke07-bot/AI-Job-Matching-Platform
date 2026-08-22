export default function ProjectDetailModal({
  project = {},
  onClose = () => {},
  language = "en",
  accent = { shell: "from-indigo-950 via-slate-950 to-slate-950", button: "bg-indigo-500" },
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="glass w-full max-w-3xl overflow-hidden rounded-[32px]">
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
              {language === "en" ? "Featured project" : "ተለይቶ የሚታየው ፕሮጀክት"}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">{project.title || "Project"}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-200"
          >
            Close
          </button>
        </div>

        <div className={`h-40 bg-gradient-to-br ${accent.shell}`} />

        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            {(project.tags || []).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-5 text-base leading-8 text-slate-300">{project.summary || ""}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Role</p>
              <p className="mt-2 text-white">Design + product lead</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Timeline</p>
              <p className="mt-2 text-white">4 months</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Outcome</p>
              <p className="mt-2 text-white">3.8x engagement lift</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className={`rounded-full px-4 py-2 text-sm font-medium text-white ${accent.button}`}
            >
              {language === "en" ? "Back to overview" : "ወደ አጠቃላይ ተመለስ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}