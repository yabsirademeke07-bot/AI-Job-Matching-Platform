import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Phone, MapPin, Briefcase, GraduationCap, Sparkles, ArrowRight } from 'lucide-react';
import { getApplicationJobId, getNextApplicationStep, hasCompletedProfile } from '../../utils/applicationFlow';

const PersonalInfo = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const applicationJobId = searchParams.get('jobId') || getApplicationJobId();
  const countryCodes = [
    { code: '+251', country: 'Ethiopia' },
    { code: '+1', country: 'United States / Canada' },
    { code: '+44', country: 'United Kingdom' },
    { code: '+33', country: 'France' },
    { code: '+49', country: 'Germany' },
    { code: '+91', country: 'India' },
    { code: '+254', country: 'Kenya' },
    { code: '+255', country: 'Tanzania' },
    { code: '+256', country: 'Uganda' },
    { code: '+27', country: 'South Africa' },
  ];

  const [countryCode, setCountryCode] = useState('+251');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    location: '',
    skills: '',
    education: '',
    experience: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.location) {
      setError('እባክዎን አስፈላጊ የሆኑ መረጃዎችን (ሙሉ ስም፣ ስልክ፣ እና አድራሻ) ይሙሉ፤');
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const personalInfo = {
      ...formData,
      phone: `${countryCode} ${formData.phone.replace(/^\+?\d+\s*/, '')}`,
      countryCode,
    };
    localStorage.setItem('user', JSON.stringify({ ...storedUser, personalInfo }));

    if (applicationJobId) {
      navigate(hasCompletedProfile() ? getNextApplicationStep(applicationJobId) : `/profile?jobId=${encodeURIComponent(applicationJobId)}`);
    } else {
      navigate('/upload-cv');
    }
  };

  return (
    <div className="information-page min-h-screen w-full bg-slate-100 flex items-start justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl bg-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl border border-slate-200">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Personal Information</h2>
          <p className="text-base text-slate-500 mt-2">የግልና የሙያ መረጃዎን ያስገቡ</p>
        </div>

        {error && <div className="mb-5 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200">{error}</div>}

        <form id="personal-info-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Full Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Tekeba Aweke" className="w-full pl-10 pr-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Phone *</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  aria-label="Country calling code"
                  className="w-32 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-sm text-slate-700 outline-none focus:border-blue-600"
                >
                  {countryCodes.map(({ code, country }) => (
                    <option key={code} value={code}>{code} {country}</option>
                  ))}
                </select>
                <div className="relative min-w-0 flex-1">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="912345678" inputMode="tel" className="w-full pl-10 pr-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Location *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Addis Ababa, Ethiopia" className="w-full pl-10 pr-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Education</label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input type="text" name="education" value={formData.education} onChange={handleChange} placeholder="BSc in Computer Science" className="w-full pl-10 pr-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Skills</label>
            <div className="relative">
              <Sparkles className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input type="text" name="skills" value={formData.skills} onChange={handleChange} placeholder="React, Node.js, Python" className="w-full pl-10 pr-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Experience</label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea name="experience" rows="3" value={formData.experience} onChange={handleChange} placeholder="Summary of your experience..." className="w-full pl-10 pr-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" />
            </div>
          </div>

          <button
            type="submit"
            className="primary-button w-full flex items-center justify-center gap-2 shadow-lg shadow-[#56a2d8]/25 hover:bg-[#f0f7fc] hover:text-[#2b73a4] hover:shadow-[#56a2d8]/30 active:scale-[0.98]"
          >
            <span>Continue to CV Upload</span>
            <ArrowRight className="h-4 w-4" />
          </button>

        </form>
      </div>
    </div>
  );
};

export default PersonalInfo;