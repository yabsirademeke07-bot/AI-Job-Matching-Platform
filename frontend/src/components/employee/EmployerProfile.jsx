import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Save, Upload } from 'lucide-react';

const getStoredCompany = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}').companyInfo || null;
  } catch {
    return null;
  }
};

const EmployerProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    company_name: '',
    logo_url: '',
    short_description: '',
    description: '',
    mission: '',
    vision: '',
    services: '',
    founded_year: '',
    license_number: '',
    license_document_url: '',
    verification_status: 'Pending',
    linkedin: '',
    facebook: '',
    x: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const savedCompany = getStoredCompany();
      try {
        const source = savedCompany;
        if (!source) throw new Error('No company profile found');
        let socials = source.social_media_urls || {};
        if (typeof socials === 'string') {
          try {
            socials = JSON.parse(socials || '{}');
          } catch {
            socials = {};
          }
        }
        setProfile((current) => ({
          ...current,
          company_name: source.company_name || '',
          logo_url: source.logo_url || '',
          short_description: source.short_description || '',
          description: source.description || '',
          mission: source.mission || '',
          vision: source.vision || '',
          services: source.services || '',
          founded_year: source.founded_year || '',
          license_number: source.license_number || '',
          license_document_url: source.license_document_url || '',
          verification_status: source.verification_status ? source.verification_status.charAt(0).toUpperCase() + source.verification_status.slice(1) : 'Pending',
          linkedin: socials.linkedin || '',
          facebook: socials.facebook || '',
          x: socials.x || ''
        }));
      } catch {
        if (!savedCompany) setError('Unable to load your company profile.');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const completionFields = ['company_name', 'logo_url', 'short_description', 'description', 'mission', 'vision', 'services', 'founded_year', 'license_number', 'license_document_url', 'linkedin', 'facebook', 'x'];
  const completedFields = completionFields.filter((field) => String(profile[field] || '').trim()).length;
  const completion = Math.round((completedFields / completionFields.length) * 100);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const company = getStoredCompany() || {};
      const updatedCompany = {
          company_name: profile.company_name || company.company_name,
          industry: company.industry || '',
          company_type: company.company_type || 'Private',
          company_size: company.company_size || '11-50',
          location: company.location || '',
          country: company.country || '',
          city: company.city || '',
          website: company.website || '',
          logo_url: profile.logo_url || company.logo_url,
          description: profile.description,
          founded_year: profile.founded_year || null,
          social_media_urls: JSON.stringify({ linkedin: profile.linkedin, facebook: profile.facebook, x: profile.x }),
          short_description: profile.short_description,
          mission: profile.mission,
          vision: profile.vision,
          services: profile.services,
          license_number: profile.license_number,
          license_document_url: profile.license_document_url,
          verification_status: profile.verification_status
      };
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, companyInfo: updatedCompany }));
      navigate('/employer/dashboard');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-3xl p-8 text-center text-slate-500">Loading company profile...</div>;

  return (
    <div className="information-page mx-auto w-full max-w-3xl space-y-6 p-4 pb-10">
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Employer Profile Setup</p>
            <h1 className="text-3xl font-bold text-slate-900">Complete Your Company Profile</h1>
            <p className="mt-1 text-sm text-slate-500">Add detailed information candidates should know about your company.</p>
          </div>
        </div>
      </div>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between text-sm font-semibold"><span>Profile completion</span><span className="text-blue-600">{completion}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-600 transition-all" style={{ width: `${completion}%` }} /></div>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-semibold">Company Name<input required value={profile.company_name} onChange={(event) => setProfile({ ...profile, company_name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
          <label className="block text-sm font-semibold">Company Logo URL<input type="url" value={profile.logo_url} onChange={(event) => setProfile({ ...profile, logo_url: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
        </div>
        <label className="block text-sm font-semibold">Short Company Description<textarea value={profile.short_description} onChange={(event) => setProfile({ ...profile, short_description: event.target.value })} rows="2" className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
        {[
          ['description', 'About Company'], ['mission', 'Mission'], ['vision', 'Vision'],
          ['services', 'Services / Products']
        ].map(([field, label]) => <label key={field} className="block text-sm font-semibold">{label}<textarea value={profile[field]} onChange={(event) => setProfile({ ...profile, [field]: event.target.value })} rows="3" className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>)}
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-semibold">Founded Year<input type="number" min="1800" max="2100" value={profile.founded_year} onChange={(event) => setProfile({ ...profile, founded_year: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
          <label className="block text-sm font-semibold">Verification Status<select value={profile.verification_status} onChange={(event) => setProfile({ ...profile, verification_status: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option>Pending</option><option>Verified</option><option>Rejected</option><option>Expired</option></select></label>
        </div>
        <div className="rounded-xl border border-slate-200 p-4"><h2 className="mb-4 font-bold">Company License</h2><div className="grid gap-4"><label className="text-sm font-semibold">License Number<input type="text" value={profile.license_number} onChange={(event) => setProfile({ ...profile, license_number: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label><label className="text-sm font-semibold">License Document URL<input type="url" value={profile.license_document_url} onChange={(event) => setProfile({ ...profile, license_document_url: event.target.value })} placeholder="https://example.com/license-document" className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label></div><p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Upload className="h-4 w-4" />Verification is managed by the platform.</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><h2 className="mb-4 font-bold">Social Media Links</h2><div className="grid gap-4 md:grid-cols-3">{[['linkedin', 'LinkedIn'], ['facebook', 'Facebook'], ['x', 'X']].map(([field, label]) => <label key={field} className="text-sm font-semibold">{label}<input type="url" value={profile[field]} onChange={(event) => setProfile({ ...profile, [field]: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>)}</div></div>
        <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Profile & Continue'}<ArrowRight className="h-4 w-4" /></button>
      </form>
    </div>
  );
};

export default EmployerProfile;
