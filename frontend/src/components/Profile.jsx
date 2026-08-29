import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, Mail, Phone, GraduationCap, 
  Briefcase, Plus, Trash2, Award, Languages, Link as LinkIcon, 
  Target, CheckCircle2, Sparkles, X, Globe, Save, Check, ArrowRight
} from 'lucide-react';
import { getApplicationJobId } from '../utils/applicationFlow';

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
    country: savedProfile?.country || '',
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
  const handleSaveProfile = (redirect = false) => {
    const fullProfile = {
      ...profileData,
      education: educationList,
      experience: experienceList,
      skills,
      languages,
      completionPercentage
    };
    
    localStorage.setItem('userProfile', JSON.stringify(fullProfile));
    setIsSaved(true);

    setTimeout(() => {
      setIsSaved(false);
      if (redirect) navigate(location.state?.onboarding ? '/dashboard' : applicationJobId ? `/job-details/${applicationJobId}` : '/seeker-dashboard');
    }, 600);
  };

  return (
    <div className="information-page profile-readable space-y-7 animate-in fade-in duration-300 max-w-5xl mx-auto p-4 pb-12 sm:p-6">
      
      {/* 1. Header Bar (Back button ተወግዶ Save Button ብቻ ወደ ቀኝ ተደርጓል) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Seeker Profile</h1>
          <p className="text-base text-slate-500">Manage your profile details and preferences</p>
        </div>

        <button
          type="button"
          onClick={() => handleSaveProfile(false)}
          className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md transition cursor-pointer ${
            isSaved ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {isSaved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>

      {/* Profile Progress Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" /> Profile Completion
          </span>
          <span className="text-blue-600 font-bold">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Header Badge */}
      <div className="text-center mb-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20 shadow-sm">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">User Profile Setup</h2>
        <p className="text-base text-slate-500">
          Complete your information to get AI-matched job recommendations.
        </p>
      </div>

      {/* Personal Information */}
      <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-6 space-y-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-200">
          <User className="w-4 h-4 text-blue-600" /> Personal Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
          <div>
            <label className="block text-slate-600 mb-1 font-medium">First Name</label>
            <input 
              type="text" 
              placeholder="Your first name"
              value={profileData.firstName} 
              onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Last Name</label>
            <input 
              type="text" 
              placeholder="Your last name"
              value={profileData.lastName} 
              onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Email</label>
            <input 
              type="email" 
              placeholder="you@example.com"
              value={profileData.email} 
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Phone Number</label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3" />
              <input 
                type="text" 
                placeholder="+251 9XX XXX XXX"
                value={profileData.phone} 
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="hidden">
            <label className="block text-slate-600 mb-1 font-medium">Date of Birth (Optional)</label>
            <input 
              type="date" 
              value={profileData.dob} 
              onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="hidden">
            <label className="block text-slate-600 mb-1 font-medium">Gender (Optional)</label>
            <select 
              value={profileData.gender} 
              onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            >
              <option value="" disabled>Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-600 mb-1 font-medium">Country</label>
              <input 
                type="text" 
                placeholder="Country"
                value={profileData.country} 
                onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1 font-medium">City</label>
              <input 
                type="text" 
                placeholder="City"
                value={profileData.city} 
                onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
              />
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
          <div key={edu.id} className="p-3.5 bg-white rounded-xl border border-slate-200 relative space-y-3">
            {educationList.length > 1 && (
              <button 
                type="button" 
                onClick={() => handleRemoveEducation(edu.id)}
                className="absolute top-3 right-3 text-red-500 hover:text-red-700 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <input 
                type="text" 
                placeholder="University / Institution" 
                value={edu.university} 
                onChange={(e) => handleEducationChange(edu.id, 'university', e.target.value)}
                className="p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500" 
              />
              <input 
                type="text" 
                placeholder="Degree / Qualification" 
                value={edu.degree} 
                onChange={(e) => handleEducationChange(edu.id, 'degree', e.target.value)}
                className="p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500" 
              />
              <input 
                type="text" 
                placeholder="Department / Field of Study" 
                value={edu.department} 
                onChange={(e) => handleEducationChange(edu.id, 'department', e.target.value)}
                className="p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500" 
              />
              <input 
                type="text" 
                placeholder="Graduation Year" 
                value={edu.graduationYear} 
                onChange={(e) => handleEducationChange(edu.id, 'graduationYear', e.target.value)}
                className="p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500" 
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
          <div key={exp.id} className="p-3.5 bg-white rounded-xl border border-slate-200 relative space-y-3">
            {experienceList.length > 1 && (
              <button 
                type="button" 
                onClick={() => handleRemoveExperience(exp.id)}
                className="absolute top-3 right-3 text-red-500 hover:text-red-700 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <input 
                type="text" 
                placeholder="Company Name" 
                value={exp.company} 
                onChange={(e) => handleExperienceChange(exp.id, 'company', e.target.value)}
                className="p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500" 
              />
              <input 
                type="text" 
                placeholder="Position / Title" 
                value={exp.position} 
                onChange={(e) => handleExperienceChange(exp.id, 'position', e.target.value)}
                className="p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500" 
              />
              <input 
                type="month" 
                value={exp.startDate} 
                onChange={(e) => handleExperienceChange(exp.id, 'startDate', e.target.value)}
                className="p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500" 
              />
              <input 
                type="text" 
                placeholder="End Date (or Present)" 
                value={exp.endDate} 
                onChange={(e) => handleExperienceChange(exp.id, 'endDate', e.target.value)}
                className="p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500" 
              />
            </div>
            <textarea 
              rows={2} 
              placeholder="Key responsibilities and achievements..." 
              value={exp.responsibilities} 
              onChange={(e) => handleExperienceChange(exp.id, 'responsibilities', e.target.value)}
              className="w-full p-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-blue-500"
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
            className="text-xs p-2.5 rounded-xl border border-slate-200 flex-1 bg-white outline-none focus:border-blue-500"
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
            className="text-xs p-2.5 rounded-xl border border-slate-200 flex-1 bg-white outline-none focus:border-purple-500"
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
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="relative flex items-center">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3" />
            <input 
              type="url" 
              placeholder="LinkedIn Profile" 
              value={profileData.linkedin} 
              onChange={(e) => setProfileData({ ...profileData, linkedin: e.target.value })}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="relative flex items-center">
            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3" />
            <input 
              type="url" 
              placeholder="Portfolio Website" 
              value={profileData.portfolio} 
              onChange={(e) => setProfileData({ ...profileData, portfolio: e.target.value })}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
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
            <label className="block text-slate-600 mb-1 font-medium">Desired Position</label>
            <input 
              type="text" 
              placeholder="e.g. Frontend Developer"
              value={profileData.preferredJob} 
              onChange={(e) => setProfileData({ ...profileData, preferredJob: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Job Category</label>
            <input 
              type="text" 
              placeholder="e.g. Software Engineering"
              value={profileData.jobCategory} 
              onChange={(e) => setProfileData({ ...profileData, jobCategory: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Employment Type</label>
            <select 
              value={profileData.employmentType} 
              onChange={(e) => setProfileData({ ...profileData, employmentType: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            >
              <option value="" disabled>Select employment type</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Salary Expectation</label>
            <input 
              type="text" 
              placeholder="e.g. 25,000 ETB / month"
              value={profileData.salaryExpectation} 
              onChange={(e) => setProfileData({ ...profileData, salaryExpectation: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Preferred Location (City)</label>
            <input 
              type="text" 
              placeholder="e.g. Addis Ababa or Remote"
              value={profileData.preferredCity} 
              onChange={(e) => setProfileData({ ...profileData, preferredCity: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Work Setup</label>
            <select 
              value={profileData.preferredWorkSetup} 
              onChange={(e) => setProfileData({ ...profileData, preferredWorkSetup: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
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
  );
};

export default Profile;