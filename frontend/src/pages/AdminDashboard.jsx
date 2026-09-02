import { useEffect, useMemo, useState } from 'react';
import {
    Activity, AlertTriangle, BarChart3, BadgeCheck, BriefcaseBusiness, Building2,
    CheckCircle2, CircleDot, Eye, LogOut, Search, ShieldCheck, Trash2, Users, X,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const tabs = [
    { id: 'overview', label: 'Overview & Analytics', icon: BarChart3 },
    { id: 'companies', label: 'Employer Verification', icon: Building2 },
    { id: 'jobs', label: 'Job Moderation', icon: BriefcaseBusiness },
    { id: 'users', label: 'User Directory & Logs', icon: Users },
];

const emptyMetrics = { seekersCount: 0, employersTotal: 0, employersVerified: 0, activeJobsCount: 0, totalApplications: 0, avgMatchScore: 0, topMatchedSkill: 'No skill data yet', placementVelocity: 'No placement data yet' };
const isActive = (value) => value === 1 || value === true;
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'Not provided';
const formatMoney = (min, max, currency = 'USD') => min || max ? `${currency} ${Number(min || 0).toLocaleString()} - ${Number(max || 0).toLocaleString()}` : 'Negotiable';

function StatusBadge({ status }) {
    const styles = { verified: 'bg-emerald-100 text-emerald-700', published: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', 'under-review': 'bg-amber-100 text-amber-700', rejected: 'bg-rose-100 text-rose-700', suspended: 'bg-rose-100 text-rose-700', closed: 'bg-slate-200 text-slate-700', job_seeker: 'bg-blue-100 text-blue-700', employer: 'bg-violet-100 text-violet-700', admin: 'bg-slate-200 text-slate-700' };
    return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${styles[status] || 'bg-slate-100 text-slate-600'}`}>{String(status || 'pending').replace('_', ' ').replace('-', ' ')}</span>;
}

function AdminDashboard() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [metrics, setMetrics] = useState(emptyMetrics);
    const [companies, setCompanies] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [previewJob, setPreviewJob] = useState(null);
    const [deleteJob, setDeleteJob] = useState(null);

    const loadDashboard = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/admin/overview');
            setMetrics(data.data || emptyMetrics);
            setCompanies(data.companies || []);
            setJobs(data.jobs || []);
            setUsers(data.users || []);
            setLogs(data.logs || []);
        } catch (loadError) {
            setError(loadError.response?.data?.message || 'Unable to load the admin control center.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadDashboard(); }, []);

    const filteredUsers = useMemo(() => users.filter((item) => {
        const query = userSearch.trim().toLowerCase();
        const matchesSearch = !query || `${item.full_name} ${item.email}`.toLowerCase().includes(query);
        const matchesRole = roleFilter === 'all' || (roleFilter === 'seekers' && item.role === 'job_seeker') || (roleFilter === 'employers' && item.role === 'employer') || (roleFilter === 'admins' && ['admin', 'super_admin'].includes(item.role));
        return matchesSearch && matchesRole;
    }), [users, userSearch, roleFilter]);

    const updateCompany = async (id, status) => {
        try {
            await api.patch(`/admin/company/${id}/verify`, { status });
            setCompanies((items) => items.map((item) => item.id === id ? { ...item, is_verified: status === 'verified', verification_status: status } : item));
        } catch (actionError) { setError(actionError.response?.data?.message || 'Unable to update company verification.'); }
    };

    const updateJobStatus = async (id, status) => {
        try {
            await api.patch(`/admin/jobs/${id}/moderate`, { status });
            setJobs((items) => items.map((item) => item.id === id ? { ...item, status } : item));
        } catch (actionError) { setError(actionError.response?.data?.message || 'Unable to update job status.'); }
    };

    const toggleUser = async (id) => {
        try {
            const { data } = await api.patch(`/admin/users/${id}/status`);
            setUsers((items) => items.map((item) => item.id === id ? { ...item, is_active: data.is_active } : item));
        } catch (actionError) { setError(actionError.response?.data?.message || 'Unable to update account status.'); }
    };

    const openPreview = async (id) => {
        try {
            const { data } = await api.get(`/admin/jobs/${id}/preview`);
            setPreviewJob(data.job);
        } catch (actionError) { setError(actionError.response?.data?.message || 'Unable to preview listing.'); }
    };

    const confirmDelete = async () => {
        if (!deleteJob) return;
        try {
            await api.delete(`/admin/jobs/${deleteJob.id}`);
            setJobs((items) => items.filter((item) => item.id !== deleteJob.id));
            setDeleteJob(null);
        } catch (actionError) { setError(actionError.response?.data?.message || 'Unable to delete listing.'); }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-950 text-white shadow-xl">
                <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
                    <div className="flex min-h-20 flex-col justify-center gap-4 py-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-center gap-3"><div className="rounded-2xl bg-emerald-400/15 p-2.5 text-emerald-300 ring-1 ring-emerald-300/25"><ShieldCheck className="h-6 w-6" /></div><div><p className="text-base font-black tracking-tight sm:text-lg">SmartRecruit AI <span className="text-slate-400">•</span> Enterprise Control Center</p><p className="text-xs text-slate-400">Restricted platform operations</p></div></div>
                        <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-white/5 p-1" aria-label="Admin sections">{tabs.map(({ id, label, icon: Icon }, index) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition sm:px-4 ${activeTab === id ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon className="h-4 w-4" /><span><span className="mr-1 text-slate-400">{index + 1}.</span>{label}</span></button>)}</nav>
                        <div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300"><CircleDot className="h-3.5 w-3.5 fill-current" />100% Operational</span><span className="hidden max-w-40 truncate text-sm font-semibold text-slate-300 md:block">{user?.email || 'Administrator'}</span><button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"><LogOut className="h-4 w-4" />Log Out</button></div>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
                {error && <div className="mb-5 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div>}
                {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center font-semibold text-slate-500">Loading live platform data...</div> : <>{activeTab === 'overview' && <Overview metrics={metrics} companies={companies} jobs={jobs} logs={logs} setActiveTab={setActiveTab} />}{activeTab === 'companies' && <Companies companies={companies} onUpdate={updateCompany} />}{activeTab === 'jobs' && <Jobs jobs={jobs} onPreview={openPreview} onStatus={updateJobStatus} onDelete={setDeleteJob} />}{activeTab === 'users' && <UsersAndLogs users={filteredUsers} logs={logs} search={userSearch} setSearch={setUserSearch} filter={roleFilter} setFilter={setRoleFilter} onToggle={toggleUser} />}</>}
            </main>
            {previewJob && <Modal title="Listing Preview" onClose={() => setPreviewJob(null)}><div className="space-y-4"><div><h3 className="text-2xl font-black text-slate-900">{previewJob.title}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{previewJob.company_name || 'Company'} • {previewJob.category || 'General'} • {previewJob.work_mode || 'hybrid'}</p></div><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{previewJob.description}</p><div className="grid gap-3 sm:grid-cols-2"><Info label="Salary" value={formatMoney(previewJob.salary_min, previewJob.salary_max, previewJob.currency)} /><Info label="Education" value={previewJob.required_education || 'Not specified'} /><Info label="Experience" value={`${previewJob.years_of_experience_min || 0}-${previewJob.years_of_experience_max || 20} years`} /><Info label="Location" value={previewJob.location || 'Not specified'} /></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Required skills and benefits</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{previewJob.required_skills || previewJob.benefits || 'Not provided'}</p></div></div></Modal>}
            {deleteJob && <Modal title="Delete Listing?" onClose={() => setDeleteJob(null)}><p className="text-sm leading-6 text-slate-600">This permanently removes <strong>{deleteJob.title}</strong> and its related applications. This action cannot be undone.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeleteJob(null)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">Cancel</button><button type="button" onClick={confirmDelete} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"><Trash2 className="h-4 w-4" />Delete Post</button></div></Modal>}
        </div>
    );
}

function Overview({ metrics, companies, jobs, logs, setActiveTab }) {
    const verifiedRate = metrics.employersTotal ? Math.round((metrics.employersVerified / metrics.employersTotal) * 100) : 0;
    const cards = [{ label: 'Total Job Seekers', value: metrics.seekersCount, icon: Users, color: 'text-blue-700 bg-blue-50' }, { label: 'Registered Employers', value: metrics.employersTotal, detail: `${verifiedRate}% verified`, icon: Building2, color: 'text-emerald-700 bg-emerald-50' }, { label: 'Active Job Postings', value: metrics.activeJobsCount, icon: BriefcaseBusiness, color: 'text-violet-700 bg-violet-50' }, { label: 'AI-Calculated Applications', value: metrics.totalApplications, detail: `${metrics.avgMatchScore || 0}% average match`, icon: Activity, color: 'text-amber-700 bg-amber-50' }];
    return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Section 1</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">AI platform & recruitment analytics</h1><p className="mt-2 text-sm text-slate-600">A live operational view of talent supply, hiring demand, and matching performance.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, detail, icon: Icon, color }) => <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-500">{label}</p><div className={`rounded-xl p-2.5 ${color}`}><Icon className="h-5 w-5" /></div></div><p className="mt-5 text-4xl font-black tracking-tight text-slate-950">{value}</p>{detail && <p className="mt-2 text-xs font-bold text-slate-500">{detail}</p>}</div>)}</div><div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">AI matching health</p><h2 className="mt-2 text-2xl font-black">Algorithm efficiency</h2></div><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><BadgeCheck className="h-6 w-6" /></div></div><div className="mt-6 flex items-end gap-4"><p className="text-6xl font-black text-slate-950">{metrics.avgMatchScore || 0}<span className="text-2xl text-slate-400">%</span></p><p className="pb-2 text-sm font-semibold text-emerald-700">Average application fit</p></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(Number(metrics.avgMatchScore || 0), 100)}%` }} /></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><Info label="Top matched skill" value="Live application data" /><Info label="Placement velocity" value={metrics.totalApplications ? 'Live' : 'Awaiting data'} /><Info label="Verified employer rate" value={`${verifiedRate}%`} /></div></div><div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Live queue</p><h2 className="mt-2 text-2xl font-black">Needs attention</h2><div className="mt-6 space-y-4"><QueueItem label="Employer reviews" value={companies.filter((company) => company.verification_status === 'pending').length} onClick={() => setActiveTab('companies')} /><QueueItem label="Active listings" value={jobs.filter((job) => job.status === 'published').length} onClick={() => setActiveTab('jobs')} /><QueueItem label="Audit events" value={logs.length} onClick={() => setActiveTab('users')} /></div></div></div></div>;
}

function Companies({ companies, onUpdate }) { return <Section title="Employer verification & compliance desk" eyebrow="Section 2"><TableWrap><table className="min-w-262.5 w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="p-3">Company identity</th><th className="p-3">Authorized rep</th><th className="p-3">Location & website</th><th className="p-3">Status</th><th className="p-3 text-right">Quick actions</th></tr></thead><tbody className="divide-y divide-slate-100">{companies.map((company) => <tr key={company.id} className="align-top"><td className="p-3"><div className="flex gap-3"><div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-500">{company.logo_url ? <img src={company.logo_url} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5" />}</div><div><p className="font-bold text-slate-900">{company.company_name}</p><p className="mt-1 text-xs text-slate-500">{company.industry || 'Industry not provided'} • {company.company_size || 'Size not provided'}</p></div></div></td><td className="p-3 text-slate-600"><p>{company.rep_name || company.representative_name || 'Not provided'}</p><p className="text-xs">{company.rep_email || company.work_email || 'No email'}</p><p className="text-xs">{company.rep_phone || company.phone || 'No phone'}</p></td><td className="p-3 text-slate-600"><p>{company.city || company.location || 'Not provided'}, {company.country || 'Ethiopia'}</p>{company.website && <a href={company.website} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">{company.website}</a>}</td><td className="p-3"><StatusBadge status={company.verification_status} /></td><td className="p-3 text-right"><div className="flex justify-end gap-2">{company.verification_status !== 'verified' && <button type="button" onClick={() => onUpdate(company.id, 'verified')} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">Approve & Certify</button>}{company.verification_status !== 'rejected' && <button type="button" onClick={() => onUpdate(company.id, 'rejected')} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">Reject</button>}</div></td></tr>)}</tbody></table></TableWrap></Section>; }

function Jobs({ jobs, onPreview, onStatus, onDelete }) { return <Section title="Job listings & content moderation" eyebrow="Section 3"><TableWrap><table className="min-w-300 w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="p-3">Job details</th><th className="p-3">Employer</th><th className="p-3">Candidates</th><th className="p-3">Deadline</th><th className="p-3">Status</th><th className="p-3 text-right">Moderation</th></tr></thead><tbody className="divide-y divide-slate-100">{jobs.map((job) => <tr key={job.id}><td className="p-3"><p className="font-bold text-slate-900">{job.title}</p><p className="mt-1 text-xs text-slate-500">{job.category || 'General'} • {job.work_mode || 'hybrid'} • {formatMoney(job.salary_min, job.salary_max, job.currency)}</p></td><td className="p-3"><p className="font-semibold text-slate-800">{job.company_name || 'Unassigned'}</p><p className="text-xs text-slate-500">{job.company_location || job.location || 'Location not provided'}</p></td><td className="p-3"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{job.total_applicants || 0} applications</span></td><td className="p-3 text-xs text-slate-600">{formatDate(job.application_deadline)}</td><td className="p-3"><StatusBadge status={job.status} /></td><td className="p-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => onPreview(job.id)} className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200" title="Preview listing"><Eye className="h-4 w-4" /></button><button type="button" onClick={() => onStatus(job.id, job.status === 'suspended' ? 'published' : 'suspended')} className="rounded-xl bg-amber-50 p-2 text-amber-700 hover:bg-amber-100" title="Suspend or reactivate listing"><AlertTriangle className="h-4 w-4" /></button><button type="button" onClick={() => onDelete(job)} className="rounded-xl bg-rose-50 p-2 text-rose-700 hover:bg-rose-100" title="Delete post"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></TableWrap></Section>; }

function UsersAndLogs({ users, logs, search, setSearch, filter, setFilter, onToggle }) { return <Section title="User directory & system audit logs" eyebrow="Section 4"><div className="mb-5 flex flex-col gap-3 md:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500" /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none"><option value="all">All roles</option><option value="seekers">Job Seekers</option><option value="employers">Employers</option><option value="admins">Admins</option></select></div><div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]"><TableWrap><table className="min-w-225 w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="p-3">Full name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Role</th><th className="p-3">Verification</th><th className="p-3">Joined</th><th className="p-3 text-right">Account</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((item) => <tr key={item.id}><td className="p-3 font-bold text-slate-900">{item.full_name || 'Unnamed user'}</td><td className="p-3 text-slate-600">{item.email}</td><td className="p-3 text-slate-600">{item.phone || 'Not provided'}</td><td className="p-3"><StatusBadge status={item.role} /></td><td className="p-3">{isActive(item.is_verified) ? <span className="font-semibold text-emerald-700">Verified</span> : <span className="font-semibold text-amber-700">Pending</span>}</td><td className="p-3 text-xs text-slate-600">{formatDate(item.created_at)}</td><td className="p-3 text-right"><button type="button" onClick={() => onToggle(item.id)} className={`rounded-xl px-3 py-2 text-xs font-bold ${isActive(item.is_active) ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>{isActive(item.is_active) ? 'Block' : 'Activate'}</button></td></tr>)}</tbody></table></TableWrap><div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Live audit stream</p><h2 className="mt-2 text-xl font-black">Recent events</h2></div><Activity className="h-5 w-5 text-emerald-300" /></div><div className="mt-5 space-y-4">{logs.map((entry, index) => <div key={`${entry.created_at}-${index}`} className="flex gap-3 border-b border-white/10 pb-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><div><p className="text-sm font-semibold">{entry.full_name || entry.email || 'Unknown user'} <span className="font-normal text-slate-400">{entry.activity_type || 'activity'}</span></p><p className="mt-1 text-[11px] text-slate-400">{new Date(entry.created_at).toLocaleString()}</p></div></div>)}</div></div></div></Section>; }

function Section({ eyebrow, title, children }) { return <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{title}</h1><div className="mt-6">{children}</div></div>; }
function TableWrap({ children }) { return <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">{children}</div>; }
function Info({ label, value }) { return <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>; }
function QueueItem({ label, value, onClick }) { return <button type="button" onClick={onClick} className="flex w-full items-center justify-between border-b border-white/10 pb-3 text-left"><span className="text-sm font-semibold text-slate-300">{label}</span><span className="text-xl font-black text-white">{value}</span></button>; }
function Modal({ title, onClose, children }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-black text-slate-950">{title}</h2><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" aria-label="Close modal"><X className="h-5 w-5" /></button></div>{children}</div></div>; }

export default AdminDashboard;

