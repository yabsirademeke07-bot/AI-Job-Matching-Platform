import React from 'react';
import { Link } from 'react-router-dom';

export default function DualPathCards() {
  return (
    <section className="py-12 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-indigo-100/20 pt-12">
        {/* Job Seeker Card - Deep Indigo Background */}
        <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-950 p-8 rounded-3xl border border-indigo-800/60 text-white flex flex-col justify-between shadow-lg">
          <div>
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-300 rounded-2xl flex items-center justify-center text-xl mb-4 border border-indigo-400/30">👨‍💻</div>
            <h3 className="text-xl font-bold text-white mb-2">For Job Seekers</h3>
            <p className="text-xs text-indigo-200/80 mb-6 leading-relaxed">
              Create your profile, upload your resume, and let our AI algorithm instantly connect you with matching tech roles.
            </p>
          </div>
          {/* Bright Indigo Action Button */}
          <Link to="/register" className="w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-md shadow-indigo-600/30">
            Create Free Profile
          </Link>
        </div>

        {/* Employer Card - Matches Deep Indigo Background */}
        <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-950 p-8 rounded-3xl border border-indigo-800/60 text-white flex flex-col justify-between shadow-lg">
          <div>
            <div className="w-12 h-12 bg-white/10 text-indigo-200 rounded-2xl flex items-center justify-center text-xl mb-4 border border-white/10">🏢</div>
            <h3 className="text-xl font-bold text-white mb-2">For Employers</h3>
            <p className="text-xs text-indigo-200/80 mb-6 leading-relaxed">
              Post job openings and receive AI-ranked applicants tailored specifically to your company's technical stack.
            </p>
          </div>
          {/* Contrast White Action Button */}
          <Link to="/register" className="w-full text-center bg-white hover:bg-indigo-50 text-indigo-950 font-bold py-3 rounded-xl text-xs transition shadow-md">
            Post a Job Opening
          </Link>
        </div>
      </div>
    </section>
  );
}