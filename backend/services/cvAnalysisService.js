const fs = require('fs/promises');
const path = require('path');
const mammoth = require('mammoth');

const CV_FIELDS = ['full_name', 'email', 'phone', 'professional_title', 'skills', 'experience', 'education', 'certifications', 'languages'];
const INVALID_MARKERS = ['invoice', 'electric bill', 'utility bill', 'receipt', 'bank statement', 'purchase order', 'table of contents'];
const SECTION_MARKERS = ['resume', 'curriculum vitae', 'professional summary', 'summary', 'experience', 'work history', 'employment', 'skills', 'education', 'certification', 'objective'];
const LOCATION_WORDS = ['addis ababa', 'ethiopia', 'nairobi', 'kenya', 'lagos', 'nigeria', 'kigali', 'rwanda', 'dire dawa', 'bahir dar'];
const SKILL_CATALOG = {
  technical: ['javascript', 'typescript', 'react', 'node.js', 'nodejs', 'python', 'java', 'c++', 'sql', 'mysql', 'mongodb', 'aws', 'azure', 'docker', 'kubernetes', 'git', 'html', 'css', 'excel', 'figma', 'php', 'django', 'machine learning', 'data analysis', 'networking', 'linux', 'cisco packet tracer'],
  soft: ['communication', 'leadership', 'teamwork', 'problem solving', 'time management', 'adaptability', 'collaboration', 'critical thinking', 'team leadership'],
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
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker('eng');
    try { return ((await worker.recognize(buffer)).data.text || '').trim(); } finally { await worker.terminate(); }
  }
  throw new Error('Unsupported CV file type.');
}

function normalizeSkill(value) {
  return String(value || '').toLowerCase().trim().replace(/nodejs/g, 'node.js').replace(/problem-solving/g, 'problem solving');
}

function skillObject(value, category) {
  const name = normalizeSkill(typeof value === 'string' ? value : value?.skill_name || value?.name);
  if (!name) return null;
  return { skill_name: name, skill_category: String(typeof value === 'object' ? value.skill_category || category : category), proficiency_level: typeof value === 'object' && value.proficiency_level ? value.proficiency_level : 'intermediate', years_of_experience: typeof value === 'object' ? value.years_of_experience ?? null : null };
}

function normalizeName(value, text, email) {
  const candidate = String(value || '').replace(/\s+/g, ' ').trim();
  const lower = candidate.toLowerCase();
  const roleWords = /engineer|developer|specialist|manager|analyst|consultant|administrator|designer|student|professional|coordinator/;
  if (candidate && candidate.split(' ').length >= 2 && !LOCATION_WORDS.some((place) => lower.includes(place)) && !roleWords.test(lower)) return candidate;
  const prefix = String(email || '').split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+/g, ' ').trim();
  if (prefix) return prefix.split(' ').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => /^[A-Za-z]+(?:\s+[A-Za-z]+){1,3}$/.test(line) && !LOCATION_WORDS.includes(line.toLowerCase()) && !SECTION_MARKERS.includes(line.toLowerCase()) && !roleWords.test(line.toLowerCase())) || '';
}

function cleanAnalysis(value) {
  const analysis = value && typeof value === 'object' ? value : {};
  const skillGroups = analysis.skills && !Array.isArray(analysis.skills) ? analysis.skills : {};
  const skills = (Array.isArray(analysis.skills) ? analysis.skills : [
    ...(skillGroups.technical || []).map((item) => skillObject(item, 'technical')),
    ...(skillGroups.tools || []).map((item) => skillObject(item, 'tools')),
    ...(skillGroups.soft || []).map((item) => skillObject(item, 'soft')),
  ]).map((item) => skillObject(item, item?.skill_category || 'technical')).filter(Boolean).filter((item, index, list) => list.findIndex((candidate) => candidate.skill_name === item.skill_name) === index);
  const email = String(analysis.email || '').trim();
  const fullName = normalizeName(analysis.fullName || analysis.full_name, analysis.rawText, email);
  const education = Array.isArray(analysis.education) ? analysis.education.map((item) => ({ school_name: item.institution || item.school_name || null, degree: item.degree || null, field_of_study: item.field_of_study || null, start_date: item.start_date || null, end_date: item.end_date || null, graduationYear: item.graduationYear || null, gpa: item.gpa || null, is_current: Boolean(item.is_current), description: item.description || null })) : [];
  const experience = Array.isArray(analysis.experience) ? analysis.experience.map((item) => ({ company_name: item.company || item.company_name || null, job_title: item.role || item.job_title || null, employment_type: item.employment_type || 'contract', location: item.location || null, start_date: item.start_date || null, end_date: item.end_date || null, duration: item.duration || null, is_current: Boolean(item.is_current || /present|current/i.test(item.duration || '')), description: Array.isArray(item.responsibilities) ? item.responsibilities.join('\n') : item.description || null, responsibilities: Array.isArray(item.responsibilities) ? item.responsibilities : [], years_of_experience: item.years_of_experience ?? null })) : [];
  return {
    is_cv: analysis.is_cv === true,
    full_name: fullName,
    fullName,
    email,
    phone: String(analysis.phone || '').trim(),
    professional_title: String(analysis.professional_title || analysis.headline || '').trim(),
    headline: String(analysis.headline || analysis.professional_title || '').trim(),
    location: String(analysis.location || '').trim(),
    skills,
    skillGroups: { technical: skills.filter((item) => item.skill_category === 'technical').map((item) => item.skill_name), tools: skills.filter((item) => item.skill_category === 'tools').map((item) => item.skill_name), soft: skills.filter((item) => item.skill_category === 'soft').map((item) => item.skill_name) },
    experience,
    education,
    certifications: Array.isArray(analysis.certifications) ? analysis.certifications : [],
    languages: Array.isArray(analysis.languages) ? analysis.languages : [],
    recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
    extractedSummary: String(analysis.extractedSummary || analysis.summary || '').trim(),
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
  const fullName = normalizeName('', text, email);
  const location = lines.find((line) => LOCATION_WORDS.some((place) => line.toLowerCase().includes(place))) || '';
  const titleLine = lines.find((line) => /developer|engineer|designer|manager|analyst|consultant|specialist|administrator|accountant|marketing|student|professional/i.test(line) && line.length < 100) || '';
  const skills = Object.entries(SKILL_CATALOG).flatMap(([category, catalog]) => catalog.filter((skill) => lower.includes(skill)).map((skill) => ({ skill_name: skill, skill_category: category, proficiency_level: 'intermediate', years_of_experience: null })));
  const uniqueSkills = skills.filter((skill, index, list) => list.findIndex((item) => item.skill_name === skill.skill_name) === index);
  const education = lines.filter((line) => /university|college|school|institute|bachelor|master|phd|degree|diploma/i.test(line)).slice(0, 5).map((line) => ({ school_name: /university|college|school|institute/i.test(line) ? line : null, degree: /bachelor|master|phd|degree|diploma/i.test(line) ? line : null, field_of_study: null, start_date: dateFromText(line), end_date: null, is_current: false, description: null }));
  const experience = lines.filter((line) => /engineer|developer|manager|analyst|consultant|specialist|administrator|intern|coordinator/i.test(line) && !/skill|education|summary/i.test(line)).slice(0, 5).map((line) => ({ company_name: null, job_title: line.slice(0, 100), employment_type: 'contract', location: null, start_date: dateFromText(line), end_date: null, is_current: /present|current/i.test(line), description: line, years_of_experience: null }));
  const certifications = lines.filter((line) => /certified|certification|certificate|aws|scrum|pmp/i.test(line)).slice(0, 5).map((line) => ({ name: line, issuer: null, date: dateFromText(line) }));
  const languages = lines.filter((line) => /english|amharic|french|german|spanish|arabic/i.test(line)).slice(0, 5).map((line) => ({ language_name: line, proficiency: 'professional-working' }));
  const hasName = Boolean(fullName);
  const hasContact = Boolean(email || phone);
  const hasContentIndicator = uniqueSkills.length > 0 || education.length > 0 || experience.length > 0;
  const isCv = Boolean(text.trim()) && !INVALID_MARKERS.some((marker) => lower.includes(marker)) && hasName && hasContact && hasContentIndicator;
  return cleanAnalysis({ is_cv: isCv, full_name: fullName, email, phone, location, professional_title: titleLine, skills: uniqueSkills, experience, education, certifications, languages, rawText: text, recommendations: ['Add specific achievements and measurable results to your experience entries.'] });
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
  return `You are a conservative CV extraction engine. Return ONLY valid JSON matching this schema. Never invent data. Never use "Not specified" or "Unknown"; use null or []. A city/country is never a person's name. Choose fullName from an explicit name heading or corroborate it with the email prefix; reject headings such as Addis Ababa, Ethiopia, Resume, or Curriculum Vitae. Normalize every skill to lowercase and put it in technical, tools, or soft. Keep real company and institution names only; for missing values use null.\nSchema: {"is_cv":true,"fullName":"string","email":"string","phone":"string","location":"string","headline":"string","education":[{"degree":"string|null","institution":"string|null","graduationYear":"string|null","gpa":"string|null"}],"experience":[{"role":"string|null","company":"string|null","duration":"string|null","responsibilities":["string"]}],"skills":{"technical":["string"],"tools":["string"],"soft":["string"]},"extractedSummary":"string"}.\nDOCUMENT:\n${text.slice(0, 50000)}`;
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
      return cleanAnalysis({ ...analysis, rawText: text, is_cv: local.is_cv, ai_provider: provider, is_fallback: false });
    } catch (error) {
      console.error(`${provider} CV analysis failed; trying fallback:`, error.message);
    }
  }
  return { ...local, ai_provider: 'fallback_parser', is_fallback: true };
}

module.exports = { extractText, classifyAndExtract, calculateScores, calculateRealJobMatch, localParse };
