import React, { useState } from 'react';

export default function FaqAccordion() {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    { q: "How does the AI Job Matching algorithm work?", a: "Our algorithm analyzes your tech skills, experience level, and preferred stack to match you against active job requirements with a percentage score." },
    { q: "Is AI JobMatch free for tech job seekers?", a: "Yes! Job seekers can register, build an AI resume profile, and apply to job postings completely free." },
    { q: "How do employers review my application?", a: "Employers see an AI-ranked list of candidates sorted by compatibility, ensuring top-matching applicants get interviewed first." },
  ];

  return (
    <section className="py-16 px-6 bg-white border-t border-indigo-100">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-indigo-50/40 rounded-2xl border border-indigo-100 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left p-4 font-bold text-slate-800 text-xs md:text-sm flex justify-between items-center cursor-pointer hover:text-indigo-600 transition"
              >
                <span>{faq.q}</span>
                <span className="text-indigo-400 font-mono text-base">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-indigo-100/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}