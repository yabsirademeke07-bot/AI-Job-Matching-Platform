import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function MatchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract parsed skills passed from UploadCv page
  const extractedSkills = location.state?.skills || ['React.js', 'Node.js', 'JavaScript'];

  // Dummy Matched Jobs Data based on AI Score
  const matchedJobs = [
    {
      id: 1,
      title: 'Senior Frontend Developer',
      company: 'Gebeya Inc.',
      location: 'Addis Ababa (Hybrid)',
      matchScore: 95,
      matchingSkills: ['React.js', 'JavaScript', 'Tailwind CSS'],
      salary: '35,000 - 50,000 ETB'
    },
    {
      id: 2,
      title: 'Full Stack Software Engineer',
      company: 'EagleLion System Solutions',
      location: 'Addis Ababa (On-site)',
      matchScore: 88,
      matchingSkills: ['Node.js', 'React.js', 'Git'],
      salary: '40,000 - 60,000 ETB'
    },
    {
      id: 3,
      title: 'Junior Web Developer',
      company: 'iCog Labs',
      location: 'Remote',
      matchScore: 82,
      matchingSkills: ['JavaScript', 'Tailwind CSS'],
      salary: '20,000 - 30,000 ETB'
    }
  ];

  const handleApply = (jobId) => {
    // Directs user to Register page to save profile & complete application
    navigate('/register', { state: { jobId, fromMatch: true } });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Summary */}
        <div className="bg-indigo-950/40 border border-indigo-800/50 p-6 rounded-3xl backdrop-blur-md text-center">
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold px-4 py-1.5 rounded-full inline-block mb-3">
            ✨ AI Match Complete
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Matched Jobs For Your Profile</h1>
          <p className="text-xs sm:text-sm text-indigo-200/80 mb-4">
            Based on skills extracted from your CV:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {extractedSkills.map((skill, index) => (
              <span key={index} className="bg-indigo-900/80 border border-indigo-700/60 text-indigo-100 text-xs px-3 py-1 rounded-lg">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Matched Jobs List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-indigo-200">Top Recommended Roles:</h2>
          
          {matchedJobs.map((job) => (
            <div 
              key={job.id} 
              className="bg-indigo-950/30 border border-indigo-800/40 p-6 rounded-2xl hover:border-indigo-600/60 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-white">{job.title}</h3>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
                    {job.matchScore}% Match
                  </span>
                </div>
                <p className="text-xs text-indigo-300">{job.company} • {job.location}</p>
                <p className="text-xs text-slate-400 font-semibold">{job.salary}</p>
                
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {job.matchingSkills.map((s, idx) => (
                    <span key={idx} className="bg-indigo-950 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-800/60">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleApply(job.id)}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-indigo-600/30 whitespace-nowrap"
              >
                Apply & Save Profile &rarr;
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}