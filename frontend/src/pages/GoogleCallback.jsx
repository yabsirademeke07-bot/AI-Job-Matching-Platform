import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // 1. ከ Backend URL (Query Parameters) ላይ መረጃዎችን ማንበብ
    const token = searchParams.get('token');
    const role = searchParams.get('role');
    const userId = searchParams.get('userId');

    if (token) {
      // Save token under canonical [token](http://_vscodecontentref_/10) key
      localStorage.setItem('token', token);

      // JWT Token በ LocalStorage ውስጥ ማስቀመጥ
      localStorage.setItem('authToken', token);

      // 2. ተጠቃሚው አዲስ ከሆነ (Role ገና ካልመረጠ) -> ወደ Role Selection Step 3 መላክ
      if (role === 'pending' || !role) {
        navigate('/register', { 
          replace: true,
          state: { 
            initialStep: 3, 
            userId: userId 
          } 
        });
      } else {
        // 3. ቀድሞ የተመዘገበ user ከሆነ (Role አለው) -> በቀጥታ ወደ ሚናው Dashboard መውሰድ
        const targetRole = role === 'job_seeker' ? 'seeker' : role;
        
        localStorage.setItem('user', JSON.stringify({ id: userId, role: targetRole }));

        if (targetRole === 'employer') {
          navigate('/employer-dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } else {
      // Token ካልተገኘ ወደ Login ገጽ ይመልሳል
      navigate('/login?error=auth_failed', { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-slate-600 font-medium text-sm">Signing in with Google...</p>
      </div>
    </div>
  );
}