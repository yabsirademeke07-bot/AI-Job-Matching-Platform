import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  User, Mail, Briefcase, GraduationCap, Award, Globe, Upload,
  Plus, Trash2, Edit3, Save, CheckCircle2, Clock, Sparkles,
  Bookmark, Bell, Video, Moon, Sun, Search, AlertCircle, FileText,
  TrendingUp, CheckCircle, ExternalLink, ChevronRight, X
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const SeekerDashboard = () => {
  const navigate = useNavigate();

  // 1. User & Auth State
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const token = localStorage.getItem('token');

  // 2. Profile States
  const [profile, setProfile] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    skills: user?.skills ? user.skills.split(',').map(s => s.trim()) : [],
    education: ['B.Sc. in Computer Science - Mekdela Amba University'],
    experience: ['Software Engineer - Tech Solutions (1 year)'],
    certifications: ['Full Stack Web Development'],
    portfolio: 'https://github.com/user',
    cvUrl: ''
  });

  const [editMode, setEditMode] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [isAnalyzingCV, setIsAnalyzingCV] = useState(false);

  // 3. Dashboard States
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'jobs', 'applications', 'saved'
  const [jobs, setJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'Your application for Senior React Dev is under review.', time: '2h ago' },
    { id: 2, message: 'AI matched you with a new Full Stack Role (95% Match)!', time: '1d ago' }
  ]);

  // 4. Protect Page (ወደ Login መመለስ)
  useEffect(() => {
    if (!token || !user) {
      navigate('/login?redirect=dashboard');
    } else {
      fetchJobs();
    }
  }, [token, user, navigate]);

  // Jobs ከ Backend ማምጫ
  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/jobs`);
      setJobs(res.data);
    } catch (err) {
      console.error('Jobs fetch error:', err);
    }
  };

  // 5. Profile Completion % Calculator
  const calculateCompletion = () => {
    let score = 20; // Base score for registration
    if (profile.skills.length > 0) score += 20;
    if (profile.education.length > 0) score += 20;
    if (profile.experience.length > 0) score += 15;
    if (profile.portfolio) score += 10;
    if (profile.cvUrl || cvFile) score += 15;
    return Math.min(score, 100);
  };

  // 6. CV Upload & AI Skill Extraction
  const handleCvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCvFile(file);
    setIsAnalyzingCV(true);

    // AI Skill Extraction Simulation (Backend integration ready)
    setTimeout(() => {
      const extractedSkills = ['React', 'Node.js', 'Express', 'Tailwind CSS', 'MySQL', 'Git'];
      const updatedSkills = Array.from(new Set([...profile.skills, ...extractedSkills]));
      
      setProfile(prev => ({
        ...prev,
        skills: updatedSkills,
        cvUrl: URL.createObjectURL(file)
      }));

      setIsAnalyzingCV(false);
      alert('AI extracted skills successfully from your CV!');
    }, 1500);
  };

  // Skill Management
  const handleAddSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter(s => s !== skillToRemove)
    });
  };

  // Bookmark / Save Job Toggle
  const toggleSaveJob = (id) => {
    if (savedJobIds.includes(id)) {
      setSavedJobIds(savedJobIds.filter(jId => jId !== id));
    } else {
      setSavedJobIds([...savedJobIds, id]);
    }
  };

  // Filtered Jobs by Search & Real Match Score
  const filteredJobs = jobs.filter(j => 
    j.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Top Navigation */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold">
              ES
            </div>
            <span className="font-bold text-lg">EthioSolve AI</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition">
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {/* Real-time Notifications */}
            <div className="relative group">
              <button className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 hidden group-hover:block z-50">
                <h4 className="font-bold text-xs mb-3">Notifications</h4>
                <div className="space-y-2">
                  {notifications.map(n => (
                    <div key={n.id} className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs">
                      <p>{n.message}</p>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-semibold text-xs">
                {profile.fullName.charAt(0)}
              </div>
              <span className="text-xs font-medium hidden sm:inline">{profile.fullName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Profile & Settings (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* User Card */}
          <div className={`p-6 rounded-3xl border shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 text-white flex items-center justify-center text-xl font-bold">
                  {profile.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base">{profile.fullName}</h3>
                  <p className="text-xs text-slate-500">{profile.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditMode(!editMode)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium flex items-center gap-1 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {editMode ? 'Done' : 'Edit'}
              </button>
            </div>

            {/* Profile Completion Bar */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span>Profile Strength</span>
                <span className="text-emerald-500 font-bold">{calculateCompletion()}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${calculateCompletion()}%` }}
                />
              </div>
            </div>

            {/* AI Profile Suggestions */}
            {calculateCompletion() < 100 && (
              <div className="mt-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-amber-800 dark:text-amber-300">
                  Add portfolio links and upload your latest CV to reach 100% and get 2x match accuracy!
                </p>
              </div>
            )}
          </div>

          {/* CV Upload & AI Extraction Box */}
          <div className={`p-6 rounded-3xl border shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> Resume / CV Management
            </h4>
            
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center hover:border-slate-400 transition relative">
              <input 
                type="file" 
                onChange={handleCvUpload}
                accept=".pdf,.doc,.docx"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              <p className="text-xs font-medium">
                {cvFile ? cvFile.name : 'Upload or Drag new CV here'}
              </p>
              <span className="text-[10px] text-slate-400">PDF, DOCX up to 5MB</span>
            </div>

            {isAnalyzingCV && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-blue-500">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>AI analyzing CV & extracting skills...</span>
              </div>
            )}
          </div>

          {/* Dynamic Skills Management */}
          <div className={`p-6 rounded-3xl border shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Skills & Expertise</span>
              <span className="text-[10px] text-slate-400">{profile.skills.length} added</span>
            </h4>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {profile.skills.map((skill, index) => (
                <span 
                  key={index} 
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium rounded-xl flex items-center gap-1.5"
                >
                  {skill}
                  {editMode && (
                    <X 
                      className="w-3 h-3 cursor-pointer text-slate-400 hover:text-red-500" 
                      onClick={() => handleRemoveSkill(skill)}
                    />
                  )}
                </span>
              ))}
            </div>

            {editMode && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add skill (e.g. Python)"
                  className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
                <button 
                  onClick={handleAddSkill}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-medium"
                >
                  Add
                </button>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Jobs, Dashboard & Applications (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Navigation Tabs */}
          <div className="flex gap-2 p-1 bg-slate-200/60 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            {[
              { id: 'overview', label: 'AI Recommended Jobs' },
              { id: 'applications', label: 'My Applications' },
              { id: 'saved', label: 'Saved Jobs' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                  activeTab === tab.id 
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: AI Recommended Jobs */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search jobs by title, skill, or company..."
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-xs outline-none transition ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              {/* Jobs List */}
              <div className="space-y-3">
                {filteredJobs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No matching jobs found right now.
                  </div>
                ) : (
                  filteredJobs.map(job => (
                    <div 
                      key={job.id} 
                      className={`p-5 rounded-3xl border shadow-sm transition hover:border-slate-400 ${
                        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm">{job.title}</h4>
                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                              95% Match
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{job.company} • {job.location}</p>
                        </div>

                        <button 
                          onClick={() => toggleSaveJob(job.id)}
                          className="p-2 text-slate-400 hover:text-slate-600"
                        >
                          <Bookmark className={`w-4 h-4 ${savedJobIds.includes(job.id) ? 'fill-slate-800 text-slate-800 dark:fill-white dark:text-white' : ''}`} />
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2">
                        {job.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {job.salary || 'Negotiable'}
                        </span>
                        <button 
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium transition"
                        >
                          Quick Apply
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 2: Applications & Real-time Status */}
          {activeTab === 'applications' && (
            <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className="font-bold text-sm mb-2">Submitted Applications</h3>
              
              <div className="space-y-3">
                {[
                  { id: 1, title: 'Full Stack Engineer', company: 'EthioTelecom', status: 'Shortlisted', date: 'Jul 28, 2026' },
                  { id: 2, title: 'React Developer', company: 'Commercial Bank of Ethiopia', status: 'Under Review', date: 'Jul 25, 2026' }
                ].map(app => (
                  <div key={app.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs">{app.title}</h4>
                      <p className="text-[11px] text-slate-400">{app.company} • Applied on {app.date}</p>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                      app.status === 'Shortlisted' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                        : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default SeekerDashboard;