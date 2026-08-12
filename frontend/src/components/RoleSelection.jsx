import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Building2, Check, ArrowRight, Sparkles } from 'lucide-react';

const RoleSelection = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('');
  const [error, setError] = useState('');

  const handleRoleSubmit = () => {
    if (!selectedRole) {
      setError('Please select an account role to continue');
      return;
    }

    try {
      // 1. የቆየውን User ዳታ ከ localStorage አግኝ ወይም አዲስ ፍጠር
      const storedUser = localStorage.getItem('user');
      const existingUser = storedUser ? JSON.parse(storedUser) : {};

      // 2. Role-ኡን ጨምረህ መልሰህ በ localStorage ውስጥ መዝግብ
      const updatedUser = {
        ...existingUser,
        role: selectedRole
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // 3. በተመረጠው Role መሰረት ወደ ተፈለገው ገጽ መራት
      if (selectedRole === 'seeker') {
        navigate('/upload-cv'); // ከ App.jsx route ጋር የተስተካከለ
      } else if (selectedRole === 'employer') {
        navigate('/employer-profile');
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('An error occurred while saving your choice. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100/80 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 md:p-10 shadow-2xl border border-slate-200/80">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Select Account Role</h2>
          <p className="text-xs text-slate-500 mt-1">Choose how you plan to use SmartRecruit AI.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium text-center border border-red-200">
            {error}
          </div>
        )}

        {/* Cards Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Seeker Option */}
          <div
            onClick={() => {
              setSelectedRole('seeker');
              setError('');
            }}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              selectedRole === 'seeker'
                ? 'border-blue-600 bg-blue-50/40 shadow-md shadow-blue-500/10'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                selectedRole === 'seeker' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Job Seeker</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                I want to upload my CV, extract skills, and apply for AI-matched jobs.
              </p>
            </div>
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-200/60">
              <span className={`text-[11px] font-bold ${selectedRole === 'seeker' ? 'text-blue-600' : 'text-slate-400'}`}>
                {selectedRole === 'seeker' ? 'Selected' : 'Select'}
              </span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedRole === 'seeker' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
              }`}>
                {selectedRole === 'seeker' && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
          </div>

          {/* Employer Option */}
          <div
            onClick={() => {
              setSelectedRole('employer');
              setError('');
            }}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              selectedRole === 'employer'
                ? 'border-blue-600 bg-blue-50/40 shadow-md shadow-blue-500/10'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                selectedRole === 'employer' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Employer</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                I am hiring talent and want to post job vacancies and analyze applicant CVs.
              </p>
            </div>
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-200/60">
              <span className={`text-[11px] font-bold ${selectedRole === 'employer' ? 'text-blue-600' : 'text-slate-400'}`}>
                {selectedRole === 'employer' ? 'Selected' : 'Select'}
              </span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedRole === 'employer' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
              }`}>
                {selectedRole === 'employer' && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleRoleSubmit}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/25 cursor-pointer active:scale-[0.99]"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};

export default RoleSelection;