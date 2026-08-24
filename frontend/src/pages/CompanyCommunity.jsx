import { useParams } from 'react-router-dom';
import CompanyReviews from '../components/company/CompanyReviews';
import CompanyQA from '../components/company/CompanyQA';
export default function CompanyCommunity() { const { companyId } = useParams(); return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6"><div className="mx-auto max-w-4xl space-y-10"><header className="rounded-3xl bg-blue-600 p-8 text-white"><p className="text-sm font-bold uppercase tracking-widest text-blue-100">Company profile</p><h1 className="mt-2 text-3xl font-black">Community Feedback</h1><p className="mt-2 text-blue-100">Read employee reviews and ask the employer questions.</p></header><CompanyReviews companyId={companyId} /><CompanyQA companyId={companyId} /></div></main>; }
