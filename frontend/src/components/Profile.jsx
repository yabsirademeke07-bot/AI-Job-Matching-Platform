import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getApplicationJobId } from '../utils/applicationFlow';
import { notifyProfileUpdated } from '../utils/profileUpdateEvent';
import personalImage from '../pages/images/personal.png';

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
const fieldClass = 'h-14 w-full rounded-xl border-[1.5px] border-slate-300 bg-slate-50/60 px-4 py-3.5 text-base font-semibold leading-relaxed text-slate-900 placeholder:italic placeholder:text-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15';
const labelClass = 'mb-3 block text-sm font-bold leading-relaxed text-slate-800';

const Profile = ({ userData = {}, cvFile = null, onContinue, onNavigateNext }) => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const [searchParams] = useSearchParams();
  const applicationJobId = searchParams.get('jobId') || getApplicationJobId();

  // Helper to retrieve persisted profile or user state
  const getInitialState = () => {
    try {
      const savedProfile = JSON.parse(localStorage.getItem('userProfile') || 'null');
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const pendingCv = JSON.parse(localStorage.getItem('pending_cv_data') || 'null');

      return { savedProfile, savedUser, pendingCv };
    } catch {
      return { savedProfile: null, savedUser: {}, pendingCv: null };
    }
  };

  const { savedProfile, savedUser, pendingCv } = getInitialState();
  const cvName = pendingCv?.fullName || pendingCv?.full_name || pendingCv?.name || [pendingCv?.firstName, pendingCv?.lastName].filter(Boolean).join(' ') || '';
  const cvNameParts = cvName.trim().split(/\s+/).filter(Boolean);
  const cvLocation = String(pendingCv?.location || '').split(',').map((part) => part.trim()).filter(Boolean);
  const cvSkills = Array.isArray(pendingCv?.skills) ? pendingCv.skills.map((skill) => typeof skill === 'string' ? skill : skill?.skill_name).filter(Boolean) : [];
  const cvEducation = Array.isArray(pendingCv?.education) ? pendingCv.education.map((item, index) => ({ id: item.id || `cv-education-${index}`, university: item.school_name || item.institution || '', degree: item.degree || '', department: item.field_of_study || '', graduationYear: item.graduationYear || (item.end_date ? String(item.end_date).slice(0, 4) : '') })) : [];
  const cvExperience = Array.isArray(pendingCv?.experience) ? pendingCv.experience.map((item, index) => ({ id: item.id || `cv-experience-${index}`, company: item.company_name || item.company || '', position: item.job_title || item.role || '', startDate: item.start_date ? String(item.start_date).slice(0, 7) : '', endDate: item.end_date ? String(item.end_date).slice(0, 7) : (item.duration || ''), responsibilities: Array.isArray(item.responsibilities) ? item.responsibilities.join('\n') : item.description || '' })) : [];

  // Dynamic Lists State
  const [educationList, setEducationList] = useState(
    (pendingCv ? cvEducation : savedProfile?.education) || []
  );

  const [experienceList, setExperienceList] = useState(
    (pendingCv ? cvExperience : savedProfile?.experience) || []
  );

  const [skills, setSkills] = useState(pendingCv ? cvSkills : (savedProfile?.skills || []));
  const [newSkill, setNewSkill] = useState('');

  const [languages, setLanguages] = useState(savedProfile?.languages || []);
  const [newLang, setNewLang] = useState('');

  const [isSaved, setIsSaved] = useState(false);

  // Personal Profile Data State
  const [profileData, setProfileData] = useState({
    firstName: pendingCv ? pendingCv.firstName || pendingCv.first_name || cvNameParts[0] || '' : (savedProfile?.firstName || userData?.firstName || savedUser?.full_name?.split(' ')[0] || ''),
    lastName: pendingCv ? pendingCv.lastName || pendingCv.last_name || cvNameParts.slice(1).join(' ') : (savedProfile?.lastName || userData?.lastName || savedUser?.full_name?.split(' ').slice(1).join(' ') || ''),
    email: pendingCv?.email || savedProfile?.email || userData?.email || savedUser?.email || '',
    phone: pendingCv?.phone || savedProfile?.phone || savedUser?.phone || '',
    dob: savedProfile?.dob || '',
    gender: savedProfile?.gender || '',
    country: pendingCv ? cvLocation[1] || '' : (savedProfile?.country || 'Ethiopia'),
    city: pendingCv ? cvLocation[0] || '' : (savedProfile?.city || ''),
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
    notifyProfileUpdated();
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
      onboardingProfileCompleted: true,
      profileComplete: completionPercentage >= 80,
      onboardingCvUploaded: true,
      cvSkipped: false,
    }));
    setIsSaved(true);

    setTimeout(() => {
      setIsSaved(false);
      if (redirect) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const continueHandler = onContinue || onNavigateNext;
        if (location.state?.onboarding) {
          navigate('/ai-career-matches', { replace: true, state: { profile: fullProfile } });
          return;
        }
        if (continueHandler) {
          continueHandler(fullProfile);
          return;
        }
        navigate(location.state?.onboarding ? '/seeker/dashboard' : applicationJobId ? `/job-details/${applicationJobId}` : '/seeker/dashboard');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#eef5f9] text-slate-900 lg:flex lg:h-screen lg:overflow-hidden">
      <section className="relative flex min-h-90 w-full items-end overflow-hidden bg-slate-950 lg:h-screen lg:w-1/2 lg:items-end">
        <img src={personalImage} alt="Personal profile setup" className="absolute inset-0 h-full w-full object-cover object-center" />
      </section>

      <section className="h-auto w-full overflow-y-auto bg-[#f8fbfd] lg:h-screen lg:w-1/2">
      <div className="information-page profile-readable mx-auto max-w-4xl space-y-10 px-6 py-12 pb-16 leading-relaxed sm:px-10 lg:px-12">
      <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Personal Profile Setup</h1>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-800"><span>Profile Completion</span><span className="text-blue-700">{completionPercentage}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${completionPercentage}%` }} /></div>
      </div>

      {/* Personal Information */}
      <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 border-b pb-3 border-slate-200">Personal Information</h3>

        <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
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
            <div>
              <input 
                type="text" 
                placeholder="+251 9XX XXX XXX"
                value={profileData.phone} 
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className={fieldClass}
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

          <div className="grid grid-cols-2 gap-4">
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
      <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-8 shadow-sm">
        <div className="flex items-center justify-between border-b pb-2 border-slate-200">
          <h3 className="text-sm font-bold text-slate-800">Education</h3>
          <button 
            type="button" 
            onClick={handleAddEducation}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Add Education
          </button>
        </div>

        {educationList.map((edu) => (
          <div key={edu.id} className="relative space-y-5 rounded-xl border border-slate-200/80 bg-white p-6">
            {educationList.length > 1 && (
              <button 
                type="button" 
                onClick={() => handleRemoveEducation(edu.id)}
                className="absolute top-3 right-3 text-red-500 hover:text-red-700 cursor-pointer"
              >
                Remove
              </button>
            )}
            <div className="grid grid-cols-1 gap-5 text-sm md:grid-cols-2">
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
      <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-8 shadow-sm">
        <div className="flex items-center justify-between border-b pb-2 border-slate-200">
          <h3 className="text-sm font-bold text-slate-800">Experience</h3>
          <button 
            type="button" 
            onClick={handleAddExperience}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Add Experience
          </button>
        </div>

        {experienceList.map((exp) => (
          <div key={exp.id} className="relative space-y-5 rounded-xl border border-slate-200/80 bg-white p-6">
            {experienceList.length > 1 && (
              <button 
                type="button" 
                onClick={() => handleRemoveExperience(exp.id)}
                className="absolute top-3 right-3 text-red-500 hover:text-red-700 cursor-pointer"
              >
                Remove
              </button>
            )}
            <div className="grid grid-cols-1 gap-5 text-sm md:grid-cols-2">
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
      <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-8 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 border-slate-200">Skills</h3>

        <div className="flex flex-wrap gap-2 py-1">
          {skills.map((skill) => (
            <span key={skill} className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 border border-blue-200">
              {skill}
              <button type="button" onClick={() => handleRemoveSkill(skill)} className="hover:text-red-600 cursor-pointer">Remove</button>
            </span>
          ))}
        </div>

        <div className="flex gap-4">
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
      <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-8 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 border-slate-200">Languages <span className="font-normal text-slate-500">(Optional)</span></h3>

        <div className="flex flex-wrap gap-2 py-1">
          {languages.map((lang) => (
            <span key={lang} className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold flex items-center gap-1.5 border border-purple-200">
              {lang}
              <button type="button" onClick={() => handleRemoveLanguage(lang)} className="hover:text-red-600 cursor-pointer">Remove</button>
            </span>
          ))}
        </div>

        <div className="flex gap-4">
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
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 border-slate-200">Portfolio &amp; Links (Optional)</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <input 
              type="url" 
              placeholder="GitHub Profile" 
              value={profileData.github} 
              onChange={(e) => setProfileData({ ...profileData, github: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <input 
              type="url" 
              placeholder="LinkedIn Profile" 
              value={profileData.linkedin} 
              onChange={(e) => setProfileData({ ...profileData, linkedin: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <input 
              type="url" 
              placeholder="Portfolio Website" 
              value={profileData.portfolio} 
              onChange={(e) => setProfileData({ ...profileData, portfolio: e.target.value })}
              className={fieldClass}
            />
          </div>
        </div>
      </div>

      {/* Job Preferences */}
      <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-8 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 border-slate-200">Job Preferences <span className="font-normal text-slate-500">(Optional)</span></h3>

        <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
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
      <div className="mt-10 flex items-center justify-end border-t border-slate-200/80 pt-8">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleSaveProfile(true);
          }}
          className="primary-button flex items-center gap-2 rounded-xl px-7 py-4 text-base shadow-lg shadow-[#56a2d8]/25 hover:bg-[#f0f7fc] hover:text-[#2b73a4] hover:shadow-[#56a2d8]/30 active:scale-[0.98]"
        >
          <span>Analyze &amp; Match My Career (AI) →</span>
        </button>
      </div>

      </div>
      </section>
    </div>
  );
};

export default Profile;