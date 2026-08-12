import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const email = location.state?.email || searchParams.get('email') || '';
  const userIdFromUrl = searchParams.get('userId') || null;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const otpInputRefs = useRef([]);

  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';
  const apiBase = API_URL.replace(/\/$/, '');

  useEffect(() => {
    otpInputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);

    if (value && index < otp.length - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');

    const otpCode = otp.join('');
    if (!email) {
      setError('Email የለም። እባክዎን signup/login ድጋሜ ይሞክሩ።');
      return;
    }
    if (otpCode.length !== 6) {
      setError('እባክዎን 6 ጊዜ የOTP ቁጥር ያስገቡ።');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${apiBase}/auth/verify-otp`, {
        email,
        otp: otpCode,
      });

      const data = response.data || {};

      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem(
          'userRole',
          (data.user.role || data.user.userType || '').toString()
        );
      }

      if (data.success) {
        if (data.requiresRoleSelection || !data.user?.role || userIdFromUrl) {
          const targetUserId = userIdFromUrl || data.user?.id;
          navigate(`/select-role?userId=${targetUserId}`);
        } else {
          navigate('/dashboard');
        }
        return;
      }

      setError(data.message || 'OTP verification failed. Please try again.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'OTP verification failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      setError('Email የለም። እባክዎን signup/login ድጋሜ ይሞክሩ።');
      return;
    }

    try {
      await axios.post(`${apiBase}/auth/resend-otp`, { email });
      setInfo('OTP ኮድ ዳግም ተልኳል። እባክዎን ኢሜይልዎን ይመልከቱ።');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to resend OTP.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="mb-3 text-2xl font-bold text-slate-900">Verify Your Email</h1>
        <p className="mb-6 text-sm text-slate-600">
          Enter the 6-digit code sent to{' '}
          <span className="font-semibold text-slate-900">{email || 'your email'}</span>.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-6 gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                ref={(el) => (otpInputRefs.current[index] = el)}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="h-14 w-full rounded-2xl border border-slate-300 bg-slate-50 text-center text-xl font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                aria-label={`OTP digit ${index + 1}`}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResendOtp}
          className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Resend OTP
        </button>
      </div>
    </div>
  );
};

export default OtpVerification;