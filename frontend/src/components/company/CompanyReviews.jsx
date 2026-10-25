import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const initial = {
  interview_rating: 0,
  culture_rating: 0,
  communication_rating: 0,
  title: '',
  narrative: '',
  pros: '',
  cons: '',
  recommends: true,
  anonymous: false,
};

function Stars({ value, onChange, readOnly = false }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button type="button" key={star} disabled={readOnly} onClick={() => onChange?.(star)} aria-label={`${star} star${star === 1 ? '' : 's'}`}>
          <Star className={`h-5 w-5 ${star <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
        </button>
      ))}
    </div>
  );
}

export default function CompanyReviews({ companyId, employerView = false }) {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState(initial);
  const [responses, setResponses] = useState({});
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get(`/companies/${companyId}/reviews`);
      setReviews(data.reviews || []);
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to load company reviews.');
    }
  };

  useEffect(() => {
    let active = true;
    api.get(`/companies/${companyId}/reviews`)
      .then(({ data }) => { if (active) setReviews(data.reviews || []); })
      .catch((error) => {
        if (active) setMessage(error?.response?.data?.message || 'Unable to load company reviews.');
      });
    return () => { active = false; };
  }, [companyId]);

  const submit = async (event) => {
    event.preventDefault();
    if ([form.interview_rating, form.culture_rating, form.communication_rating].some((rating) => !rating)) {
      setMessage('Please rate all three categories.');
      return;
    }
    try {
      await api.post(`/companies/${companyId}/reviews`, form);
      setForm(initial);
      setMessage('Your verified candidate review has been submitted.');
      await load();
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to submit review.');
    }
  };

  const respond = async (reviewId) => {
    try {
      await api.post(`/companies/${companyId}/reviews/${reviewId}/response`, { response: responses[reviewId] });
      setMessage('Official response posted.');
      setResponses((current) => ({ ...current, [reviewId]: '' }));
      await load();
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to post response.');
    }
  };

  return (
    <section className="space-y-5">
      {!employerView && <div><h2 className="text-2xl font-bold text-slate-900">Company Reviews &amp; Ratings</h2><p className="mt-1 text-sm text-slate-500">Verified feedback from candidates who applied to this company.</p></div>}
      {message && <p role="status" className="rounded-xl bg-sky-50 p-3 text-sm font-semibold text-sky-700">{message}</p>}
      {!employerView && isAuthenticated && (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Share your interview experience</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['interview_rating', 'Interview process'],
              ['culture_rating', 'Work culture'],
              ['communication_rating', 'Communication'],
            ].map(([key, label]) => (
              <label className="text-sm font-semibold text-slate-700" key={key}>{label}<div className="mt-2"><Stars value={form[key]} onChange={(value) => setForm((current) => ({ ...current, [key]: value }))} /></div></label>
            ))}
          </div>
          <input required minLength={4} maxLength={160} placeholder="Review title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
          <textarea required minLength={20} maxLength={5000} rows={4} placeholder="Describe your interview experience..." value={form.narrative} onChange={(event) => setForm((current) => ({ ...current, narrative: event.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
          <div className="grid gap-4 sm:grid-cols-2">
            <textarea rows={3} maxLength={1500} placeholder="Pros" value={form.pros} onChange={(event) => setForm((current) => ({ ...current, pros: event.target.value }))} className="rounded-xl border border-slate-200 p-3 text-sm" />
            <textarea rows={3} maxLength={1500} placeholder="Cons" value={form.cons} onChange={(event) => setForm((current) => ({ ...current, cons: event.target.value }))} className="rounded-xl border border-slate-200 p-3 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.recommends} onChange={(event) => setForm((current) => ({ ...current, recommends: event.target.checked }))} /> I recommend applying to this company</label>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.anonymous} onChange={(event) => setForm((current) => ({ ...current, anonymous: event.target.checked }))} /> Post without displaying my name</label>
          <button type="submit" className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-600">Submit Review</button>
        </form>
      )}
      {!reviews.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No verified candidate reviews yet.</div>}
      <div className="space-y-4">
        {reviews.map((review) => {
          const average = Math.round((Number(review.interview_rating) + Number(review.culture_rating) + Number(review.communication_rating)) / 3);
          return (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={review.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="font-bold text-slate-900">{review.title}</h3><p className="mt-1 text-xs font-semibold text-emerald-700">Verified Applicant{review.role_title ? ` · ${review.role_title}` : ''}</p></div>
                <Stars readOnly value={average} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{review.narrative}</p>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                {review.pros && <p><b className="text-emerald-700">Pros:</b> {review.pros}</p>}
                {review.cons && <p><b className="text-rose-700">Cons:</b> {review.cons}</p>}
              </div>
              {review.employer_response && <div className="mt-4 rounded-xl bg-sky-50 p-4 text-sm text-sky-800"><b>Official Employer Response</b><p className="mt-1">{review.employer_response}</p></div>}
              {employerView && !review.employer_response && <div className="mt-4 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border p-2 text-sm" placeholder="Official response" value={responses[review.id] || ''} onChange={(event) => setResponses((current) => ({ ...current, [review.id]: event.target.value }))} /><button type="button" onClick={() => respond(review.id)} className="rounded-xl bg-sky-500 px-3 text-xs font-bold text-white hover:bg-sky-600">Respond</button></div>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
