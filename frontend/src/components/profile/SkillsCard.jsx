import { Award, Plus } from 'lucide-react';

export default function SkillsCard({ skills = {}, onAdd }) {
	const normalizedSkills = Array.isArray(skills)
		? { Skills: skills }
		: Object.fromEntries(Object.entries(skills || {}).map(([group, values]) => [
			group,
			Array.isArray(values) ? values : values ? [values] : [],
		]));
	const groups = Object.entries(normalizedSkills);
	const hasSkills = groups.some(([, values]) => values.length > 0);

	return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="skills-heading"><div className="flex items-center justify-between"><h2 id="skills-heading" className="flex items-center gap-2 text-xl font-black text-slate-900"><Award className="h-5 w-5 text-[var(--brand-deep)]" /> Skills</h2><button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-sm font-bold text-[var(--brand-deep)]"><Plus className="h-4 w-4" /> Add Skill</button></div>{!hasSkills ? <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Add skills so our AI can match you with relevant roles.</p> : <div className="mt-5 space-y-4">{groups.map(([group, values]) => <div key={group}><h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{group}</h3><div className="mt-2 flex flex-wrap gap-2">{values.map((skill, index) => { const skillName = typeof skill === 'object' ? skill.name || skill.title || `Skill ${index + 1}` : String(skill); return <span key={`${group}-${skillName}-${index}`} className="rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--brand-deep)]">{skillName}{typeof skill === 'object' && skill.level ? ` · ${skill.level}` : ''}</span>; })}</div></div>)}</div>}</section>;
}
