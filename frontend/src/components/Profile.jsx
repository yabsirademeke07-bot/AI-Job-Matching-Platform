import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, Mail, Phone, GraduationCap, 
  Briefcase, Plus, Trash2, Award, Languages, Link as LinkIcon, 
  Target, CheckCircle2, Sparkles, X, Globe, Save, Check, ArrowRight
} from 'lucide-react';
import { getApplicationJobId } from '../utils/applicationFlow';
import skyscraperImage from '../pages/images/image.png';

const countryOptions = ['Ethiopia', 'Kenya', 'Rwanda', 'Tanzania', 'Uganda', 'South Africa', 'United States', 'United Kingdom', 'Canada', 'Other'];
const cityOptionsByCountry = {
  Ethiopia: ['Addis Ababa', 'Bahir Dar', 'Hawassa', 'Mekelle', 'Dire Dawa', 'Adama', 'Gondar', 'Jimma', 'Dessie', 'Jijiga'],
  Kenya: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'],
  Rwanda: ['Kigali', 'Butare', 'Gisenyi'],
  Tanzania: ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma'],
  Uganda: ['Kampala', 'Entebbe', 'Jinja', 'Mbarara'],
  'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Washington, D.C.'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Liverpool'],
  Canada: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa'],
  Other: ['Other'],
};
const fieldClass = 'h-12 w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15';
const labelClass = 'mb-2 block text-sm font-bold text-slate-800';

const Profile = ({ userData = {}, cvFile = null }) => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const [searchParams] = useSearchParams();
  const applicationJobId = searchParams.get('jobId') || getApplicationJobId();

  // Helper to retrieve persisted profile or user state
  const getInitialState = () => {
    try {
      const savedProfile = JSON.parse(localStorage.getItem('userProfile') || 'null');
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');

      return { savedProfile, savedUser };
    } catch {
      return { savedProfile: null, savedUser: {} };
    }
  };

  const { savedProfile, savedUser } = getInitialState();

  // Dynamic Lists State
  const [educationList, setEducationList] = useState(
    savedProfile?.education || []
  );

  const [experienceList, setExperienceList] = useState(
    savedProfile?.experience || []
  );

  const [skills, setSkills] = useState(savedProfile?.skills || []);
  const [newSkill, setNewSkill] = useState('');

  const [languages, setLanguages] = useState(savedProfile?.languages || []);
  const [newLang, setNewLang] = useState('');

  const [isSaved, setIsSaved] = useState(false);

  // Personal Profile Data State
  const [profileData, setProfileData] = useState({
    firstName: savedProfile?.firstName || userData?.firstName || savedUser?.full_name?.split(' ')[0] || '',
    lastName: savedProfile?.lastName || userData?.lastName || savedUser?.full_name?.split(' ')[1] || '',
    email: savedProfile?.email || userData?.email || savedUser?.email || '',
    phone: savedProfile?.phone || savedUser?.phone || '',
    dob: savedProfile?.dob || '',
    gender: savedProfile?.gender || '',
    country: savedProfile?.country || 'Ethiopia',
    city: savedProfile?.city || '',
    github: savedProfile?.github || '',
    linkedin: savedProfile?.linkedin || '',
    portfolio: savedProfile?.portfolio || '',
    jobCategory: savedProfile?.jobCategory || '',
    preferredJob: savedProfile?.preferredJob || userData?.preferredJob || '',
    employmentType: savedProfile?.employmentType || '',
    salaryExpectation: savedProfile?.salaryExpectation || userData?.salaryExpectation || '',
    preferredCity: savedProfile?.preferredCity || '',
    preferredWorkSetup: savedProfile?.preferredWorkSetup || ''
  });

  // Calculate profile completion dynamically
  const completionPercentage = useMemo(() => {
    const fields = [
      profileData.firstName,
      profileData.lastName,
      profileData.email,
      profileData.phone,
      profileData.country,
      profileData.city,
      profileData.github,
      profileData.preferredJob,
      skills.length > 0,
      educationList.length > 0,
      experienceList.length > 0,
      languages.length > 0
    ];

    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [profileData, skills, educationList, experienceList, languages]);

  // Handlers for Education
  const handleAddEducation = () => {
    setEducationList([
      ...educationList,
      { id: Date.now(), university: '', degree: '', department: '', graduationYear: '' }
    ]);
  };

  const handleEducationChange = (id, field, value) => {
    setEducationList(educationList.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveEducation = (id) => {
    setEducationList(educationList.filter((item) => item.id !== id));
  };

  // Handlers for Experience
  const handleAddExperience = () => {
    setExperienceList([
      ...experienceList,
      { id: Date.now(), company: '', position: '', startDate: '', endDate: '', responsibilities: '' }
    ]);
  };

  const handleExperienceChange = (id, field, value) => {
    setExperienceList(experienceList.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveExperience = (id) => {
    setExperienceList(experienceList.filter((item) => item.id !== id));
  };

  // Handlers for Skills & Languages
  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleAddLanguage = () => {
    if (newLang.trim() && !languages.includes(newLang.trim())) {
      setLanguages([...languages, newLang.trim()]);
      setNewLang('');
    }
  };

  const handleRemoveLanguage = (langToRemove) => {
    setLanguages(languages.filter((lang) => lang !== langToRemove));
  };

  // Profile Save Handler
  const handleSaveProfile = async (redirect = false) => {
    const fullProfile = {
      ...profileData,
      education: educationList,
      experience: experienceList,
      skills,
      languages,
      completionPercentage
    };
    
    localStorage.setItem('userProfile', JSON.stringify(fullProfile));
    const token = localStorage.getItem('token');
    if (token) {
      const response = await fetch('/api/seeker/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(fullProfile),
      });
      if (!response.ok) return;
    }
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({
      ...currentUser,
      onboardingProfileCompleted: completionPercentage >= 80,
      profileComplete: completionPercentage >= 80,
    }));
    setIsSaved(true);

    setTimeout(() => {
      setIsSaved(false);
      if (redirect) navigate(location.state?.onboarding ? '/seeker/dashboard' : applicationJobId ? `/job-details/${applicationJobId}` : '/seeker/dashboard');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#eef5f9] text-slate-900 lg:flex lg:h-screen lg:overflow-hidden">
      <section className="relative flex min-h-[360px] w-full items-end overflow-hidden bg-slate-950 lg:h-screen lg:w-1/2 lg:items-end">
        <img src={skyscraperImage} alt="Modern skyscrapers" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-blue-950/45 to-transparent" />
        <div className="relative z-10 w-full p-7 sm:p-10 lg:p-12">
          <div className="mb-10 flex items-center gap-3 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md"><Sparkles className="h-5 w-5" /></div>
            <div><p className="text-lg font-black tracking-tight">SmartRecruit AI</p><p className="text-xs font-medium text-blue-100/75">Build the profile your next opportunity can find.</p></div>
          </div>
          <div className="max-w-lg">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Your career, intelligently matched</p>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl">AI-driven career matching.</h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-200 sm:text-base">A complete profile gives our matching engine the signal it needs to connect you with work that fits.</p>
          </div>
          <div className="mt-8 max-w-md rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/20 text-cyan-100"><Target className="h-5 w-5" /></div><div><p className="text-sm font-black text-white">AI-Driven Career Matching</p><p className="mt-1 text-xs leading-5 text-blue-100/80">Skills, experience, education, and goals come together in one professional profile.</p></div></div>
            <div className="mt-5 flex items-center gap-3 border-t border-white/15 pt-4 text-xs font-bold text-blue-100"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Your profile powers better recommendations</div>
          </div>
        </div>
      </section>

      <section className="h-auto w-full overflow-y-auto bg-[#f8fbfd] lg:h-screen lg:w-1/2">
      <div className="information-page profile-readable mx-auto max-w-4xl space-y-7 p-5 pb-12 sm:p-8 lg:p-12">
      
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-200 pb-6">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700"><Sparkles className="h-4 w-4" /> Step 4 of 4 • Smart Profile Builder</div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">የግል መረጃዎን ያሟሉ <span className="text-blue-700">(Personal Profile Setup)</span></h1>
          <p className="mt-2 text-sm text-slate-600">Complete your information to activate AI-matched job recommendations.</p>
        </div>
        <button type="button" onClick={() => handleSaveProfile(false)} className={`flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-md transition ${isSaved ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {isSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}{isSaved ? 'Saved!' : 'Save Profile'}
        </button>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-800"><span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-600" /> Profile Completion</span><span className="text-blue-700">{completionPercentage}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${completionPercentage}%` }} /></div>
      </div>

      {/* Personal Information */}
      <div className="rounded-2xl border border-slate-300 bg-white p-6 space-y-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-200">
          <User className="w-4 h-4 text-blue-600" /> Personal Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
          <div>
            <label className={labelClass}>First Name <span className="ml-1 font-bold text-rose-500">*</span></label>
            <input 
              type="text" 
              placeholder="Your first name"
              value={profileData.firstName} 
              onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Last Name <span className="ml-1 font-bold text-rose-500">*</span></label>
            <input 
              type="text" 
              placeholder="Your last name"
              value={profileData.lastName} 
              onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Email <span className="ml-1 font-bold text-rose-500">*</span></label>
            <input 
              type="email" 
              placeholder="you@example.com"
              value={profileData.email} 
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Phone Number <span className="ml-1 font-bold text-rose-500">*</span></label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3" />
              <input 
                type="text" 
                placeholder="+251 9XX XXX XXX"
                value={profileData.phone} 
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className={`${fieldClass} pl-10 pr-3`}
              />
            </div>
          </div>

          <div className="hidden">
            <label className={labelClass}>Date of Birth (Optional)</label>
            <input 
              type="date" 
              value={profileData.dob} 
              onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div className="hidden">
            <label className={labelClass}>Gender (Optional)</label>
            <select 
              value={profileData.gender} 
              onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
              className={fieldClass}
            >
              <option value="" disabled>Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Country <span className="ml-1 font-bold text-rose-500">*</span></label>
              <select
                value={profileData.country}
                onChange={(e) => setProfileData({ ...profileData, country: e.target.value, city: '' })}
                className={fieldClass}
              >
                {countryOptions.map((country) => <option key={country} value={country}>{country}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>City <span className="ml-1 font-bold text-rose-500">*</span></label>
              <select
                value={profileData.city}
                onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                className={fieldClass}
              >
                <option value="">Select city</option>
                {(cityOptionsByCountry[profileData.country] || ['Other']).map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Education Section */}
      <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b pb-2 border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-600" /> Education
          </h3>
          <button 
            type="button" 
            onClick={handleAddEducation}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Education
          </button>
        </div>

        {educationList.map((edu) => (
          <div key={edu.id} className="relative space-y-3 rounded-xl border border-slate-300 bg-white p-4">
            {educationList.length > 1 && (
              <button 
                type="button" 
                onClick={() => handleRemoveEducation(edu.id)}
                className="absolute top-3 right-3 text-red-500 hover:text-red-700 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <input 
                type="text" 
                placeholder="University / Institution" 
                value={edu.university} 
                onChange={(e) => handleEducationChange(edu.id, 'university', e.target.value)}
                className={fieldClass}
              />
              <input 
                type="text" 
                placeholder="Degree / Qualification" 
                value={edu.degree} 
                onChange={(e) => handleEducationChange(edu.id, 'degree', e.target.value)}
                className={fieldClass}
              />
              <input 
                type="text" 
                placeholder="Department / Field of Study" 
                value={edu.department} 
                onChange={(e) => handleEducationChange(edu.id, 'department', e.target.value)}
                className={fieldClass}
              />
              <input 
                type="text" 
                placeholder="Graduation Year" 
                value={edu.graduationYear} 
                onChange={(e) => handleEducationChange(edu.id, 'graduationYear', e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Experience Section */}
      <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b pb-2 border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-amber-600" /> Experience
          </h3>
          <button 
            type="button" 
            onClick={handleAddExperience}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Experience
          </button>
        </div>

        {experienceList.map((exp) => (
          <div key={exp.id} className="relative space-y-3 rounded-xl border border-slate-300 bg-white p-4">
            {experienceList.length > 1 && (
              <button 
                type="button" 
                onClick={() => handleRemoveExperience(exp.id)}
                className="absolute top-3 right-3 text-red-500 hover:text-red-700 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <input 
                type="text" 
                placeholder="Company Name" 
                value={exp.company} 
                onChange={(e) => handleExperienceChange(exp.id, 'company', e.target.value)}
                className={fieldClass}
              />
              <input 
                type="text" 
                placeholder="Position / Title" 
                value={exp.position} 
                onChange={(e) => handleExperienceChange(exp.id, 'position', e.target.value)}
                className={fieldClass}
              />
              <input 
                type="month" 
                value={exp.startDate} 
                onChange={(e) => handleExperienceChange(exp.id, 'startDate', e.target.value)}
                className={fieldClass}
              />
              <input 
                type="text" 
                placeholder="End Date (or Present)" 
                value={exp.endDate} 
                onChange={(e) => handleExperienceChange(exp.id, 'endDate', e.target.value)}
                className={fieldClass}
              />
            </div>
            <textarea 
              rows={2} 
              placeholder="Key responsibilities and achievements..." 
              value={exp.responsibilities} 
              onChange={(e) => handleExperienceChange(exp.id, 'responsibilities', e.target.value)}
              className={`${fieldClass} h-auto min-h-24`}
            />
          </div>
        ))}
      </div>

      {/* Skills Section */}
      <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2 border-slate-200">
          <Award className="w-4 h-4 text-emerald-600" /> Skills
        </h3>

        <div className="flex flex-wrap gap-2 py-1">
          {skills.map((skill) => (
            <span key={skill} className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 border border-blue-200">
              {skill}
              <button type="button" onClick={() => handleRemoveSkill(skill)} className="hover:text-red-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Add a new skill (e.g. React, Python)" 
            value={newSkill} 
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
            className={`${fieldClass} flex-1`}
          />
          <button 
            type="button" 
            onClick={handleAddSkill} 
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>

      {/* Languages Section */}
      <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2 border-slate-200">
          <Languages className="w-4 h-4 text-purple-600" /> Languages
        </h3>

        <div className="flex flex-wrap gap-2 py-1">
          {languages.map((lang) => (
            <span key={lang} className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold flex items-center gap-1.5 border border-purple-200">
              {lang}
              <button type="button" onClick={() => handleRemoveLanguage(lang)} className="hover:text-red-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Add language (e.g. Afaan Oromo, Amharic, English)" 
            value={newLang} 
            onChange={(e) => setNewLang(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLanguage())}
            className={`${fieldClass} flex-1`}
          />
          <button 
            type="button" 
            onClick={handleAddLanguage} 
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 transition cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>

      {/* Portfolio Links */}
      <div className="hidden bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2 border-slate-200">
          <LinkIcon className="w-4 h-4 text-sky-600" /> Portfolio & Links
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="relative flex items-center">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3" />
            <input 
              type="url" 
              placeholder="GitHub Profile" 
              value={profileData.github} 
              onChange={(e) => setProfileData({ ...profileData, github: e.target.value })}
              className={`${fieldClass} pl-10 pr-3`}
            />
          </div>

          <div className="relative flex items-center">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3" />
            <input 
              type="url" 
              placeholder="LinkedIn Profile" 
              value={profileData.linkedin} 
              onChange={(e) => setProfileData({ ...profileData, linkedin: e.target.value })}
              className={`${fieldClass} pl-10 pr-3`}
            />
          </div>

          <div className="relative flex items-center">
            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3" />
            <input 
              type="url" 
              placeholder="Portfolio Website" 
              value={profileData.portfolio} 
              onChange={(e) => setProfileData({ ...profileData, portfolio: e.target.value })}
              className={`${fieldClass} pl-10 pr-3`}
            />
          </div>
        </div>
      </div>

      {/* Job Preferences */}
      <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2 border-slate-200">
          <Target className="w-4 h-4 text-rose-600" /> Job Preferences
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className={labelClass}>Desired Position</label>
            <input 
              type="text" 
              placeholder="e.g. Frontend Developer"
              value={profileData.preferredJob} 
              onChange={(e) => setProfileData({ ...profileData, preferredJob: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Job Category</label>
            <input 
              type="text" 
              placeholder="e.g. Software Engineering"
              value={profileData.jobCategory} 
              onChange={(e) => setProfileData({ ...profileData, jobCategory: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Employment Type</label>
            <select 
              value={profileData.employmentType} 
              onChange={(e) => setProfileData({ ...profileData, employmentType: e.target.value })}
              className={fieldClass}
            >
              <option value="" disabled>Select employment type</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Salary Expectation</label>
            <input 
              type="text" 
              placeholder="e.g. 25,000 ETB / month"
              value={profileData.salaryExpectation} 
              onChange={(e) => setProfileData({ ...profileData, salaryExpectation: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Preferred Location (City)</label>
            <input 
              type="text" 
              placeholder="e.g. Addis Ababa or Remote"
              value={profileData.preferredCity} 
              onChange={(e) => setProfileData({ ...profileData, preferredCity: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Work Setup</label>
            <select 
              value={profileData.preferredWorkSetup} 
              onChange={(e) => setProfileData({ ...profileData, preferredWorkSetup: e.target.value })}
              className={fieldClass}
            >
              <option value="" disabled>Select work setup</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Bottom Action Bar */}
      <div className="mt-8 flex items-center justify-end pt-6 border-t border-slate-200/80">
        <button
          type="button"
          onClick={() => handleSaveProfile(true)}
          className="primary-button flex items-center gap-2 rounded-xl px-6 py-3.5 shadow-lg shadow-[#56a2d8]/25 hover:bg-[#f0f7fc] hover:text-[#2b73a4] hover:shadow-[#56a2d8]/30 active:scale-[0.98]"
        >
          <span>Continue to Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      </div>
      </section>
    </div>
  );
};

export default Profile;