export const phoneCountries = [
  { id: 'ET', countryCode: 'et', name: 'Ethiopia', dialCode: '+251', placeholder: '91 234 5678' },
  { id: 'KE', countryCode: 'ke', name: 'Kenya', dialCode: '+254', placeholder: '712 345 678' },
  { id: 'RW', countryCode: 'rw', name: 'Rwanda', dialCode: '+250', placeholder: '78 123 4567' },
  { id: 'UG', countryCode: 'ug', name: 'Uganda', dialCode: '+256', placeholder: '712 345678' },
  { id: 'TZ', countryCode: 'tz', name: 'Tanzania', dialCode: '+255', placeholder: '712 345 678' },
  { id: 'DJ', countryCode: 'dj', name: 'Djibouti', dialCode: '+253', placeholder: '77 12 34 56' },
  { id: 'SO', countryCode: 'so', name: 'Somalia', dialCode: '+252', placeholder: '61 234 5678' },
  { id: 'SD', countryCode: 'sd', name: 'Sudan', dialCode: '+249', placeholder: '91 234 5678' },
  { id: 'SS', countryCode: 'ss', name: 'South Sudan', dialCode: '+211', placeholder: '912 345 678' },
  { id: 'ER', countryCode: 'er', name: 'Eritrea', dialCode: '+291', placeholder: '7 123 456' },
  { id: 'AE', countryCode: 'ae', name: 'United Arab Emirates', dialCode: '+971', placeholder: '50 123 4567' },
  { id: 'SA', countryCode: 'sa', name: 'Saudi Arabia', dialCode: '+966', placeholder: '50 123 4567' },
  { id: 'US', countryCode: 'us', name: 'United States', dialCode: '+1', placeholder: '201 555 0123' },
  { id: 'GB', countryCode: 'gb', name: 'United Kingdom', dialCode: '+44', placeholder: '7400 123456' },
  { id: 'CA', countryCode: 'ca', name: 'Canada', dialCode: '+1', placeholder: '204 234 5678' },
  { id: 'DE', countryCode: 'de', name: 'Germany', dialCode: '+49', placeholder: '1512 3456789' },
  { id: 'ZA', countryCode: 'za', name: 'South Africa', dialCode: '+27', placeholder: '82 123 4567' },
];

export const getPhoneParts = (number = '') => {
  const digits = String(number || '').replace(/\D/g, '');
  const country = [...phoneCountries]
    .sort((left, right) => right.dialCode.length - left.dialCode.length)
    .find((item) => digits.startsWith(item.dialCode.slice(1))) || phoneCountries[0];
  const nationalNumber = country === phoneCountries[0] && !digits.startsWith(country.dialCode.slice(1))
    ? digits.replace(/^0/, '')
    : digits.slice(country.dialCode.length - 1);
  return { country, nationalNumber: nationalNumber.slice(0, 12) };
};

export const formatPhoneNumber = (dialCode, nationalNumber) => {
  const digits = String(nationalNumber || '').replace(/\D/g, '').slice(0, 12);
  return digits ? `${dialCode}${digits}` : '';
};
