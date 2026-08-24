import React, { useState } from 'react';
import { ShieldAlert, Check, X, FileCheck, ShieldCheck } from 'lucide-react';

const AdminApproval = () => {
  const [requests, setRequests] = useState([
    { id: 1, name: 'Tekeba Aweke', type: 'Job Seeker', doc: 'Degree & CV', date: 'Just now' },
    { id: 2, name: 'Ethio Tech Corp', type: 'Employer Account', doc: 'TIN License', date: '10 mins ago' },
  ]);

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
              <ShieldAlert className="w-4 h-4" /> System Governance Panel
            </div>
            <h1 className="text-2xl font-bold">Verification Approvals</h1>
          </div>
          <span className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold">Admin Mode</span>
        </div>

        <div className="space-y-3">
          {requests.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                  <p className="text-xs text-slate-500">{item.type} • Document: <span className="font-semibold">{item.doc}</span></p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1">
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1">
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default AdminApproval;