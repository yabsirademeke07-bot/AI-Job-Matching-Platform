import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import JobCard from '../components/JobCard';
import {
  Search,
  MapPin,
  Briefcase,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SECTORS = [
  'Select sector',
  'Agriculture',
  'Architecture & Urban Planning',
  'Beauty & Grooming',
  'Brokerage & Case Closing',
  'Chemical & Biomedical Engineering',
  'Construction & Civil Engineering',
  'Creative Art & Design',
  'Customer Service & Care',
  'Documentation & Writing',
  'Event Management & Organization',
  'Food & Drink Preparation / Service',
  'Healthcare',
  'Hospitality & Tourism',
  'Human Resource & Talent Management',
  'Information Technology',
  'Installation & Maintenance',
  'Janitorial & Office Services',
  'Labor & Masonry',
  'Logistics & Supply Chain',
  'Mechanical & Electrical Engineering',
  'Multimedia Content Production',
  'Pharmaceutical',
  'Psychiatry, Psychology & Social Work',
  'Sales & Promotion',
  'Secretarial & Office Management',
  'Security & Safety',
  'Retail & Office Support',
  'Software Design & Development',
  'Transportation & Delivery',
  'Veterinary',
  'Woodwork & Carpentry',
  'Fashion / Clothing & Textile',
  'Media & Entertainment',
  'Environmental, Mining & Energy Engineering',
  'Law & Legal Advocacy',
  'Marketing',
  'Journalism & Communication',
  'Business Administration & Operations',
  'Research Services',
  'Data Science & Analytics',
  'Teaching & Education',
  'Tutoring, Training & Mentorship',
  'Gardening & Landscaping',
  'Horticulture',
  'Livestock & Animal Husbandry',
  'Manufacturing & Production',
  'Purchasing & Procurement',
  'Translation & Transcription',
  'Accounting & Finance',
  'Advisory & Consultancy',
  'Aeronautics & Aerospace',
];

const JOB_TYPES = [
  { label: 'Full-time', value: 'full-time' },
  { label: 'Part-time', value: 'part-time' },
  { label: 'Freelance', value: 'freelance' },
  { label: 'Contractual', value: 'contract' },
  { label: 'Volunteer', value: 'volunteer' },
  { label: 'Intern (Paid)', value: 'intern-paid' },
  { label: 'Intern (Unpaid)', value: 'intern-unpaid' },
];

const WORK_MODES = [
  { label: 'On-site', value: 'on-site' },
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
];

const EXPERIENCE_LEVELS = [
  { label: 'Entry level', value: 'entry level' },
  { label: 'Junior', value: 'junior' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Senior', value: 'senior' },
  { label: 'Expert', value: 'expert' },
];

const EDUCATION_LEVELS = [
  { label: 'Not Required', value: 'not required' },
  { label: 'Primary School', value: 'primary school' },
  { label: 'Middle School', value: 'middle school' },
  { label: 'High School', value: 'high school' },
  { label: 'Certificate', value: 'certificate' },
  { label: 'Tvet', value: 'tvet' },
  { label: 'Diploma', value: 'diploma' },
  { label: 'Bachelor’s Degree', value: 'bachelor' },
  { label: 'Postgraduate Diploma', value: 'postgraduate diploma' },
  { label: 'Master’s Degree', value: 'master' },
  { label: 'Phd', value: 'phd' },
];

const GENDER_PREFERENCES = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

const FilterSection = ({ title, isOpen, onToggle, children }) => (
  <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-slate-900"
    >
      <span>{title}</span>
      {isOpen ? (
        <ChevronUp className="h-5 w-5 text-slate-500" />
      ) : (
        <ChevronDown className="h-5 w-5 text-slate-500" />
      )}
    </button>
    {isOpen && <div className="space-y-3 border-t border-slate-100 px-5 py-4">{children}</div>}
  </div>
);

const formatSalary = (min, max, currency) => {
  if (min && max)
    return `${currency || '$'} ${Number(min).toLocaleString()} - ${currency || '$'} ${Number(max).toLocaleString()}`;
  if (min) return `${currency || '$'} ${Number(min).toLocaleString()}+`;
  if (max) return `${currency || '$'} up to ${Number(max).toLocaleString()}`;
  return 'Salary undisclosed';
};

const ExploreJobs = () => {
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState(SECTORS[0]);
  const [sectorSearch, setSectorSearch] = useState('');
  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false);
  const [selectedJobTypes, setSelectedJobTypes] = useState([]);
  const [selectedWorkMode, setSelectedWorkMode] = useState('');
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState('');
  const [selectedEducationLevel, setSelectedEducationLevel] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openSections, setOpenSections] = useState({
    jobTypes: true,
    workModes: true,
    experience: false,
    education: false,
    gender: false,
  });

  const sectorDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sectorDropdownRef.current && !sectorDropdownRef.current.contains(event.target)) {
        setSectorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSectors = SECTORS.filter(
    (item) =>
      item !== 'Select sector' &&
      item.toLowerCase().includes(sectorSearch.toLowerCase())
  );

  const toggleSection = (name) => {
    setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleCheckbox = (current, value, setter) => {
    if (current.includes(value)) {
      setter(current.filter((item) => item !== value));
    } else {
      setter([...current, value]);
    }
  };

  const buildParams = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.append('ft_title_desc', query.trim());
    if (sector && sector !== SECTORS[0]) params.append('sector', sector);
    selectedJobTypes.forEach((type) => params.append('job_type', type));
    if (selectedWorkMode) params.append('work_mode', selectedWorkMode);
    if (selectedExperienceLevel) params.append('experience_level', selectedExperienceLevel);
    if (selectedEducationLevel) params.append('education_level', selectedEducationLevel);
    if (selectedGender) params.append('gender_preference', selectedGender);
    if (minSalary) params.append('salary_min', minSalary);
    return params;
  };

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/jobs', {
        params: buildParams(),
      });
      const payload = response.data;
      setJobs(Array.isArray(payload) ? payload : payload.jobs ?? []);
    } catch (err) {
      setError('Unable to load jobs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [
    query,
    sector,
    selectedJobTypes,
    selectedWorkMode,
    selectedExperienceLevel,
    selectedEducationLevel,
    selectedGender,
    minSalary,
  ]);

  const clearFilters = () => {
    setQuery('');
    setSector(SECTORS[0]);
    setSelectedJobTypes([]);
    setSelectedWorkMode('');
    setSelectedExperienceLevel('');
    setSelectedEducationLevel('');
    setSelectedGender('');
    setMinSalary('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Explore Jobs</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">Discover your next role</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Search and filter the job board with sector, mode, type, experience, education, and more.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex w-full items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm sm:w-[420px]">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search jobs, companies, or skills"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
              <p className="mt-1 text-sm text-slate-600">Refine jobs with the filters below.</p>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Sector
                </label>

                <div className="relative mt-3" ref={sectorDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setSectorDropdownOpen((open) => !open)}
                    className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:border-slate-300"
                  >
                    <span className={sector === 'Select sector' ? 'text-slate-400' : 'text-slate-900'}>
                      {sector}
                    </span>
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  </button>

                  {sectorDropdownOpen && (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
                      <div className="border-b border-slate-200 px-4 py-3">
                        <input
                          value={sectorSearch}
                          onChange={(e) => setSectorSearch(e.target.value)}
                          placeholder="Search for sector..."
                          className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>

                      <div className="max-h-64 overflow-y-auto">
                        {filteredSectors.length > 0 ? (
                          filteredSectors.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => {
                                setSector(item);
                                setSectorDropdownOpen(false);
                                setSectorSearch('');
                              }}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                                sector === item
                                  ? 'bg-slate-100 text-slate-900 font-semibold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className={`h-2 w-2 rounded-full ${sector === item ? 'bg-slate-900' : 'bg-transparent'}`} />
                              {item}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-4 text-sm text-slate-500">No sectors found.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Minimum salary
                </label>
                <input
                  id="salary"
                  type="number"
                  min="0"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  placeholder="e.g. 30000"
                  className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {/* Multiple Selection (Checkbox) */}
              <FilterSection
                title="Job Types"
                isOpen={openSections.jobTypes}
                onToggle={() => toggleSection('jobTypes')}
              >
                <div className="space-y-2">
                  {JOB_TYPES.map((type) => {
                    const isChecked = selectedJobTypes.includes(type.value);
                    return (
                      <label
                        key={type.value}
                        className={`flex cursor-pointer items-center justify-between rounded-3xl border px-4 py-3 text-sm font-medium transition ${
                          isChecked
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span>{type.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            toggleCheckbox(selectedJobTypes, type.value, setSelectedJobTypes)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                        />
                      </label>
                    );
                  })}
                </div>
              </FilterSection>

              {/* Single Selection (Radio) */}
              <FilterSection
                title="Job Sites"
                isOpen={openSections.workModes}
                onToggle={() => toggleSection('workModes')}
              >
                <div className="space-y-2">
                  {WORK_MODES.map((mode) => (
                    <label
                      key={mode.value}
                      className={`flex cursor-pointer items-center justify-between rounded-3xl border px-4 py-3 text-sm transition ${
                        selectedWorkMode === mode.value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{mode.label}</span>
                      <input
                        type="radio"
                        name="workMode"
                        value={mode.value}
                        checked={selectedWorkMode === mode.value}
                        onChange={() =>
                          setSelectedWorkMode(selectedWorkMode === mode.value ? '' : mode.value)
                        }
                        className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                      />
                    </label>
                  ))}
                </div>
              </FilterSection>

              {/* Single Selection (Radio) */}
              <FilterSection
                title="Experience Level"
                isOpen={openSections.experience}
                onToggle={() => toggleSection('experience')}
              >
                <div className="space-y-2">
                  {EXPERIENCE_LEVELS.map((level) => (
                    <label
                      key={level.value}
                      className={`flex cursor-pointer items-center justify-between rounded-3xl border px-4 py-3 text-sm transition ${
                        selectedExperienceLevel === level.value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{level.label}</span>
                      <input
                        type="radio"
                        name="experience"
                        value={level.value}
                        checked={selectedExperienceLevel === level.value}
                        onChange={() =>
                          setSelectedExperienceLevel(
                            selectedExperienceLevel === level.value ? '' : level.value
                          )
                        }
                        className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                      />
                    </label>
                  ))}
                </div>
              </FilterSection>

              {/* Single Selection (Radio) */}
              <FilterSection
                title="Education Level"
                isOpen={openSections.education}
                onToggle={() => toggleSection('education')}
              >
                <div className="space-y-2">
                  {EDUCATION_LEVELS.map((level) => (
                    <label
                      key={level.value}
                      className={`flex cursor-pointer items-center justify-between rounded-3xl border px-4 py-3 text-sm transition ${
                        selectedEducationLevel === level.value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{level.label}</span>
                      <input
                        type="radio"
                        name="educationLevel"
                        value={level.value}
                        checked={selectedEducationLevel === level.value}
                        onChange={() =>
                          setSelectedEducationLevel(
                            selectedEducationLevel === level.value ? '' : level.value
                          )
                        }
                        className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                      />
                    </label>
                  ))}
                </div>
              </FilterSection>

              {/* Single Selection (Radio) */}
              <FilterSection
                title="Gender Preference"
                isOpen={openSections.gender}
                onToggle={() => toggleSection('gender')}
              >
                <div className="space-y-2">
                  {GENDER_PREFERENCES.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center justify-between rounded-3xl border px-4 py-3 text-sm transition ${
                        selectedGender === option.value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{option.label}</span>
                      <input
                        type="radio"
                        name="genderPreference"
                        value={option.value}
                        checked={selectedGender === option.value}
                        onChange={() =>
                          setSelectedGender(
                            selectedGender === option.value ? '' : option.value
                          )
                        }
                        className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                      />
                    </label>
                  ))}
                </div>
              </FilterSection>
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  {loading
                    ? 'Loading job listings...'
                    : jobs.length
                    ? `${jobs.length} job${jobs.length === 1 ? '' : 's'} found`
                    : 'No jobs found'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                {sector !== SECTORS[0] && (
                  <span className="rounded-full bg-slate-100 px-3 py-1">{sector}</span>
                )}
                {selectedJobTypes.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {selectedJobTypes.join(', ')}
                  </span>
                )}
                {selectedWorkMode && (
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {selectedWorkMode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-6">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white p-6"
                />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-lg font-semibold text-slate-900">No jobs match your filters.</p>
              <p className="mt-2 text-sm text-slate-600">
                Try broadening your search or removing a filter.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {jobs.map((job) => {
                const companyName =
                  job.company_name || job.company?.company_name || job.company || 'Unknown company';
                const logoUrl = job.logo_url || job.company?.logo_url;
                const location =
                  job.location ||
                  [job.city, job.country].filter(Boolean).join(', ') ||
                  'Location undisclosed';
                const skills = job.required_skills || job.skills || [];

                return (
                  <article
                    key={job.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100">
                            {logoUrl ? (
                              <img
                                src={logoUrl}
                                alt={`${companyName} logo`}
                                className="h-10 w-10 object-contain"
                              />
                            ) : (
                              <Briefcase className="h-6 w-6 text-slate-500" />
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-500">{companyName}</p>
                            <h2 className="text-2xl font-semibold text-slate-900">{job.title}</h2>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                            <MapPin className="h-4 w-4" />
                            {location}
                          </span>
                          {job.category && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                              <Briefcase className="h-4 w-4" />
                              {job.category}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {job.work_mode && (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                              {job.work_mode}
                            </span>
                          )}
                          {job.job_type && (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                              {job.job_type}
                            </span>
                          )}
                          {job.is_urgent && (
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
                              Urgent
                            </span>
                          )}
                          {job.is_featured && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                              Featured
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-4 lg:items-end">
                        <p className="text-lg font-semibold text-slate-900">
                          {formatSalary(job.salary_min, job.salary_max, job.currency || '$')}
                        </p>
                        <Link
                          to={`/jobs/${job.id}`}
                          className="inline-flex items-center rounded-3xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          View Details
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    {skills.length > 0 && (
                      <div className="mt-6 flex flex-wrap gap-2">
                        {skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-2xl bg-slate-100 px-3 py-1 text-sm text-slate-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ExploreJobs;