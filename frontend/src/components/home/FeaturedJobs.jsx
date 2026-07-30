import React from 'react';
import { Link } from 'react-router-dom';

export default function FeaturedJobs() {
  const jobs = [
    { title: 'Frontend React Developer', company: 'Ethiopian Tech Hub', location: 'Addis Ababa (Hybrid)', type: 'Full-time', match: '98% Match', skills: ['React', 'JavaScript', 'Tailwind'] },
    { title: 'Full Stack Engineer', company: 'PayEthio FinTech', location: 'Remote', type: 'Full-time', match: '85% Match', skills: ['React', 'Node.js', 'PostgreSQL'] },
    { title: 'Python Backend Engineer', company: 'NextGen Solutions', location: 'Addis Ababa', type: 'Contract', match: '92% Match', skills: ['Python', 'FastAPI', 'Docker'] },
  ];

  return (
    <section className="py-16 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Featured Opportunities</h2>
          <p className="text-slate-500 text-sm mt-1">High-match technical roles updated daily.</p>
        </div>
        <Link to="/jobs" className="text-indigo-600 hover:text-indigo-700 font-bold text-sm hover:underline">
          Browse All Jobs &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {jobs.map((job, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">{job.type}</span>
                <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200">{job.match}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">{job.title}</h3>
              <p className="text-xs text-slate-500 mb-1">🏢 {job.company}</p>
              <p className="text-[11px] text-slate-400 mb-4">📍 {job.location}</p>
              <div className="flex flex-wrap gap-1.5 mb-6">
                {job.skills.map(s => (
                  <span key={s} className="text-[11px] bg-indigo-50/80 text-indigo-700 px-2 py-0.5 rounded font-medium border border-indigo-100">{s}</span>
                ))}
              </div>
            </div>
            <Link to="/login" className="w-full text-center bg-indigo-950 hover:bg-indigo-600 text-white font-semibold py-2.5 rounded-xl text-xs transition">
              Apply with AI Resume
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}