import { useEffect, useMemo, useState } from 'react';
import { Bell, Check, Download, ExternalLink, FileText, Loader2, MessageSquareText, Search, Star, UserPlus, UserRound, X } from 'lucide-react';
import api from '../../services/api';

const departmentCatalog = [
  'Software & IT / Technology',
  'Finance, Accounting & Banking',
  'Sales, Marketing & PR',
  'Human Resources & Admin',
  'Engineering & Construction',
  'Healthcare & Pharmaceuticals',
  'Customer Support & Operations',
];

const skillCatalog = [
  'React',
  'Python',
  'Node.js',
  'SQL',
  'Accounting / IFRS',
  'Financial Modeling',
  'Digital Marketing',
  'Project Management',
  'Graphic Design',
  'UI/UX Design',
  'Communication',
  'JavaScript',
  'TypeScript',
  'Figma',
  'Power BI',
  'AWS',
  'REST APIs',
  'Leadership',
  'Customer Service',
];

const experienceOptions = [
  { value: 'All', label: 'All Experience' },
  { value: 'entry', label: 'Entry Level / Fresh Graduate (0 - 1 Year)' },
  { value: 'junior', label: 'Junior (1 - 3 Years)' },
  { value: 'mid', label: 'Mid-Level (3 - 5 Years)' },
  { value: 'senior', label: 'Senior (5 - 8 Years)' },
  { value: 'lead', label: 'Lead / Manager (8+ Years)' },
];
const INITIAL_VISIBLE_CANDIDATES = 5;
const CANDIDATE_PAGE_SIZE = 5;

const normalizeText = (value) => String(value || '').toLowerCase().trim();

const toSkillList = (value) => {
  if (Array.isArray(value)) return value.map((skill) => String(skill).trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[|,;\n]/)
    .map((skill) => skill.trim())
    .filter(Boolean);
};

const normalizeDepartment = (candidate = {}) => {
  const haystack = [candidate.preferredDepartment, candidate.department, candidate.industry, candidate.headline, candidate.fullName, candidate.role].join(' ').toLowerCase();

  if (/software|technology|it|developer|engineer|frontend|backend|full stack|data analyst|ai|product|design|ux|qa|devops|cloud|digital/.test(haystack)) return 'Software & IT / Technology';
  if (/finance|account|bank|audit|tax|treasury|risk|credit|financial/.test(haystack)) return 'Finance, Accounting & Banking';
  if (/sales|marketing|brand|digital marketing|pr|public relations|media|communication/.test(haystack)) return 'Sales, Marketing & PR';
  if (/hr|human resources|admin|office|operations|recruit|personnel/.test(haystack)) return 'Human Resources & Admin';
  if (/construction|civil|mechanical|electrical|architect|engineering/.test(haystack)) return 'Engineering & Construction';
  if (/health|medical|pharma|pharmacy|nurse|clinic|care/.test(haystack)) return 'Healthcare & Pharmaceuticals';
  if (/customer|support|call center|operations|service/.test(haystack)) return 'Customer Support & Operations';

  return candidate.preferredDepartment || candidate.department || 'Software & IT / Technology';
};

const getExperienceBucket = (years) => {
  const value = Number(years || 0);
  if (value <= 1) return 'entry';
  if (value <= 3) return 'junior';
  if (value <= 5) return 'mid';
  if (value <= 8) return 'senior';
  return 'lead';
};

const formatExperienceLabel = (years) => {
  const safeYears = Number(years || 0);
  if (safeYears <= 1) return 'Entry Level / Fresh Graduate';
  if (safeYears <= 3) return 'Junior';
  if (safeYears <= 5) return 'Mid-Level';
  if (safeYears <= 8) return 'Senior';
  return 'Lead / Manager';
};

export default function TalentPool() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [skillFilter, setSkillFilter] = useState('All');
  const [experience, setExperience] = useState('All');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CANDIDATES);
  const [inviteCandidate, setInviteCandidate] = useState(null);
  const [inviteJobId, setInviteJobId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [busyCandidateId, setBusyCandidateId] = useState(null);
  const [notice, setNotice] = useState('');
  const [shortlistCandidate, setShortlistCandidate] = useState(null);
  const [shortlistNotes, setShortlistNotes] = useState('');
  const [shortlistError, setShortlistError] = useState('');
  const [cvCandidate, setCvCandidate] = useState(null);
  const [cvPreviewError, setCvPreviewError] = useState(false);
  const [activityCandidate, setActivityCandidate] = useState(null);
  const [activity, setActivity] = useState({ invitations: [], conversations: [] });
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [activityErrors, setActivityErrors] = useState({ invitations: false, conversations: false });

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const loadPool = async () => {
      try {
        const [{ data: poolData }, { data: jobsData }] = await Promise.all([
          api.get('/employer/talent-pool'),
          api.get('/employer/jobs'),
        ]);

        const items = (poolData?.candidates || poolData || []).map((candidate) => {
          const rawSkills = toSkillList(candidate.keySkills || candidate.skills || candidate.skillSet || candidate.tags || []);
          const experienceYears = Number(candidate.experienceYears ?? candidate.experience ?? candidate.totalExperience ?? 0);
          const normalizedDepartment = normalizeDepartment({ ...candidate, preferredDepartment: candidate.preferredDepartment || candidate.department || candidate.industry || candidate.headline });

          return {
            ...candidate,
            fullName: candidate.fullName || candidate.name || 'Candidate',
            email: candidate.email || '',
            headline: candidate.headline || candidate.role || candidate.currentTitle || candidate.preferredDepartment || 'Candidate',
            preferredDepartment: normalizedDepartment,
            preferredJobType: candidate.preferredJobType || candidate.jobType || 'full-time',
            keySkills: rawSkills.length ? rawSkills : ['Communication', 'Project Management'],
            experienceYears: Number.isFinite(experienceYears) && experienceYears >= 0 ? experienceYears : 0,
            experience: candidate.experience || formatExperienceLabel(experienceYears),
            aiMatchScore: Number(candidate.aiMatchScore ?? candidate.matchScore ?? 0),
            resumeText: candidate.resumeText || candidate.coverNote || candidate.summary || '',
            coverNote: candidate.coverNote || candidate.summary || candidate.headline || 'No cover note provided yet.',
            shortlisted: Boolean(candidate.savedAt),
          };
        });

        setCandidates(items);
        setJobs((jobsData?.jobs || jobsData || []).filter((job) => (job.status || '').toLowerCase() === 'published'));
      } catch {
        const seededCandidates = [
          { id: 1, fullName: 'Eyerus Shibabaw', email: 'shibabaweyerus@gmail.com', preferredDepartment: 'Software & IT / Technology', preferredJobType: 'full-time', keySkills: ['React', 'Node.js', 'SQL', 'JavaScript'], experienceYears: 4, headline: 'Software Engineer', coverNote: 'Strong frontend and backend delivery with product mindset.', resumeText: 'React Node.js SQL JavaScript backend API design', aiMatchScore: 94 },
          { id: 2, fullName: 'Selam Bekele', email: 'selam.bekele@gmail.com', preferredDepartment: 'Finance, Accounting & Banking', preferredJobType: 'full-time', keySkills: ['Accounting / IFRS', 'Financial Modeling', 'SQL'], experienceYears: 3, headline: 'Accountant', coverNote: 'Experienced in financial reporting, controls, and closing processes.', resumeText: 'Accounting IFRS financial modeling reconciliation reporting', aiMatchScore: 90 },
          { id: 3, fullName: 'Netsanet Fikadu', email: 'netsanet.fikadu@gmail.com', preferredDepartment: 'Sales, Marketing & PR', preferredJobType: 'full-time', keySkills: ['Digital Marketing', 'Communication', 'Project Management'], experienceYears: 2, headline: 'Marketing Specialist', coverNote: 'Campaign planning, performance marketing, and customer acquisition.', resumeText: 'Digital marketing campaign strategy communication', aiMatchScore: 87 },
          { id: 4, fullName: 'Mikiyas Tesfaye', email: 'mikiyas.tesfaye@gmail.com', preferredDepartment: 'Human Resources & Admin', preferredJobType: 'full-time', keySkills: ['Project Management', 'Communication', 'Leadership'], experienceYears: 5, headline: 'HR Generalist', coverNote: 'Supports recruitment operations and employee engagement programs.', resumeText: 'HR admin recruitment onboarding employee relations', aiMatchScore: 88 },
          { id: 5, fullName: 'Dawit Alemu', email: 'dawit.alemu@gmail.com', preferredDepartment: 'Engineering & Construction', preferredJobType: 'full-time', keySkills: ['Project Management', 'AutoCAD', 'Leadership'], experienceYears: 8, headline: 'Site Engineer', coverNote: 'Manages construction schedules, QA, and contractor coordination.', resumeText: 'construction project management site engineering budget control', aiMatchScore: 82 },
          { id: 6, fullName: 'Hana Solomon', email: 'hana.solomon@gmail.com', preferredDepartment: 'Healthcare & Pharmaceuticals', preferredJobType: 'part-time', keySkills: ['Communication', 'Healthcare', 'Project Management'], experienceYears: 1, headline: 'Pharmaceutical Sales Representative', coverNote: 'Customer-facing sales support for healthcare and pharmacy channels.', resumeText: 'pharmacy sales healthcare customer relationship', aiMatchScore: 80 },
          { id: 7, fullName: 'Biruktawit Daniel', email: 'biruktawit.daniel@gmail.com', preferredDepartment: 'Customer Support & Operations', preferredJobType: 'full-time', keySkills: ['Customer Service', 'Communication', 'SQL'], experienceYears: 3, headline: 'Customer Success Associate', coverNote: 'Leads service escalations, retention, and process documentation.', resumeText: 'customer support operations service management retention', aiMatchScore: 85 },
          { id: 8, fullName: 'Ephrem Getahun', email: 'ephrem.getahun@gmail.com', preferredDepartment: 'Software & IT / Technology', preferredJobType: 'full-time', keySkills: ['Python', 'SQL', 'REST APIs', 'AWS'], experienceYears: 6, headline: 'Backend Engineer', coverNote: 'Builds scalable APIs and data workflows for product teams.', resumeText: 'Python SQL APIs AWS backend engineering scale', aiMatchScore: 92 },
        ];

        setCandidates(seededCandidates);
        setJobs([]);
      }
    };

    loadPool();
  }, []);

  const departmentOptions = useMemo(() => {
    const options = new Set(['All']);
    candidates.forEach((candidate) => {
      const value = normalizeDepartment(candidate);
      if (value) options.add(value);
    });
    return ['All', ...Array.from(options).filter((option) => option !== 'All')];
  }, [candidates]);

  const skillOptions = useMemo(() => {
    const options = new Set(['All']);
    candidates.forEach((candidate) => {
      (candidate.keySkills || []).forEach((skill) => options.add(skill));
    });
    return ['All', ...Array.from(options).filter((option) => option !== 'All')];
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const searchTerm = normalizeText(search);
      const searchFields = [
        candidate.fullName,
        candidate.email,
        candidate.headline,
        candidate.preferredDepartment,
        candidate.coverNote,
        candidate.resumeText,
        (candidate.keySkills || []).join(' '),
      ].join(' ');

      const matchesSearch = !searchTerm || normalizeText(searchFields).includes(searchTerm);
      const matchesDepartment = department === 'All' || candidate.preferredDepartment === department;
      const matchesSkill = skillFilter === 'All' || (candidate.keySkills || []).includes(skillFilter);
      const candidateBucket = getExperienceBucket(candidate.experienceYears);
      const matchesExperience = experience === 'All' || candidateBucket === experience;

      return matchesSearch && matchesDepartment && matchesSkill && matchesExperience;
    });
  }, [candidates, search, department, skillFilter, experience]);

  const visibleCandidates = filteredCandidates.slice(0, visibleCount);

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setDepartment('All');
    setSkillFilter('All');
    setExperience('All');
    setVisibleCount(INITIAL_VISIBLE_CANDIDATES);
  };

  const openShortlist = (candidate) => {
    setShortlistCandidate(candidate);
    setShortlistNotes(candidate.notes || '');
    setShortlistError('');
  };

  const moveToShortlist = async (event) => {
    event.preventDefault();
    if (!shortlistCandidate || (shortlistCandidate.shortlisted && shortlistCandidate.shortlistNotificationSent)) return;
    const isBackfillNotification = shortlistCandidate.shortlisted;
    setBusyCandidateId(shortlistCandidate.id);
    setShortlistError('');
    setNotice('');
    try {
      await api.post('/employer/talent-pool/save', {
        candidateId: shortlistCandidate.id,
        candidateName: shortlistCandidate.fullName,
        primaryRole: shortlistCandidate.preferredDepartment,
        skills: shortlistCandidate.keySkills || [],
        aiMatchScore: shortlistCandidate.aiMatchScore || 0,
        notes: shortlistNotes.trim() || 'Saved to shortlist from talent pool',
      });
      setCandidates((current) => current.map((item) => (item.id === shortlistCandidate.id ? { ...item, shortlisted: true, shortlistNotificationSent: true, notes: shortlistNotes.trim() } : item)));
      window.dispatchEvent(new Event('employer-talent-pool:updated'));
      setNotice(isBackfillNotification ? `A shortlist notification was sent to ${shortlistCandidate.fullName}.` : `${shortlistCandidate.fullName} was added to your shortlist and notified.`);
      setShortlistCandidate(null);
    } catch (error) {
      setShortlistError(error?.response?.data?.message || 'Unable to add this candidate to your shortlist.');
    } finally {
      setBusyCandidateId(null);
    }
  };

  const openInvite = (candidate) => {
    setInviteCandidate(candidate);
    setInviteJobId(String(jobs[0]?.id || ''));
    setInviteMessage(`Hi ${candidate.fullName || 'Candidate'}, we would like to invite you to apply for ${jobs[0]?.title || 'our open role'}.`);
    setInviteError('');
  };

  const inviteToApply = async (event) => {
    event.preventDefault();
    if (!inviteCandidate || !inviteJobId) return;
    setSendingInvite(true);
    setInviteError('');
    try {
      await api.post('/employer/job-invitations', {
        candidateId: inviteCandidate.id,
        jobId: Number(inviteJobId),
        message: inviteMessage.trim(),
      });
      setCandidates((current) => current.map((item) => (item.id === inviteCandidate.id ? { ...item, invited: true } : item)));
      setNotice(`Invitation sent to ${inviteCandidate.fullName}.`);
      setInviteCandidate(null);
    } catch (error) {
      setInviteError(error?.response?.data?.message || 'Unable to send invitation.');
    } finally {
      setSendingInvite(false);
    }
  };

  const getCandidateCvUrl = (candidate) => {
    const resumeUrl = candidate.resumeUrl || candidate.fileUrl || candidate.file_url;
    if (!resumeUrl) return '';
    const baseUrl = api.defaults.baseURL || window.location.origin;
    const origin = /^https?:\/\//i.test(baseUrl) ? new URL(baseUrl).origin : window.location.origin;
    return /^https?:\/\//i.test(resumeUrl) ? resumeUrl : new URL(resumeUrl.startsWith('/') ? resumeUrl : `/uploads/cvs/${resumeUrl}`, origin).href;
  };

  const viewCandidateCv = (candidate) => {
    setCvPreviewError(false);
    setCvCandidate(candidate);
  };

  const openCandidateActivity = async (candidate) => {
    setActivityCandidate(candidate);
    setActivity({ invitations: [], conversations: [] });
    setActivityLoading(true);
    setActivityError('');
    setActivityErrors({ invitations: false, conversations: false });

    const [invitationResult, conversationResult] = await Promise.allSettled([
      api.get('/employer/job-invitations'),
      api.get('/employer/messages/conversations'),
    ]);
    const invitationsFailed = invitationResult.status === 'rejected';
    const conversationsFailed = conversationResult.status === 'rejected';
    const invitations = invitationsFailed
      ? []
      : (invitationResult.value.data?.invitations || []).filter((item) => Number(item.candidateId) === Number(candidate.id));
    const conversations = conversationsFailed
      ? []
      : (conversationResult.value.data?.data || conversationResult.value.data?.conversations || []).filter((item) => Number(item.candidateId) === Number(candidate.id));
    const detailResults = await Promise.allSettled(conversations.map(async (conversation) => {
      const { data } = await api.get(`/employer/messages/conversations/${conversation.conversationId}`);
      return { ...conversation, messages: data?.data?.messages || [] };
    }));
    const conversationDetails = detailResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);
    const detailLoadFailed = detailResults.some((result) => result.status === 'rejected');
    const hasErrors = invitationsFailed || conversationsFailed || detailLoadFailed;

    setActivity({ invitations, conversations: conversationDetails });
    setActivityErrors({ invitations: invitationsFailed, conversations: conversationsFailed || detailLoadFailed });
    setActivityError(hasErrors ? 'Some activity could not be loaded. Retry to load the missing details.' : '');
    setActivityLoading(false);
  };

  const closeCandidateActivity = () => {
    setActivityCandidate(null);
    setActivity({ invitations: [], conversations: [] });
    setActivityErrors({ invitations: false, conversations: false });
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-600">Talent pool</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">General Applicants</h2>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          {filteredCandidates.length} {filteredCandidates.length === 1 ? 'candidate' : 'candidates'}
        </span>
      </div>

      {notice && <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss notice"><X className="h-4 w-4" /></button></div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setVisibleCount(INITIAL_VISIBLE_CANDIDATES);
              }}
              placeholder="Search candidate"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-blue-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-600 hover:bg-slate-300"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <select
            value={department}
            onChange={(event) => {
              setDepartment(event.target.value);
              setVisibleCount(INITIAL_VISIBLE_CANDIDATES);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            {departmentOptions.map((option) => (
              <option key={option} value={option}>{option === 'All' ? 'All Departments' : option}</option>
            ))}
          </select>

          <select
            value={skillFilter}
            onChange={(event) => {
              setSkillFilter(event.target.value);
              setVisibleCount(INITIAL_VISIBLE_CANDIDATES);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            {skillOptions.map((option) => (
              <option key={option} value={option}>{option === 'All' ? 'All Skills' : option}</option>
            ))}
          </select>

          <select
            value={experience}
            onChange={(event) => {
              setExperience(event.target.value);
              setVisibleCount(INITIAL_VISIBLE_CANDIDATES);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            {experienceOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {visibleCandidates.map((candidate) => (
          <article key={candidate.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-lg font-black text-blue-700">
                  {candidate.fullName?.charAt(0) || 'C'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{candidate.fullName}</h3>
                  <p className="text-sm text-slate-500">{candidate.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-700">{candidate.preferredDepartment}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700">{candidate.preferredJobType}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-700">{candidate.experience || 'Experience TBD'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => viewCandidateCv(candidate)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                >
                  <FileText className="h-4 w-4" /> View CV
                </button>
                <button
                  onClick={() => openInvite(candidate)}
                  disabled={!jobs.length}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                  title={!jobs.length ? 'Publish a job before inviting candidates' : undefined}
                >
                  <UserPlus className="h-4 w-4" /> Invite to Apply for New Job
                </button>
                <button
                  onClick={() => openShortlist(candidate)}
                  disabled={(candidate.shortlisted && candidate.shortlistNotificationSent) || busyCandidateId === candidate.id}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-default disabled:bg-emerald-800"
                >
                  {busyCandidateId === candidate.id ? <Loader2 className="h-4 w-4 animate-spin" /> : candidate.shortlisted && candidate.shortlistNotificationSent ? <Check className="h-4 w-4" /> : candidate.shortlisted ? <Bell className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                  {candidate.shortlisted && candidate.shortlistNotificationSent ? 'Shortlisted' : candidate.shortlisted ? 'Notify seeker' : 'Move to Shortlist'}
                </button>
                <button
                  type="button"
                  onClick={() => openCandidateActivity(candidate)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                >
                  <MessageSquareText className="h-4 w-4" /> Activity & Messages
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(candidate.keySkills || []).map((skill) => (
                    <span key={skill} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Cover note</p>
                <p className="mt-2 text-sm text-slate-600">{candidate.coverNote || 'No cover note provided yet.'}</p>
              </div>
            </div>
          </article>
        ))}

        {!filteredCandidates.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <UserRound className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-lg font-black text-slate-700">No candidates match your current search and filter criteria.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100"
            >
              Reset Filters
            </button>
          </div>
        )}

        {filteredCandidates.length > visibleCount && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setVisibleCount((count) => Math.min(count + CANDIDATE_PAGE_SIZE, filteredCandidates.length))}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100 sm:w-auto"
            >
              Show more
            </button>
          </div>
        )}

        {visibleCount > INITIAL_VISIBLE_CANDIDATES && filteredCandidates.length > INITIAL_VISIBLE_CANDIDATES && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setVisibleCount(INITIAL_VISIBLE_CANDIDATES)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100 sm:w-auto"
            >
              Show less
            </button>
          </div>
        )}
      </div>

      {cvCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCvCandidate(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="cv-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
              <div className="min-w-0"><p className="text-xs font-black uppercase tracking-widest text-blue-600">Candidate CV</p><h3 id="cv-title" className="mt-1 text-xl font-black text-slate-900">{cvCandidate.fullName}</h3><p className="text-sm text-slate-500">{cvCandidate.headline} · {cvCandidate.email}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                {getCandidateCvUrl(cvCandidate) && <>
                  <a href={getCandidateCvUrl(cvCandidate)} download className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-blue-800"><Download className="h-4 w-4" />Download CV</a>
                  <a href={getCandidateCvUrl(cvCandidate)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"><ExternalLink className="h-4 w-4" />Open in New Tab</a>
                </>}
                <button type="button" onClick={() => setCvCandidate(null)} aria-label="Close CV preview" title="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-h-[300px] overflow-auto bg-slate-100 p-3 sm:p-5">
                {getCandidateCvUrl(cvCandidate) && /\.pdf(?:$|[?#])/i.test(getCandidateCvUrl(cvCandidate)) && !cvPreviewError ? (
                  <iframe title={`${cvCandidate.fullName} CV`} src={getCandidateCvUrl(cvCandidate)} onError={() => setCvPreviewError(true)} className="h-[65vh] min-h-[300px] w-full rounded-lg border border-slate-300 bg-white" />
                ) : getCandidateCvUrl(cvCandidate) ? (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
                    <FileText className="h-10 w-10 text-blue-600" />
                    <h4 className="mt-3 font-black text-slate-900">{cvPreviewError ? 'PDF preview unavailable' : 'Preview unavailable'}</h4>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{cvPreviewError ? 'This PDF could not be loaded. Open it in a new tab or download it to review the file.' : 'This file type cannot be previewed here. Open it in a new tab or download it to review the file.'}</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <a href={getCandidateCvUrl(cvCandidate)} download className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"><Download className="h-4 w-4" />Download CV</a>
                      <a href={getCandidateCvUrl(cvCandidate)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><ExternalLink className="h-4 w-4" />Open in New Tab</a>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                    <FileText className="h-10 w-10 text-slate-300" />
                    <h4 className="mt-3 font-black text-slate-800">No CV uploaded</h4>
                    <p className="mt-1 text-sm text-slate-500">There is no CV file available for this candidate yet.</p>
                  </div>
                )}
              </div>
              <aside className="space-y-5 overflow-y-auto border-t border-slate-200 p-5 lg:border-l lg:border-t-0">
                <div><p className="text-xs font-black uppercase tracking-widest text-slate-400">Profile</p><p className="mt-2 font-bold text-slate-900">{cvCandidate.preferredDepartment}</p><p className="mt-1 text-sm text-slate-600">{cvCandidate.experience || 'Experience not provided'} · {cvCandidate.preferredJobType}</p></div>
                <div><p className="text-xs font-black uppercase tracking-widest text-slate-400">Skills</p><div className="mt-2 flex flex-wrap gap-1.5">{(cvCandidate.keySkills || []).length ? cvCandidate.keySkills.map((skill) => <span key={skill} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{skill}</span>) : <span className="text-sm text-slate-500">No skills listed</span>}</div></div>
                <div><p className="text-xs font-black uppercase tracking-widest text-slate-400">Cover note</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{cvCandidate.coverNote || 'No cover note provided.'}</p></div>
              </aside>
            </div>
          </section>
        </div>
      )}

      {shortlistCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyCandidateId) setShortlistCandidate(null); }}>
          <form onSubmit={moveToShortlist} role="dialog" aria-modal="true" aria-labelledby="shortlist-title" className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Shortlist review</p><h3 id="shortlist-title" className="mt-1 text-xl font-black text-slate-900">{shortlistCandidate.shortlisted ? `Notify ${shortlistCandidate.fullName}` : `Add ${shortlistCandidate.fullName}`}</h3><p className="mt-1 text-sm text-slate-500">{shortlistCandidate.shortlisted ? 'This candidate is already saved. Send the one-time shortlist notification.' : 'This candidate will be saved to your employer shortlist and notified.'}</p></div><button type="button" onClick={() => setShortlistCandidate(null)} aria-label="Close shortlist review" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="font-bold text-slate-900">{shortlistCandidate.headline}</p><p className="mt-1 text-sm text-slate-600">{shortlistCandidate.preferredDepartment} · {shortlistCandidate.experience}</p><div className="mt-3 flex flex-wrap gap-1.5">{(shortlistCandidate.keySkills || []).map((skill) => <span key={skill} className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-bold text-blue-700">{skill}</span>)}</div></div>
            <label className="block space-y-1.5 text-sm font-bold text-slate-700">Internal note <span className="font-normal text-slate-500">(optional)</span><textarea value={shortlistNotes} onChange={(event) => setShortlistNotes(event.target.value)} rows={3} maxLength={1000} placeholder="Add a reason, follow-up reminder, or hiring-team note." className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 font-medium outline-none focus:border-emerald-600" /></label>
            {shortlistError && <p role="alert" className="text-sm font-semibold text-red-600">{shortlistError}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShortlistCandidate(null)} disabled={busyCandidateId === shortlistCandidate.id} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button><button type="submit" disabled={busyCandidateId === shortlistCandidate.id} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busyCandidateId === shortlistCandidate.id && <Loader2 className="h-4 w-4 animate-spin" />}{busyCandidateId === shortlistCandidate.id ? 'Saving...' : shortlistCandidate.shortlisted ? 'Send notification' : 'Shortlist & notify'}</button></div>
          </form>
        </div>
      )}

      {inviteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInviteCandidate(null); }}>
          <form onSubmit={inviteToApply} role="dialog" aria-modal="true" aria-labelledby="invite-title" className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Candidate invitation</p><h3 id="invite-title" className="mt-1 text-xl font-black text-slate-900">Invite {inviteCandidate.fullName}</h3></div>
              <button type="button" onClick={() => setInviteCandidate(null)} aria-label="Close invitation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            {jobs.length ? <>
              <label className="block space-y-1.5 text-sm font-bold text-slate-700">Published job
                <select value={inviteJobId} onChange={(event) => setInviteJobId(event.target.value)} required className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-medium outline-none focus:border-blue-500">
                  {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-bold text-slate-700">Invitation message
                <textarea value={inviteMessage} onChange={(event) => setInviteMessage(event.target.value)} rows={4} maxLength={2000} className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 font-medium outline-none focus:border-blue-500" />
              </label>
            </> : <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Publish a job first to invite candidates.</p>}
            {inviteError && <p role="alert" className="text-sm font-semibold text-red-600">{inviteError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setInviteCandidate(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
              <button type="submit" disabled={!jobs.length || sendingInvite || !inviteJobId} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{sendingInvite && <Loader2 className="h-4 w-4 animate-spin" />}{sendingInvite ? 'Sending...' : 'Send invitation'}</button>
            </div>
          </form>
        </div>
      )}

      {activityCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCandidateActivity(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="activity-title" className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Candidate record</p><h3 id="activity-title" className="mt-1 text-xl font-black text-slate-900">{activityCandidate.fullName}</h3><p className="text-sm text-slate-500">Invitations and employer-seeker messages</p></div>
              <button type="button" onClick={closeCandidateActivity} aria-label="Close candidate activity" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-6 overflow-y-auto p-5">
              {activityLoading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading candidate activity...</div> : <>
                {activityError && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{activityError}<button type="button" onClick={() => openCandidateActivity(activityCandidate)} className="ml-2 underline">Retry</button></div>}
                <section>
                  <h4 className="mb-3 font-black text-slate-900">Invitations sent</h4>
                  {activityErrors.invitations ? <p className="text-sm text-red-700">Unable to load invitations.</p> : activity.invitations.length ? <div className="space-y-2">{activity.invitations.map((invitation) => <article key={invitation.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-slate-800">{invitation.jobTitle}</p><span className="text-xs text-slate-500">{invitation.sentAt ? new Date(invitation.sentAt).toLocaleString() : ''} · {invitation.status}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{invitation.message}</p></article>)}</div> : <p className="text-sm text-slate-500">No invitations have been sent to this candidate.</p>}
                </section>
                <section>
                  <h4 className="mb-3 font-black text-slate-900">Messages</h4>
                  {activityErrors.conversations ? <p className="text-sm text-red-700">Unable to load messages.</p> : activity.conversations.length ? <div className="space-y-4">{activity.conversations.map((conversation) => <article key={conversation.conversationId} className="rounded-xl border border-slate-200 p-4"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{conversation.jobTitle || 'Candidate conversation'}</p><div className="space-y-3">{conversation.messages.map((message) => <div key={message.id} className={`max-w-[90%] rounded-xl px-3 py-2 ${Number(message.senderId) === Number(conversation.employerId) ? 'ml-auto bg-blue-50 text-slate-800' : 'bg-slate-100 text-slate-800'}`}><p className="whitespace-pre-wrap text-sm">{message.message}</p><p className="mt-1 text-right text-[11px] text-slate-500">{Number(message.senderId) === Number(conversation.employerId) ? 'You' : activityCandidate.fullName} · {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}</p></div>)}</div></article>)}</div> : <p className="text-sm text-slate-500">No message conversation yet. Sent invitation messages are listed above.</p>}
                </section>
              </>}
            </div>
            <div className="flex justify-end border-t border-slate-200 p-4"><button type="button" onClick={closeCandidateActivity} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Close</button></div>
          </section>
        </div>
      )}
    </section>
  );
}
