import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  MessageCircle,
  MessageSquareText,
  Send,
  ShieldCheck,
  Star,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import api from '../../services/api';

const tabs = [
  ['all', 'All Reviews'],
  ['reviews', 'Interview Experiences'],
  ['questions', 'Public Q&A'],
];

const ratingValue = (value) => (value == null ? null : Math.max(0, Math.min(100, Number(value))));

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function Stars({ value = 0, size = 'h-4 w-4' }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rounded} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`${size} ${star <= rounded ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </span>
  );
}

function CategoryBar({ label, value }) {
  const percentage = ratingValue(value);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-bold text-slate-800">{percentage == null ? '—' : `${percentage}%`}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-sky-500 transition-[width] duration-500" style={{ width: `${percentage || 0}%` }} />
      </div>
    </div>
  );
}

function ReviewCard({ review, response, onResponseChange, onRespond, responding }) {
  const score = Number(review.overall_rating)
    || Math.round((Number(review.interview_rating) + Number(review.culture_rating) + Number(review.communication_rating)) / 3);
  const roleContext = [review.role_title, review.work_mode].filter(Boolean).join(' · ');
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg hover:shadow-slate-900/5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" />Verified Applicant</span>
            {roleContext && <span className="text-xs text-slate-500">{roleContext}</span>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Stars value={score} />
            <span className="text-xs font-semibold text-slate-700">{score}/5</span>
            <span className="text-xs text-slate-400">· {formatDate(review.created_at)}</span>
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-900">{review.title}</h3>
        </div>
        <span className="shrink-0 text-sm font-semibold text-slate-600">{review.author_name || 'Verified applicant'}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{review.narrative}</p>
      {(review.pros || review.cons) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {review.pros && <div className="rounded-xl bg-emerald-50/80 p-3.5"><p className="flex items-center gap-1.5 text-xs font-bold text-emerald-800"><ThumbsUp className="h-3.5 w-3.5" />Pros</p><p className="mt-1.5 whitespace-pre-wrap text-sm text-emerald-900/80">{review.pros}</p></div>}
          {review.cons && <div className="rounded-xl bg-rose-50/80 p-3.5"><p className="flex items-center gap-1.5 text-xs font-bold text-rose-800"><ThumbsDown className="h-3.5 w-3.5" />Cons</p><p className="mt-1.5 whitespace-pre-wrap text-sm text-rose-900/80">{review.cons}</p></div>}
        </div>
      )}
      {review.employer_response ? (
        <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/70 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-sky-800"><ShieldCheck className="h-4 w-4" />Official Company Response <span className="font-medium text-sky-600">· {formatDate(review.employer_responded_at)}</span></p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-sky-950/80">{review.employer_response}</p>
        </div>
      ) : (
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); onRespond(review.id); }}>
          <input value={response} onChange={(event) => onResponseChange(event.target.value)} maxLength={3000} required placeholder="Write a thoughtful public response..." aria-label="Company response" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
          <button type="submit" disabled={responding} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-bold text-white transition hover:bg-sky-600 disabled:opacity-60"><MessageCircle className="h-4 w-4" />Reply as Company</button>
        </form>
      )}
    </article>
  );
}

function QuestionCard({ question, answer, onAnswerChange, onAnswer, answering }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg hover:shadow-slate-900/5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><MessageSquareText className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{question.asker_name || 'Prospective applicant'}</span>
            <span>·</span><span>{formatDate(question.created_at)}</span>
          </div>
          <h3 className="mt-2 text-sm font-bold leading-6 text-slate-900">{question.question}</h3>
          {question.answer ? (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />Employer Verified Answer</span>
                <span className="text-xs text-slate-500">{question.respondent_name || 'Company representative'} · {formatDate(question.answered_at)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{question.answer}</p>
            </div>
          ) : (
            <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); onAnswer(question.id); }}>
              <input value={answer} onChange={(event) => onAnswerChange(event.target.value)} maxLength={3000} required placeholder="Write an official answer..." aria-label="Answer candidate question" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              <button type="submit" disabled={answering} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-bold text-white transition hover:bg-sky-600 disabled:opacity-60"><Send className="h-4 w-4" />Answer Question</button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}

export default function EmployerReputationCenter({ companyId }) {
  const [reputation, setReputation] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [responses, setResponses] = useState({});
  const [answers, setAnswers] = useState({});
  const [busyAction, setBusyAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadReputation = async () => {
    if (!companyId) {
      setError('A saved company profile is required to view reputation feedback.');
      setLoading(false);
      return;
    }
    try {
      setError('');
      const { data } = await api.get(`/companies/${companyId}/reputation`);
      setReputation(data?.reputation || null);
      if (!data?.reputation) throw new Error('The reputation response was empty.');
    } catch (requestError) {
      console.error('Unable to load employer reputation:', requestError);
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load company feedback.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!companyId) {
      Promise.resolve().then(() => {
        if (!active) return;
        setError('A saved company profile is required to view reputation feedback.');
        setLoading(false);
      });
      return () => { active = false; };
    }
    api.get(`/companies/${companyId}/reputation`)
      .then(({ data }) => {
        if (!active) return;
        if (!data?.reputation) throw new Error('The reputation response was empty.');
        setReputation(data.reputation);
        setError('');
      })
      .catch((requestError) => {
        if (!active) return;
        console.error('Unable to load employer reputation:', requestError);
        setError(requestError.response?.data?.message || requestError.message || 'Unable to load company feedback.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [companyId]);

  const reviews = reputation?.reviews || [];
  const questions = reputation?.questions || [];
  const tabCounts = useMemo(() => ({
    all: reviews.length + questions.length,
    reviews: reviews.length,
    questions: questions.length,
  }), [reviews.length, questions.length]);
  const visibleReviews = activeTab === 'questions' ? [] : reviews;
  const visibleQuestions = activeTab === 'reviews' ? [] : questions;

  const respond = async (reviewId) => {
    const response = String(responses[reviewId] || '').trim();
    if (!response) return;
    setBusyAction(`review-${reviewId}`);
    setError('');
    setNotice('');
    try {
      await api.post(`/companies/${companyId}/reviews/${reviewId}/response`, { response });
      setResponses((current) => ({ ...current, [reviewId]: '' }));
      setNotice('Your official response has been published.');
      await loadReputation();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to publish your company response.');
    } finally {
      setBusyAction('');
    }
  };

  const answerQuestion = async (questionId) => {
    const answer = String(answers[questionId] || '').trim();
    if (!answer) return;
    setBusyAction(`question-${questionId}`);
    setError('');
    setNotice('');
    try {
      await api.post(`/companies/${companyId}/questions/${questionId}/answer`, { answer });
      setAnswers((current) => ({ ...current, [questionId]: '' }));
      setNotice('Your verified answer has been published.');
      await loadReputation();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to publish your answer.');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Company Reviews &amp; Reputation</h2>
        <p className="mt-1 text-sm text-slate-500">Manage candidate interview feedback, ratings, and public hiring Q&amp;A.</p>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}

      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[0.85fr_1.15fr] sm:p-6">
        <div className="flex flex-col justify-center border-b border-slate-100 pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall rating</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-4xl font-black tracking-tight text-slate-900">{reputation?.overallRating == null ? '—' : Number(reputation.overallRating).toFixed(1)}</span>
            <span className="pb-1 text-sm text-slate-400">/ 5.0</span>
          </div>
          <Stars value={reputation?.overallRating || 0} size="h-5 w-5" />
          <p className="mt-2 text-xs text-slate-500">Based on {reputation?.reviewCount || 0} verified candidate {reputation?.reviewCount === 1 ? 'review' : 'reviews'}</p>
          {reputation?.recommendationRate != null && (
            <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700">
              <ThumbsUp className="h-3.5 w-3.5" />{reputation.recommendationRate}% of candidates recommend applying here
            </div>
          )}
        </div>
        <div className="space-y-4">
          <CategoryBar label="Interview Process" value={reputation?.categories?.interviewProcess} />
          <CategoryBar label="Work Culture" value={reputation?.categories?.workCulture} />
          <CategoryBar label="Communication Speed" value={reputation?.categories?.communicationSpeed} />
          {loading && <p className="text-xs text-slate-400">Loading verified feedback…</p>}
        </div>
      </section>

      <nav className="overflow-x-auto border-b border-slate-200/70 scrollbar-none" aria-label="Feedback filters">
        <div className="flex min-w-max items-center gap-6 sm:gap-8">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={`flex items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-sm font-bold transition-colors ${activeTab === id ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400 hover:text-sky-500'}`}>
              {label}<span className={`rounded-full px-2 py-0.5 text-[11px] ${activeTab === id ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>{tabCounts[id]}</span>
            </button>
          ))}
        </div>
      </nav>

      {!loading && !error && !visibleReviews.length && !visibleQuestions.length && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <MessageCircle className="mx-auto h-9 w-9 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-800">No candidate feedback yet</h3>
          <p className="mt-1 text-sm text-slate-500">Verified interview reviews and candidate questions will appear here.</p>
        </div>
      )}

      <div className="space-y-4">
        {visibleReviews.map((review) => (
          <ReviewCard key={review.id} review={review} response={responses[review.id] || ''} onResponseChange={(value) => setResponses((current) => ({ ...current, [review.id]: value }))} onRespond={respond} responding={busyAction === `review-${review.id}`} />
        ))}
        {visibleQuestions.map((question) => (
          <QuestionCard key={question.id} question={question} answer={answers[question.id] || ''} onAnswerChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} onAnswer={answerQuestion} answering={busyAction === `question-${question.id}`} />
        ))}
      </div>
    </section>
  );
}
