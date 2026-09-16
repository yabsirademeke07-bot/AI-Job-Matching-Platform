export function validateCandidateProfile(data = {}) {
  const input = data && typeof data === 'object' ? data : {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const location = typeof input.location === 'string' ? input.location.trim() : '';
  const hasName = name.length >= 2;
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const hasLocation = location.length > 0;
  const hasMeaningfulValue = (value) => {
    if (typeof value === 'string') return value.trim().length > 0 && value.trim().toLowerCase() !== 'not specified';
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value && typeof value === 'object' && Object.keys(value).length > 0);
  };
  const hasEducation = hasMeaningfulValue(input.education);
  const hasExperience = typeof input.experience === 'number'
    || typeof input.yearsOfExperience === 'number'
    || hasMeaningfulValue(input.experience);
  const hasQualification = hasEducation || hasExperience;
  const errors = [];
  if (!hasName) errors.push('Valid candidate name is required.');
  if (!hasEmail) errors.push('Valid email address is required.');
  if (!hasLocation) errors.push('Location is required.');
  if (!hasQualification) errors.push('Either Education history OR Work Experience is required.');
  const result = {
    isValid: errors.length === 0,
    errors,
    data: { ...input, hasEducation, hasExperience },
  };
  console.log('CV VALIDATION AUDIT:', {
    inputData: input,
    checks: { hasName, hasEmail, hasLocation, hasEducation, hasExperience, hasQualification },
    isValid: result.isValid,
  });
  return result;
}
