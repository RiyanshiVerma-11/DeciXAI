import { useNavigate } from 'react-router-dom'

const domains = [
  {
    label: 'Career',
    path: 'career',
    color: 'from-cyan-500 via-sky-500 to-blue-600',
    blurb: 'Match skills, projects, and intent with clearer career guidance.',
  },
  {
    label: 'Finance',
    path: 'finance',
    color: 'from-emerald-500 via-lime-500 to-teal-600',
    blurb: 'Turn income, debt, and credit signals into smarter money decisions.',
  },
  {
    label: 'Startup',
    path: 'startup',
    color: 'from-fuchsia-500 via-violet-500 to-indigo-600',
    blurb: 'Measure investor readiness, team strength, and market momentum fast.',
  },
  {
    label: 'Government Policy',
    path: 'policy',
    color: 'from-orange-500 via-amber-500 to-rose-500',
    blurb: 'Assess policy feasibility with explainable, public-impact focused reasoning.',
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,_rgba(8,47,73,0.96)_0%,_rgba(2,132,199,0.9)_45%,_rgba(16,185,129,0.84)_100%)] p-8 text-white shadow-2xl">
          <div className="grid gap-8 lg:grid-cols-[1.15fr,0.85fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100">
                Explainable Decision Intelligence
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
                DeciXAI helps teams choose with clarity, confidence, and evidence.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-cyan-50/90">
                Your AI partner for better decisions across careers, finance, startups, and public policy.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/20 bg-white/10 p-6">
              <div className="flex items-center gap-4">
                <img
                  src="/logo.jpeg"
                  alt="DeciXAI logo"
                  className="h-20 w-20 rounded-3xl border border-white/20 object-cover shadow-lg"
                />
                <div>
                  <div className="text-3xl font-semibold">DeciXAI</div>
                  <div className="text-sm uppercase tracking-[0.26em] text-cyan-100">Decision support that explains itself</div>
                </div>
              </div>

              <div className="mt-6 rounded-3xl bg-slate-950/25 p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-100/80">Guiding quote</p>
                <p className="mt-3 text-xl font-medium leading-8">
                  Better decisions begin when AI shows not just what to do, but why it matters.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Reasoning</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">Explainable outputs</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Every answer comes with factors, confidence, and actionable next steps.</p>
          </div>
          <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Visuals</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">Cards and charts</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Insights are presented in colorful visual summaries that are easier to scan and trust.</p>
          </div>
          <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Coverage</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">Four decision domains</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Career, finance, startup, and policy workflows are ready from one shared interface.</p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {domains.map((domain) => (
            <button
              key={domain.path}
              onClick={() => navigate(domain.path)}
              className={`group rounded-[28px] bg-gradient-to-br ${domain.color} p-6 text-left text-white shadow-lg transition-all hover:-translate-y-1.5 hover:shadow-2xl`}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/80">
                  Explore
                </div>
                <div className="text-lg transition-transform group-hover:translate-x-1">→</div>
              </div>
              <h2 className="mt-10 text-2xl font-semibold">{domain.label}</h2>
              <p className="mt-3 text-sm leading-6 text-white/85">{domain.blurb}</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
