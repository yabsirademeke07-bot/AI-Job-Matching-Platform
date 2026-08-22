import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, FileText, Target, Search, Bookmark,
  ClipboardList, Brain, Mic, Bell, Settings, LogOut, Sparkles, CheckCircle2,
  AlertTriangle, MapPin, Briefcase, DollarSign, Send, Globe, Menu, X, Lightbulb
} from 'lucide-react';
import heroBannerImg from '../assets/hero.png';

// የተስተካከለ Import Path (ከ pages ፎልደር ወጥቶ ወደ components/seeker ይሄዳል)
import CvAnalysisPage from '../components/seeker/CvAnalysis';

export default function SeekerDashboard() {
  const [language, setLanguage] = useState('EN'); // 'EN' or 'AM'
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => location.state?.activeTab || 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const [chatHistory, setChatHistory] = useState([
    { 
      sender: 'ai', 
      text: language === 'EN' 
        ? "Hello Abebe! I'm your AI Career Assistant. How can I help you today?" 
        : "ሰላም አበበ! እኔ የሥራ አጋር የ AI ረዳትዎ ነኝ። ዛሬ እንዴት ልረዳዎት?" 
    }
  ]);

  // User Profile & Stats Data
  const user = {
    name: "Abebe Bikila",
    title: "Full Stack React / Node.js Developer",
    location: "Addis Ababa, Ethiopia",
    preferredLocation: "Addis Ababa + Remote",
    profileCompletion: 85,
    cvScore: 82,
    cvStatus: "Analyzed ✓",
    cvAnalysisDate: "Aug 05, 2026",
    expectedSalary: "25,000 - 35,000 ETB",
    employmentType: ["Full-time", "Contract"]
  };

  // AI Recommended Jobs
  const recommendedJobs = [
    {
      id: 1,
      title: "Senior React & Node.js Developer",
      company: "YeneTech Solutions",
      location: "Addis Ababa (Bole)",
      workMode: "Hybrid",
      salary: "30,000 - 40,000 ETB",
      type: "Full-time",
      matchScore: 94,
      skillsBreakdown: { skills: 95, experience: 90, location: 100, salary: 90 },
      whyMatch: [
        "React.js matches your top skills",
        "2+ years experience meets requirements",
        "Located in Addis Ababa",
        "Salary matches preference"
      ],
      posted: "2 hours ago"
    },
    {
      id: 2,
      title: "Frontend Developer (React / Next.js)",
      company: "EthioTelecom Innovation Lab",
      location: "Addis Ababa",
      workMode: "On-site",
      salary: "28,000 - 35,000 ETB",
      type: "Permanent",
      matchScore: 88,
      skillsBreakdown: { skills: 90, experience: 85, location: 100, salary: 85 },
      whyMatch: [
        "Matches 8 out of 9 required skills",
        "Preferred employment type matches"
      ],
      posted: "1 day ago"
    },
    {
      id: 3,
      title: "Full Stack Engineer",
      company: "Kacha Digital Financial",
      location: "Addis Ababa (Hybrid)",
      workMode: "Hybrid",
      salary: "35,000 - 50,000 ETB",
      type: "Full-time",
      matchScore: 91,
      skillsBreakdown: { skills: 92, experience: 88, location: 95, salary: 90 },
      whyMatch: [
        "Your Node.js and MongoDB skills are a strong match",
        "Hybrid work fits your preferred location",
        "Salary is within your preferred range"
      ],
      posted: "3 hours ago"
    }
  ];

  // Skill Gap Data
  const skillGapData = {
    userSkills: ["React.js", "JavaScript", "Node.js", "MongoDB", "Tailwind CSS"],
    missingSkills: [
      { name: "TypeScript", demand: "High (High Demand in 14 jobs)", impact: "+8% match" },
      { name: "Docker", demand: "Medium (Used in DevOps teams)", impact: "+5% match" }
    ]
  };

  // Application Tracking
  const defaultApplications = [
    { company: "Gebeya Inc.", position: "Frontend Engineer", status: "Shortlisted", date: "Aug 02, 2026", step: 3 },
    { company: "Kacha Digital Financial", position: "Full Stack Dev", status: "Under Review", date: "Jul 28, 2026", step: 2 }
  ];
  const applications = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mockApplications') || '[]');
      return [...saved, ...defaultApplications];
    } catch {
      return defaultApplications;
    }
  })();

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!aiMessage.trim()) return;

    const newHistory = [...chatHistory, { sender: 'user', text: aiMessage }];
    setChatHistory(newHistory);
    setAiMessage('');

    setTimeout(() => {
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'ai',
          text: language === 'EN'
            ? "I found 3 high-matching React jobs in Addis Ababa within your 25,000+ ETB salary range!"
            : "በአዲስ አበባ ውስጥ ከ 25,000 ETB በላይ ደመወዝ ያላቸው 3 ለስራዎ ተስማሚ የሆኑ የ React ስራዎችን አግኝቻለሁ!"
        }
      ]);
    }, 1000);
  };

  return (
    <div className="seeker-dashboard min-h-screen bg-slate-50 text-slate-800 flex font-sans">

      {/* SIDEBAR NAVIGATION */}
      <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="dashboard-sidebar-header p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--brand-border)] shadow-sm shadow-blue-500/10 shrink-0">
              <img src={heroBannerImg} alt="Job Matching" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 leading-none block lowercase">
                job <span className="brand-text">matching</span>
              </span>
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">AI Platform</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-80px)] text-sm font-medium">
          {[{
            id: 'dashboard', path: '/dashboard', label: language === 'EN' ? 'Dashboard' : 'ዳሽቦርድ', icon: LayoutDashboard
          }, {
            id: 'profile', path: '/profile', label: language === 'EN' ? 'My Profile' : 'የግል መረጃ', icon: User
          }, {
            id: 'cv', path: '/cv-analysis', label: language === 'EN' ? 'My CV & Analysis' : 'CV እና AI ትንተና', icon: FileText
          }, {
            id: 'matches', path: '/ai-matches', label: language === 'EN' ? 'AI Job Matches' : 'የተጣጣሙ ስራዎች', icon: Target
          }, {
            id: 'explore', path: '/explore-jobs', label: language === 'EN' ? 'Explore Jobs' : 'ስራዎችን ፈልግ', icon: Search
          }, {
            id: 'saved', path: '/saved-jobs', label: language === 'EN' ? 'Saved Jobs' : 'የተቀመጡ ስራዎች', icon: Bookmark
          }, {
            id: 'applications', path: '/applications', label: language === 'EN' ? 'My Applications' : 'የማመልከቻዎች ሁኔታ', icon: ClipboardList
          }, {
            id: 'skillgap', path: '/skill-gap', label: language === 'EN' ? 'Skill Gap Analysis' : 'የክህሎት ክፍተት ትንተና', icon: Brain
          }, {
            id: 'interview', path: '/interview-prep', label: language === 'EN' ? 'AI Interview Prep' : 'AI የቃለ-መጠይቅ ዝግጅት', icon: Mic
          }, {
            id: 'notifications', path: '/notifications', label: language === 'EN' ? 'Notifications' : 'ማሳወቂያዎች', icon: Bell
          }].map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); navigate(item.path); }}
                className={`dashboard-nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'dashboard-active text-white shadow-lg font-semibold'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-6 mt-6 border-t border-slate-800 space-y-1">
            <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
              <Settings className="w-5 h-5" />
              <span>{language === 'EN' ? 'Settings' : 'ማስተካከያዎች'}</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition">
              <LogOut className="w-5 h-5" />
              <span>{language === 'EN' ? 'Logout' : 'ውጣ'}</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">

        {/* TOP HEADER */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-lg bg-slate-100 text-slate-600">
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative hidden md:block w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'EN' ? "Search jobs, skills, companies..." : "ስራ፣ ክህሎት ወይም ድርጅት ፈልግ..."}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 border-none text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <button
              onClick={() => setLanguage(language === 'EN' ? 'AM' : 'EN')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
            >
              <Globe className="w-4 h-4 text-blue-600" />
              <span>{language === 'EN' ? 'EN | አማርኛ' : 'አማርኛ | EN'}</span>
            </button>

            {/* Notifications Icon */}
            <button className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white" />
            </button>

            {/* User Dropdown Preview */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-600/20"
              />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-slate-800 leading-none">{user.name}</p>
                <p className="text-xs text-slate-500 mt-1">Software Engineer</p>
              </div>
            </div>
          </div>
        </header>

        {/* DASHBOARD MAIN BODY */}
        <main className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
          {activeTab === 'cv' ? (
            /* activeTab 'cv' ሲሆን የ CV Analysis ገጽ ይከፈታል */
            <CvAnalysisPage />
          ) : (
            /* activeTab ሌላ (ለምሳሌ 'dashboard') ሲሆን ዋናው Dashboard ይታያል */
            <>
              {/* WELCOME BANNER & PROFILE COMPLETION */}
              <div className="dashboard-hero rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{language === 'EN' ? 'AI Career Dashboard' : 'የ AI የሥራ እድል ዳሽቦርድ'}</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                      {language === 'EN' ? `Welcome, ${user.name.split(' ')[0]} 👋` : `እንኳን ደህና መጡ፣ ${user.name.split(' ')[0]} 👋`}
                    </h1>
                    <p className="text-slate-300 text-sm max-w-xl">
                      {language === 'EN'
                        ? "Here are your latest job matches based on your profile and CV analysis."
                        : "ከእርስዎ መረጃ እና CV ትንተና በመነሳት የተዘጋጁ የቅርብ ጊዜ የሥራ እድሎች ከዚህ በታች ቀርበዋል።"}
                    </p>
                  </div>

                  {/* Profile Completion & CV Status Card */}
                  <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 md:p-5 rounded-2xl flex items-center gap-6 shrink-0">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-300 font-medium">{language === 'EN' ? 'Profile Completion' : 'የመረጃ ምልአት'}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{user.profileCompletion}%</span>
                        <span className="text-xs text-emerald-400 font-semibold">{language === 'EN' ? 'Complete' : 'ተጠናቋል'}</span>
                      </div>
                      <div className="w-32 bg-slate-700 h-2 rounded-full overflow-hidden mt-1">
                        <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${user.profileCompletion}%` }} />
                      </div>
                      <button onClick={() => navigate('/profile')} className="text-[11px] font-bold text-blue-200 hover:text-white hover:underline">
                        {language === 'EN' ? 'Add your CV' : 'CVዎን ይጨምሩ'}
                      </button>
                    </div>

                    <div className="border-l border-white/20 pl-6 space-y-1">
                      <p className="text-xs text-slate-300 font-medium">{language === 'EN' ? 'AI CV Score' : 'የ CV ነጥብ'}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-blue-400">{user.cvScore}/100</span>
                      </div>
                      <p className="text-[11px] text-emerald-300 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {user.cvStatus}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* STATS OVERVIEW CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { title: language === 'EN' ? 'AI Job Matches' : 'የ AI የተጣጣሙ ስራዎች', count: '14', detail: language === 'EN' ? 'new matches' : 'አዲስ', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', path: '/ai-matches' },
                  { title: language === 'EN' ? 'Applied Jobs' : 'ያመለከቱባቸው ስራዎች', count: '6', detail: language === 'EN' ? 'applications' : 'ማመልከቻዎች', icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/applications' },
                  { title: language === 'EN' ? 'Interviews' : 'ቃለ-መጠይቆች', count: '2', detail: language === 'EN' ? 'scheduled' : 'የተያዙ', icon: Mic, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/interview-prep' },
                  { title: language === 'EN' ? 'Saved Jobs' : 'ያስቀመጧቸው ስራዎች', count: '4', detail: language === 'EN' ? 'saved jobs' : 'የተቀመጡ', icon: Bookmark, color: 'text-amber-600', bg: 'bg-amber-50', path: '/saved-jobs' },
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <button key={idx} onClick={() => navigate(stat.path)} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between text-left hover:border-blue-300 hover:shadow-md transition">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{stat.count}</p>
                        <p className="text-xs text-slate-400 mt-1">{stat.detail}</p>
                      </div>
                      <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* MAIN CONTENT LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN */}
                <div className="lg:col-span-2 space-y-8">

                  {/* RECOMMENDED JOBS SECTION */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-bold text-slate-900">
                          {language === 'EN' ? 'Recommended For You' : 'ለእርስዎ የተመከሩ ስራዎች'}
                        </h2>
                      </div>
                      <button onClick={() => navigate('/ai-matches')} className="text-xs font-bold text-blue-600 hover:underline">
                        {language === 'EN' ? 'View All Matches' : 'ሁሉንም ተመልከት'}
                      </button>
                    </div>

                    {/* Job Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {recommendedJobs.filter((job) => job.matchScore > 90).map((job) => (
                        <div key={job.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:border-blue-500/50 hover:shadow-md transition-all space-y-4">
                          
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-700 text-lg border border-slate-200 shrink-0">
                                {job.company.charAt(0)}
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-slate-900 hover:text-blue-600 transition cursor-pointer">{job.title}</h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">{job.company}</p>
                              </div>
                            </div>

                            <div className="bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0">
                              <Target className="w-4 h-4 text-emerald-600" />
                              <span className="text-xs font-black text-emerald-700">{job.matchScore}% Match</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                            <span className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}
                            </span>
                            <span className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg">
                              <DollarSign className="w-3.5 h-3.5 text-slate-400" /> {job.salary}
                            </span>
                            <span className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg">
                              <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {job.workMode}
                            </span>
                          </div>

                          <div className="bg-blue-50/70 border border-blue-100 p-3.5 rounded-xl space-y-1.5">
                            <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                              <Lightbulb className="w-4 h-4 text-blue-600" />
                              {language === 'EN' ? 'Why this job matches you:' : 'ይህ ስራ ለእርስዎ የመረጠበት ምክንያት:'}
                            </p>
                            <ul className="text-xs text-slate-600 space-y-1 pl-5 list-disc">
                              {job.whyMatch.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <span className="text-slate-400 font-medium">Posted {job.posted}</span>
                            <div className="flex gap-3">
                              <button className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 transition">
                                {language === 'EN' ? 'Save' : 'አስቀምጥ'}
                              </button>
                              <button onClick={() => navigate('/explore-jobs')} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm">
                                {language === 'EN' ? 'Quick Apply' : 'በፍጥነት አመልክት'}
                              </button>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>

                  {/* APPLICATIONS TRACKING SECTION */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900">
                        {language === 'EN' ? 'Active Applications Tracking' : 'የማመልከቻዎች ወቅታዊ ሁኔታ'}
                      </h3>
                      <button className="text-xs font-bold text-blue-600 hover:underline">
                        {language === 'EN' ? 'View All' : 'ሁሉንም ተመልከት'}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {applications.map((app, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{app.position}</p>
                              <p className="text-xs text-slate-500">{app.company} • Applied on {app.date}</p>
                            </div>
                            <span className="text-xs font-extrabold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                              {app.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-5 gap-1.5 pt-2">
                            {['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Offer'].map((stepName, sIdx) => (
                              <div key={sIdx} className="space-y-1">
                                <div className={`h-1.5 rounded-full ${sIdx < app.step ? 'bg-blue-600' : 'bg-slate-200'}`} />
                                <p className="text-[10px] text-center font-medium text-slate-400 hidden sm:block">{stepName}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-8">

                  {/* AI SKILL GAP ANALYSIS CARD */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-base font-bold text-slate-900">
                        {language === 'EN' ? 'AI Skill Gap Analysis' : 'የክህሎት ክፍተት ትንተና'}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {language === 'EN'
                        ? "Adding these missing skills can increase your eligibility for 14 new recommended jobs."
                        : "እነዚህን ክፍተቶች በመሙላት ተጨማሪ 14 አዳዲስ የሥራ እድሎችን ማግኘት ይችላሉ።"}
                    </p>

                    <div className="space-y-3">
                      {skillGapData.missingSkills.map((skill, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/50 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> {skill.name}
                            </span>
                            <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                              {skill.impact}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800/80 pl-5">{skill.demand}</p>
                        </div>
                      ))}
                    </div>

                    <button className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition">
                      {language === 'EN' ? 'Explore Skill Courses' : 'የክህሎት ማሻሻያዎችን ተመልከት'}
                    </button>
                  </div>

                  {/* AI INTERVIEW PREPARATION PROMPT */}
                  <div className="bg-gradient-to-tr from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
                    <div className="flex items-center gap-2">
                      <Mic className="w-5 h-5 text-blue-400" />
                      <h3 className="text-base font-bold">{language === 'EN' ? 'Mock AI Interview' : 'የ AI ቃለ-መጠይቅ ልምምድ'}</h3>
                    </div>
                    <p className="text-xs text-slate-300">
                      {language === 'EN'
                        ? "Practice role-specific interview questions and get real-time AI feedback."
                        : "ለስራው የሚሆኑ ጥያቄዎችን በመለማመድ ከ AI ፈጣን አስተያየት ያግኙ።"}
                    </p>
                    <button className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md">
                      {language === 'EN' ? 'Start Mock Interview' : 'ልምምድ ጀምር'}
                    </button>
                  </div>

                  {/* AI CAREER ASSISTANT CHAT WIDGET */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-80">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-800">AI Career Assistant</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs">
                      {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`p-3 rounded-2xl max-w-[85%] ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 flex gap-2">
                      <input
                        type="text"
                        value={aiMessage}
                        onChange={(e) => setAiMessage(e.target.value)}
                        placeholder={language === 'EN' ? "Ask AI for advice..." : "AI ረዳቱን ይጠይቁ..."}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-100 text-xs border-none outline-none"
                      />
                      <button type="submit" className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition">
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>

                </div>

              </div>
            </>
          )}
        </main>
      </div>

    </div>
  );
}
