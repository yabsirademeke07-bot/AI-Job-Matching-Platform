import React, { useState } from 'react';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle, Sparkles,
  TrendingUp, Award, Zap, RefreshCw, Globe
} from 'lucide-react';

export default function CvAnalysis() {
  const [language, setLanguage] = useState('EN'); // 'EN' or 'AM'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState({
    cvScore: 84,
    formattingScore: 90,
    keywordMatch: 78,
    experienceImpact: 85,
    fileName: "Abebe_Bikila_CV_2026.pdf",
    uploadedDate: "Aug 07, 2026",
    summary: language === 'EN' 
      ? "Your CV is well-structured for Full Stack React/Node.js roles in Ethiopia. Keywords match 78% of active market requirements."
      : "CVዎ በኢትዮጵያ ውስጥ ለሚገኙ የ Full Stack React/Node.js ስራዎች በጥሩ ሁኔታ የተዋቀረ ነው። የቃላት ይዘቱ ከገበያው 78% ይጣጣማል፡",
    strengths: [
      "Strong emphasis on React & modern frontend frameworks",
      "Clear experience metrics with quantifiable project outcomes",
      "Clean ATS-friendly single/two-column design format"
    ],
    improvements: [
      "Add TypeScript experience to unlock senior full-stack positions",
      "Include metrics for backend scale (e.g., database response times, API users)",
      "Include a concise 2-sentence Professional Summary at the top"
    ],
    topKeywordsFound: ["React.js", "JavaScript", "Node.js", "REST APIs", "Tailwind CSS", "Git"],
    missingKeywords: ["TypeScript", "Docker", "GraphQL", "CI/CD Pipeline"]
  });

  // Mock File Upload Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setIsAnalyzing(true);
      
      // Simulate AI analysis delay
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Lemesrat AI Engine</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {language === 'EN' ? 'CV Analysis & AI Optimizer' : 'የ CV ትንተና እና ማሻሻያ'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'EN' 
              ? 'Get instant feedback and tailored recommendations to bypass ATS filters.' 
              : 'ከ AI ፈጣን አስተያየት እና የ CV ማሻሻያ ነጥቦችን ያግኙ።'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'EN' ? 'AM' : 'EN')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>{language === 'EN' ? 'EN | አማርኛ' : 'አማርኛ | EN'}</span>
          </button>
        </div>
      </div>

      {/* UPLOAD & SCORE OVERVIEW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: FILE UPLOAD ZONE */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              <span>{language === 'EN' ? 'Upload CV / Resume' : 'CV ያስገቡ'}</span>
            </h2>

            {/* Drag & Drop Area */}
            <label className="border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {language === 'EN' ? 'Click or drag file here' : 'ፋይል ለመምረጥ እዚህ ይጫኑ'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">PDF or DOCX (Max 5MB)</p>
              </div>
              <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileUpload} />
            </label>

            {/* Current File Info */}
            {analysisResult && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{analysisResult.fileName}</p>
                    <p className="text-[10px] text-slate-400">{analysisResult.uploadedDate}</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                  Analyzed
                </span>
              </div>
            )}

            {/* Re-analyze Button */}
            <button className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition">
              <RefreshCw className="w-4 h-4" />
              <span>{language === 'EN' ? 'Re-Analyze Resume' : 'እንደገና ተንትን'}</span>
            </button>
          </div>

          {/* QUICK SUMMARY CARD */}
          <div className="bg-gradient-to-tr from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold">{language === 'EN' ? 'Market Fit Score' : 'የገበያ ተስማሚነት'}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {analysisResult.summary}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: AI SCORE BREAKDOWN & INSIGHTS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* OVERALL SCORE DISPLAY */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'EN' ? 'Overall Resume Score' : 'አጠቃላይ የ CV ውጤት'}</span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-4xl font-black text-slate-900">{analysisResult.cvScore}</span>
                  <span className="text-sm font-bold text-slate-400">/ 100</span>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    Excellent
                  </span>
                </div>
              </div>

              {/* Progress Bar visual */}
              <div className="w-full sm:w-48 bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full" style={{ width: `${analysisResult.cvScore}%` }} />
              </div>
            </div>

            {/* DETAILED SCORE CATEGORIES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { title: language === 'EN' ? 'Formatting & Layout' : 'የአቀራረብ ጥራት', score: analysisResult.formattingScore, icon: Award, color: 'text-blue-600' },
                { title: language === 'EN' ? 'Keyword Match' : 'የቃላት መጣጣም', score: analysisResult.keywordMatch, icon: TrendingUp, color: 'text-indigo-600' },
                { title: language === 'EN' ? 'Impact & Experience' : 'የልምድ መገለጫ', score: analysisResult.experienceImpact, icon: Zap, color: 'text-amber-600' },
              ].map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <Icon className={`w-4 h-4 ${cat.color}`} />
                      <span className="text-xs font-black text-slate-900">{cat.score}%</span>
                    </div>
                    <p className="text-xs font-medium text-slate-600">{cat.title}</p>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-slate-800 h-full rounded-full" style={{ width: `${cat.score}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STRENGTHS AND IMPROVEMENTS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Strengths */}
            <div className="bg-emerald-50/50 border border-emerald-200/80 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold">{language === 'EN' ? 'CV Strengths' : 'የ CV ጥንካሬዎች'}</h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {analysisResult.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations / Improvements */}
            <div className="bg-amber-50/50 border border-amber-200/80 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold">{language === 'EN' ? 'Areas to Improve' : 'የሚሻሻሉ ነጥቦች'}</h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {analysisResult.improvements.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* KEYWORDS BREAKDOWN */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'EN' ? 'Market Keywords Analysis' : 'የቁልፍ ቃላት ትንተና'}
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">{language === 'EN' ? 'Detected Skills in your CV:' : 'በ CVዎ ውስጥ የተገኙ ክህሎቶች፡'}</p>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.topKeywordsFound.map((kw, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
                      ✓ {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-amber-700 mb-2">{language === 'EN' ? 'Missing High-Demand Skills:' : 'የሚጎድሉ ተፈላጊ ክህሎቶች፡'}</p>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.missingKeywords.map((mkw, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs">
                      + {mkw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}