import React from 'react';
import { FileText, CheckCircle, Clock, Sparkles, Award, User, Download } from 'lucide-react';

const SeekerDocumentation = () => {
  const seeker = JSON.parse(localStorage.getItem('user')) || { fullName: 'Tekeba Aweke', email: 'seeker@ethiosolve.com' };

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">Job Seeker Profile</span>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">{seeker.fullName}</h1>
            <p className="text-xs text-slate-500">{seeker.email} • Computer Science Graduate</p>
          </div>
          <div className="flex gap-2">
            <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 font-semibold px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle className="w-4 h-4" /> Admin Verified
            </span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Document Status */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" /> Attached Documents
            </h2>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-700">Tekeba_Software_CV.pdf</span>
              </div>
              <Download className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-700">Degree_Certificate.pdf</span>
              </div>
              <Download className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
            </div>
          </div>

          {/* AI Match Overview */}
          <div className="md:col-span-2 bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-400" /> EthioSolve AI Ranking
                </span>
                <span className="text-xs bg-slate-800 text-amber-300 font-bold px-2.5 py-1 rounded-lg">96.4% Match Rate</span>
              </div>
              <h3 className="text-lg font-bold">Top Match: Senior Full-Stack Engineer</h3>
              <p className="text-xs text-slate-300 mt-1">Your uploaded profile fits 14 current open tech positions in Addis Ababa.</p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-400">
              <span>Primary Skills: React, Node.js, Python, PostgreSQL</span>
              <span className="text-emerald-400 font-medium">Status: Interview Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeekerDocumentation;