function normalizeSubSectors(value) {
  if (value === undefined || value === null || value === '') return [];

  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) return null;

  return [...new Set(parsed.map((item) => item.trim()).filter(Boolean))];
}

module.exports = { normalizeSubSectors };
