import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  FileText,
  Globe2,
  Link2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast.js';
import SearchableSelect from '../ui/SearchableSelect.jsx';

const hiringVolumeOptions = ['1-5 Hires', '6-20 Hires', '20+ Scaled Hiring', 'Continuous Talent Pool'];
const companySizeOptions = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

const initialData = {
  repFullName: '',
  repPosition: '',
  workEmail: '',
  phone: '',
  companyName: '',
  industry: '',
  companySize: '11-50',
  hqLocation: '',
  website: '',
  linkedin: '',
  companySummary: '',
  hiringVolume: '1-5 Hires',
  tinNumber: '',
  companyRegistrationNumber: '',
  licenseDocumentUrl: '',
  logoUrl: '',
  isVerified: false,
};

const getLocalPhoneDigits = (number = '') => {
  let digits = String(number || '').replace(/\D/g, '');
  if (digits.startsWith('251')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
};

const normalizePhoneNumber = (number = '') => {
  const digits = getLocalPhoneDigits(number).slice(0, 9);
  return digits ? `+251${digits}` : '';
};

function buildFieldState(company = {}) {
  const socialUrls = company?.social_media_urls && typeof company.social_media_urls === 'object' ? company.social_media_urls : {};

  return {
    ...initialData,
    repFullName: company?.representative_name || '',
    repPosition: company?.representative_title || '',
    workEmail: company?.work_email || '',
    phone: company?.phone || '',
    companyName: company?.company_name || company?.companyName || '',
    industry: company?.industry || '',
    companySize: company?.company_size || company?.companySize || '11-50',
    hqLocation: company?.location || '',
    website: company?.website || '',
    companySummary: company?.company_summary || company?.description || '',
    hiringVolume: company?.hiring_volume || socialUrls?.hiring_volume || '1-5 Hires',
    linkedin: company?.linkedin || socialUrls?.linkedin || '',
    tinNumber: company?.tinNumber || company?.tin_number || '',
    companyRegistrationNumber: company?.company_registration_number || company?.companyRegistrationNumber || '',
    licenseDocumentUrl: company?.licenseDocumentUrl || company?.license_document_url || '',
    logoUrl: company?.logo_url || company?.logoUrl || '',
    isVerified: company?.verification_status === 'verified' || company?.verificationStatus === 'verified' || Boolean(company?.is_verified),
  };
}

export default function CompanyLegal({ company, onSaveSuccess }) {
  const [formData, setFormData] = useState(() => buildFieldState(company));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [phoneOperator, setPhoneOperator] = useState(() => (getLocalPhoneDigits(company?.phone).startsWith('7') ? 'safaricom' : 'ethio-telecom'));
  const [phoneNumber, setPhoneNumber] = useState(() => getLocalPhoneDigits(company?.phone).slice(0, 9));
  const lastSavedSignatureRef = useRef('');
  const fieldRefs = useRef({});
  const errorsTimerRef = useRef(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => () => {
    if (errorsTimerRef.current) window.clearTimeout(errorsTimerRef.current);
  }, []);

  useEffect(() => {
    setFormData(buildFieldState(company));
  }, [company]);

  useEffect(() => {
    setPhoneOperator((current) => (getLocalPhoneDigits(formData.phone).startsWith('7') ? 'safaricom' : current || 'ethio-telecom'));
    setPhoneNumber(getLocalPhoneDigits(formData.phone).slice(0, 9));
  }, [formData.phone]);

  useEffect(() => {
    setFormData((current) => ({ ...current, phone: normalizePhoneNumber(phoneNumber) }));
  }, [phoneNumber]);

  const update = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const validate = (data = formData) => {
    const nextErrors = {};
    const companyName = String(data.companyName || '').trim();
    const workEmail = String(data.workEmail || '').trim();
    const phoneDigits = getLocalPhoneDigits(data.phone);
    const tin = String(data.tinNumber || '').trim();
    const expectedPhonePrefix = phoneOperator === 'safaricom' ? '7' : '9';
    const phoneExample = phoneOperator === 'safaricom' ? '712345678' : '912345678';

    if (!companyName) nextErrors.companyName = 'Company Name is required.';
    else if (!/^[a-zA-Z\s]+$/.test(companyName)) nextErrors.companyName = 'Must contain letters only (no numbers or symbols).';
    else if (companyName.length < 2) nextErrors.companyName = 'Company Legal Name must be at least 2 characters.';
    if (!workEmail) nextErrors.workEmail = 'Official email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) nextErrors.workEmail = 'Please enter a valid business email.';
    if (!phoneDigits) nextErrors.phone = 'Phone number is required.';
    else if (phoneDigits.length !== 9 || !new RegExp(`^${expectedPhonePrefix}\\d{8}$`).test(phoneDigits)) {
      nextErrors.phone = `Enter a 9-digit ${phoneOperator === 'safaricom' ? 'Safaricom' : 'Ethio Telecom'} number, e.g. ${phoneExample}.`;
    }
    if (!tin) nextErrors.tinNumber = 'TIN number is required.';
    else if (!/^\d{10}$/.test(tin)) nextErrors.tinNumber = 'TIN must be exactly 10 digits.';
    if (!String(data.companyRegistrationNumber || '').trim() && !String(data.licenseDocumentUrl || '').trim()) nextErrors.tradeLicense = 'Trade License PDF document is required.';
    const legalRepresentative = String(data.repFullName || '').trim();
    if (!legalRepresentative) nextErrors.fullName = 'Representative Full Name is required.';
    else if (!/^[a-zA-Z\s]+$/.test(legalRepresentative)) nextErrors.fullName = 'Must contain letters only (no numbers or symbols).';
    if (!String(data.hqLocation || '').trim()) nextErrors.headquarters = 'Headquarters location/city is required.';
    if (!String(data.industry || '').trim()) nextErrors.industry = 'Please select your primary industry / city.';
    return nextErrors;
  };

  const focusFirstError = (nextErrors) => {
    const firstField = Object.keys(nextErrors)[0];
    const element = fieldRefs.current[firstField];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => element.focus(), 250);
    }
  };

  const buildPayload = (data = formData) => ({
    representative_name: data.repFullName,
    representative_title: data.repPosition,
    work_email: data.workEmail,
    phone: data.phone,
    company_name: data.companyName,
    company_registration_number: data.companyRegistrationNumber,
    industry: data.industry,
    company_size: data.companySize,
    location: data.hqLocation,
    website: data.website,
    logo_url: data.logoUrl,
    linkedin: data.linkedin,
    social_media_urls: { linkedin: data.linkedin, hiring_volume: data.hiringVolume },
    company_summary: data.companySummary,
    description: data.companySummary,
    hiring_volume: data.hiringVolume,
    tinNumber: data.tinNumber,
    licenseDocumentUrl: data.licenseDocumentUrl,
    verificationStatus: data.isVerified ? 'verified' : 'pending',
  });

  const persistProfile = async (data = formData, manual = false) => {
    if (manual) {
      const nextErrors = validate(data);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) {
        if (errorsTimerRef.current) window.clearTimeout(errorsTimerRef.current);
        errorsTimerRef.current = window.setTimeout(() => {
          setErrors({});
          errorsTimerRef.current = null;
        }, 10000);
        focusFirstError(nextErrors);
        showError('Please complete all highlighted required fields.');
        return;
      }
    }
    const payload = buildPayload(data);
    const signature = JSON.stringify(payload);

    if (signature === lastSavedSignatureRef.current && !manual) return;
    lastSavedSignatureRef.current = signature;

    setSaving(true);

    try {
      const response = await api.put('/employer/profile', payload);
      if (manual) {
        localStorage.removeItem('saved_employer_draft');
        showSuccess('Company profile saved successfully!');
      }
      onSaveSuccess?.(response?.data?.profile || payload);
    } catch (error) {
      if (manual) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.setItem('saved_employer_draft', JSON.stringify(data));
          showError('⚠️ Your session has expired. Please log in again to save your profile.');
        } else {
          showError(error?.response?.data?.message || 'Unable to save company information to the database. Please try again.');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const hasBasicValues = Boolean(
      formData.companyName ||
      formData.repFullName ||
      formData.workEmail ||
      formData.industry ||
      formData.hqLocation ||
      formData.website ||
      formData.companySummary
    );

    if (!hasBasicValues) return undefined;

    const timeoutId = setTimeout(() => {
      if (!Object.keys(validate(formData)).length) persistProfile(formData, false);
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [formData.companyName, formData.repFullName, formData.workEmail, formData.industry, formData.hqLocation, formData.website, formData.companySummary, formData.phone, formData.companySize, formData.linkedin, formData.tinNumber, formData.companyRegistrationNumber, formData.licenseDocumentUrl, formData.logoUrl, formData.hiringVolume]);

  const save = async (event) => {
    event.preventDefault();
    await persistProfile(formData, true);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-sky-600">Company &amp; Legal</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Business Profile</h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Keep your company and verification details up to date.</p>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${formData.isVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            <ShieldCheck className="h-4 w-4" />
            {formData.isVerified ? 'Verified business profile' : 'Verification in progress'}
          </div>
      </header>

      <form noValidate onSubmit={save} className="space-y-4">
        <ProfileCard icon={Building2} title="Company & Industry Details" description="Share the essential details about your business.">
          <Field icon={Building2} label="Company legal name" required value={formData.companyName} onChange={(value) => update('companyName', value)} error={errors.companyName} inputRef={(element) => { fieldRefs.current.companyName = element; }} />
          <Field icon={UserRound} label="Position / title" value={formData.repPosition} onChange={(value) => update('repPosition', value)} />
          <Field icon={Building2} label="Primary industry" required value={formData.industry} onChange={(value) => update('industry', value)} error={errors.industry} inputRef={(element) => { fieldRefs.current.industry = element; }} />
          <Field icon={Building2} label="Company size" select value={formData.companySize} onChange={(value) => update('companySize', value)} options={companySizeOptions} />
          <Field icon={Globe2} label="Website" type="url" value={formData.website} onChange={(value) => update('website', value)} />
          <Field icon={Link2} label="LinkedIn" type="url" value={formData.linkedin} onChange={(value) => update('linkedin', value)} />
        </ProfileCard>

        <ProfileCard icon={UserRound} title="Representative & Direct Contact" description="Provide the primary contact for employer verification.">
          <Field icon={UserRound} label="Legal representative name" required value={formData.repFullName} onChange={(value) => update('repFullName', value)} error={errors.fullName} inputRef={(element) => { fieldRefs.current.fullName = element; }} />
          <Field icon={Mail} label="Official business email" type="email" required value={formData.workEmail} onChange={(value) => update('workEmail', value)} error={errors.workEmail} inputRef={(element) => { fieldRefs.current.workEmail = element; }} />
          <div>
            <FieldLabel icon={Phone} label="Phone number" required />
            <div className="flex gap-2">
              <select aria-label="Phone carrier" value={phoneOperator} onChange={(event) => setPhoneOperator(event.target.value)} className="h-11 min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400">
                <option value="ethio-telecom">Ethio Telecom</option>
                <option value="safaricom">Safaricom</option>
              </select>
              <input
                ref={(element) => { fieldRefs.current.phone = element; }}
                type="tel"
                inputMode="numeric"
                value={phoneNumber}
                onChange={(event) => {
                  const digits = getLocalPhoneDigits(event.target.value).slice(0, 9);
                  setPhoneNumber(digits);
                  update('phone', normalizePhoneNumber(digits));
                }}
                aria-invalid={Boolean(errors.phone)}
                className={`h-11 w-full rounded-xl border bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:ring-2 focus:ring-sky-400 focus:border-sky-400 ${errors.phone ? 'border-rose-400' : 'border-slate-200'}`}
                placeholder="912345678"
              />
            </div>
            {errors.phone && <ErrorMessage message={errors.phone} />}
          </div>
          <Field icon={MapPin} label="City / headquarters" required value={formData.hqLocation} onChange={(value) => update('hqLocation', value)} error={errors.headquarters} inputRef={(element) => { fieldRefs.current.headquarters = element; }} />
        </ProfileCard>

        <ProfileCard icon={ShieldCheck} title="Trade License & Tax Verification" description="Add your official tax and registration details.">
          <div>
            <Field icon={ShieldCheck} label="TIN number" required value={formData.tinNumber} onChange={(value) => update('tinNumber', value)} error={errors.tinNumber} inputRef={(element) => { fieldRefs.current.tinNumber = element; }} />
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700"><ShieldCheck className="h-3 w-3" />Tax ID</span>
          </div>
          <Field icon={FileText} label="Trade license number" required value={formData.companyRegistrationNumber} onChange={(value) => update('companyRegistrationNumber', value)} error={errors.tradeLicense} inputRef={(element) => { fieldRefs.current.tradeLicense = element; }} />
          <Field icon={FileText} label="Document attachment URL" type="url" value={formData.licenseDocumentUrl} onChange={(value) => update('licenseDocumentUrl', value)} />
        </ProfileCard>

        <ProfileCard icon={FileText} title="About Company Bio" description="A short introduction helps candidates understand your organization." columns={1}>
          <div>
            <FieldLabel icon={FileText} label="Company bio" />
            <textarea
              rows={4}
              value={formData.companySummary}
              onChange={(event) => update('companySummary', event.target.value)}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400"
              placeholder="Tell candidates about your mission, products, and what makes your company a great place to work..."
            />
            <div className="mt-1 text-right text-xs text-slate-400">{formData.companySummary.length} characters</div>
          </div>
        </ProfileCard>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <Field label="Hiring volume" select value={formData.hiringVolume} onChange={(value) => update('hiringVolume', value)} options={hiringVolumeOptions} />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-7 py-3 text-sm font-bold text-white shadow-md shadow-sky-500/25 transition hover:bg-sky-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save & Update Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileCard({ icon: Icon, title, description, children, columns = 2 }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Icon className="h-5 w-5" /></span>
        <div><h3 className="text-sm font-bold text-slate-900 sm:text-base">{title}</h3><p className="mt-1 text-xs text-slate-500">{description}</p></div>
      </div>
      <div className={`grid gap-x-5 gap-y-4 ${columns === 1 ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>{children}</div>
    </section>
  );
}

function FieldLabel({ icon: Icon, label, required }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
      {label}
      {required && <span className="text-rose-500">*</span>}
    </span>
  );
}

function Field({ icon: Icon, label, value, onChange, type = 'text', required = false, select = false, options = [], error, inputRef }) {
  const safeValue = value ?? '';
  const classes = `h-11 w-full rounded-xl border bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400 ${error ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'}`;

  return (
    <label className="block min-w-0">
      <FieldLabel icon={Icon} label={label} required={required} />
      {select ? (
        <SearchableSelect
          value={safeValue}
          onChange={onChange}
          options={options}
          placeholder={`Select ${label.toLowerCase()}...`}
          aria-invalid={Boolean(error)}
          className={classes}
        />
      ) : (
        <input ref={inputRef} type={type} value={safeValue} onChange={(event) => onChange(event.target.value)} className={classes} aria-invalid={Boolean(error)} />
      )}
      {error && <ErrorMessage message={error} />}
    </label>
  );
}

function ErrorMessage({ message }) {
  return (
    <p className="mt-1.5 flex animate-fade-in items-center gap-1.5 text-xs font-medium text-rose-500/85">
      <span className="text-xs text-rose-400" aria-hidden="true">⚠️</span>
      <span>{message}</span>
    </p>
  );
}
