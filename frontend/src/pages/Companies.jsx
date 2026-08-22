import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  MapPin, 
  Users, 
  Briefcase, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2, 
  Star 
} from 'lucide-react';

// Sample AI-Matched Companies Data
const SAMPLE_COMPANIES = [
  {
    id: 1,
    name: "Safaricom Ethiopia",
    industry: "Telecommunications & Tech",
    location: "Addis Ababa, Ethiopia",
    employees: "1,000 - 5,000",
    openJobs: 12,
    matchScore: 96,
    logoBg: "bg-emerald-600",
    description: "Leading telecommunications company driving digital transformation and mobile network expansion across Ethiopia.",
    verified: true,
    rating: 4.8
  },
  {
    id: 2,
    name: "Ethio Telecom",
    industry: "Enterprise Software & Cloud",
    location: "Addis Ababa, Ethiopia",
    employees: "10,000+",
    openJobs: 18,
    matchScore: 92,
    logoBg: "bg-blue-600",
    description: "National telecommunications provider developing large-scale digital payment and cloud infrastructure solutions.",
    verified: true,
    rating: 4.7
  },
  {
    id: 3,
    name: "Gebeya Inc.",
    industry: "EdTech & Software Engineering",
    location: "Hybrid / Addis Ababa",
    employees: "100 - 500",
    openJobs: 8,
    matchScore: 88,
    logoBg: "bg-amber-500",
    description: "Pan-African tech talent marketplace training and matching skilled software developers with global tech clients.",
    verified: true,
    rating: 4.9
  },
  {
    id: 4,
    name: "Kubik Africa",
    industry: "CleanTech & Environmental Engineering",
    location: "Addis Ababa, Ethiopia",
    employees: "50 - 200",
    openJobs: 5,
    matchScore: 84,
    logoBg: "bg-teal-600",
    description: "Innovative startup converting plastic waste into low-cost, sustainable building materials through AI supply chain management.",
    verified: true,
    rating: 4.6
  },
  {
    id: 5,
    name: "Chapa Financial Technologies",
    industry: "FinTech & Payment Solutions",
    location: "Addis Ababa, Ethiopia",
    employees: "50 - 150",
    openJobs: 9,
    matchScore: 94,
    logoBg: "bg-purple-600",
    description: "Online payment gateway empowering businesses across East Africa with secure, developer-friendly payment APIs.",
    verified: true,
    rating: 4.9
  },
  {
    id: 6,
    name: "Iceaddis Innovation Hub",
    industry: "Tech Incubator & Venture Studio",
    location: "Addis Ababa, Ethiopia",
    employees: "20 - 50",
    openJobs: 3,
    matchScore: 79,
    logoBg: "bg-rose-500",
    description: "Ethiopia's first innovation hub supporting tech entrepreneurs, digital startups, and software acceleration.",
    verified: false,
    rating: 4.5
  }
];

export default function Companies() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');

  // Filter Logic
  const filteredCompanies = SAMPLE_COMPANIES.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          company.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = selectedIndustry === 'All' || company.industry.includes(selectedIndustry);
    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="min-h-screen bg-brand-soft text-slate-800 pt-8 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header / Hero Banner */}
        <div className="brand-gradient rounded-3xl p-8 md:p-12 text-white shadow-xl shadow-[#56a2d8]/20 mb-12 relative overflow-hidden">
          {/* Subtle Background Particle Shapes */}
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-0 right-1/3 w-32 h-32 bg-blue-400/20 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold tracking-wide">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>AI Company Match Engine</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Top Hiring Companies Matched for Your Skills
            </h1>
            
            <p className="text-blue-100 text-sm md:text-base leading-relaxed">
              Explore vetted companies hiring in Ethiopia and remotely. Our AI analyzes tech stacks, company culture, and career growth potential for your profile.
            </p>
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200/80 shadow-sm mb-10 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search company name, skills, tech..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>

          {/* Industry Quick Filters */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {['All', 'Telecommunications', 'FinTech', 'CleanTech', 'EdTech'].map((industry) => (
              <button
                key={industry}
                onClick={() => setSelectedIndustry(industry)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedIndustry === industry 
                    ? 'brand-bg text-white shadow-md shadow-[#56a2d8]/20' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {industry}
              </button>
            ))}
          </div>

        </div>

        {/* Company Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCompanies.map((company) => (
            <div 
              key={company.id}
              className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden min-h-[430px]"
            >
              {/* AI Match Score Badge (Top Right) */}
              <div className="absolute top-5 right-5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1.5 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{company.matchScore}% Match</span>
              </div>

              <div>
                {/* Company Logo Header */}
                <div className="flex items-start gap-4 mb-5 pr-24">
                  <div className={`w-16 h-16 rounded-2xl ${company.logoBg} text-white flex items-center justify-center text-2xl font-black shadow-md ring-4 ring-slate-50 shrink-0`}>
                    {company.name.charAt(0)}
                  </div>
                  
                  <div className="min-w-0 pt-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xl font-extrabold text-slate-900 group-hover-brand-text transition-colors line-clamp-2 leading-tight">
                        {company.name}
                      </h3>
                      {company.verified && (
                        <CheckCircle2 className="w-4 h-4 brand-text shrink-0" title="Verified Employer" />
                      )}
                    </div>
                    
                    <span className="text-sm text-slate-600 font-semibold block mt-1 line-clamp-2 leading-5">
                      {company.industry}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-base text-slate-700 leading-7 mb-7 line-clamp-3">
                  {company.description}
                </p>

                {/* Company Meta Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 border-t border-slate-100 text-sm text-slate-600 font-semibold mb-6">
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 min-w-0">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{company.location}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 min-w-0">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{company.employees}</span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1 text-amber-500 text-sm font-extrabold">
                  <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                  <span>{company.rating}</span>
                </div>

                <Link
                  to={`/jobs?company=${encodeURIComponent(company.name)}`}
                  className="inline-flex items-center gap-1.5 bg-brand-soft hover-brand-bg brand-text hover:text-white px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all duration-200 group/btn"
                >
                  <span>{company.openJobs} Open Jobs</span>
                  <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </Link>
              </div>

            </div>
          ))}
        </div>

        {/* Empty State if no result */}
        {filteredCompanies.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-12">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">No Companies Found</h3>
            <p className="text-xs text-slate-500 mb-4">Try adjusting your search terms or filter selections.</p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedIndustry('All'); }}
              className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition"
            >
              Reset Filters
            </button>
          </div>
        )}

      </div>
    </div>
  );
}