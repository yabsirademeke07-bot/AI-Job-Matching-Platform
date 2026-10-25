const metricCardBaseClassName =
  "group relative flex min-h-[160px] transform flex-col justify-between rounded-3xl border bg-white p-6 text-left shadow-[0_10px_30px_-5px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-20 hover:scale-[1.03] hover:-translate-y-2 hover:shadow-[0_25px_50px_-10px_rgba(15,23,42,0.18),0_8px_16px_-4px_rgba(15,23,42,0.08)]";

export const getMetricCardClassName = (selected = false, interactive = true) =>
  `${metricCardBaseClassName} ${
    interactive
      ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      : "cursor-default"
  } ${
    selected
      ? "border-2 border-blue-600 ring-4 ring-blue-500/15 shadow-[0_10px_30px_rgba(37,99,235,0.22)] scale-[1.01] hover:border-blue-600 hover:ring-4 hover:ring-blue-500/15"
      : "border-slate-200/90 hover:border-blue-400 hover:ring-2 hover:ring-blue-500/20"
  }`;

export const metricCardIconClassName =
  "transition-transform duration-300 ease-out group-hover:scale-110";
