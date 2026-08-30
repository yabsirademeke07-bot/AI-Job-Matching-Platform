import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Filter, Search, Star, UserRound, FileText, UserPlus, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';

const demoCandidates = [
  {
    id: 'pool-1',
    fullName: 'Marta Bekele',
    email: 'marta@example.com',
    phone: '+251912345678',
    preferredDepartment: 'Engineering',
    preferredJobType: 'Full-time',
    keySkills: ['React', 'TypeScript', 'Node.js'],
    experience: '5 years',
    cvFileName: 'marta_resume.pdf',
    coverNote: 'Looking for senior frontend product roles in a collaborative team.',
  },
  {
    id: 'pool-2',
    fullName: 'Nahom Tesfaye',
    email: 'nahom@example.com',
    phone: '+251911223344',
    preferredDepartment: 'Design',
    preferredJobType: 'Remote',
    keySkills: ['Figma', 'UI/UX', 'Product Design'],
    experience: '3 years',
    cvFileName: 'nahom_resume.pdf',
    coverNote: 'Interested in remote design roles focused on SaaS product experiences.',
  },
];

export default function TalentPool() {
  const [candidates, setCandidates] = useState(demoCandidates);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [skillFilter, setSkillFilter] = useState('All');
  const [experience, setExperience] = useState('All');

  useEffect(() => {
    const loadPool = async () => {
      try {
        const { data } = await api.get('/employer/talent-pool');
        const items = data?.candidates || data || demoCandidates;
        setCandidates(items.length ? items : demoCandidates);
      } catch {
        const stored = JSON.parse(localStorage.getItem('company-open-applications:default') || '[]');
        setCandidates(stored.length ? stored : demoCandidates);
      }
    };

    loadPool();
  }, []);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const matchesSearch =
        !search ||
        `${candidate.fullName || ''} ${candidate.email || ''} ${candidate.preferredDepartment || ''} ${candidate.keySkills?.join(' ') || ''}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesDepartment = department === 'All' || candidate.preferredDepartment === department;
      const matchesSkill = skillFilter === 'All' || (candidate.keySkills || []).includes(skillFilter);
      const matchesExperience =
        experience === 'All' ||
        (experience === '1-3 years' && candidate.experience && candidate.experience.includes('1')) ||
        (experience === '3+ years' && candidate.experience && Number.parseInt(candidate.experience, 10) >= 3) ||
        (experience === '5+ years' && candidate.experience && Number.parseInt(candidate.experience, 10) >= 5);

      return matchesSearch && matchesDepartment && matchesSkill && matchesExperience;
    });
  }, [candidates, search, department, skillFilter, experience]);

  const departmentOptions = ['All', ...new Set(candidates.map((candidate) => candidate.preferredDepartment).filter(Boolean))];
  const skillOptions = ['All', ...new Set(candidates.flatMap((candidate) => candidate.keySkills || []))];

  const moveToShortlist = (id) => {
    setCandidates((current) => current.map((candidate) => (candidate.id === id ? { ...candidate, shortlisted: true } : candidate)));
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-600">Talent pool</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">General Applicants</h2>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          {filteredCandidates.length} candidates
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search candidate"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            {departmentOptions.map((option) => (
              <option key={option} value={option}>{option === 'All' ? 'All Departments' : option}</option>
            ))}
          </select>

          <select
            value={skillFilter}
            onChange={(event) => setSkillFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            {skillOptions.map((option) => (
              <option key={option} value={option}>{option === 'All' ? 'All Skills' : option}</option>
            ))}
          </select>

          <select
            value={experience}
            onChange={(event) => setExperience(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="All">All Experience</option>
            <option value="1-3 years">1–3 years</option>
            <option value="3+ years">3+ years</option>
            <option value="5+ years">5+ years</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredCandidates.map((candidate) => (
          <article key={candidate.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-lg font-black text-blue-700">
                  {candidate.fullName?.charAt(0) || 'C'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{candidate.fullName}</h3>
                  <p className="text-sm text-slate-500">{candidate.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-700">{candidate.preferredDepartment}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700">{candidate.preferredJobType}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-700">{candidate.experience || 'Experience TBD'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                  <FileText className="h-4 w-4" /> View CV
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">
                  <UserPlus className="h-4 w-4" /> Invite to Apply for New Job
                </button>
                <button
                  onClick={() => moveToShortlist(candidate.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                >
                  <Star className="h-4 w-4" /> Move to Shortlist
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(candidate.keySkills || []).map((skill) => (
                    <span key={skill} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Cover note</p>
                <p className="mt-2 text-sm text-slate-600">{candidate.coverNote || 'No cover note provided yet.'}</p>
              </div>
            </div>
          </article>
        ))}

        {!filteredCandidates.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <UserRound className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-lg font-black text-slate-700">No candidates match the current filters.</p>
            <p className="mt-1 text-sm text-slate-500">Try broadening the department, skill, or experience filters.</p>
          </div>
        )}
      </div>
    </section>
  );
}
