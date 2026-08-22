import React, { useState } from 'react';
import { Cpu, Sparkles, Zap, CheckCircle2 } from 'lucide-react';

export default function InteractiveAiDemo() {
  const [userSkills, setUserSkills] = useState('React, Tailwind');
  const [demoScore, setDemoScore] = useState(88);

  const handleSkillChange = (val) => {
    setUserSkills(val);
    const count = val.split(',').filter((s) => s.trim().length > 0).length;
    const calculated = Math.min(50 + count * 12, 99);
    setDemoScore(count > 0 ? calculated : 40);
  };

  return (
    <section className="py-16 px-6 max-w-5xl mx-auto">
      <div className="bg-gradient-to-br from-blue-50/80 via-white to-slate-50 text-slate-900 rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200/90 relative overflow-hidden">
        
        {/* Subtle Decorative Glow */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-2xl relative z-10 space-y-6">
          
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-bold px-3.5 py-1.5 rounded-full border border-blue-200 shadow-xs">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            Interactive AI Simulator
          </span>

          {/* Heading */}
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              See How AI Match Works
            </h2>
            <p className="text-slate-500 text-xs md:text-sm mt-1">
              Type your technical skills to calculate live job fit accuracy in real-time.
            </p>
          </div>

          {/* Input Field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Your Skills Matrix
            </label>
            <input
              type="text"
              value={userSkills}
              onChange={(e) => handleSkillChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 shadow-sm transition"
              placeholder="e.g. React, Node.js, PostgreSQL, Tailwind"
            />
          </div>

          {/* Live Result Output Box */}
          <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                  <span>Senior Full Stack Developer</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target Stack: React, Node.js, PostgreSQL
                </p>
              </div>

              <span
                className={`text-lg md:text-xl font-black px-3.5 py-1.5 rounded-xl border flex items-center gap-1 ${
                  demoScore >= 80
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                {demoScore}% Match
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  demoScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${demoScore}%` }}
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}