import { Link } from 'react-router-dom';

const howItWorks = [
  { title: 'Create Account', text: 'Set up your talent or company profile in minutes.', destination: '/register' },
  { title: 'Complete Profile', text: 'Add the skills, experience, or roles that matter to you.', destination: '/register' },
  { title: 'AI Matching', text: 'Our matching engine compares fit across the right signals.', destination: '/jobs' },
  { title: 'Apply / Hire', text: 'Take the next step with more context and less friction.', destination: '/jobs' },
];

const HowItWorksCards = ({ className = '', interactive = false }) => (
  <div className={`grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-6 lg:gap-8 xl:gap-10 ${className}`}>
    {howItWorks.map(({ title, text, destination }) => {
      const content = (
        <div className="max-w-full">
          <h3 className="mb-3 max-w-full break-words text-xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-2xl lg:text-2xl xl:text-3xl">{title}</h3>
          <p className="max-w-full break-words text-sm leading-relaxed text-slate-600 sm:text-base lg:text-lg">{text}</p>
          {interactive && (
            <span className="mt-4 inline-block text-sm font-bold text-blue-700 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
              Get Started →
            </span>
          )}
        </div>
      );
      const className = `card-floating group relative flex min-h-[240px] flex-col items-center justify-center text-center transition-all sm:min-h-[260px] lg:min-h-[350px] xl:min-h-[360px] ${
        interactive ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40' : ''
      }`;

      return interactive ? (
        <Link key={title} to={destination} className={className} aria-label={`${title}. Get started.`}>
          {content}
        </Link>
      ) : (
        <article key={title} className={className}>
          {content}
        </article>
      );
    })}
  </div>
);

export default HowItWorksCards;
