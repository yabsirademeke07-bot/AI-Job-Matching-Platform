/**
 * Client-side CV Inspector / Validator
 */
export const validateCvContent = async (file, firstName = '', lastName = '') => {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const fileName = file.name;
  const fileSize = (file.size / 1024).toFixed(1) + ' KB';
  
  const techKeywords = ['JavaScript', 'React', 'Node.js', 'HTML', 'CSS', 'PHP', 'Python', 'SQL', 'Git', 'Tailwind CSS'];
  const detectedSkills = techKeywords.filter(() => Math.random() > 0.3);

  const mockEmail = `${firstName.toLowerCase() || 'candidate'}@example.com`;
  const mockPhone = '+251 91 123 4567';

  return {
    fileName,
    fileSize,
    isValidCV: true,
    details: {
      name: { value: `${firstName} ${lastName}`.trim() || 'Candidate Name', status: 'valid' },
      email: { value: mockEmail, status: 'valid' },
      contact: { value: mockPhone, status: 'valid' },
      skills: { value: detectedSkills, status: 'valid' }
    }
  };
};