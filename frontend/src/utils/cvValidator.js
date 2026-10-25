const supportedCvExtensions = new Set(['.pdf', '.doc', '.docx']);

export const validateCvContent = async (file) => {
  if (!file || typeof file.name !== 'string' || !Number.isFinite(file.size)) {
    throw new TypeError('A valid CV file is required.');
  }

  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const fileSize = `${(file.size / 1024).toFixed(1)} KB`;
  return {
    fileName: file.name,
    fileSize,
    isValidCV: file.size > 0 && supportedCvExtensions.has(extension),
    details: {},
  };
};