import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Building2, Briefcase, Users, UserCheck, Calendar, CheckCircle2,
  XCircle, Search, Plus, Edit3, Trash2, PauseCircle, PlayCircle,
  Download, Moon, Sun, Sparkles, Eye, X, Loader2
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const EmployerDashboard = () => {
  const navigate = useNavigate();

  // 1. User & Auth State
  const [user] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const token = localStorage.getItem('token');

  // 2. Dashboard UI States
  const [activeTab, setActiveTab] = useState('overview');
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // 3. Company Profile State
  const [companyProfile, setCompanyProfile] = useState({
    name: user?.full_name || 'TechSolve Ethiopia',
    industry: 'Software & AI Development',
    location: 'Addis Ababa, Ethiopia',
    website: 'https://techsolve.et'
  });
  const [editCompanyMode, setEditCompanyMode] = useState(false);

  // Mock Fallback Data
  const defaultJobs = [
    {
      id: 1,
      title: 'Senior React Developer',
      category: 'Software Development',
      location: 'Addis Ababa',
      salary: '$1,500/mo',
      status: 'active',
      applicantsCount: 12,
      created_at: '2026-07-28'
    },
    {
      id: 2,
      title: 'Full Stack Node.js Engineer',
      category: 'Software Development',
      location: 'Remote',
      salary: 'Negotiable',
      status: 'active',
      applicantsCount: 8,
      created_at: '2026-08-01'
    }
  ];

  const defaultApplicants = [
    {
      id: 'app-1',
      name: 'Kaleab Tadesse',
      email: 'kaleab@example.com',
      jobTitle: 'Senior React Developer',
      matchScore: 94,
      status: 'Shortlisted',
      skills: ['React', 'JavaScript', 'Tailwind CSS', 'Redux'],
      resumeUrl: '/uploads/kaleab_cv.pdf'
    },
    {
      id: 'app-2',
      name: 'Bethlehem Worku',
      email: 'bethlehem@example.com',
      jobTitle: 'Full Stack Node.js Engineer',
      matchScore: 82,
      status: 'Under Review',
      skills: ['Node.js', 'Express', 'React', 'MongoDB'],
      resumeUrl: '/uploads/bethlehem_cv.pdf'
    }
  ];

  // 4. Job Posts State
  const [jobs, setJobs] = useState([]);

  // 5. Applicants State
  const [applicants, setApplicants] = useState([]);

  // Modals State
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);

  // New Job Form State
  const [newJob, setNewJob] = useState({
    title: '',
    category: 'Software Development',
    location: '',
    salary: '',
    required_skills: '',
    description: ''
  });

  // Headers config for Auth
  const authHeader = {
    headers: { Authorization: `Bearer ${token}` }
  };

  // Protect Route & Initial Data Fetching
  useEffect(() => {
    if (!token || !user || (user.role && user.role.toLowerCase() !== 'employer')) {
      // Fallback local testing behavior or navigate
      // navigate('/login?redirect=employer-dashboard');
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [jobsRes, applicantsRes] = await Promise.all([
          axios.get(`${API_BASE}/jobs/employer`, authHeader).catch(() => ({ data: null })),
          axios.get(`${API_BASE}/applicants/employer`, authHeader).catch(() => ({ data: null }))
        ]);

        if (jobsRes.data && jobsRes.data.length > 0) {
          setJobs(jobsRes.data);
        } else {
          setJobs(defaultJobs);
        }

        if (applicantsRes.data && applicantsRes.data.length > 0) {
          setApplicants(applicantsRes.data);
        } else {
          setApplicants(defaultApplicants);
        }
      } catch (err) {
        console.error("Data fetching error:", err);
        setJobs(defaultJobs);
        setApplicants(defaultApplicants);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, user]);

  // Dynamic Dashboard Stats
  const stats = {
    totalJobs: jobs.length,
    totalApplicants: applicants.length,
    interviews: applicants.filter(a => a.status === 'Interview Scheduled').length,
    hired: applicants.filter(a => a.status === 'Hired').length
  };

  // Job Actions
  const toggleJobStatus = async (id) => {
    const jobToUpdate = jobs.find(j => j.id === id);
    if (!jobToUpdate) return;
    const newStatus = jobToUpdate.status === 'active' ? 'paused' : 'active';
    
    setJobs(jobs.map(j => j.id === id ? { ...j, status: newStatus } : j));

    try {
      await axios.patch(`${API_BASE}/jobs/${id}/status`, { status: newStatus }, authHeader);
    } catch {
      // Retain optimistic state update
    }
  };

  const deleteJob = async (id) => {
    if (window.confirm('Are you sure you want to delete this job post?')) {
      setJobs(jobs.filter(j => j.id !== id));
      try {
        await axios.delete(`${API_BASE}/jobs/${id}`, authHeader);
      } catch {
        // Retain local update
      }
    }
  };

  // Create Job Handler
  const handleCreateJob = async (e) => {
    e.preventDefault();
    const fallbackJob = {
      id: Date.now(),
      ...newJob,
      status: 'active',
      applicantsCount: 0,
      created_at: new Date().toISOString().split('T')[0]
    };

    try {
      const res = await axios.post(`${API_BASE}/jobs`, newJob, authHeader);
      const createdJob = res.data || fallbackJob;
      setJobs([createdJob, ...jobs]);
    } catch {
      setJobs([fallbackJob, ...jobs]);
    } finally {
      setShowJobModal(false);
      setNewJob({ title: '', category: 'Software Development', location: '', salary: '', required_skills: '', description: '' });
    }
  };

  // Candidate Status Update
  const updateCandidateStatus = async (applicantId, newStatus) => {
    setApplicants(applicants.map(a => a.id === applicantId ? { ...a, status: newStatus } : a));
    if (selectedApplicant && selectedApplicant.id === applicantId) {
      setSelectedApplicant({ ...selectedApplicant, status: newStatus });
    }

    try {
      await axios.patch(`${API_BASE}/applicants/${applicantId}`, { status: newStatus }, authHeader);
    } catch (err) {
      console.warn("Backend update skipped or failed:", err);
    }
  };

  // Safe Filter Applicants
  const filteredApplicants = applicants
    .filter(a => 
      (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (a.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(a => statusFilter === 'all' ? true : (a.status || '').toLowerCase() === statusFilter.toLowerCase());

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Top Header */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              ES
            </div>
            <div>
              <span className="font-bold text-base block leading-tight">EthioSolve AI</span>
              <span className="text-[10px] text-blue-500 font-semibold tracking-wider uppercase">Employer Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition">
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            <button 
              onClick={() => setShowJobModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Post New Job
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Company Banner & Profile Edit */}
        <div className={`p-6 rounded-3xl border shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 text-white flex items-center justify-center font-bold text-2xl border border-slate-700">
                <Building2 className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                {editCompanyMode ? (
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      value={companyProfile.name} 
                      onChange={(e) => setCompanyProfile({...companyProfile, name: e.target.value})} 
                      className="px-2 py-1 border rounded-lg text-sm font-bold dark:bg-slate-800"
                    />
                    <input 
                      type="text" 
                      value={companyProfile.industry} 
                      onChange={(e) => setCompanyProfile({...companyProfile, industry: e.target.value})} 
                      className="px-2 py-1 border rounded-lg text-xs block dark:bg-slate-800"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold">{companyProfile.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{companyProfile.industry} • {companyProfile.location}</p>
                  </>
                )}
              </div>
            </div>

            <button 
              onClick={() => setEditCompanyMode(!editCompanyMode)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-200 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" /> {editCompanyMode ? 'Save Profile' : 'Edit Company Info'}
            </button>
          </div>
        </div>

        {/* Dynamic Analytics Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Jobs Posted', value: stats.totalJobs, icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
            { label: 'Total Applicants', value: stats.totalApplicants, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
            { label: 'Interviews Scheduled', value: stats.interviews, icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/40' },
            { label: 'Hired Candidates', value: stats.hired, icon: UserCheck, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' }
          ].map((s, idx) => (
            <div key={idx} className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div>
                <span className="text-xs font-medium text-slate-400 block mb-1">{s.label}</span>
                <span className="text-2xl font-bold">{s.value}</span>
              </div>
              <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-slate-200/60 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
          {[
            { id: 'overview', label: 'AI Applicants Ranking' },
            { id: 'jobs', label: 'Manage Job Listings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* TAB 1: AI APPLICANTS RANKING TABLE */}
            {activeTab === 'overview' && (
              <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                
                {/* Search & Filter Header */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search applicants by name or position..."
                      className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs outline-none ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`px-4 py-2.5 rounded-2xl border text-xs outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="all">All Statuses</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Interview Scheduled">Interview Scheduled</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Applicants Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Candidate</th>
                        <th className="py-3 px-4">Applied Job</th>
                        <th className="py-3 px-4">AI Match Score</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {filteredApplicants.length > 0 ? (
                        filteredApplicants.map(applicant => (
                          <tr key={applicant.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                            <td className="py-3.5 px-4 font-semibold">
                              <div>
                                <p className="font-bold">{applicant.name}</p>
                                <span className="text-[10px] text-slate-400">{applicant.email}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">{applicant.jobTitle}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-fit ${
                                applicant.matchScore >= 90 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                applicant.matchScore >= 75 ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                <Sparkles className="w-3 h-3" /> {applicant.matchScore}% Match
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {applicant.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              <button 
                                onClick={() => setSelectedApplicant(applicant)}
                                className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => updateCandidateStatus(applicant.id, 'Shortlisted')}
                                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer"
                                title="Shortlist"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => updateCandidateStatus(applicant.id, 'Rejected')}
                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 hover:bg-red-100 transition cursor-pointer"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-6 text-slate-400">
                            No applicants found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* TAB 2: MANAGE JOBS */}
            {activeTab === 'jobs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map(job => (
                  <div key={job.id} className={`p-6 rounded-3xl border shadow-sm space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-base">{job.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{job.category} • {job.location}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${job.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {job.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>Applicants: <strong>{job.applicantsCount || 0}</strong></span>
                      <span>Posted: <strong>{job.created_at}</strong></span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        onClick={() => toggleJobStatus(job.id)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {job.status === 'active' ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                        {job.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                      <button 
                        onClick={() => deleteJob(job.id)}
                        className="p-2 rounded-xl bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1 hover:bg-red-100 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      {/* MODAL 1: CANDIDATE PROFILE VIEWER */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setSelectedApplicant(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center text-lg">
                {selectedApplicant.name?.charAt(0) || 'A'}
              </div>
              <div>
                <h3 className="font-bold text-lg">{selectedApplicant.name}</h3>
                <p className="text-xs text-slate-400">{selectedApplicant.email}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs">
              <span>AI Skill Match Score:</span>
              <span className="font-extrabold text-blue-600 text-sm">{selectedApplicant.matchScore}%</span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Skills Extracted</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedApplicant.skills?.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <a 
                href={`${API_BASE}${selectedApplicant.resumeUrl}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download CV
              </a>
              <button 
                onClick={() => updateCandidateStatus(selectedApplicant.id, 'Interview Scheduled')}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-blue-700 cursor-pointer"
              >
                <Calendar className="w-4 h-4" /> Schedule Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE JOB POST */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setShowJobModal(false)} className="absolute top-4 right-4 text-slate-400 cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg mb-4">Post a New Job Opportunity</h3>

            <form onSubmit={handleCreateJob} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Job Title</label>
                <input 
                  type="text" 
                  required
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  placeholder="e.g. Senior React Developer" 
                  className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Required Skills (Comma separated for AI Engine)</label>
                <input 
                  type="text" 
                  required
                  value={newJob.required_skills}
                  onChange={(e) => setNewJob({ ...newJob, required_skills: e.target.value })}
                  placeholder="React, Node.js, Express, MySQL" 
                  className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Location</label>
                  <input 
                    type="text" 
                    required
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    placeholder="Addis Ababa / Remote" 
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Salary Range</label>
                  <input 
                    type="text" 
                    value={newJob.salary}
                    onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                    placeholder="Negotiable" 
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Description</label>
                <textarea 
                  rows="3" 
                  required
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  placeholder="Describe responsibilities and requirements..." 
                  className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none"
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition mt-2 cursor-pointer"
              >
                Publish Job Listing
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployerDashboard;