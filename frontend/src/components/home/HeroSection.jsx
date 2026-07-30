import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HeroSection({ searchTitle, setSearchTitle, handleSearch }) {
  const navigate = useNavigate();

  return (
    <section className="relative bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-950 text-white py-24 px-6 md:py-32 overflow-hidden border-b border-indigo-800/40">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl animate-glow pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        <div>
          {/* Badge */}
          <span className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-sm font-semibold px-4 py-2 rounded-full mb-6 backdrop-blur-md">
            ⚡ #1 Ethiopian AI-Powered Tech Career Platform
          </span>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-white">
            Find Your Dream Tech Job With <br />
            <span className="gradient-text-indigo">AI Matching Precision</span>
          </h1>

          {/* Expanded Paragraph Text */}
          <p className="text-indigo-100/90 text-base md:text-lg mb-8 leading-relaxed max-w-2xl font-normal">
            Welcome to the modern way of tech hiring in Ethiopia. Upload your CV to get an instant AI-powered compatibility analysis for top developer roles, or search active job opportunities across leading technology companies directly.
          </p>

          {/* Action Buttons Section */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
            {/* Primary Action Button - Prominent & Bold Glow */}
            <button
              onClick={() => navigate('/upload-cv')}
              className="bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 text-white font-extrabold text-sm sm:text-base px-9 py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-indigo-600/40 hover:shadow-indigo-500/60 hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-3 border border-indigo-400/30 active:scale-95"
            >
              <span>🚀</span>
              <span>Start Now</span>
            </button>

            {/* Secondary Action Button */}
            <button
              onClick={() => navigate('/jobs')}
              className="bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-100 font-bold text-sm sm:text-base px-8 py-4 rounded-2xl transition border border-indigo-700/60 flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md active:scale-95"
            >
              <span>🔍</span>
              <span>Explore All Jobs</span>
            </button>
          </div>

          {/* Quick Search Bar */}
          <form onSubmit={handleSearch} className="bg-indigo-950/70 backdrop-blur-md p-2 rounded-2xl border border-indigo-700/50 flex gap-2 max-w-xl">
            <input
              type="text"
              placeholder="Search title or skill (e.g. React, Python, Node)..."
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              className="w-full bg-indigo-900/40 px-4 py-3 rounded-xl text-sm text-white placeholder-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-indigo-400 border border-indigo-800/60"
            />
            <button
              type="submit"
              className="bg-white hover:bg-indigo-50 text-indigo-950 font-bold px-6 py-3 rounded-xl text-sm transition cursor-pointer whitespace-nowrap shadow-md"
            >
              Search
            </button>
          </form>
        </div>

        {/* Hero Vector Graphics */}
        <div className="relative flex justify-center">
          <div className="w-full max-w-md lg:max-w-lg animate-float">
            <svg viewBox="0 0 500 350" className="w-full h-auto drop-shadow-2xl">
              <rect x="40" y="40" width="420" height="270" rx="16" fill="#1e1b4b" stroke="#3730a3" strokeWidth="3"/>
              <circle cx="70" cy="70" r="6" fill="#ef4444"/>
              <circle cx="90" cy="70" r="6" fill="#f59e0b"/>
              <circle cx="110" cy="70" r="6" fill="#10b981"/>
              <rect x="70" y="100" width="220" height="14" rx="7" fill="#6366f1"/>
              <rect x="70" y="130" width="280" height="10" rx="5" fill="#4338ca"/>
              <rect x="70" y="150" width="200" height="10" rx="5" fill="#4338ca"/>
              <rect x="70" y="185" width="120" height="34" rx="8" fill="#10b981"/>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}