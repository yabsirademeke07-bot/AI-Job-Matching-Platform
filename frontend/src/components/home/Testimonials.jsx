import React from 'react';
import { Quote, Star, UserCheck } from 'lucide-react';

export default function Testimonials() {
  const stories = [
    { 
      quote: "I landed my React developer role in less than a week. The AI match score was spot on!", 
      name: "Yared H.", 
      role: "Frontend Developer" 
    },
    { 
      quote: "Screening tech candidates used to take days. Lemesrat.ai saved our recruitment team dozens of hours.", 
      name: "Saba T.", 
      role: "Tech Recruiter" 
    },
    { 
      quote: "The platform's skill evaluation showed me exactly what tech roles I was qualified for in Addis Ababa.", 
      name: "Aman K.", 
      role: "Full Stack Engineer" 
    },
  ];

  return (
    <section className="py-20 px-6 bg-slate-50/80 border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Success Stories
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Trusted by Local Tech Talent
          </h2>
          <p className="text-slate-500 text-sm">
            See how Ethiopian developers and employers thrive with Lemesrat.ai.
          </p>
        </div>

        {/* Testimonials Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stories.map((t, idx) => (
            <div 
              key={idx} 
              className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-6 relative group"
            >
              {/* Quote Icon Background Accent */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Quote className="w-8 h-8 text-blue-500/20 group-hover:text-blue-500/40 transition-colors" />
                  
                  {/* 5-Star Rating */}
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  "{t.quote}"
                </p>
              </div>

              {/* User Info Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs border border-blue-200">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                  <p className="text-[11px] text-blue-600 font-semibold">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}