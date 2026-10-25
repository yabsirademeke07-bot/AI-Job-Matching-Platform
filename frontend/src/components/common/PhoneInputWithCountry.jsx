import SearchableSelect from '../ui/SearchableSelect.jsx';
import { formatPhoneNumber, phoneCountries } from './phoneCountries.js';

export default function PhoneInputWithCountry({
  countryCode = '+251',
  phoneNumber = '',
  onChange,
  id = 'phone',
  error = false,
  onBlur,
  className = '',
}) {
  const selectedCountry = phoneCountries.find((country) => country.dialCode === countryCode) || phoneCountries[0];

  const updatePhone = (dialCode, nationalNumber) => {
    onChange({
      countryCode: dialCode,
      phoneNumber: nationalNumber,
      phone: formatPhoneNumber(dialCode, nationalNumber),
    });
  };

  return (
    <div className={`flex w-full min-w-0 flex-col items-stretch gap-2.5 sm:flex-row sm:items-center ${className}`}>
      <SearchableSelect
        aria-label="Country dialing code"
        value={selectedCountry.id}
        options={phoneCountries.map((country) => ({
          value: country.id,
          label: `${country.name} (${country.dialCode})`,
          triggerLabel: country.dialCode,
          iconSrc: `https://flagcdn.com/${country.countryCode}.svg`,
          iconAlt: `${country.name} flag`,
        }))}
        placeholder="Select country..."
        onChange={(countryId) => {
          const country = phoneCountries.find((item) => item.id === countryId) || phoneCountries[0];
          updatePhone(country.dialCode, phoneNumber);
        }}
        className="profile-field-control h-14 w-full shrink-0 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 pr-12 text-base font-normal text-slate-900 placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 shadow-xs outline-none transition-all hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:w-40 lg:w-44"
      />
      <input
        id={id}
        required
        type="tel"
        inputMode="numeric"
        value={phoneNumber}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '').slice(0, 12);
          updatePhone(selectedCountry.dialCode, digits);
        }}
        maxLength={12}
        placeholder="Enter phone number"
        aria-label="Enter phone number"
        aria-invalid={error}
        onBlur={onBlur}
        className={`profile-field-control h-14 w-full min-w-0 flex-1 rounded-2xl border bg-white px-5 py-3.5 text-base font-normal text-slate-900 placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 shadow-xs outline-none transition-all focus:ring-2 ${error ? 'border-rose-400 bg-rose-50/15 ring-1 ring-rose-400/20 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 hover:border-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20'}`}
      />
    </div>
  );
}
