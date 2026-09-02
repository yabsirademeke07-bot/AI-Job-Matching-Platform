import { useEffect, useState } from 'react';
import { Building2, ShieldCheck, User } from 'lucide-react';
import officeImage from '../../pages/images/images3.jpg';
import api from '../../services/api';

const hiringVolumeOptions = ['1-5 Hires', '6-20 Hires', '20+ Scaled Hiring', 'Continuous Talent Pool'];
const phoneOperatorOptions = [
  { value: 'ethio-telecom', label: 'Ethio Telecom' },
  { value: 'safaricom', label: 'Safaricom Ethiopia' },
];
const initialData = { repFullName: '', repPosition: '', workEmail: '', phone: '', companyName: '', industry: '', companySize: '11-50', hqLocation: '', website: '', linkedin: '', companySummary: '', hiringVolume: '1-5 Hires', isVerified: false };

const normalizePhoneNumber = (number = '', operator = 'ethio-telecom') => {
  const digits = String(number || '').replace(/\D/g, '').slice(0, 9);
  if (!digits) return '';
  return `+251${digits}`;
};

function fieldFromCompany(company = {}) {
  const socialUrls = company?.social_media_urls && typeof company.social_media_urls === 'object' ? company.social_media_urls : {};

  return {
    ...initialData,
    repFullName: company?.representative_name || '',
    repPosition: company?.representative_title || '',
    workEmail: company?.work_email || '',
    phone: company?.phone || '',
    companyName: company?.company_name || '',
    industry: company?.industry || '',
    companySize: company?.company_size || '11-50',
    hqLocation: company?.location || '',
    website: company?.website || '',
    companySummary: company?.company_summary || company?.description || '',
    hiringVolume: company?.hiring_volume || socialUrls?.hiring_volume || '1-5 Hires',
    linkedin: company?.linkedin || socialUrls?.linkedin || '',
    isVerified: company?.verification_status === 'Verified',
  };
}

export default function CompanyLegal({ company, onSaveSuccess }) {
  const [formData, setFormData] = useState(() => fieldFromCompany(company));
  const [phoneOperator, setPhoneOperator] = useState(() => (String(company?.phone || '').replace(/\D/g, '').startsWith('7') ? 'safaricom' : 'ethio-telecom'));
  const [phoneNumber, setPhoneNumber] = useState(() => String(company?.phone || '').replace(/\D/g, '').replace(/^251/, '').replace(/^0/, '').slice(0, 9));
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setFormData(fieldFromCompany(company)), [company]);
  useEffect(() => {
    setPhoneOperator((current) => (String(formData.phone || '').replace(/\D/g, '').startsWith('7') ? 'safaricom' : current || 'ethio-telecom'));
    setPhoneNumber(String(formData.phone || '').replace(/\D/g, '').replace(/^251/, '').replace(/^0/, '').slice(0, 9));
  }, [formData.phone]);
  useEffect(() => {
    setFormData((current) => ({ ...current, phone: normalizePhoneNumber(phoneNumber, phoneOperator) }));
  }, [phoneNumber, phoneOperator]);
  const update = (key, value) => setFormData((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    const payload = { representative_name: formData.repFullName, representative_title: formData.repPosition, work_email: formData.workEmail, phone: formData.phone, company_name: formData.companyName, industry: formData.industry, company_size: formData.companySize, location: formData.hqLocation, website: formData.website, social_media_urls: { linkedin: formData.linkedin }, description: formData.companySummary, hiring_volume: formData.hiringVolume };
    try { await api.post('/employer/profile', payload); setNotice('Company profile saved and synced with AI matching.'); onSaveSuccess?.(payload); } catch { setNotice('Unable to save company profile. Please try again.'); } finally { setSaving(false); }
  };

  const input = 'h-12 w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15';
  return (
    <div className="relative min-h-screen w-full overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <img
        src={officeImage}
        alt="Office team collaboration background"
        className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-slate-950/75 backdrop-blur-[5px]" />

      <section className="relative mx-auto max-w-4xl space-y-5 rounded-[28px] border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-600">Stage 2 of 9</span>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Company Profile</h2>
            <p className="mt-1 text-xs font-semibold text-slate-600">Share the essential details candidates need to understand your organization.</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"><ShieldCheck className="h-4 w-4 text-emerald-600" />{formData.isVerified ? 'Verified Business Profile' : 'Verification Under Review'}</div>
        </div>

        <form data-company-legal-form="true" onSubmit={save} className="space-y-4">
          <Panel icon={User} title="Authorized Representative & Contact"><div className="grid gap-3.5 sm:grid-cols-2"><Field label="Representative Name" value={formData.repFullName} onChange={(value) => update('repFullName', value)} input={input} /><Field label="Position / Title" value={formData.repPosition} onChange={(value) => update('repPosition', value)} input={input} /><Field label="Work Email" type="email" value={formData.workEmail} onChange={(value) => update('workEmail', value)} input={input} /><div className="block text-sm font-bold text-slate-800"><span className="block">Phone Number</span><div className="mt-2 flex gap-2"><select value={phoneOperator} onChange={(event) => setPhoneOperator(event.target.value)} className={`${input} w-[180px] shrink-0`}><option value="ethio-telecom">Ethio Telecom</option><option value="safaricom">Safaricom Ethiopia</option></select><input type="tel" inputMode="numeric" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, '').slice(0, 9))} className={`${input} flex-1`} placeholder="912345678" /></div></div></div></Panel>
          <Panel icon={Building2} title="Company Identity"><div className="grid gap-3.5 sm:grid-cols-2"><Field label="Company Name" value={formData.companyName} onChange={(value) => update('companyName', value)} input={input} /><Field label="Industry" value={formData.industry} onChange={(value) => update('industry', value)} input={input} /><Field label="Company Size" select value={formData.companySize} onChange={(value) => update('companySize', value)} input={input} options={['1-10', '11-50', '51-200', '201-500', '1000+']} /><Field label="Headquarters Location" value={formData.hqLocation} onChange={(value) => update('hqLocation', value)} input={input} /><Field label="Target Candidates / Hiring Volume" select value={formData.hiringVolume} onChange={(value) => update('hiringVolume', value)} input={input} options={hiringVolumeOptions} /><Field label="Website" type="url" value={formData.website} onChange={(value) => update('website', value)} input={input} /><Field label="LinkedIn / Social Media Link" type="url" value={formData.linkedin} onChange={(value) => update('linkedin', value)} input={input} /><div className="sm:col-span-2"><label className="block text-sm font-bold text-slate-800">About Company<textarea rows={3} value={formData.companySummary} onChange={(event) => update('companySummary', event.target.value)} className="mt-2 w-full resize-y rounded-xl border-[1.5px] border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15" placeholder="Briefly describe what your organization does..." /></label></div></div></Panel>
          {notice && <p className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-700">{notice}</p>}<div className="flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-extrabold text-white shadow-md shadow-blue-500/20 disabled:opacity-60">{saving ? 'Saving...' : 'Save & Sync AI Profile'}</button></div>
        </form>
      </section>
    </div>
  );
}

function Panel({ icon: Icon, title, accent = false, children }) { return <section className={`space-y-4 rounded-2xl border-2 p-5 shadow-sm ${accent ? 'border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/30' : 'border-slate-200 bg-white'}`}><h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900"><Icon className="h-4 w-4 text-blue-600" />{title}</h3>{children}</section>; }
function Field({ label, value, onChange, input, type = 'text', select = false, options = [] }) {
  const safeValue = value ?? '';

  return (
    <label className="block text-sm font-bold text-slate-800">
      {label}
      {select ? (
        <select value={safeValue} onChange={(event) => onChange(event.target.value)} className={`mt-2 ${input}`}>
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
      ) : (
        <input type={type} value={safeValue} onChange={(event) => onChange(event.target.value)} className={`mt-2 ${input}`} />
      )}
    </label>
  );
}
