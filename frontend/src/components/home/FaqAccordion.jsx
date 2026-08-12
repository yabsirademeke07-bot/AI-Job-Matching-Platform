import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export default function FaqAccordion() {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    { 
      q: "How does the AI Job Matching algorithm work?", 
      a: "Our algorithm analyzes your tech skills, experience level, and preferred stack from your uploaded CV to match you against active job requirements with a precise compatibility score." 
    },
    { 
      q: "Is Lemesrat.ai free for tech job seekers?", 
      a: "Yes! Job seekers can register, build an AI resume profile, analyze skill matches, and apply to job postings completely free." 
    },
    { 
      q: "How do employers review my application?", 
      a: "Employers see an AI-ranked list of candidates sorted by compatibility score, ensuring top-matching applicants get interviewed first." 
    },
  ];

  return (
    <section className="py-20 px-6 bg-white border-t border-slate-200/80">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* Section Header */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200">
            <HelpCircle className="w-3.5 h-3.5" />
            Support & FAQs
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-500 text-sm">
            Everything you need to know about candidate matching on Lemesrat.ai.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div 
                key={i} 
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen 
                    ? 'bg-blue-50/40 border-blue-200 shadow-sm' 
                    : 'bg-slate-50/70 border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full text-left p-5 font-bold text-slate-900 text-sm md:text-base flex justify-between items-center cursor-pointer transition-colors"
                >
                  <span className="pr-4">{faq.q}</span>
                  <div className={`p-1 rounded-full bg-white border border-slate-200 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600 border-blue-200' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs md:text-sm text-slate-600 leading-relaxed border-t border-blue-100/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}