import React, { useState } from 'react';
import { Search, Filter, Eye, CheckCircle2, XCircle, Sparkles, MessageSquare } from 'lucide-react';

const CvCheck = () => {
  const [candidates] = useState([
    { id: 1, name: 'Tekeba Aweke', role: 'Full Stack Developer', score: 96, status: 'Verified', experience: '1 Year Exp' },
    { id: 2, name: 'Dawit Aklil', role: 'Backend Developer', score: 88, status: 'Pending', experience: '2 Years Exp' },
  ]);

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Title */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Applicant Review Hub</h1>
            <p className="text-xs text-slate-500">Screening AI-Matched Candidates for EthioSolve Projects</p>
          </div>
          <span className="text-xs font-semibold bg-slate-900 text-white px-3 py-1.5 rounded-xl">Employer Portal</span>
        </div>

        {/* Candidate List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <th className="p-4">Candidate Name</th>
                <th className="p-4">Applied Position</th>
                <th className="p-4">AI Score</th>
                <th className="p-4">Admin Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-4 font-bold text-slate-900">{candidate.name}</td>
                  <td className="p-4">{candidate.role}</td>
                  <td className="p-4">
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md text-[11px]">
                      {candidate.score}% Match
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {candidate.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center gap-1 font-semibold text-slate-700">
                        <Eye className="w-3.5 h-3.5" /> View CV
                      </button>
                      <button className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-1 font-semibold">
                        <MessageSquare className="w-3.5 h-3.5" /> Contact
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default CvCheck;