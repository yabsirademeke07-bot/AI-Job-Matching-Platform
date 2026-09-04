const fs = require('fs/promises');
const path = require('path');
const mammoth = require('mammoth');

const CV_FIELDS = ['full_name', 'email', 'phone', 'professional_title', 'skills', 'experience', 'education', 'certifications', 'languages'];
const INVALID_MARKERS = ['invoice', 'electric bill', 'utility bill', 'receipt', 'bank statement', 'purchase order', 'table of contents'];
const SECTION_MARKERS = ['resume', 'curriculum vitae', 'professional summary', 'summary', 'experience', 'work history', 'employment', 'skills', 'education', 'certification', 'objective'];
const SKILL_CATALOG = {
  technical: ['javascript', 'typescript', 'react', 'node.js', 'nodejs', 'python', 'java', 'c++', 'sql', 'mysql', 'mongodb', 'aws', 'azure', 'docker', 'kubernetes', 'git', 'html', 'css', 'excel', 'figma', 'php', 'django', 'machine learning', 'data analysis'],
  soft: ['communication', 'leadership', 'teamwork', 'problem solving', 'time management', 'adaptability', 'collaboration', 'critical thinking'],
};

async function extractText(file) {
  const buffer = await fs.readFile(file.path);
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }
  if (extension === '.pdf') {
    const parserModule = require('pdf-parse');
    if (typeof parserModule === 'function') return ((await parserModule(buffer)).text || '').trim();
    const parser = new parserModule.PDFParse({ data: buffer });
    try { return ((await parser.getText()).text || '').trim(); } finally { await parser.destroy(); }
  }
  throw new Error('Unsupported CV file type.');
}

function cleanAnalysis(value) {
  const analysis = value && typeof value === 'object' ? value : {};
  return {
    is_cv: analysis.is_cv === true,
    full_name: String(analysis.full_name || '').trim(),
    email: String(analysis.email || '').trim(),
    phone: String(analysis.phone || '').trim(),
    professional_title: String(analysis.professional_title || '').trim(),
    skills: Array.isArray(analysis.skills) ? analysis.skills : [],
    experience: Array.isArray(analysis.experience) ? analysis.experience : [],
    education: Array.isArray(analysis.education) ? analysis.education : [],
    certifications: Array.isArray(analysis.certifications) ? analysis.certifications : [],
    languages: Array.isArray(analysis.languages) ? analysis.languages : [],
    recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
  };
}

function dateFromText(value) {
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? `${match[0]}-01-01` : null;
}

function localParse(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lower = text.toLowerCase();
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || '';
  const fullName = lines.find((line) => /^[A-Za-z][A-Za-z .'-]{2,60}$/.test(line) && !SECTION_MARKERS.includes(line.toLowerCase())) || '';
  const titleLine = lines.find((line) => /developer|engineer|designer|manager|analyst|consultant|specialist|administrator|accountant|marketing|student|professional/i.test(line) && line.length < 100) || '';
  const skills = Object.entries(SKILL_CATALOG).flatMap(([category, catalog]) => catalog.filter((skill) => lower.includes(skill)).map((skill) => ({ skill_name: skill, skill_category: category, proficiency_level: 'intermediate', years_of_experience: null })));
  const uniqueSkills = skills.filter((skill, index, list) => list.findIndex((item) => item.skill_name === skill.skill_name) === index);
  const education = lines.filter((line) => /university|college|school|institute|bachelor|master|phd|degree|diploma/i.test(line)).slice(0, 5).map((line) => ({ school_name: line, degree: /master|phd/i.test(line) ? (line.match(/master|phd/i)?.[0] || 'Degree') : 'Degree', field_of_study: 'Not specified', start_date: dateFromText(line), end_date: null, is_current: false, description: null }));
  const experience = lines.filter((line) => /engineer|developer|manager|analyst|consultant|specialist|administrator|intern|coordinator|at\s+[A-Z]/i.test(line) && !/skill|education|summary/i.test(line)).slice(0, 5).map((line) => ({ company_name: 'Not specified', job_title: line.slice(0, 100), employment_type: 'contract', location: null, start_date: dateFromText(line), end_date: null, is_current: /present|current/i.test(line), description: line, years_of_experience: null }));
  const certifications = lines.filter((line) => /certified|certification|certificate|aws|scrum|pmp/i.test(line)).slice(0, 5).map((line) => ({ name: line, issuer: null, date: dateFromText(line) }));
  const languages = lines.filter((line) => /english|amharic|french|german|spanish|arabic/i.test(line)).slice(0, 5).map((line) => ({ language_name: line, proficiency: 'professional-working' }));
  const hasName = Boolean(fullName);
  const hasContact = Boolean(email || phone);
  const hasContentIndicator = uniqueSkills.length > 0 || education.length > 0 || experience.length > 0;
  const isCv = Boolean(text.trim()) && !INVALID_MARKERS.some((marker) => lower.includes(marker)) && hasName && hasContact && hasContentIndicator;
  return cleanAnalysis({ is_cv: isCv, full_name: fullName, email, phone, professional_title: titleLine, skills: uniqueSkills, experience, education, certifications, languages, recommendations: ['Add specific achievements and measurable results to your experience entries.'] });
}

function calculateScores(analysis, text) {
  const presentFields = CV_FIELDS.filter((field) => (Array.isArray(analysis[field]) ? analysis[field].length > 0 : Boolean(analysis[field]))).length;
  const lower = text.toLowerCase();
  const sectionHits = SECTION_MARKERS.filter((section) => lower.includes(section)).length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const readability = Math.max(0, Math.min(100, Math.round(35 + Math.min(words / 8, 35) + Math.min(sectionHits * 5, 30))));
  const keywordMatch = Math.max(0, Math.min(100, Math.round(40 + (analysis.skills.length > 0 ? 25 : 0) + (analysis.education.length > 0 ? 20 : 0) + (analysis.experience.length > 0 ? 15 : 0))));
  const profileCompletion = Math.round((presentFields / CV_FIELDS.length) * 100);
  const cvScore = Math.round(readability * 0.35 + keywordMatch * 0.35 + profileCompletion * 0.3);
  return { cvScore, readability, keywordMatch, profileCompletion };
}

function calculateRealJobMatch(candidateSkills = [], activeJobs = []) {
  if (!candidateSkills.length || !activeJobs.length) return 0;
  const normalizedCandidateSkills = candidateSkills
    .map((skill) => (typeof skill === 'string' ? skill : skill.skill_name))
    .filter(Boolean)
    .map((skill) => skill.toLowerCase().trim());
  let totalMatch = 0;
  let evaluatedJobs = 0;

  for (const job of activeJobs) {
    const jobSkills = Array.isArray(job.required_skills)
      ? job.required_skills
      : typeof job.required_skills === 'string'
        ? (() => {
          try { return JSON.parse(job.required_skills); } catch { return job.required_skills.split(','); }
        })()
        : [];
    const normalizedJobSkills = jobSkills
      .map((skill) => (typeof skill === 'string' ? skill : skill.skill_name))
      .filter(Boolean)
      .map((skill) => skill.toLowerCase().trim());
    if (!normalizedJobSkills.length) continue;
    const matched = normalizedJobSkills.filter((skill) => normalizedCandidateSkills.includes(skill));
    totalMatch += (matched.length / normalizedJobSkills.length) * 100;
    evaluatedJobs += 1;
  }

  return evaluatedJobs ? Math.round(totalMatch / evaluatedJobs) : 0;
}

function buildPrompt(text) {
  return `Classify and parse this document as a resume. Return ONLY JSON. Set is_cv true when it has a candidate name, an email or phone number, and at least one skills, education, work, volunteer, or project indicator. Reject only blank, unreadable, clearly unrelated documents such as invoices, receipts, bills, books, or articles. Missing address, summary, LinkedIn, dates, institution, degree, experience, languages, and certifications are acceptable; use null, "Not specified", or empty arrays. Never invent data. Return this shape: {"is_cv":boolean,"full_name":string,"email":string,"phone":string,"professional_title":string,"skills":[{"skill_name":string,"skill_category":string,"proficiency_level":"beginner|intermediate|advanced|expert","years_of_experience":number|null}],"experience":[{"company_name":string,"job_title":string,"employment_type":"full-time|part-time|contract|temporary|internship|freelance|self-employed","location":string|null,"start_date":"YYYY-MM-DD"|null,"end_date":"YYYY-MM-DD"|null,"is_current":boolean,"description":string|null,"years_of_experience":number|null}],"education":[{"school_name":string,"degree":string,"field_of_study":string,"start_date":"YYYY-MM-DD"|null,"end_date":"YYYY-MM-DD"|null,"is_current":boolean,"description":string|null}],"certifications":[{"name":string,"issuer":string|null,"date":"YYYY-MM-DD"|null}],"languages":[{"language_name":string,"proficiency":"elementary|limited-working|professional-working|full-professional|native"}],"recommendations":[string]}.\nDOCUMENT:\n${text.slice(0, 50000)}`;
}

async function analyzeWithOpenAI(text) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_CV_MODEL || 'gpt-4o-mini', temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Return conservative resume JSON only.' }, { role: 'user', content: buildPrompt(text) }] }) });
  if (!response.ok) throw new Error(`OpenAI returned HTTP ${response.status}`);
  const payload = await response.json();
  return cleanAnalysis(JSON.parse(payload.choices?.[0]?.message?.content || '{}'));
}

async function analyzeWithGemini(text) {
  const { GoogleGenAI } = require('@google/genai');
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await client.models.generateContent({ model: process.env.GEMINI_CV_MODEL || 'gemini-2.0-flash', contents: buildPrompt(text), config: { temperature: 0, responseMimeType: 'application/json' } });
  const content = typeof response.text === 'function' ? response.text() : response.text;
  return cleanAnalysis(JSON.parse(content || '{}'));
}

async function classifyAndExtract(text) {
  const local = localParse(text);
  if (!local.is_cv) return { ...local, ai_provider: 'fallback_parser', is_fallback: true };
  const providers = [];
  if (process.env.OPENAI_API_KEY) providers.push(['openai', analyzeWithOpenAI]);
  if (process.env.GEMINI_API_KEY) providers.push(['gemini', analyzeWithGemini]);
  for (const [provider, analyzer] of providers) {
    try {
      const analysis = await analyzer(text);
      return { ...analysis, is_cv: local.is_cv, ai_provider: provider, is_fallback: false };
    } catch (error) {
      console.error(`${provider} CV analysis failed; trying fallback:`, error.message);
    }
  }
  return { ...local, ai_provider: 'fallback_parser', is_fallback: true };
}

module.exports = { extractText, classifyAndExtract, calculateScores, calculateRealJobMatch, localParse };
