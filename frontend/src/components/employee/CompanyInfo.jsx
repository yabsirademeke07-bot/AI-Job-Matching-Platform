import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Building2, Sparkles, User } from 'lucide-react';
import officeImage from '../../pages/images/images3.jpg';

const hiringVolumeOptions = ['1-5 Hires', '6-20 Hires', '20+ Scaled Hiring', 'Continuous Talent Pool'];
const companySizeOptions = ['1-10', '11-50', '51-200', '201-500', '1000+'];
const industryOptions = ['Technology & Cloud Infrastructure', 'Fintech & Banking', 'AI & Machine Learning', 'E-Commerce & Retail', 'Healthcare & BioTech', 'Telecom & Networks'];
const phoneOperatorOptions = [
  { value: 'ethio-telecom', label: 'Ethio Telecom' },
  { value: 'safaricom', label: 'Safaricom Ethiopia' },
];
const inputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-all hover:bg-slate-50 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/10';
const labelClass = 'mb-1.5 block text-xs sm:text-sm font-bold text-slate-800';

const normalizePhoneNumber = (number = '', operator = 'ethio-telecom') => {
  const digits = String(number || '').replace(/\D/g, '').slice(0, 9);
  if (!digits) return '';
  const allowedStarts = operator === 'safaricom' ? ['7'] : ['9'];
  const normalized = allowedStarts.includes(digits[0]) ? digits : digits;
  return normalized ? `+251${normalized}` : '';
};

export default function CompanyInfo({ user, onComplete }) {
  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  const slides = [
    {
      badge: '✨ AI-POWERED RECRUITMENT INTELLIGENCE',
      heading: 'Build & Scale Your High-Performing Team.',
      description: 'Connect with verified top-tier professionals matched precisely to your company culture and technical needs.',
    },
    {
      badge: '⚡ 10X FASTER HIRING PIPELINE',
      heading: 'Hire Top 1% AI-Matched Talent Faster.',
      description: 'Eliminate manual CV screening with automated skill scoring and instant interview scheduling.',
    },
  ];
  const initialPhoneDigits = String(currentUser.phone || '').replace(/\D/g, '').replace(/^251/, '').replace(/^0/, '').slice(0, 9);
  const [phoneOperator, setPhoneOperator] = useState(() => (String(currentUser.phone || '').replace(/\D/g, '').startsWith('7') ? 'safaricom' : 'ethio-telecom'));
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneDigits);
  const [form, setForm] = useState({
    representative_name: currentUser.full_name || currentUser.name || '',
    representative_title: '',
    work_email: currentUser.email || '',
    phone: normalizePhoneNumber(initialPhoneDigits, phoneOperator),
    company_name: '',
    industry: industryOptions[0],
    company_size: '11-50',
    location: '',
    website: '',
    linkedin: '',
    description: '',
    hiring_volume: hiringVolumeOptions[0],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    setForm((current) => ({ ...current, phone: normalizePhoneNumber(phoneNumber, phoneOperator) }));
  }, [phoneNumber, phoneOperator]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((previous) => (previous + 1) % slides.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [slides.length]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const response = await fetch('/api/employer/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ ...form, social_media_urls: { linkedin: form.linkedin } }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to save company profile.');
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, companyInfo: form, isOnboardingComplete: true }));
      if (onComplete) onComplete(form);
      else window.location.assign('/employer/dashboard');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save company profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-slate-100 lg:block">
          <img
            src={officeImage}
            alt="Collaborative Office Team"
            className="absolute inset-0 h-full w-full object-cover object-[30%_top] select-none pointer-events-none transition-all duration-700 lg:object-[center_top]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent" />
          <div className="absolute inset-0 flex items-end p-8 lg:p-12">
            <div className="w-full max-w-xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlideIndex}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
                    <span>{slides[currentSlideIndex].badge}</span>
                  </div>

                  <h1 className="text-3xl font-black leading-tight tracking-tight text-white drop-shadow-md lg:text-4xl">
                    {slides[currentSlideIndex].heading}
                  </h1>

                  <div className="max-w-lg rounded-2xl border border-white/20 bg-white/10 p-4 text-xs leading-relaxed text-white/90 shadow-xl backdrop-blur-md sm:p-5 sm:text-sm">
                    <p>{slides[currentSlideIndex].description}</p>
                    <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-3 text-[11px] font-bold text-emerald-400">
                      <span>✓ 98.4% AI Match Accuracy</span>
                      <span>•</span>
                      <span>Verified Profiles</span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 flex items-center gap-2">
                {slides.map((_, index) => (
                  <span
                    key={index}
                    className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                      index === currentSlideIndex ? 'bg-white shadow-lg shadow-white/50' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="bg-white p-6 text-left h-full lg:overflow-y-auto sm:p-10 lg:p-12">
          <div className="mx-auto max-w-xl">
            <header className="mb-8">
              <h1 className="mb-1.5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Company Profile Setup</h1>
              <p className="mb-8 text-xs font-medium text-slate-500 sm:text-sm">Add the essential information candidates need to understand your organization.</p>
            </header>

            {error && <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">{error}</p>}

            <form onSubmit={handleSave} className="space-y-6">
              <section>
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-black text-slate-900">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>Representative Information</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full Name" value={form.representative_name} onChange={(value) => update('representative_name', value)} required />
                  <Field label="Job Title / Position" value={form.representative_title} onChange={(value) => update('representative_title', value)} required />
                  <Field label="Work Email" type="email" value={form.work_email} onChange={(value) => update('work_email', value)} required />
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Phone Number</label>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={phoneOperator}
                        onChange={(event) => setPhoneOperator(event.target.value)}
                        className={`${inputClass} w-[180px] shrink-0`}
                      >
                        {phoneOperatorOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <input
                        required
                        type="tel"
                        inputMode="numeric"
                        value={phoneNumber}
                        onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="912345678"
                        className={`${inputClass} flex-1`}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-black text-slate-900">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span>Company Identity</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company Name" value={form.company_name} onChange={(value) => update('company_name', value)} required />
                  <Field label="Industry" select options={industryOptions} value={form.industry} onChange={(value) => update('industry', value)} required />
                  <Field label="Company Size" select options={companySizeOptions} value={form.company_size} onChange={(value) => update('company_size', value)} required />
                  <Field label="Headquarters Location" value={form.location} onChange={(value) => update('location', value)} required />
                  <Field label="Target Candidates / Hiring Volume" select options={hiringVolumeOptions} value={form.hiring_volume} onChange={(value) => update('hiring_volume', value)} required />
                  <Field label="Website" type="url" value={form.website} onChange={(value) => update('website', value)} placeholder="https://example.com" />
                  <Field label="Social Media Link" type="url" value={form.linkedin} onChange={(value) => update('linkedin', value)} placeholder="https://linkedin.com/company/..." />
                  <div className="sm:col-span-2">
                    <label className={labelClass}>About Company
                      <textarea
                        rows={3}
                        value={form.description}
                        onChange={(event) => update('description', event.target.value)}
                        className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-all hover:bg-slate-50 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:text-sm"
                        placeholder="Briefly describe what your organization does..."
                      />
                    </label>
                  </div>
                </div>
              </section>

              <button type="submit" disabled={isSaving} className="mt-6 flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-xs font-black text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.99] sm:text-sm">
                {isSaving ? 'Saving...' : 'Save & Continue to Dashboard →'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', select = false, options = [], required = false, placeholder }) {
  return <label className={labelClass}>{label}{select ? <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className={`mt-2 ${inputClass}`}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`mt-2 ${inputClass}`} />}</label>;
}
