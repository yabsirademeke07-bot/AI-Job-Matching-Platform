const SALARY_TYPES = ['Monthly', 'Yearly', 'Hourly', 'Fixed', 'Negotiable'];

function normalizeSalaryType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const aliases = {
    monthly: 'Monthly',
    'per month': 'Monthly',
    yearly: 'Yearly',
    annual: 'Yearly',
    annually: 'Yearly',
    'per year': 'Yearly',
    hourly: 'Hourly',
    'per hour': 'Hourly',
    fixed: 'Fixed',
    'project-based': 'Fixed',
    'fixed / project-based': 'Fixed',
    negotiable: 'Negotiable',
  };
  return aliases[normalized] || null;
}

module.exports = { SALARY_TYPES, normalizeSalaryType };
