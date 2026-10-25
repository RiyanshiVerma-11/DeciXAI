export default function WizardProgress({ step }) {
  const steps = [
    { num: 1, label: 'Personal' },
    { num: 2, label: 'Loan Terms' },
    { num: 3, label: 'Employment' },
    { num: 4, label: 'Financials' },
    { num: 5, label: 'Documents' },
    { num: 6, label: 'Verification' },
    { num: 7, label: 'Evaluation' },
  ];

  return (
    <div className="mb-6 flex flex-wrap gap-2 items-center">
      {steps.map(({ num, label }) => {
        const isActive = num === step;
        const isComplete = num < step;
        return (
          <div
            key={label}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
              isActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/20'
                : isComplete
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-extrabold ${
                isActive
                  ? 'bg-white text-blue-600'
                  : isComplete
                  ? 'bg-emerald-200 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {isComplete ? '✓' : num}
            </span>
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
