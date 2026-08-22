 import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, ArrowRight, Briefcase } from 'lucide-react';
import { TypeAnimation } from 'react-type-animation';

import homeImg from '../../pages/images/home.jpg';

export default function HeroSection({ searchTitle = '', setSearchTitle, handleSearch, isLoggedIn = false }) {
  const navigate = useNavigate();

  // 🎯 Start Now Logic:
  const handleStartNow = () => {
    if (isLoggedIn) {
      navigate('/seeker-dashboard');
    } else {
      navigate('/register');
    }
  };

  // 🎯 Explore All Jobs Logic:
  // Navbar ላይ ካለው /jobs ጋር እንዲገናኝ ተስተካክሏል
  const handleExploreJobs = () => {
    navigate('/jobs');
  };

  // 🎯 Search Logic:
  const onSearchSubmit = (e) => {
    e.preventDefault();
    if (typeof handleSearch === 'function') {
      handleSearch(e);
    } else {
      navigate(`/jobs?query=${encodeURIComponent(searchTitle || '')}`);
    }
  };

  return (
    <section className="relative bg-gradient-to-b from-blue-50/70 via-indigo-50/30 to-slate-50 text-slate-900 py-16 px-6 md:py-24 overflow-hidden border-b border-slate-200/80">
      
      {/* Soft Background Lights */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center relative z-10">
        
        {/* Left Side Content */}
        <div className="lg:col-span-6 xl:col-span-5">
          <span className="inline-flex items-center gap-2 bg-blue-100/80 text-blue-700 border border-blue-200/80 text-xs font-bold px-4 py-2 rounded-full mb-6 shadow-xs">
            <Sparkles className="w-4 h-4 text-blue-600" />
            #1 Ethiopian AI-Powered Tech Career Platform
          </span>

          <div className="max-w-2xl text-3xl sm:text-4xl lg:text-[3.25rem] font-extrabold tracking-tight mb-6 leading-[1.08] text-slate-950 min-h-[112px] sm:min-h-[132px]">
            <TypeAnimation
              sequence={[
                'Find Your Dream Tech Job With AI Matching Precision',
                2000,
                'Connect With Better Tech Opportunities Faster',
                500,
              ]}
              wrapper="h1"
              speed={50}
              repeat={Infinity}
              cursor={true}
              className="bg-gradient-to-r from-slate-900 via-blue-700 to-indigo-600 bg-clip-text text-transparent inline-block"
            />
          </div>

          <p className="max-w-xl text-slate-700 text-base md:text-lg mb-8 leading-8 font-medium">
            Welcome to the modern way of tech hiring in Ethiopia. Upload your CV to get an instant AI-powered compatibility analysis for top developer roles, or search active job opportunities across leading technology companies directly.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
            {/* Start Now Button */}
            <button
              onClick={handleStartNow}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm sm:text-base px-8 py-3.5 rounded-2xl transition-all duration-300 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2.5 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
 {/* Explore All Jobs Button - ቀጥታ Navbar ላይ ወዳለው /jobs ይወስዳል */}
            <button
              onClick={handleExploreJobs}
              className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm sm:text-base px-7 py-3.5 rounded-2xl transition border border-slate-200/90 shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Briefcase className="w-4 h-4 text-slate-500" />
              <span>Explore All Jobs</span>
            </button>
          </div>

          {/* Quick Search Input */}
          <form onSubmit={onSearchSubmit} className="bg-white p-2 rounded-2xl border border-slate-300 shadow-lg shadow-slate-200/60 flex flex-col sm:flex-row gap-2 w-full">
            <div className="hidden sm:flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search title or skill (e.g. React, Python, Node)..."
              value={searchTitle}
              onChange={(e) => setSearchTitle && setSearchTitle(e.target.value)}
              className="w-full min-w-0 bg-transparent px-3 py-3 text-sm text-slate-900 placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-slate-900 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition cursor-pointer whitespace-nowrap shadow-sm"
            >
              Search
            </button>
          </form>
        </div>

        {/* Right Side Image */}
        <div className="lg:col-span-6 xl:col-span-7 flex justify-center lg:justify-end items-center">
          <div className="relative w-full max-w-xl lg:max-w-2xl animate-slide-infinite">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-3xl blur-2xl -z-10" />
            <img 
              src={homeImg} 
              alt="AI Resume Parser Match Preview" 
              className="w-full h-auto rounded-3xl shadow-2xl border border-slate-200/90 object-cover bg-white"
            />
          </div>
        </div>

      </div>
    </section>
  );
}