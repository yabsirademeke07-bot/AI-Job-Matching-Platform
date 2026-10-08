import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useToast } from '../../hooks/useToast.js';
import { scrollToFeedback } from '../../utils/scrollHelper.js';
import SearchableSelect from '../ui/SearchableSelect.jsx';

const hiringVolumeOptions = ['1-5 Hires', '6-20 Hires', '20+ Scaled Hiring', 'Continuous Talent Pool'];
const tradeLicenseKeywords = [
  'ንግድ ፈቃድ',
  'የንግድ',
  'ንግድ',
  'trade license',
  'commercial registration',
  'ministry of trade',
  'የንግድ ሚኒስቴር',
  'tin',
  'taxpayer',
  'revenue',
  'certificate of registration',
  'business license',
  'fdre',
  'federal democratic republic',
];
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const companySizeOptions = ['1-10', '11-50', '51-200', '201-500', '500+'];
const industryOptions = [
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
const householdIndustryOptions = ['Domestic & Home Services (የቤት ሰራተኛ / ጽዳት)', 'Driver & Transportation (የግል ሹፌር)', 'Childcare & Nanny (ሞግዚት)', 'Home Security & Guard (የቤት ጥበቃ)', 'Private Tutor / Freelance'];
const householdSizeOptions = ['1-2 People', '3-5 People', '6+ People'];
const TIN_ERROR_MESSAGE = 'Please enter a valid 10-digit Tax Identification Number (TIN).';

const isValidTin = (value) => {
  const tin = String(value || '');
  return /^\d{10}$/.test(tin) && !/^(\d)\1{9}$/.test(tin) && tin !== '1234567890';
};

const phoneCountries = [
  { id: 'ET', flag: '🇪🇹', name: 'Ethiopia', dialCode: '+251', placeholder: '91 234 5678' },
  { id: 'KE', flag: '🇰🇪', name: 'Kenya', dialCode: '+254', placeholder: '712 345 678' },
  { id: 'RW', flag: '🇷🇼', name: 'Rwanda', dialCode: '+250', placeholder: '78 123 4567' },
  { id: 'UG', flag: '🇺🇬', name: 'Uganda', dialCode: '+256', placeholder: '712 345678' },
  { id: 'TZ', flag: '🇹🇿', name: 'Tanzania', dialCode: '+255', placeholder: '712 345 678' },
  { id: 'DJ', flag: '🇩🇯', name: 'Djibouti', dialCode: '+253', placeholder: '77 12 34 56' },
  { id: 'SO', flag: '🇸🇴', name: 'Somalia', dialCode: '+252', placeholder: '61 234 5678' },
  { id: 'SD', flag: '🇸🇩', name: 'Sudan', dialCode: '+249', placeholder: '91 234 5678' },
  { id: 'AE', flag: '🇦🇪', name: 'UAE', dialCode: '+971', placeholder: '50 123 4567' },
  { id: 'SA', flag: '🇸🇦', name: 'Saudi Arabia', dialCode: '+966', placeholder: '50 123 4567' },
  { id: 'US', flag: '🇺🇸', name: 'United States', dialCode: '+1', placeholder: '201 555 0123' },
  { id: 'GB', flag: '🇬🇧', name: 'United Kingdom', dialCode: '+44', placeholder: '7400 123456' },
  { id: 'CA', flag: '🇨🇦', name: 'Canada', dialCode: '+1', placeholder: '204 234 5678' },
  { id: 'DE', flag: '🇩🇪', name: 'Germany', dialCode: '+49', placeholder: '1512 3456789' },
  { id: 'ZA', flag: '🇿🇦', name: 'South Africa', dialCode: '+27', placeholder: '82 123 4567' },
];
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none shadow-2xs';
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600 tracking-wide uppercase';

const getPhoneParts = (number = '') => {
  const digits = String(number || '').replace(/\D/g, '');
  const country = [...phoneCountries]
    .sort((left, right) => right.dialCode.length - left.dialCode.length)
    .find((item) => digits.startsWith(item.dialCode.slice(1))) || phoneCountries[0];
  let nationalNumber = country === phoneCountries[0] && !digits.startsWith(country.dialCode.slice(1))
    ? digits.replace(/^0/, '')
    : digits.slice(country.dialCode.length - 1);
  return { country, nationalNumber: nationalNumber.slice(0, 12) };
};

const formatPhoneNumber = (countryId, nationalNumber) => {
  const country = phoneCountries.find((item) => item.id === countryId) || phoneCountries[0];
  const digits = String(nationalNumber || '').replace(/\D/g, '').slice(0, 12);
  return digits ? `${country.dialCode}${digits}` : '';
};

const formatFileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return 'Size unavailable';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function CompanyInfo({ user, onComplete }) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  const [phoneCountryId, setPhoneCountryId] = useState(phoneCountries[0].id);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tinTouched, setTinTouched] = useState(false);
  const [employerType, setEmployerType] = useState('company');
  const [form, setForm] = useState({
    representative_name: currentUser.full_name || currentUser.name || '',
    employer_type: 'company',
    representative_title: '',
    work_email: '',
    phone: '',
    company_name: '',
    industry: '',
    company_size: '',
    location: '',
    tin_number: '',
    tin_certificate_url: '',
    tin_certificate_file_name: '',
    trade_license_number: '',
    trade_license_url: '',
    trade_license_name: '',
    trade_license_size_bytes: null,
    trade_license_uploaded_at: null,
    trade_license_official_document: null,
    tradeLicenseName: '',
    website: '',
    linkedin: '',
    description: '',
    hiring_volume: hiringVolumeOptions[0],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
  const validationTimerRef = useRef(null);
  const tradeLicenseInputRef = useRef(null);
  const tradeLicenseScanIdRef = useRef(0);
  const [tradeLicenseScanStatus, setTradeLicenseScanStatus] = useState('idle');
  const [previewDocumentUrl, setPreviewDocumentUrl] = useState('');
  const [previewDocumentError, setPreviewDocumentError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!previewDocumentUrl) return undefined;
    return () => URL.revokeObjectURL(previewDocumentUrl);
  }, [previewDocumentUrl]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = window.setTimeout(() => setError(''), 10000);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => () => {
    if (validationTimerRef.current) window.clearTimeout(validationTimerRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/employer/profile', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.profile || cancelled) return;
        const profile = data.profile;
        const savedPhone = profile.phone || profile.phone_number || profile.phoneNumber;
        const savedPhoneParts = savedPhone ? getPhoneParts(savedPhone) : null;
        const savedIndustry = String(profile.industry || '').trim();
        setForm((current) => ({
          ...current,
          representative_name: profile.representative_name || current.representative_name,
          representative_title: profile.representative_title || current.representative_title,
          work_email: profile.work_email || current.work_email,
          company_name: profile.company_name || current.company_name,
          industry: /^agriculture$/i.test(savedIndustry) ? '' : savedIndustry || current.industry,
          company_size: '',
          location: profile.location || current.location,
          tin_number: profile.tin_number || profile.tinNumber || current.tin_number,
          tin_certificate_url: profile.tin_certificate_url || current.tin_certificate_url,
          tin_certificate_file_name: profile.tin_certificate_name || profile.tin_certificate_url?.split('/').pop() || current.tin_certificate_file_name,
          trade_license_number: profile.trade_license_number || profile.tradeLicenseNumber || profile.company_registration_number || current.trade_license_number,
          trade_license_url: profile.trade_license_url || profile.tradeLicenseUrl || profile.licenseDocumentUrl || current.trade_license_url,
          trade_license_name: profile.trade_license_name || current.trade_license_name,
          trade_license_size_bytes: profile.trade_license_size_bytes ?? current.trade_license_size_bytes,
          trade_license_uploaded_at: profile.trade_license_uploaded_at || current.trade_license_uploaded_at,
          trade_license_official_document: profile.trade_license_official_document ?? current.trade_license_official_document,
          tradeLicenseName: profile.trade_license_name || profile.trade_license_url || profile.tradeLicenseUrl || profile.licenseDocumentUrl || current.tradeLicenseName,
          website: profile.website || current.website,
          linkedin: profile.linkedin || current.linkedin,
          description: profile.description || profile.company_summary || current.description,
          hiring_volume: profile.hiring_volume || current.hiring_volume,
          employer_type: profile.employer_type || current.employer_type,
        }));
        setTradeLicenseScanStatus(
          profile.trade_license_official_document === true ? 'verified'
            : profile.trade_license_official_document === false ? 'unverified'
              : 'idle'
        );
        if (profile.employer_type === 'individual') setEmployerType('individual');
        if (savedPhoneParts) {
          setPhoneCountryId(savedPhoneParts.country.id);
        }
      } catch (loadError) {
        console.warn('Unable to hydrate company profile:', loadError);
      }
    };
    loadProfile();
    return () => { cancelled = true; };
  }, []);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    const errorKey = { representative_name: 'fullName', company_name: 'companyName', location: 'headquarters', tin_number: 'tinNumber', phone: 'phone' }[key] || key;
    setErrors((current) => {
      if (!current[errorKey]) return current;
      const next = { ...current };
      delete next[errorKey];
      return next;
    });
  };

  const changeEmployerType = (type) => {
    setEmployerType(type);
    setTinTouched(false);
    setForm((current) => ({
      ...current,
      employer_type: type,
      industry: '',
      company_size: '',
      tin_number: type === 'individual' ? '' : current.tin_number,
      tin_certificate_url: type === 'individual' ? '' : current.tin_certificate_url,
      tin_certificate_file_name: type === 'individual' ? '' : current.tin_certificate_file_name,
      trade_license_url: type === 'individual' ? '' : current.trade_license_url,
      trade_license_name: type === 'individual' ? '' : current.trade_license_name,
      trade_license_size_bytes: type === 'individual' ? null : current.trade_license_size_bytes,
      trade_license_uploaded_at: type === 'individual' ? null : current.trade_license_uploaded_at,
      trade_license_official_document: type === 'individual' ? null : current.trade_license_official_document,
      tradeLicenseName: type === 'individual' ? '' : current.tradeLicenseName,
    }));
    setErrors({});
  };

  const triggerValidationAlert = (message, newErrors) => {
    setErrors(newErrors);
    setToast({ show: true, message, type: 'error' });
    if (validationTimerRef.current) window.clearTimeout(validationTimerRef.current);
    validationTimerRef.current = window.setTimeout(() => {
      setErrors({});
      setToast((current) => ({ ...current, show: false }));
      validationTimerRef.current = null;
    }, 10000);
  };

  const attachTradeLicense = async (file) => {
    if (!file) return;
    const allowedTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (file.size < 20 * 1024 || file.size > 10 * 1024 * 1024 || allowedTypes[extension] !== file.type) {
      setErrors((current) => ({ ...current, tradeLicense: 'Please upload a valid document (PDF, PNG, or JPG between 20KB and 10MB).' }));
      return;
    }
    const scanId = ++tradeLicenseScanIdRef.current;
    const isPdf = extension === '.pdf';
    setForm((current) => ({
      ...current,
      trade_license_url: '',
      trade_license_name: file.name,
      trade_license_size_bytes: file.size,
      trade_license_uploaded_at: new Date().toISOString(),
      trade_license_official_document: null,
      tradeLicenseFile: file,
      tradeLicenseName: file.name,
    }));
    setErrors((current) => ({ ...current, tradeLicense: '' }));
    setPreviewDocumentError('');
    if (!isPdf) {
      setTradeLicenseScanStatus('idle');
      return;
    }
    setTradeLicenseScanStatus('scanning');
    try {
      const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
      const pdf = await loadingTask.promise;
      try {
        const pageTexts = await Promise.all(
          Array.from({ length: pdf.numPages }, async (_, index) => {
            const page = await pdf.getPage(index + 1);
            const content = await page.getTextContent();
            return content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
          })
        );
        const documentText = pageTexts.join(' ').normalize('NFKC').toLowerCase();
        const isOfficial = tradeLicenseKeywords.some((keyword) => documentText.includes(keyword.toLowerCase()));
        if (scanId !== tradeLicenseScanIdRef.current) return;
        setTradeLicenseScanStatus(isOfficial ? 'verified' : 'unverified');
        setForm((current) => ({ ...current, trade_license_official_document: isOfficial }));
      } finally {
        await pdf.destroy();
      }
    } catch (scanError) {
      if (scanId !== tradeLicenseScanIdRef.current) return;
      console.error('Unable to inspect selected trade-license PDF:', scanError);
      setTradeLicenseScanStatus('error');
    }
  };

  const previewTradeLicense = async () => {
    setPreviewDocumentError('');
    if (form.tradeLicenseFile) {
      setPreviewDocumentUrl(URL.createObjectURL(form.tradeLicenseFile));
      return;
    }
    if (!form.trade_license_url) return;
    try {
      const response = await fetch(form.trade_license_url, {
        headers: { Authorization: `******'token') || ''}` },
      });
      if (!response.ok) throw new Error('Unable to load the uploaded document preview.');
      setPreviewDocumentUrl(URL.createObjectURL(await response.blob()));
    } catch (error) {
      setPreviewDocumentError(error.message || 'Unable to load the uploaded document preview.');
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const newErrors = {};
    const tinNumber = String(form.tin_number || '').trim();
    setTinTouched(true);
    if (!String(form.phone || '').trim()) newErrors.phone = 'Phone number is required.';
    if (!String(form.company_name || '').trim()) newErrors.companyName = employerType === 'individual' ? 'Household / Family Name is required.' : 'Company Name is required.';
    if (!String(form.company_size || '').trim()) newErrors.company_size = employerType === 'individual' ? 'Household size is required.' : 'Company size is required.';
    if (employerType === 'company') {
      if (!isValidTin(tinNumber)) newErrors.tinNumber = TIN_ERROR_MESSAGE;
    }
    if (!String(form.industry || '').trim()) newErrors.industry = 'Industry is required.';
    if (!String(form.location || '').trim()) newErrors.headquarters = 'Headquarters Location is required.';
    if (Object.keys(newErrors).length) {
      triggerValidationAlert('Please complete all highlighted required fields.', newErrors);
      document.getElementById(Object.keys(newErrors)[0])?.focus();
      return;
    }
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/employer/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          ...form,
          employer_type: employerType,
          employerType,
          fullName: form.representative_name,
          roleRelationship: form.representative_title,
          householdName: form.company_name,
          householdMembers: form.company_size,
          residenceLocation: form.location,
          aboutHousehold: form.description,
          phoneNumber,
          phoneCountryCode: phoneCountries.find((country) => country.id === phoneCountryId)?.dialCode || phoneCountries[0].dialCode,
          tinNumber: employerType === 'individual' ? null : tinNumber,
          tradeLicenseNumber: employerType === 'individual' ? null : form.trade_license_number,
          trade_license_number: employerType === 'individual' ? null : form.trade_license_number,
          trade_license_url: employerType === 'individual' ? null : form.trade_license_url,
          tradeLicenseName: employerType === 'individual' ? null : form.tradeLicenseName,
          social_media_urls: { linkedin: form.linkedin },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true) throw new Error(data.message || data.error || 'Unable to save company profile.');
      let tinCertificateUrl = form.tin_certificate_url;
      let tradeLicenseUrl = form.trade_license_url;
      let tradeLicenseName = form.trade_license_name || form.tradeLicenseName;
      let tradeLicenseSize = form.trade_license_size_bytes;
      let tradeLicenseUploadedAt = form.trade_license_uploaded_at;
      let tradeLicenseOfficialDocument = form.trade_license_official_document;
      if (employerType === 'company' && form.tradeLicenseFile) {
        const documentBody = new FormData();
        documentBody.append('document', form.tradeLicenseFile);
        const documentResponse = await fetch('/api/employer/profile/trade-license', {
          method: 'POST',
          headers: { Authorization: `******'token') || ''}` },
          body: documentBody,
        });
        const documentData = await documentResponse.json().catch(() => ({}));
        if (!documentResponse.ok || documentData.success !== true) {
          throw new Error(documentData.message || 'Unable to upload the business document.');
        }
        tradeLicenseUrl = documentData.url;
        tradeLicenseName = documentData.fileName;
        tradeLicenseSize = documentData.fileSize;
        tradeLicenseUploadedAt = documentData.uploadedAt;
        tradeLicenseOfficialDocument = documentData.textExtracted
          ? documentData.officialDocument
          : tradeLicenseOfficialDocument;
        if (typeof tradeLicenseOfficialDocument === 'boolean') {
          setTradeLicenseScanStatus(tradeLicenseOfficialDocument ? 'verified' : 'unverified');
        }
        setForm((current) => ({
          ...current,
          trade_license_url: tradeLicenseUrl,
          trade_license_name: tradeLicenseName,
          trade_license_size_bytes: tradeLicenseSize,
          trade_license_uploaded_at: tradeLicenseUploadedAt,
          trade_license_official_document: tradeLicenseOfficialDocument,
          tradeLicenseName,
          tradeLicenseFile: null,
        }));
      }
      const savedForm = {
        ...form,
        tin_certificate_url: employerType === 'individual' ? null : tinCertificateUrl,
        trade_license_url: employerType === 'individual' ? null : tradeLicenseUrl,
        trade_license_name: employerType === 'individual' ? null : tradeLicenseName,
        trade_license_size_bytes: employerType === 'individual' ? null : tradeLicenseSize,
        trade_license_uploaded_at: employerType === 'individual' ? null : tradeLicenseUploadedAt,
        trade_license_official_document: employerType === 'individual' ? null : tradeLicenseOfficialDocument,
        tradeLicenseName: employerType === 'individual' ? null : tradeLicenseName,
        tradeLicenseFile: null,
      };
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...storedUser,
        companyInfo: {
          ...savedForm,
          employer_type: employerType,
          tin_number: employerType === 'individual' ? null : tinNumber,
          tin_certificate_name: employerType === 'individual' ? null : form.tin_certificate_file_name,
        },
        isOnboardingComplete: true,
      }));
      localStorage.setItem('employerInfo', JSON.stringify({
        ...savedForm,
        employer_type: employerType,
        tin_number: employerType === 'individual' ? null : tinNumber,
        tin_certificate_name: employerType === 'individual' ? null : form.tin_certificate_file_name,
      }));
      setForm(savedForm);
      setSuccess('Company profile saved successfully!');
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (onComplete) onComplete(savedForm);
      else navigate('/employer/jobs/new', { replace: true, state: { step: 1, fromOnboarding: true } });
      showSuccess('Company profile saved successfully.');
      scrollToFeedback('top');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save company profile.');
      showError(saveError.message || 'Unable to save company profile.');
      scrollToFeedback('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50/70 py-4 sm:py-8">
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 lg:px-6">
        <main className="mx-auto my-4 w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm sm:my-8 sm:p-6 lg:p-10">
          <div className="w-full">
            <header className="mb-8">
              <h2 className="mb-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">Employer Profile Setup</h2>
              <p className="mb-8 text-sm text-slate-500">Add the essential information candidates need to understand your organization or household.</p>
            </header>

            <div className="mb-8">
              <label className="mb-2 block text-xs font-bold text-slate-700 sm:text-sm">
                <span className={labelClass}>I am hiring as <span className="normal-case text-slate-400">*</span></span>
              </label>
              <div className="grid w-full max-w-md grid-cols-1 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-2">
                <button type="button" onClick={() => changeEmployerType('company')} className={`min-h-11 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 ${employerType === 'company' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                  Registered Company
                </button>
                <button type="button" onClick={() => changeEmployerType('individual')} className={`min-h-11 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 ${employerType === 'individual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                  Individual / Household
                </button>
              </div>
              <p className="mt-1.5 text-[11px] font-normal text-slate-500">
                {employerType === 'company'
                  ? 'For corporate organizations, enterprises, and registered businesses.'
                  : 'For private employers hiring housekeepers, drivers, nannies, or home security.'}
              </p>
            </div>

            {toast.show && (
              <div className="fixed inset-x-3 top-3 z-[9999] mx-auto w-auto max-w-md rounded-2xl border border-red-500 bg-red-600 p-4 text-white shadow-2xl animate-in slide-in-from-right duration-300 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-[min(28rem,calc(100vw-3rem))]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><p className="text-xs font-semibold sm:text-sm">{toast.message}</p></div>
                  <button type="button" onClick={() => setToast((current) => ({ ...current, show: false }))} className="text-xs font-bold text-white/80 hover:text-white" aria-label="Dismiss validation message">Close</button>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/20"><div className="h-full bg-white" style={{ animation: 'toastCountdown 10000ms linear forwards', transformOrigin: 'left center' }} /></div>
              </div>
            )}

            {success && <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700" role="status">{success}</p>}

            <form noValidate onSubmit={handleSave} className="space-y-7">
              <section>
                <h3 className="mb-3.5 inline-block rounded-md border border-blue-100/60 bg-blue-50/70 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">Organization Details</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                  <Field id="companyName" label={employerType === 'individual' ? 'Household / Family Name *' : 'Company Name'} value={form.company_name} onChange={(value) => update('company_name', value)} required error={errors.companyName} placeholder={employerType === 'individual' ? "e.g. Yabsira's Residence" : ''} />
                  <Field id="industry" label="Industry" select options={employerType === 'individual' ? householdIndustryOptions : industryOptions} value={form.industry} onChange={(value) => update('industry', value)} required error={errors.industry} placeholder="Select Industry..." />
                  <Field id="companySize" label={employerType === 'individual' ? 'Household Members' : 'Company Size'} select options={employerType === 'individual' ? householdSizeOptions : companySizeOptions} value={form.company_size} onChange={(value) => update('company_size', value)} required error={errors.company_size} placeholder={employerType === 'individual' ? 'Select household size...' : 'Select Company Size...'} searchable={false} />
                  <Field id="headquarters" label={employerType === 'individual' ? 'Residence Location / Neighborhood *' : 'Headquarters Location'} value={form.location} onChange={(value) => update('location', value)} required error={errors.headquarters} placeholder={employerType === 'individual' ? 'e.g. Addis Ababa, Bole' : 'e.g. Addis Ababa, Bole (Behind Edna Mall)'} />
                  {employerType === 'company' && <>
                    <Field label={<><span>Website</span> <span className="font-normal normal-case text-slate-400">(Optional)</span></>} type="url" value={form.website} onChange={(value) => update('website', value)} placeholder="https://example.com" />
                    <Field label={<><span>Social Media</span> <span className="font-normal normal-case text-slate-400">(Optional)</span></>} type="url" value={form.linkedin} onChange={(value) => update('linkedin', value)} placeholder="https://linkedin.com/company/..." />
                  </>}
                </div>
              </section>

              <section>
                <h3 className="mb-3.5 inline-block rounded-md border border-blue-100/60 bg-blue-50/70 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">Representative &amp; Contact</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                  <Field label={employerType === 'individual' ? <><span>Role / Relationship</span> <span className="ml-1 text-xs font-normal italic text-slate-400">(Optional)</span></> : 'Job Title / Position'} value={form.representative_title} onChange={(value) => update('representative_title', value)} placeholder={employerType === 'individual' ? 'e.g. Homeowner, Parent, Consultant' : 'Enter your role at the company (e.g. HR Manager, CEO)'} />
                  <Field label="Work Email" type="email" value={form.work_email} onChange={(value) => update('work_email', value)} placeholder="e.g. hr@company.com or careers@company.com" />
                  <div className="md:col-span-2">
                    <label className={labelClass}>Phone Number</label>
                    <div className="mt-2 flex w-full flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
                      <SearchableSelect
                        aria-label="Country dialing code"
                        value={phoneCountryId}
                        options={phoneCountries.map((country) => ({
                          value: country.id,
                          label: `${country.flag} ${country.name} (${country.dialCode})`,
                        }))}
                        placeholder="Select country..."
                        showIcons={false}
                        onChange={(countryId) => {
                          setPhoneCountryId(countryId);
                          update('phone', formatPhoneNumber(countryId, phoneNumber));
                        }}
                        className="w-full shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-2xs sm:w-36 lg:w-40"
                      />
                      <input
                          id="phone"
                          required
                          type="tel"
                          inputMode="numeric"
                          value={phoneNumber}
                          onChange={(event) => {
                            const digits = event.target.value.replace(/\D/g, '').slice(0, 12);
                            setPhoneNumber(digits);
                            update('phone', formatPhoneNumber(phoneCountryId, digits));
                          }}
                          maxLength={12}
                          placeholder="Enter phone number"
                          className={`w-full min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none shadow-2xs ${errors.phone ? 'border-rose-400 bg-rose-50/15 ring-1 ring-rose-400/20' : ''}`}
                        />
                    </div>
                    {errors.phone && <InlineError message={errors.phone} />}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-3.5 inline-block rounded-md border border-blue-100/60 bg-blue-50/70 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">Legal &amp; Verification</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                  {employerType === 'company' && <div>
                    <Field
                      id="tinNumber"
                      label="Tax Identification Number (TIN) *"
                      value={form.tin_number}
                      onChange={(value) => {
                        setTinTouched(true);
                        update('tin_number', value.replace(/\D/g, '').slice(0, 10));
                      }}
                      onBlur={() => setTinTouched(true)}
                      inputMode="numeric"
                      placeholder="e.g. 0045812390"
                      maxLength={10}
                      error={tinTouched && !isValidTin(form.tin_number) ? TIN_ERROR_MESSAGE : ''}
                    />
                    {isValidTin(form.tin_number) && (
                      <p className="mt-1 text-xs font-semibold text-emerald-700" role="status">Valid 10-digit TIN</p>
                    )}
                  </div>}
                  {employerType === 'company' && <div className="md:col-span-2">
                    <Field id="tradeLicenseNumber" label="Trade License Number (Optional)" value={form.trade_license_number} onChange={(value) => update('trade_license_number', value)} placeholder="Enter the registered trade license number" />
                  </div>}
                  {employerType === 'company' && <div className="md:col-span-2">
                    <label className={labelClass}>
                      Trade License / Registration Document (Optional)
                    </label>
                    <input
                      ref={tradeLicenseInputRef}
                      id="trade-license-file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      style={{ display: 'none' }}
                      className="hidden"
                      onChange={(event) => {
                        attachTradeLicense(event.target.files?.[0]);
                        event.target.value = '';
                      }}
                    />
                    {form.tradeLicenseFile || form.trade_license_url || form.trade_license_name ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xs font-semibold text-slate-600">
                              {(form.tradeLicenseFile?.type || form.trade_license_name || form.tradeLicenseName || form.trade_license_url || '').includes('pdf') || /\.pdf(?:$|\?)/i.test(form.trade_license_name || form.tradeLicenseName || form.trade_license_url || '')
                                ? 'PDF'
                                : 'IMG'}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-800">
                                {form.tradeLicenseFile?.name || form.trade_license_name || form.tradeLicenseName || 'Business document'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatFileSize(form.tradeLicenseFile?.size ?? form.trade_license_size_bytes)}
                                {' · '}
                                {form.trade_license_uploaded_at
                                  ? `${form.trade_license_url ? 'Uploaded' : 'Selected'} ${new Date(form.trade_license_uploaded_at).toLocaleDateString()}`
                                  : 'Date unavailable'}
                              </p>
                            </div>
                          </div>
                          {tradeLicenseScanStatus === 'verified' ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                              Verified Trade License Document
                            </span>
                          ) : tradeLicenseScanStatus === 'unverified' || tradeLicenseScanStatus === 'error' ? null : tradeLicenseScanStatus === 'scanning' ? (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700">
                              Inspecting PDF…
                            </span>
                          ) : (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                              Document Attached
                            </span>
                          )}
                        </div>
                        {tradeLicenseScanStatus === 'verified' && (
                          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800" role="status">
                            Official government business registration keywords detected.
                          </p>
                        )}
                        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3">
                          <button type="button" onClick={previewTradeLicense} className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
                            Preview Document
                          </button>
                          <button type="button" onClick={() => tradeLicenseInputRef.current?.click()} className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
                            Replace
                          </button>
                          <button type="button" onClick={() => {
                            tradeLicenseScanIdRef.current += 1;
                            setTradeLicenseScanStatus('idle');
                            setForm((current) => ({
                              ...current,
                              trade_license_url: '',
                              trade_license_name: '',
                              trade_license_size_bytes: null,
                              trade_license_uploaded_at: null,
                              trade_license_official_document: null,
                              tradeLicenseFile: null,
                              tradeLicenseName: '',
                            }));
                            setErrors((current) => ({ ...current, tradeLicense: '' }));
                            setPreviewDocumentUrl('');
                            setPreviewDocumentError('');
                          }} className="rounded-xl border border-rose-200 bg-white px-2 py-2 text-xs font-bold text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-50">
                            Remove
                          </button>
                        </div>
                        {(tradeLicenseScanStatus === 'unverified' || tradeLicenseScanStatus === 'error') && (
                          <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600" role="alert">
                            <span>Invalid license document. Please upload a valid Trade License.</span>
                          </div>
                        )}
                        {previewDocumentError && <InlineError message={previewDocumentError} />}
                      </div>
                    ) : (
                      <label htmlFor="trade-license-file" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); attachTradeLicense(event.dataTransfer.files?.[0]); }} className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-slate-50/70 p-6 transition-all hover:border-blue-400 hover:bg-slate-50 ${errors.tradeLicense ? 'border-rose-400 bg-rose-50/15' : 'border-slate-300'}`}>
                        <p className="text-xs font-semibold text-slate-700 sm:text-sm">Click to upload or drag &amp; drop your document</p>
                        <p className="mt-2 text-[11px] text-slate-400">PDF, JPG, or PNG · 20 KB–10 MB · Optional</p>
                      </label>
                    )}
                    {errors.tradeLicense && <InlineError message={errors.tradeLicense} />}
                  </div>}
                </div>
              </section>

              <button type="submit" disabled={isSaving} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? 'Saving...' : 'Save & Continue →'}
              </button>
            </form>
          </div>
        </main>
        {previewDocumentUrl && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Business document preview">
            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
                <p className="truncate text-sm font-bold text-slate-800">{form.trade_license_name || form.tradeLicenseName || 'Business document preview'}</p>
                <button type="button" onClick={() => setPreviewDocumentUrl('')} className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100" aria-label="Close document preview">
                  Close
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
                {/\.pdf$/i.test(form.tradeLicenseFile?.name || form.trade_license_name || form.tradeLicenseName || '')
                  ? <iframe title="Business document preview" src={previewDocumentUrl} className="h-[75vh] w-full rounded-lg bg-white" />
                  : <img src={previewDocumentUrl} alt="Business document preview" className="mx-auto max-h-[75vh] max-w-full rounded-lg object-contain" />}
              </div>
            </div>
          </div>
        )}
        </div>
    </div>
  );
}

function Field({ id, label, value, onChange, type = 'text', select = false, options = [], required = false, placeholder, maxLength, error, readOnly = false, className = '', inputMode, onBlur, searchable = true }) {
  const errorClass = error ? 'border border-rose-300 bg-rose-50/10 ring-1 ring-rose-300/20' : '';
  return (
    <label className={`${labelClass} ${className}`}>
      {label}
      {select ? (
        <SearchableSelect
          id={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          options={options}
          placeholder={placeholder || `Select ${String(label).toLowerCase()}...`}
          searchable={searchable}
          showIcons={false}
          aria-invalid={Boolean(error)}
          className={`mt-2 ${inputClass} ${errorClass}`}
        />
      ) : (
        <input
          id={id}
          readOnly={readOnly}
          required={required}
          maxLength={maxLength}
          inputMode={inputMode}
          type={type}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`mt-2 ${inputClass} ${errorClass}`}
        />
      )}
      {error && <InlineError message={error} />}
    </label>
  );
}

function InlineError({ message }) {
  return <p className="mt-1 flex animate-fade-in items-center gap-1 text-xs font-medium text-rose-500/85">{message}</p>;
}
