import { useState } from 'react';

const MOCK_JOBS = [
  {
    id: 1,
    title: 'Frontend Developer (React)',
    company: 'TechCorp',
    location: 'Remote',
    type: 'Full-time',
    matchScore: 92,
  },
  {
    id: 2,
    title: 'Full Stack Engineer',
    company: 'InnovateX',
    location: 'Hybrid',
    type: 'Full-time',
    matchScore: 85,
  },
];

export default function JobList() {
  const [jobs] = useState(MOCK_JOBS);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Explore Jobs</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-white p-6 rounded-xl shadow-md border border-slate-100 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{job.title}</h2>
                <p className="text-slate-500">{job.company} • {job.location}</p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {job.matchScore}% AI Match
              </span>
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
              <span className="text-sm text-slate-600">{job.type}</span>
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                Apply Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}