import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Globe, 
  MapPin, 
  Users, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2 
} from 'lucide-react';

const CompanyInfo = ({
  user,
  onComplete
}) => {
  const navigate = useNavigate();
  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  const [fullName, setFullName] = useState(currentUser.full_name || currentUser.name || '');
  const [position, setPosition] = useState(currentUser.position || currentUser.job_title || '');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companyEmail, setCompanyEmail] = useState(currentUser.email || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phone || '');
  const [companyType, setCompanyType] = useState('Private');
  const [companySize, setCompanySize] = useState('11-50');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadCompany = () => {
      try {
        const company = JSON.parse(localStorage.getItem('user') || '{}').companyInfo;
        if (!company) return;
        setFullName(company.full_name || currentUser.full_name || currentUser.name || '');
        setPosition(company.position || currentUser.position || currentUser.job_title || '');
        setCompanyName(company.company_name || '');
        setIndustry(company.industry || '');
        setCompanyEmail(company.company_email || currentUser.email || '');
        setPhoneNumber(company.phone_number || currentUser.phone || '');
        setCompanyType(company.company_type || 'Private');
        setCompanySize(company.company_size || '11-50');
        setCountry(company.country || '');
        setCity(company.city || '');
        setAddress(company.location || '');
        setWebsite(company.website || '');
        setLogoUrl(company.logo_url || '');
      } catch (error) {
        console.error('Unable to load company information:', error);
      }
    };
    loadCompany();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const profile = {
      full_name: fullName,
      position,
      company_name: companyName,
      company_email: companyEmail,
      phone_number: phoneNumber,
      industry,
      company_type: companyType,
      company_size: companySize,
      country,
      city,
      location: address,
      website,
      logo_url: logoUrl,
    };

    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, companyInfo: profile, isOnboardingComplete: true }));
      if (onComplete) onComplete(profile);
      else navigate('/employee-profile-completion');
    } catch (err) {
      console.error(err);
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...storedUser,
        companyInfo: profile,
        isOnboardingComplete: true
      }));
      if (onComplete) onComplete(profile);
      else navigate('/employee-profile-completion');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="information-page w-full max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Step 4: Employer Information</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Employer Information
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Add your basic company information to continue to your employer profile.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 text-emerald-800 text-xs font-bold self-start sm:self-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Employer Verified</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-sm space-y-8">
        <section>
          <h3 className="mb-4 text-lg font-black text-slate-900">Employer / Contact Information</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Full Name *</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Hana Bekele" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Position / Job Title *</label>
              <input type="text" required value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Human Resources Manager" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all" />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-lg font-black text-slate-900">Company Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="md:col-span-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
              Company Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. AfriCloud Technologies"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base outline-none focus:border-indigo-600 focus:bg-white transition-all"
              />
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Work Email *</label>
            <input type="email" required readOnly value={companyEmail} className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-500" />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Phone Number *</label>
            <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="e.g. +251 911 000 000" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base outline-none focus:border-indigo-600 focus:bg-white transition-all" />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
              Industry Domain
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base outline-none focus:border-indigo-600 focus:bg-white transition-all"
            >
              <option value="Technology & Cloud Infrastructure">Technology & Cloud Infrastructure</option>
              <option value="Fintech & Banking">Fintech & Banking</option>
              <option value="AI & Machine Learning">AI & Machine Learning</option>
              <option value="E-Commerce & Retail">E-Commerce & Retail</option>
              <option value="Healthcare & BioTech">Healthcare & BioTech</option>
              <option value="Telecom & Networks">Telecom & Networks</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Company Type *</label>
            <select required value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base outline-none focus:border-indigo-600 focus:bg-white transition-all">
              <option>Private</option><option>NGO</option><option>Government</option><option>Startup</option><option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Company Size *</label>
            <select required value={companySize} onChange={(e) => setCompanySize(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base outline-none focus:border-indigo-600 focus:bg-white transition-all">
              <option value="1-10">1-10</option><option value="11-50">11-50</option><option value="51-200">51-200</option><option value="201-500">201-500</option><option value="500+">500+</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
              Country *
            </label>
            <input type="text" required value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Ethiopia" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base outline-none focus:border-indigo-600 focus:bg-white transition-all" />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Region / City *</label>
            <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Addis Ababa" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base outline-none focus:border-indigo-600 focus:bg-white transition-all" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Address *</label>
            <div className="relative">
              <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address, building, or office location" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base outline-none focus:border-indigo-600 focus:bg-white transition-all" />
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
              Company Website
            </label>
            <div className="relative">
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base outline-none focus:border-indigo-600 focus:bg-white transition-all"
              />
              <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Company Logo URL</label>
            <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base outline-none focus:border-indigo-600 focus:bg-white transition-all" />
          </div>

        </div>
  </section>

        <button
          id="employer-complete-profile-btn"
          type="submit"
          disabled={isSaving}
          className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base sm:text-lg rounded-2xl shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
        >
          {isSaving ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Save and Continue</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

    </div>
  );
};

export default CompanyInfo;
