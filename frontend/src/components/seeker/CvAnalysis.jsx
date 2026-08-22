import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, AlertCircle, RefreshCw, FileText } from 'lucide-react';

const AiCvAnalysis = () => {
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    analyzeCv();
  }, []);

  const analyzeCv = async () => {
    setAnalyzing(true);
    setError('');
    setIsSuccess(false);

    // Storage ውስጥ የተመዘገበውን የ CV መረጃ ማግኘት
    let storedUser = {};
    try {
      storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    } catch (parseError) {
      storedUser = {};
    }
    const cvName = storedUser.cvFileName || storedUser.resumeName || '';
    setFileName(cvName);

    try {
      // 1. Backend API ካለህ እዚህ ጋር ጥሪ ማድረግ ትችላለህ፦
      /*
      const formData = new FormData();
      formData.append('cv', storedUser.cvFile);
      const response = await fetch('/api/v1/cv/analyze', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok || !data.isValidCv) throw new Error(data.message || 'invalid_cv');
      */

      // 2. Client-side Real Validation Simulation (ከ Backend ጋር እስኪገናኝ)
      await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 ሰከንድ የ AI ትንተና ማስመሰያ

      if (!cvName) {
        throw new Error('ምንም የተጫነ CV ፋይል አልተገኘም። እባክዎን ተመልሰው ፋይል ይጫኑ።');
      }

      const fileExtension = cvName.split('.').pop().toLowerCase();
      const validExtensions = ['pdf', 'doc', 'docx'];

      if (!validExtensions.includes(fileExtension)) {
        throw new Error('የተሳሳተ የፋይል አይነት! እባክዎን PDF ወይም DOCX ፋይል ብቻ ያስገቡ።');
      }

      // ፋይሉ CV ለመሆኑ የትርጉም ወይም የስም ማረጋገጫ (ለምሳሌ invalid/sample/image የሆኑ ፋይሎችን ለመለየት)
      const invalidKeywords = ['image', 'photo', 'picture', 'receipt', 'invoice', 'screenshot'];
      const isInvalidName = invalidKeywords.some((word) => cvName.toLowerCase().includes(word));

      if (isInvalidName) {
        throw new Error('የገባው ፋይል ትክክለኛ CV አይመስልም። እባክዎን ትክክለኛ የህይወት ታሪክ (CV) ፋይል ያስገቡ።');
      }

      // ሁሉም መስፈርቶች ሲሟሉ፦
      setIsSuccess(true);
      setAnalyzing(false);
    } catch (err) {
      setError(err.message || 'የ CV ትንተናው አልተሳካም። እባክዎን ትክክለኛ CV መሆኑን አረጋግጠው ድጋሚ ይሞክሩ።');
      setAnalyzing(false);
    }
  };

  const handleContinue = () => {
    navigate('/profile-completion');
  };

  const handleRetry = () => {
    navigate('/upload-cv');
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center">
        {/* 1. Analyzing State */}
        {analyzing && (
          <div className="flex flex-col items-center py-8 space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <h2 className="text-xl font-bold text-slate-900">AI CV Analysis in Progress...</h2>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              የላኩትን CV ይዘት፣ የሙያ ልምድ እና የትምህርት ደረጃ AI በዝርዝር በመተንተን ላይ ይገኛል...
            </p>
            {fileName && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-600 text-[11px] font-medium">
                <FileText className="w-3.5 h-3.5" />
                <span>{fileName}</span>
              </div>
            )}
          </div>
        )}

        {/* 2. Error State (CV ትክክል ካልሆነ ወይም ውድቅ ከተደረገ) */}
        {!analyzing && error && (
          <div className="flex flex-col items-center py-6 space-y-4">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">CV Analysis Failed</h2>
            <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 max-w-sm leading-relaxed">
              {error}
            </p>
            <button
              onClick={handleRetry}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>ተመልሰው ትክክለኛ CV ይጫኑ</span>
            </button>
          </div>
        )}

        {/* 3. Success State (CV ትክክለኛ ከሆነ ብቻ) */}
        {!analyzing && isSuccess && (
          <div className="flex flex-col items-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Analysis Completed!</h2>
            <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
              የእርስዎ CV በጥሩ ሁኔታ ተተንትኖ ከስራ መደቦች ጋር እንዲዛመድ ተዘጋጅቷል።
            </p>
            <button
              onClick={handleContinue}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition"
            >
              ወደ ፕሮፋይል ማጠናቀቂያ እለፍ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiCvAnalysis;