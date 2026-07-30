import React from 'react';

export default function Testimonials() {
  const stories = [
    { quote: "I landed my React developer role in less than a week. The match score was spot on!", name: "Yared H.", role: "Frontend Developer" },
    { quote: "Screening tech candidates used to take days. AI JobMatch saved our team dozens of hours.", name: "Saba T.", role: "Tech Recruiter" },
    { quote: "The platform's skill evaluation showed me exactly what roles I was qualified for.", name: "Aman K.", role: "Full Stack Engineer" },
  ];

  return (
    <section className="py-16 px-6 bg-indigo-50/50 border-t border-indigo-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Trusted by Local Tech Talent</h2>
          <p className="text-slate-500 text-sm mt-1">See how Ethiopian developers and companies use AI JobMatch.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stories.map((t, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between">
              <p className="text-xs text-slate-600 italic mb-6 leading-relaxed">"{t.quote}"</p>
              <div>
                <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                <p className="text-[11px] text-indigo-600 font-medium">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}