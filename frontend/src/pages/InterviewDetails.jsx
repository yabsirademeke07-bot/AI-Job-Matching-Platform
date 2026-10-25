import { useEffect, useState } from "react";
import { ExternalLink, MapPin, Phone } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function InterviewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/seeker/applications")
      .then(({ data }) => {
        const applications = Array.isArray(data?.applications) ? data.applications : [];
        const result = applications.find((item) =>
          String(item.interview_id) === String(id)
          || (String(item.id) === String(id) && item.interview_id),
        );
        if (active) setApplication(result || null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load interview details.");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  if (loading)
    return <main className="information-page min-h-[70vh] bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">Loading interview details...</main>;
  if (error || !application)
    return (
      <main className="information-page min-h-[70vh] bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">{error ? "Interview unavailable" : "No interview found"}</h1>
          <p role={error ? "alert" : undefined} className="mt-2 text-sm text-slate-500">
            {error || "There is no scheduled interview linked to this application."}
          </p>
          <button type="button" onClick={() => navigate("/applications")} className="mt-5 rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white">
            View Applications
          </button>
        </div>
      </main>
    );

  const interviewDate = application.interview_scheduled_at;
  const interviewType = String(application.interview_type || "").toLowerCase();
  const meetingLink = application.interview_url;
  const join = () => window.open(meetingLink, "_blank", "noopener,noreferrer");
  const interviewStatus = application.interview_status || "Scheduled";

  return (
    <main className="information-page min-h-[70vh] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-deep)]">Interview invitation</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Interview Details</h1>
          <div className="mt-6 space-y-5">
            <div>
              <h2 className="text-xl font-black text-slate-900">{application.jobTitle || application.title}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{application.company || application.company_name}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Interview Date", formatDate(interviewDate)],
                ["Interview Time", interviewDate ? new Date(interviewDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "Time unavailable"],
                ["Interview Type", application.interview_type || "Not provided"],
                ["Application Status", application.status || "Not provided"],
                ["Interview Status", interviewStatus],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">{label}</p>
                  <p className="mt-1 font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            {meetingLink && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-bold text-slate-900">Meeting Link</p>
                <button type="button" onClick={join} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-bold text-white">
                  Join Interview <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            )}
            {interviewType === "in-person" && application.location && (
              <p className="flex items-center gap-2 text-sm text-slate-700"><MapPin className="h-4 w-4 text-[var(--brand-deep)]" /> Interview Location: {application.location}</p>
            )}
            {interviewType === "phone" && (
              <p className="flex items-center gap-2 text-sm text-slate-700"><Phone className="h-4 w-4 text-[var(--brand-deep)]" /> Phone Interview</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
