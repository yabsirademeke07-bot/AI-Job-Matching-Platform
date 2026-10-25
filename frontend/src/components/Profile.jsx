import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast.js';
import { notifyProfileUpdated } from '../utils/profileUpdateEvent';
import { scrollToFeedback } from '../utils/scrollHelper.js';
import SearchableSelect from './ui/SearchableSelect.jsx';
import PhoneInputWithCountry from './common/PhoneInputWithCountry.jsx';
import { formatPhoneNumber, getPhoneParts, phoneCountries } from './common/phoneCountries.js';
import { ETHIOPIAN_SECTORS, SECTOR_SKILLS_MAP } from '../data/sectorsData.js';
import SECTOR_SUB_SECTORS_MAP from '../data/subSectorsData.ts';

const fieldClass = 'profile-field-control h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-base font-normal leading-relaxed text-slate-900 placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 shadow-xs outline-none transition-all hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';
const labelClass = 'mb-3.5 block font-sans text-[18px] font-semibold tracking-tight text-slate-900';
const experienceLevels = ['Entry level', 'Junior', 'Intermediate', 'Senior', 'Expert'];
const workSetups = ['On-site', 'Remote', 'Hybrid', 'Any / Flexible'];
const jobTypes = ['Full-time', 'Part-time', 'Freelance', 'Contractual', 'Volunteer', 'Intern (Paid)', 'Intern (Unpaid)'];
const educationLevels = ['Primary School', 'Middle School', 'High School', 'Certificate', 'Tvet', 'Diploma', 'Bachelor’s Degree', 'Postgraduate Diploma', 'Master’s Degree', 'Phd'];
const invalidJobTitleMessage = 'Please enter a valid, recognizable job title (e.g., Software Developer, Agronomist, Accountant)';

const salaryRangePattern = /^([\d,]+)\s*-\s*([\d,]+)$/;
const formatSalaryRange = (minimum, maximum) => {
  if (minimum && maximum) return `${minimum} - ${maximum}`;
  return minimum || '';
};

const normalizeList = (value, objectKeys = []) => {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = parsed.split(','); }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => {
    if (typeof item === 'string') return item.trim();
    if (!item || typeof item !== 'object') return '';
    return String(objectKeys.map((key) => item[key]).find(Boolean) || '').trim();
  }).filter(Boolean);
};

const getPhoneNationalNumber = (phone, countryCode) => {
  const digits = String(phone || '').replace(/\D/g, '');
  const dialDigits = String(countryCode || '').replace(/\D/g, '');
  const nationalNumber = dialDigits && digits.startsWith(dialDigits)
    ? digits.slice(dialDigits.length)
    : digits.replace(/^0/, '');
  return nationalNumber.slice(0, 12);
};

const isValidPhone = (value) => /^\+[1-9]\d{6,14}$/.test(String(value || '').replace(/[\s()-]/g, ''));

const cleanCvLocation = (value) => {
  const location = String(value || '').trim();
  if (!location || /@/.test(location) || /\+?251\s*9\d{8}/.test(location) || /\b09\d{8}\b/.test(location)) return '';
  return location;
};

const isResumeBullet = (value) => {
  const text = String(value || '').trim();
  const textWithoutLeadingPunctuation = text.replace(/^[^a-z]+/i, '');
  return /^(?:[•●▪◦·*-]|\d+[.)])\s*/.test(text)
    || /^(?:participate|participated|participating|contribute|contributed|collaborate|collaborated|developed?|implemented?|worked|responsible for)\b/i.test(text)
    || /^(?:participate|participated|participating|contribute|contributed|collaborate|collaborated|developed?|implemented?|worked|responsible for)\b/i.test(textWithoutLeadingPunctuation);
};

const cleanDesiredJobTitle = (value) => {
  const title = String(value || '').trim();
  return isResumeBullet(title) ? '' : title;
};

const isRecognizableJobTitle = (value) => {
  const title = String(value || '').trim().toLowerCase();
  if (title.length < 3 || !/[a-z]/i.test(title) || isResumeBullet(title)) return false;
  if (/(.)\1{4,}/.test(title) || /asdfghjkl|qwertyuiop|zxcvbnm/.test(title)) return false;
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(title)) return false;
  const knownTitle = /developer|engineer|nurse|accountant|agronomist|manager|officer|teacher|designer|developer|analyst|administrator|supervisor|architect|consultant|technician|specialist|director|assistant|coordinator|lawyer|doctor|chef|driver|sales|marketing|human resources|hr\b|qa\b|ceo\b|ux\b|ui\b/i.test(title);
  return knownTitle || /[aeiouy]/i.test(title) && title.split(/\s+/).some((word) => word.length >= 3 && /[aeiouy]/i.test(word));
};

const validateProfile = (data) => {
  const errors = {};

  const fullName = String(data.fullName || '').trim();
  if (!fullName) {
    errors.fullName = 'Full Name is required.';
  } else if (fullName.length < 2) {
    errors.fullName = 'Full Name must be at least 2 characters.';
  } else if (!/^[a-zA-Z\s]+$/.test(fullName)) {
    errors.fullName = 'Full Name must contain letters only (no numbers or symbols).';
  }

  const email = String(data.email || '').trim();
  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  const phone = String(data.phone || '').replace(/[\s()-]/g, '');
  if (!phone) {
    errors.phone = 'Phone number is required.';
  } else if (!isValidPhone(phone)) {
    errors.phone = 'Please enter a valid phone number with its selected country dial code.';
  }

  if (!String(data.city || '').trim()) errors.city = 'City or location is required.';
  if (!isRecognizableJobTitle(data.preferredJob)) errors.desiredPosition = invalidJobTitleMessage;
  const uniqueSkills = new Set((Array.isArray(data.skills) ? data.skills : [])
    .map((skill) => String(skill || '').trim().toLowerCase())
    .filter(Boolean));
  if (uniqueSkills.size < 2) errors.skills = '⚠️ Add at least 2 skills.';
  if (!ETHIOPIAN_SECTORS.includes(data.jobCategory)) errors.jobCategory = 'Select an industry / sector.';
  if (data.jobCategory && (!data.subSectors || data.subSectors.length === 0)) errors.subSectors = 'Select at least one sub-sector / specialization.';
  if (!experienceLevels.includes(data.experienceLevel)) errors.experienceLevel = 'Select your experience level.';
  if (!workSetups.includes(data.preferredWorkSetup)) errors.workSetup = 'Select a work setup preference.';
  if (!jobTypes.includes(data.jobType)) errors.jobType = 'Select your job type.';
  const salaryRange = String(data.salaryExpectation || '').trim().match(salaryRangePattern);
  const minimumSalary = salaryRange ? Number(salaryRange[1].replace(/,/g, '')) : 0;
  const maximumSalary = salaryRange ? Number(salaryRange[2].replace(/,/g, '')) : 0;
  if (!salaryRange) errors.expectedSalary = 'Enter a salary range, for example 25,000 - 45,000 ETB per month.';
  else if (minimumSalary < 1000) errors.expectedSalary = 'Minimum salary must be at least 1,000 ETB per month.';
  else if (maximumSalary < minimumSalary) errors.expectedSalary = 'Maximum salary must be greater than or equal to minimum salary.';
  if (String(data.bio || '').length > 500) errors.bio = 'Bio must be 500 characters or fewer.';
  return errors;
};

const FieldError = ({ message }) => message ? <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600 animate-fade-in" role="alert"><span>⚠️</span><span>{message}</span></p> : null;

const Profile = ({ userData = {}, onContinue }) => {
  const navigate = useNavigate();
  const { user, setSession } = useAuth();
  const { showSuccess, showError } = useToast();

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
  const initialPhone = pendingCv?.phone || savedProfile?.phone || savedUser?.phone || '';
  const initialPhoneParts = getPhoneParts(initialPhone);
  const initialCountryCodeCandidate = savedProfile?.country_code
    || savedProfile?.countryCode
    || savedUser?.country_code
    || initialPhoneParts.country.dialCode;
  const initialCountryCode = phoneCountries.some((country) => country.dialCode === initialCountryCodeCandidate)
    ? initialCountryCodeCandidate
    : initialPhoneParts.country.dialCode;
  const initialPhoneNumber = String(savedProfile?.phone_number
    || savedProfile?.phoneNumber
    || getPhoneNationalNumber(initialPhone, initialCountryCode)).replace(/\D/g, '').slice(0, 12);
  const cvName = pendingCv?.fullName || pendingCv?.full_name || pendingCv?.name || [pendingCv?.firstName, pendingCv?.lastName].filter(Boolean).join(' ') || '';
  const cvNameParts = cvName.trim().split(/\s+/).filter(Boolean);
  const cvLocation = cleanCvLocation(pendingCv?.location).split(',').map((part) => part.trim()).filter(Boolean);
  const cvSkills = Array.isArray(pendingCv?.skills) ? pendingCv.skills.map((skill) => typeof skill === 'string' ? skill : skill?.skill_name || skill?.name).filter(Boolean) : [];
  const cvEducation = Array.isArray(pendingCv?.education) ? pendingCv.education.map((item, index) => ({ id: item.id || `cv-education-${index}`, university: item.school_name || item.institution || '', degree: item.degree || '', department: item.field_of_study || '', graduationYear: item.graduationYear || (item.end_date ? String(item.end_date).slice(0, 4) : '') })) : [];
  const cvExperience = Array.isArray(pendingCv?.experience) ? pendingCv.experience.map((item, index) => ({ id: item.id || `cv-experience-${index}`, company: item.company_name || item.company || '', position: item.job_title || item.role || '', startDate: item.start_date ? String(item.start_date).slice(0, 7) : '', endDate: item.end_date ? String(item.end_date).slice(0, 7) : (item.duration || ''), responsibilities: Array.isArray(item.responsibilities) ? item.responsibilities.join('\n') : item.description || '' })) : [];

  // Dynamic Lists State
  const [educationList, setEducationList] = useState(
    (pendingCv ? cvEducation : savedProfile?.education) || []
  );

  const [experienceList, setExperienceList] = useState(
    (pendingCv ? cvExperience : savedProfile?.experience) || []
  );

  const [skills, setSkills] = useState(pendingCv ? cvSkills : normalizeList(savedProfile?.skills, ['skill_name', 'name']));
  const [newSkill, setNewSkill] = useState('');

  const [languages, setLanguages] = useState(normalizeList(savedProfile?.languages, ['language_name', 'language', 'name']));
  const [newLang, setNewLang] = useState('');

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [errors, setErrors] = useState({});
  const [subSectorDropdownOpen, setSubSectorDropdownOpen] = useState(false);
  const [subSectorSearch, setSubSectorSearch] = useState('');
  const subSectorDropdownRef = useRef(null);

  useEffect(() => {
    if (!Object.keys(errors).length) return undefined;
    const timer = window.setTimeout(() => {
      setErrors({});
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [errors]);

  useEffect(() => {
    if (!subSectorDropdownOpen) return undefined;
    const closeDropdown = (event) => {
      if (event.key === 'Escape' || !subSectorDropdownRef.current?.contains(event.target)) {
        setSubSectorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', closeDropdown);
    document.addEventListener('keydown', closeDropdown);
    return () => {
      document.removeEventListener('mousedown', closeDropdown);
      document.removeEventListener('keydown', closeDropdown);
    };
  }, [subSectorDropdownOpen]);

  // Personal Profile Data State
  const [profileData, setProfileData] = useState({
    fullName: pendingCv ? cvName : (savedProfile?.fullName || userData?.fullName || savedUser?.full_name || ''),
    firstName: pendingCv ? pendingCv.firstName || pendingCv.first_name || cvNameParts[0] || '' : (savedProfile?.firstName || userData?.firstName || savedUser?.full_name?.split(' ')[0] || ''),
    lastName: pendingCv ? pendingCv.lastName || pendingCv.last_name || cvNameParts.slice(1).join(' ') : (savedProfile?.lastName || userData?.lastName || savedUser?.full_name?.split(' ').slice(1).join(' ') || ''),
    email: pendingCv?.email || savedProfile?.email || userData?.email || savedUser?.email || '',
    phone: formatPhoneNumber(initialCountryCode, initialPhoneNumber),
    country_code: initialCountryCode,
    phone_number: initialPhoneNumber,
    dob: savedProfile?.dob || '',
    gender: savedProfile?.gender || '',
    country: pendingCv ? cvLocation[1] || '' : (savedProfile?.country || 'Ethiopia'),
    city: pendingCv ? cvLocation[0] || '' : (savedProfile?.city || ''),
    github: savedProfile?.github || '',
    linkedin: savedProfile?.linkedin || '',
    portfolio: savedProfile?.portfolio || '',
    jobCategory: savedProfile?.jobCategory || '',
    subSectors: normalizeList(savedProfile?.subSectors, ['sub_sector', 'name']).slice(0, 4),
    preferredJob: cleanDesiredJobTitle(savedProfile?.preferredJob) || cleanDesiredJobTitle(userData?.preferredJob) || '',
    employmentType: savedProfile?.employmentType || '',
    jobType: savedProfile?.jobType || savedProfile?.preferred_job_type || savedProfile?.employmentType || '',
    salaryExpectation: formatSalaryRange(savedProfile?.salaryExpectation || userData?.salaryExpectation || '', savedProfile?.salaryExpectationMax || savedProfile?.expected_salary_max || userData?.salaryExpectationMax || ''),
    salaryExpectationMax: savedProfile?.salaryExpectationMax || savedProfile?.expected_salary_max || userData?.salaryExpectationMax || '',
    preferredCity: savedProfile?.preferredCity || '',
    preferredWorkSetup: savedProfile?.preferredWorkSetup || ''
    ,experienceLevel: savedProfile?.experienceLevel || '',
    educationLevel: savedProfile?.educationLevel || '',
    bio: savedProfile?.bio || ''
  });

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    fetch('/api/seeker/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!active || !result?.profile) return;
        const saved = result.profile;
        const savedPhone = saved.phone || savedUser.phone || '';
        const savedPhoneParts = getPhoneParts(savedPhone);
        const countryCodeCandidate = saved.country_code || saved.countryCode || savedPhoneParts.country.dialCode;
        const countryCode = phoneCountries.some((country) => country.dialCode === countryCodeCandidate)
          ? countryCodeCandidate
          : savedPhoneParts.country.dialCode;
        const phoneNumber = String(saved.phone_number || saved.phoneNumber || getPhoneNationalNumber(savedPhone, countryCode)).replace(/\D/g, '').slice(0, 12);
        const parseJson = (value, fallback) => {
          if (Array.isArray(value)) return value;
          try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
        };
        setProfileData((current) => ({
          ...current,
          fullName: saved.full_name || current.fullName,
          email: saved.email || current.email,
          phone: formatPhoneNumber(countryCode, phoneNumber) || current.phone,
          country_code: countryCode,
          phone_number: phoneNumber,
          preferredJob: cleanDesiredJobTitle(saved.headline) || cleanDesiredJobTitle(current.preferredJob),
          jobCategory: saved.job_category || current.jobCategory,
          experienceLevel: saved.experience_level || current.experienceLevel,
          educationLevel: saved.education_level || current.educationLevel,
          jobType: saved.job_type || current.jobType,
          salaryExpectation: formatSalaryRange(saved.expected_salary ?? saved.salary_expectation_min ?? current.salaryExpectation, saved.expected_salary_max ?? current.salaryExpectationMax),
          salaryExpectationMax: saved.expected_salary_max ?? current.salaryExpectationMax,
          preferredWorkSetup: saved.work_setup || saved.preferred_work_mode || current.preferredWorkSetup,
          city: saved.location || saved.city || current.city,
          bio: saved.bio || current.bio,
        }));
        const savedEducation = parseJson(saved.education, result.education);
        const savedExperience = parseJson(saved.experience, result.experience);
        const savedSkills = parseJson(saved.skills, result.skills);
        const savedLanguages = parseJson(saved.languages, result.languages);
        if (Array.isArray(savedEducation)) setEducationList(savedEducation);
        if (Array.isArray(savedExperience)) setExperienceList(savedExperience);
        setSkills(normalizeList(savedSkills, ['skill_name', 'name']));
        setLanguages(normalizeList(savedLanguages, ['language_name', 'language', 'name']));
        localStorage.setItem('userProfile', JSON.stringify({ ...JSON.parse(localStorage.getItem('userProfile') || '{}'), ...saved }));
      })
      .catch(() => {})
      .finally(() => {});
    return () => { active = false; };
  }, [savedUser.phone]);

  const updateProfileField = (field, value) => {
    const nextValue = field === 'preferredJob' ? cleanDesiredJobTitle(value) : value;
    setProfileData((current) => ({ ...current, [field]: nextValue }));
    const errorFields = {
      preferredJob: 'desiredPosition',
      preferredWorkSetup: 'workSetup',
      salaryExpectation: 'expectedSalary',
      salaryExpectationMax: 'expectedSalaryMax',
      jobType: 'jobType',
    };
    const errorField = errorFields[field] || field;
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      delete next[errorField];
      return next;
    });
  };

  const handleJobCategoryChange = (value) => {
    if (value !== profileData.jobCategory) {
      updateProfileField('subSectors', []);
      setSubSectorSearch('');
      setSubSectorDropdownOpen(false);
    }
    updateProfileField('jobCategory', value);
  };

  const validateField = (field) => {
    const nextErrors = validateProfile({ ...profileData, skills });
    setErrors((current) => ({ ...current, [field]: nextErrors[field] }));
  };
  const inputClass = (field) => `${fieldClass} ${errors[field] ? 'has-error animate-[fieldShake_0.35s_ease-in-out] border-rose-500 bg-rose-50/40 ring-4 ring-rose-400/60 focus:border-rose-600 focus:ring-rose-500/40' : ''}`;
  const focusFirstInvalid = (validationErrors) => {
    const firstField = Object.keys(validationErrors)[0];
    if (!firstField || firstField === 'form') return;

    window.requestAnimationFrame(() => {
      const element = document.querySelector('input:invalid, select:invalid, textarea:invalid, .border-red-500, input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]')
        || document.querySelector(`[data-profile-field="${firstField}"]`);

      if (!element) return;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => {
        if (typeof element.focus === 'function') element.focus({ preventScroll: true });
      }, 0);
    });
  };
  const scrollToSuccess = () => {
    window.setTimeout(() => {
      const scrollContainer = document.querySelector('main, .overflow-y-auto, #dashboard-content') || document.documentElement || document.body;
      if (typeof scrollContainer.scrollTo === 'function') scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  // Calculate profile completion dynamically
  const completionPercentage = useMemo(() => {
    const fields = [
      profileData.fullName,
      profileData.email,
      profileData.phone,
      profileData.city,
      profileData.preferredJob,
      profileData.jobCategory,
      profileData.subSectors && profileData.subSectors.length > 0,
      profileData.experienceLevel,
      profileData.preferredWorkSetup,
      profileData.jobType,
      profileData.educationLevel,
      profileData.salaryExpectation,
      profileData.salaryExpectationMax,
      educationList.length > 0,
      experienceList.length > 0,
      skills.length > 0,
      languages.length > 0
    ];

    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [profileData, educationList, experienceList, languages, skills.length]);
  const suggestedSkills = SECTOR_SKILLS_MAP[profileData.jobCategory] || [];
  const filteredSubSectors = (SECTOR_SUB_SECTORS_MAP[profileData.jobCategory] || [])
    .filter((subSector) => subSector.toLowerCase().includes(subSectorSearch.trim().toLowerCase()));

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
  const addSkills = (skillsToAdd) => {
    setSkills((current) => {
      const nextSkills = [...current];
      const seen = new Set(current.map((skill) => skill.toLowerCase()));
      skillsToAdd.map((skill) => skill.trim()).filter(Boolean).forEach((skill) => {
        if (!seen.has(skill.toLowerCase())) {
          seen.add(skill.toLowerCase());
          nextSkills.push(skill);
        }
      });
      return nextSkills;
    });
    setErrors((current) => {
      const next = { ...current };
      delete next.skills;
      return next;
    });
  };

  const handleAddSkill = () => {
    addSkills(newSkill.split(','));
    setNewSkill('');
  };

  const handleSkillInputChange = (value) => {
    const parts = value.split(',');
    if (parts.length > 1) {
      addSkills(parts.slice(0, -1));
      setNewSkill(parts[parts.length - 1].trimStart());
      return;
    }
    setNewSkill(value);
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills((current) => current.filter((skill) => skill !== skillToRemove));
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
    const validationErrors = validateProfile({ ...profileData, skills });
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      showError('Please complete the highlighted required fields before saving.');
      focusFirstInvalid(validationErrors);
      scrollToFeedback('error');
      return { success: false, errors: validationErrors };
    }
    if (isSaving || isNavigating) return;
    setIsSaving(true);
    setIsNavigating(redirect);
    setErrors({});
    const fullProfile = {
      ...profileData,
      phone: formatPhoneNumber(profileData.country_code, profileData.phone_number),
      verified: true,
      userId: user?.id || user?.userId || user?.user_id || JSON.parse(localStorage.getItem('user') || '{}')?.id || JSON.parse(localStorage.getItem('user') || '{}')?.userId,
      fullName: String(profileData.fullName || '').trim(),
      expectedSalary: Number(String(profileData.salaryExpectation || '').match(salaryRangePattern)?.[1]?.replace(/,/g, '')) || null,
      expectedSalaryMax: Number(String(profileData.salaryExpectation || '').match(salaryRangePattern)?.[2]?.replace(/,/g, '')) || null,
      preferredJob: cleanDesiredJobTitle(profileData.preferredJob),
      desiredPosition: cleanDesiredJobTitle(profileData.preferredJob),
      workSetup: profileData.preferredWorkSetup || '',
      jobType: profileData.jobType || '',
      employmentType: profileData.jobType || '',
      education: educationList,
      experience: experienceList,
      skills,
      languages,
      completionPercentage
    };
    
    const persistLocally = () => {
      localStorage.setItem('userProfile', JSON.stringify(fullProfile));
      localStorage.setItem('activeSeekerProfile', JSON.stringify(fullProfile));
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...user, full_name: fullProfile.fullName, email: fullProfile.email, phone: fullProfile.phone, onboardingProfileCompleted: true, profileComplete: true, profileCompleted: true, is_profile_complete: true, onboardingCvUploaded: currentUser.cv_status === 'uploaded', cv_status: currentUser.cv_status || 'uploaded', cvSkipped: currentUser.cv_status === 'skipped', onboarding_step: 'completed', onboarding_step_completed: 'completed' };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      const token = localStorage.getItem('token');
      if (user || token) setSession({ token, user: updatedUser });
      notifyProfileUpdated();
    };

    const saveStartedAt = Date.now();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seeker/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(fullProfile),
      });
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, 600 - (Date.now() - saveStartedAt))));
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        const apiError = new Error(result.error || result.message || 'Profile API unavailable');
        apiError.code = result.code;
        throw apiError;
      }
      persistLocally();
      setIsSaved(true);
      showSuccess('✓ Your profile has been saved successfully!');
      scrollToFeedback('top');
      scrollToSuccess();
    } catch (error) {
      persistLocally();
      const errorMessage = error.message && error.message !== 'Profile API unavailable'
        ? error.message
        : 'Unable to save personal information. Please try again.';
      setErrors({});
      showError(errorMessage);
      setIsSaved(false);
      setIsNavigating(false);
      scrollToFeedback('error');
      return { success: false, localOnly: true, data: fullProfile };
    } finally {
      setIsSaving(false);
    }

    if (!redirect) {
      setIsNavigating(false);
      window.setTimeout(() => setIsSaved(false), 3000);
    }
    if (redirect) {
      window.setTimeout(() => {
        if (onContinue) {
          onContinue(fullProfile);
        } else {
          navigate('/ai-career-matches', { replace: true, state: { profile: fullProfile, openMatch: true } });
        }
      }, 0);
    }
    return { success: true, data: fullProfile };
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-[#f8fbfd] text-slate-900 dark:bg-[#f8fbfd]">
      <main className="information-page profile-readable mx-auto min-w-0 w-full max-w-6xl space-y-7 overflow-x-hidden px-5 py-10 pb-12 font-sans leading-relaxed sm:px-8 lg:px-10">
        <header className="space-y-3 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Personal Profile Setup</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-normal leading-relaxed text-slate-600 sm:text-base">
            Add your experience and preferences so we can find roles that fit your strengths.
          </p>
        </header>

        {isSaved && <div id="success-banner" role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-5 w-5" />your profile saved succussfuly</div>}

      {/* Personal Information */}
      <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-10">
        <div className="my-6 flex justify-center">
          <h3 className="inline-flex items-center justify-center rounded-full border border-blue-200/80 bg-blue-50 px-4 py-1.5 text-xs font-bold tracking-wide text-blue-900 shadow-xs sm:text-sm">Personal Information</h3>
        </div>

        <div className="grid grid-cols-1 gap-x-5 gap-y-7 text-sm md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>Full Name</label>
            <input data-profile-field="fullName" aria-invalid={Boolean(errors.fullName)} type="text" placeholder="Your full name" value={profileData.fullName} onChange={(e) => updateProfileField('fullName', e.target.value)} onBlur={() => validateField('fullName')} className={inputClass('fullName')} />
            {errors.fullName && (
              <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                <span>⚠️</span>
                <span>{errors.fullName}</span>
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input data-profile-field="email"
              type="email" aria-invalid={Boolean(errors.email)}
              placeholder="you@example.com"
              value={profileData.email} 
              onChange={(e) => updateProfileField('email', e.target.value)}
              className={inputClass('email')}
              onBlur={() => validateField('email')}
            />
            {errors.email && (
              <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                <span>⚠️</span>
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Phone Number</label>
            <PhoneInputWithCountry
              id="phone"
              countryCode={profileData.country_code}
              phoneNumber={profileData.phone_number}
              error={Boolean(errors.phone)}
              onChange={({ countryCode, phoneNumber, phone }) => {
                setProfileData((current) => ({
                  ...current,
                  country_code: countryCode,
                  phone_number: phoneNumber,
                  phone,
                }));
                setErrors((current) => ({ ...current, phone: undefined }));
              }}
              onBlur={() => validateField('phone')}
            />
            {errors.phone && (
              <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                <span>⚠️</span>
                <span>{errors.phone}</span>
              </p>
            )}
          </div>

          <div className="hidden">
            <label className={labelClass}>Date of Birth <span className="ml-1.5 text-xs font-medium text-slate-500">(Optional)</span></label>
            <input 
              type="date" 
              value={profileData.dob} 
              onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div className="hidden">
            <label className={labelClass}>Gender <span className="ml-1.5 text-xs font-medium text-slate-500">(Optional)</span></label>
            <SearchableSelect
              value={profileData.gender}
              onChange={(value) => setProfileData({ ...profileData, gender: value })}
              options={['Male', 'Female', 'Other']}
              placeholder="Select gender"
              className={`${fieldClass} !bg-white`}
            />
          </div>

          <div>
            <label className={labelClass}>City / Location</label>
            <input data-profile-field="city" aria-invalid={Boolean(errors.city)} type="text" placeholder="Addis Ababa, Dire Dawa, Hawassa, or Remote" value={profileData.city} onChange={(e) => updateProfileField('city', e.target.value)} onBlur={() => validateField('city')} className={inputClass('city')} />
            <FieldError message={errors.city} />
          </div>
        </div>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:ml-4 sm:p-7">
        <div className="text-center">
          <div className="my-6 flex justify-center">
            <h3 className="inline-flex items-center justify-center rounded-full border border-blue-200/80 bg-blue-50 px-4 py-1.5 text-xs font-bold tracking-wide text-blue-900 shadow-xs sm:text-sm">Job Preferences</h3>
          </div>
          <p className="mt-2 max-w-2xl text-sm font-normal leading-relaxed text-slate-600 sm:text-base">These details help us calculate accurate job matches.</p>
        </div>
        <div className="grid grid-cols-1 gap-x-5 gap-y-7 text-sm md:grid-cols-2">
          <div>
            <label className={labelClass}>Industry / Sector</label>
            <SearchableSelect data-profile-field="jobCategory" aria-invalid={Boolean(errors.jobCategory)} value={profileData.jobCategory} onChange={handleJobCategoryChange} onBlur={() => validateField('jobCategory')} options={ETHIOPIAN_SECTORS} placeholder="Select an industry / sector" className={`${inputClass('jobCategory')} profile-job-preference-select !text-sm`} />
            <FieldError message={errors.jobCategory} />
          </div>
          <div className={`relative ${subSectorDropdownOpen ? 'z-50' : ''}`} ref={subSectorDropdownRef}>
            <label className={labelClass}>Specialization / Sub-sectors (Select up to 4)</label>
            <div className="relative">
              <button
                type="button"
                data-profile-field="subSectors"
                aria-invalid={Boolean(errors.subSectors)}
                aria-expanded={subSectorDropdownOpen}
                aria-haspopup="listbox"
                disabled={!profileData.jobCategory}
                onClick={() => setSubSectorDropdownOpen((open) => !open)}
                className={`${inputClass('subSectors')} flex items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span className={profileData.subSectors.length ? 'truncate text-slate-900' : 'truncate text-slate-500'}>
                  {profileData.subSectors.length
                    ? `${profileData.subSectors.length} of 4 selected`
                    : 'Select up to 4 Sub-sectors'}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${subSectorDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {subSectorDropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={subSectorSearch}
                      onChange={(event) => setSubSectorSearch(event.target.value)}
                      placeholder="Search..."
                      aria-label="Search sub-sectors"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                  <div className="mt-2 max-h-60 overflow-y-auto" role="listbox" aria-multiselectable="true">
                    {filteredSubSectors.map((subSector) => {
                        const checked = profileData.subSectors.includes(subSector);
                        const atLimit = profileData.subSectors.length >= 4 && !checked;
                        return (
                          <label
                            key={subSector}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-800 hover:bg-blue-50 ${atLimit ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={atLimit}
                              onChange={() => updateProfileField(
                                'subSectors',
                                checked
                                  ? profileData.subSectors.filter((item) => item !== subSector)
                                  : [...profileData.subSectors, subSector],
                              )}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{subSector}</span>
                          </label>
                        );
                      })}
                    {filteredSubSectors.length === 0 && (
                      <p className="px-2.5 py-3 font-sans text-sm font-medium leading-relaxed text-slate-600">No matching sub-sectors.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {profileData.subSectors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {profileData.subSectors.map((subSector) => (
                  <span key={subSector} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                    {subSector}
                    <button
                      type="button"
                      aria-label={`Remove ${subSector}`}
                      onClick={() => updateProfileField('subSectors', profileData.subSectors.filter((item) => item !== subSector))}
                      className="rounded-full text-blue-700 hover:text-blue-950"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <FieldError message={errors.subSectors} />
          </div>
          <div>
            <label className={labelClass}>Desired Job Title</label>
            <input data-profile-field="desiredPosition" aria-invalid={Boolean(errors.desiredPosition)} type="text" placeholder="e.g. Frontend Developer, Software Engineer..." value={cleanDesiredJobTitle(profileData.preferredJob) || ""} onChange={(e) => updateProfileField('preferredJob', e.target.value)} onBlur={() => validateField('desiredPosition')} className={inputClass('desiredPosition')} />
            <FieldError message={errors.desiredPosition} />
          </div>
          <div>
            <label className={labelClass}>Experience Level</label>
            <SearchableSelect data-profile-field="experienceLevel" aria-invalid={Boolean(errors.experienceLevel)} value={profileData.experienceLevel} onChange={(value) => updateProfileField('experienceLevel', value)} onBlur={() => validateField('experienceLevel')} options={experienceLevels.map((level) => ({ value: level, label: level === 'Entry level' ? 'Entry level (0-1 yrs)' : level === 'Junior' ? 'Junior (1-3 yrs)' : level === 'Intermediate' ? 'Intermediate (3-5 yrs)' : level === 'Senior' ? 'Senior (5+ yrs)' : 'Expert (8+ yrs)' }))} placeholder="Select experience level" className={`${inputClass('experienceLevel')} profile-job-preference-select !text-sm`} />
            <FieldError message={errors.experienceLevel} />
          </div>
          <div>
            <label className={labelClass}>Work Setup Preference</label>
            <SearchableSelect data-profile-field="workSetup" aria-invalid={Boolean(errors.workSetup)} value={profileData.preferredWorkSetup} onChange={(value) => updateProfileField('preferredWorkSetup', value)} onBlur={() => validateField('workSetup')} options={workSetups} placeholder="Select work setup" className={`${inputClass('workSetup')} profile-job-preference-select !text-sm`} />
            <FieldError message={errors.workSetup} />
          </div>
          <div>
            <label className={labelClass}>Expected Salary (ETB/month)</label>
            <input data-profile-field="expectedSalary" aria-invalid={Boolean(errors.expectedSalary)} type="text" inputMode="numeric" placeholder="Enter a range, e.g. 25,000 - 45,000 ETB/month" value={profileData.salaryExpectation} onChange={(e) => updateProfileField('salaryExpectation', e.target.value)} onBlur={() => validateField('expectedSalary')} className={inputClass('expectedSalary')} />
            <FieldError message={errors.expectedSalary} />
          </div>
          <div>
            <label className={labelClass}>Education Level</label>
            <SearchableSelect value={profileData.educationLevel} onChange={(value) => updateProfileField('educationLevel', value)} options={educationLevels} placeholder="Select education level" className={`${fieldClass} profile-job-preference-select !text-sm`} />
          </div>
          <div className="md:col-span-2 pt-5">
            <label className={labelClass}>Skills ({skills.length})</label>
            {profileData.jobCategory && suggestedSkills.length > 0 && (
              <div className="mb-4">
                <p className="mt-2.5 mb-2 font-sans text-sm font-medium leading-relaxed text-slate-600">Suggested skills for {profileData.jobCategory} — click to add:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedSkills.map((skill) => {
                    const alreadySelected = skills.some((selectedSkill) => selectedSkill.toLowerCase() === skill.toLowerCase());
                    return (
                      <button
                        key={skill}
                        type="button"
                        disabled={alreadySelected}
                        onClick={() => addSkills([skill])}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${alreadySelected ? 'cursor-default border-slate-200 bg-slate-100 text-slate-600' : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100'}`}
                      >
                        {skill}{alreadySelected ? ' Added' : ' +'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mb-3 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill.toLowerCase()} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-bold text-blue-800">
                  {skill}
                  <button type="button" onClick={() => handleRemoveSkill(skill)} aria-label={`Remove ${skill}`} className="rounded-full text-blue-600 hover:text-blue-900">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input data-profile-field="skills" aria-invalid={Boolean(errors.skills)} type="text" placeholder="Type skills separated by commas, or enter one skill" value={newSkill} onChange={(e) => handleSkillInputChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())} onBlur={() => validateField('skills')} className={`${fieldClass} flex-1`} />
              <button type="button" onClick={handleAddSkill} className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">Add</button>
            </div>
            <FieldError message={errors.skills} />
          </div>

          <div className="md:col-span-2 pt-5">
            <label className={labelClass}>Languages <span className="ml-1.5 text-xs font-medium text-slate-500">(Optional)</span></label>
            <div className="mb-3 flex flex-wrap gap-2">
              {languages.map((lang, index) => (
                <span key={`${lang}-${index}`} className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-800">
                  {lang}
                </span>
              ))}
            </div>
            <div className="flex gap-4">
              <input type="text" placeholder="Add a language (e.g. Amharic, English)" value={newLang} onChange={(e) => setNewLang(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLanguage())} className={`${fieldClass} flex-1`} />
            </div>
          </div>

          <div className="md:col-span-2 pt-5">
            <label className={labelClass}>Job Type / Employment Type <span className="ml-0.5 text-rose-500">*</span></label>
            <SearchableSelect
              data-profile-field="jobType"
              aria-invalid={Boolean(errors.jobType)}
              value={profileData.jobType}
              onChange={(value) => updateProfileField('jobType', value)}
              onBlur={() => validateField('jobType')}
              options={jobTypes}
              placeholder="Select job type"
              className={inputClass('jobType')}
            />
            <FieldError message={errors.jobType} />
          </div>

          <div className="md:col-span-2 pt-5">
            <label className={labelClass}>Professional Bio <span className="ml-1.5 text-xs font-medium text-slate-500">(Optional, max 500 characters)</span></label>
            <textarea rows={4} maxLength={500} placeholder="Briefly describe your professional strengths..." value={profileData.bio} onChange={(e) => updateProfileField('bio', e.target.value)} onBlur={() => validateField('bio')} className={`${inputClass('bio')} h-auto`} />
            <div className="mt-1 flex justify-between"><FieldError message={errors.bio} /><span className="text-xs text-slate-400">{profileData.bio.length}/500</span></div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center border-t border-slate-200/80 pt-8">
          <button
            type="button"
            disabled={isSaving || isNavigating}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleSaveProfile(true);
            }}
            className="primary-button flex items-center gap-2 rounded-xl px-7 py-4 text-base shadow-lg shadow-[#56a2d8]/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f0f7fc] hover:text-[#2b73a4] hover:shadow-2xl hover:shadow-[#56a2d8]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-5 w-5 animate-spin" />}
            <span>{isNavigating ? 'Analyzing & Matching Jobs...' : isSaving ? 'Saving Profile...' : 'Save & Continue'}</span>
          </button>
        </div>
      </div>

      </div>

      {/* Portfolio Links */}
      <div className="hidden bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 border-slate-200">Portfolio &amp; Links <span className="ml-1.5 text-xs font-medium text-slate-500">(Optional)</span></h3>

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
      <div className="hidden space-y-6 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-8 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 border-slate-200">Job Preferences <span className="ml-1.5 text-xs font-medium text-slate-500">(Optional)</span></h3>

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
            <SearchableSelect
              value={profileData.employmentType}
              onChange={(value) => setProfileData({ ...profileData, employmentType: value })}
              options={['Full-Time', 'Part-Time', 'Contract', 'Internship']}
              placeholder="Select employment type"
              className={`${fieldClass} !bg-white`}
            />
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
            <SearchableSelect
              value={profileData.preferredWorkSetup}
              onChange={(value) => setProfileData({ ...profileData, preferredWorkSetup: value })}
              options={['Remote', 'Hybrid', 'On-site']}
              placeholder="Select work setup"
              className={`${fieldClass} !bg-white`}
            />
          </div>
        </div>
      </div>
      </main>
    </div>
  );
};

export default Profile;