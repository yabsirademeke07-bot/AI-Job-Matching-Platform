import React, { useState } from 'react';

export default function InteractiveAiDemo() {
  const [userSkills, setUserSkills] = useState('React, Tailwind');
  const [demoScore, setDemoScore] = useState(88);

  const handleSkillChange = (val) => {
    setUserSkills(val);
    const count = val.split(',').filter(s => s.trim().length > 0).length;
    const calculated = Math.min(50 + count * 12, 99);
    setDemoScore(count > 0 ? calculated : 40);
  };

  return (
    <section className="py-16 px-6 max-w-5xl mx-auto">
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-3xl p-8 md:p-12 shadow-xl border border-indigo-700/50">
        <div className="max-w-2xl">
          <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-400/30">
            Interactive AI Simulator
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold mt-4 mb-2 text-white">See How AI Match Works</h2>
          <p className="text-indigo-200/80 text-xs md:text-sm mb-6">Type your technical skills to calculate live job fit accuracy.</p>

          <div className="mb-6">
            <input
              type="text"
              value={userSkills}
              onChange={(e) => handleSkillChange(e.target.value)}
              className="w-full bg-indigo-950 border border-indigo-700/80 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-400 placeholder-indigo-300/50"
              placeholder="e.g. React, Node.js, PostgreSQL"
            />
          </div>

          <div className="bg-indigo-950/80 border border-indigo-700/70 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white text-xs md:text-sm">Senior Full Stack Developer</h4>
              <p className="text-[11px] text-indigo-300/70">Requirements: React, Node.js, PostgreSQL</p>
            </div>
            <span className={`text-xl font-extrabold ${demoScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {demoScore}% Match
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}