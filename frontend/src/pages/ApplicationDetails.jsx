import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, Check, ChevronDown, ChevronUp, FileText, Loader2, MapPin, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getApplicationById, getJobById, withdrawApplication } from '../services/jobService';

const stages = ['Applied', 'AI Matched', 'Employer Reviewed', 'Shortlisted', 'Interview', 'Final Decision'];
const withdrawableStatuses = ['applied', 'submitted', 'under review'];

const formatDate = (value) => {
	if (!value) return 'Date unavailable';
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ApplicationDetails() {
	const { id } = useParams();
	const navigate = useNavigate();
	const [application, setApplication] = useState(null);
	const [job, setJob] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [coverLetterOpen, setCoverLetterOpen] = useState(false);
	const [showWithdrawModal, setShowWithdrawModal] = useState(false);
	const [withdrawing, setWithdrawing] = useState(false);
	const [withdrawError, setWithdrawError] = useState('');

	useEffect(() => {
		let active = true;
		const loadApplication = async () => {
			setLoading(true);
			const stored = getApplicationById(id);
			if (!stored) {
				if (active) { setError('This application could not be found.'); setLoading(false); }
				return;
			}
			if (active) setApplication(stored);
			try {
				const jobData = await getJobById(stored.jobId);
				if (active) setJob(jobData);
			} catch (loadError) {
				console.error('Unable to load original job post', loadError);
			} finally {
				if (active) setLoading(false);
			}
		};
		loadApplication();
		return () => { active = false; };
	}, [id]);

	const statusLabel = useMemo(() => {
		const status = application?.status?.toLowerCase();
		if (status === 'withdrawn') return 'Withdrawn';
		if (status === 'shortlisted') return 'Shortlisted';
		return 'Under Review';
	}, [application]);
	const canWithdraw = withdrawableStatuses.includes((application?.status || '').toLowerCase());

	const handleWithdraw = async () => {
		setWithdrawing(true);
		setWithdrawError('');
		try {
			await withdrawApplication(id);
			setApplication((current) => ({ ...current, status: 'Withdrawn' }));
			setShowWithdrawModal(false);
		} catch (withdrawalError) {
			console.error('Unable to withdraw application', withdrawalError);
			setWithdrawError('Unable to withdraw this application. Please try again.');
		} finally {
			setWithdrawing(false);
		}
	};

	if (loading) return <main className="flex min-h-[70vh] items-center justify-center bg-slate-50"><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><Loader2 className="h-5 w-5 animate-spin text-[var(--brand-deep)]" /> Loading application…</div></main>;
	if (error || !application) return <main className="min-h-[70vh] bg-slate-50 px-4 py-12"><div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-black text-slate-900">Application unavailable</h1><p className="mt-2 text-slate-600">{error}</p><button type="button" onClick={() => navigate('/applications')} className="brand-button mt-6 px-5 py-3 text-sm">View My Applications</button></div></main>;

	let resume = null;
	try { resume = JSON.parse(localStorage.getItem('seekerResume') || 'null'); } catch { /* Ignore malformed local resume data. */ }
	const resumeName = resume?.fileName || application.resumeName || application.resumeId || 'Selected resume';
	const resumeUrl = resume?.fileUrl || application.resumeUrl;
	const appliedDate = formatDate(application.createdAt || application.appliedAt);
	const activeStage = statusLabel === 'Withdrawn' ? -1 : statusLabel === 'Shortlisted' ? 3 : 2;

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-5xl">
				<nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500"><Link to="/dashboard" className="hover:text-[var(--brand-deep)]">Dashboard</Link><span>/</span><Link to="/applications" className="hover:text-[var(--brand-deep)]">My Applications</Link><span>/</span><span className="font-semibold text-slate-700">Application Details</span></nav>
				<button type="button" onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand-deep)]"><ArrowLeft className="h-4 w-4" /> Back</button>
				<section className="rounded-3xl border border-[var(--brand-border)] bg-white p-6 shadow-sm sm:p-8">
					<div className="flex flex-col gap-5 border-b border-slate-100 pb-7 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-deep)]">Application Details</p><h1 className="mt-2 text-3xl font-black text-slate-900">{job?.title || 'Job application'}</h1><p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600"><span className="inline-flex items-center gap-1.5"><BriefcaseBusiness className="h-4 w-4" />{job?.companyName || job?.company || 'Company'}</span>{job?.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location}</span>}</p><p className="mt-3 text-sm text-slate-500">Applied {appliedDate}</p></div><span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-bold ${statusLabel === 'Shortlisted' ? 'bg-emerald-50 text-emerald-700' : statusLabel === 'Withdrawn' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-[var(--brand-deep)]'}`}>{statusLabel}</span></div>
					<div className="mt-7 rounded-2xl border border-slate-200 p-5"><h2 className="text-lg font-bold text-slate-900">Application progress</h2><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">{stages.map((stage, index) => { const completed = index < activeStage; const current = index === activeStage; return <div key={stage} className="flex items-start gap-3 lg:block lg:text-center"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold lg:mx-auto ${completed ? 'bg-[var(--brand-primary)] text-white' : current ? 'border-2 border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-deep)]' : 'bg-slate-100 text-slate-400'}`}>{completed ? <Check className="h-5 w-5" /> : index + 1}</span><div className="pt-1 lg:pt-3"><p className="text-sm font-bold text-slate-800">{stage}</p><p className="mt-1 text-xs text-slate-500">{completed ? 'Completed' : current ? 'In progress' : 'Waiting'}</p></div></div>; })}</div></div>
					<div className="mt-6 rounded-2xl border border-slate-200 p-5"><h2 className="text-lg font-bold text-slate-900">Submitted materials</h2><div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-[var(--brand-deep)]" /><span className="text-sm font-semibold text-slate-700">{resumeName}</span></div>{resumeUrl ? <a href={resumeUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-[var(--brand-deep)] hover:underline">View</a> : <span className="text-xs text-slate-500">Preview unavailable</span>}</div><button type="button" onClick={() => setCoverLetterOpen((open) => !open)} className="mt-5 flex w-full items-center justify-between border-t border-slate-100 pt-4 text-left text-sm font-bold text-slate-700"><span>Cover letter</span>{coverLetterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>{coverLetterOpen && <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{application.coverLetter || 'No cover letter was submitted.'}</p>}</div>
					<div className="mt-7 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:flex-wrap"><Link to="/dashboard" className="brand-button w-full px-4 py-3 text-center text-sm sm:w-auto">📊 Back to Dashboard</Link><Link to="/applications" className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--brand-border)] bg-[var(--brand-soft)] px-4 py-3 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand-soft-hover)] sm:w-auto">📁 View All My Applications</Link><Link to="/jobs" className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:w-auto">🔍 Explore More Jobs</Link>{job?.id && <Link to={`/jobs/${job.id}`} className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--brand-primary)] bg-white px-4 py-3 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand-soft)] sm:w-auto">📄 View Original Job Post</Link>}{canWithdraw && <button type="button" onClick={() => setShowWithdrawModal(true)} className="inline-flex w-full items-center justify-center rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50 sm:w-auto"><X className="mr-2 h-4 w-4" /> Withdraw Application</button>}</div>
				</section>
			</div>
			{showWithdrawModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div role="dialog" aria-modal="true" aria-labelledby="withdraw-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="withdraw-title" className="text-xl font-black text-slate-900">Withdraw application?</h2><p className="mt-2 text-sm leading-6 text-slate-600">This action will cancel your application and cannot be undone.</p>{withdrawError && <p className="mt-3 text-sm font-semibold text-red-700">{withdrawError}</p>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowWithdrawModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Keep Application</button><button type="button" onClick={handleWithdraw} disabled={withdrawing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{withdrawing && <Loader2 className="h-4 w-4 animate-spin" />}Confirm Withdrawal</button></div></div></div>}
		</main>
	);
}
