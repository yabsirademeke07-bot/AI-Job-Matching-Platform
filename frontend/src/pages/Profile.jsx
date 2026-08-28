import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getNextApplicationStep, getPendingApplication } from '../utils/applicationFlow';
import { 
  User, Mail, Phone, GraduationCap, 
  Briefcase, Plus, Trash2, Award, Languages, Link as LinkIcon, 
  Target, CheckCircle2, Sparkles, X, Globe, Save, ArrowLeft
} from 'lucide-react';

const Profile = ({ userData = {}, cvFile = null }) => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_BACKEND_URL || '/api';

  // Safe fallback to load stored user from localStorage
  const getInitialUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  };
  const savedUser = getInitialUser();

  // Dynamic Lists (Education, Experience, Skills, Languages)
  const [educationList, setEducationList] = useState([
    { id: 1, university: 'Addis Ababa University', degree: "Bachelor's", department: 'Computer Science', graduationYear: '2024' }
  ]);

  const [experienceList, setExperienceList] = useState([
    { id: 1, company: 'Tech Solutions Inc', position: 'Frontend Developer', startDate: '2024-01', endDate: 'Present', responsibilities: 'Building React components & UI interfaces.' }
  ]);

  const [skills, setSkills] = useState(['React', 'JavaScript', 'Node.js']);
  const [newSkill, setNewSkill] = useState('');

  const [languages, setLanguages] = useState(['English', 'አማርኛ']);
  const [newLang, setNewLang] = useState('');

  // Personal Profile Data State
  const [profileData, setProfileData] = useState({
    firstName: userData?.firstName || savedUser?.full_name?.split(' ')[0] || savedUser?.firstName || 'Abebe',
    lastName: userData?.lastName || savedUser?.full_name?.split(' ')[1] || savedUser?.lastName || 'Bikila',
    email: userData?.email || savedUser?.email || 'abebe@example.com',
    phone: savedUser?.phone || '+251 900 000 000',
    dob: '',
    gender: 'Male',
    country: 'Ethiopia',
    city: 'Addis Ababa',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    portfolio: 'https://myportfolio.com',
    jobCategory: 'Software Engineering',
    preferredJob: userData?.preferredJob || 'Full Stack Developer',
    employmentType: 'Full-Time',
    salaryExpectation: userData?.salaryExpectation || '$1,500 / month',
    preferredCity: 'Addis Ababa',
    preferredWorkSetup: 'Remote'
  });

  const completionPercentage = 85;

  // Handlers
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

  // 1. መረጃውን ለማስቀመጥ እና ወደ Dashboard ለመመለስ የተስተካከለ Handler
  const handleSaveProfile = async () => {
    const fullProfile = {
      ...profileData,
      education: educationList,
      experience: experienceList,
      skills,
      languages
    };
    
    // 1. የProfile መረጃውን ማስቀመጥ
    localStorage.setItem('userProfile', JSON.stringify(fullProfile));

    // 2. ዋናው user መረጃ እና role እንዳይጠፋ ማረጋገጥ (የ ProtectedRoute ችግር እንዳይፈጠር)
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedUser = {
      ...currentUser,
      full_name: `${profileData.firstName} ${profileData.lastName}`.trim(),
      email: profileData.email,
      phone: profileData.phone,
      // የቆየውን role መያዝ ወይም ከሌለ 'job_seeker' መስጠት
      role: currentUser.role || currentUser.userType || 'job_seeker'
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));

    if (localStorage.getItem('token')) {
      const response = await fetch(`${API_URL.replace(/\/$/, '')}/seeker/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ ...profileData, skills }),
      });
      if (!response.ok) return;
    }

    // 3. በቀጥታ ወደ Seeker Dashboard መራት
    const pending = getPendingApplication();
    navigate(pending?.jobId ? getNextApplicationStep(pending.jobId) : '/seeker-dashboard');
  };

  // 2. Back button ሲጫኑ User state-ኡን ጠብቆ የሚመልስ Handler
  const handleBackToDashboard = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!currentUser.role) {
      currentUser.role = 'job_seeker';
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
    navigate('/seeker-dashboard');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto p-4 pb-10">
      
      {/* Navigation Top Bar with Link */}
      <div className="flex items-center justify-between">
        
        {/* ወደ Dashboard የመመለሻ አዝራር */}
        <button
          type="button"
          onClick={handleBackToDashboard}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Save Profile Button */}
        <button
          type="button"
          onClick={handleSaveProfile}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition cursor-pointer"
        >
          <Save className="w-4 h-4" /> Save Profile
        </button>
      </div>

      {/* Profile Progress Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
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
        <h2 className="text-xl font-bold text-slate-900">User Profile Setup</h2>
        <p className="text-xs text-slate-500">
          Complete your information to get AI-matched job recommendations.
        </p>
      </div>

      {/* Personal Information */}
      <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2 border-slate-200">
          <User className="w-4 h-4 text-blue-600" /> Personal Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 mb-1">First Name</label>
            <input 
              type="text" 
              value={profileData.firstName} 
              onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Last Name</label>
            <input 
              type="text" 
              value={profileData.lastName} 
              onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Email</label>
            <input 
              type="email" 
              value={profileData.email} 
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Phone Number</label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3" />
              <input 
                type="text" 
                value={profileData.phone} 
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Date of Birth (Optional)</label>
            <input 
              type="date" 
              value={profileData.dob} 
              onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Gender (Optional)</label>
            <select 
              value={profileData.gender} 
              onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-600 mb-1">Country</label>
              <input 
                type="text" 
                value={profileData.country} 
                onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">City</label>
              <input 
                type="text" 
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
            <Plus className="w-3.5 h-3.5" /> Add Another Education
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
                placeholder="University" 
                value={edu.university} 
                onChange={(e) => handleEducationChange(edu.id, 'university', e.target.value)}
                className="p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500" 
              />
              <input 
                type="text" 
                placeholder="Degree" 
                value={edu.degree} 
                onChange={(e) => handleEducationChange(edu.id, 'degree', e.target.value)}
                className="p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500" 
              />
              <input 
                type="text" 
                placeholder="Department" 
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
                placeholder="Company" 
                value={exp.company} 
                onChange={(e) => handleExperienceChange(exp.id, 'company', e.target.value)}
                className="p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500" 
              />
              <input 
                type="text" 
                placeholder="Position" 
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
              placeholder="Responsibilities..." 
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
          <Award className="w-4 h-4 text-emerald-600" /> Skills (AI Extracted & Custom)
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
            placeholder="Add a new skill" 
            value={newSkill} 
            onChange={(e) => setNewSkill(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 flex-1 bg-white outline-none focus:border-blue-500"
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
            placeholder="Add language (e.g. Afaan Oromo, English)" 
            value={newLang} 
            onChange={(e) => setNewLang(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 flex-1 bg-white outline-none focus:border-purple-500"
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
      <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-sm">
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
            <label className="block text-slate-600 mb-1">Desired Position</label>
            <input 
              type="text" 
              value={profileData.preferredJob} 
              onChange={(e) => setProfileData({ ...profileData, preferredJob: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Job Category</label>
            <input 
              type="text" 
              value={profileData.jobCategory} 
              onChange={(e) => setProfileData({ ...profileData, jobCategory: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Employment Type</label>
            <select 
              value={profileData.employmentType} 
              onChange={(e) => setProfileData({ ...profileData, employmentType: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            >
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Salary Expectation</label>
            <input 
              type="text" 
              value={profileData.salaryExpectation} 
              onChange={(e) => setProfileData({ ...profileData, salaryExpectation: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Preferred Location (City)</label>
            <input 
              type="text" 
              value={profileData.preferredCity} 
              onChange={(e) => setProfileData({ ...profileData, preferredCity: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Work Setup</label>
            <select 
              value={profileData.preferredWorkSetup} 
              onChange={(e) => setProfileData({ ...profileData, preferredWorkSetup: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500"
            >
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Profile;