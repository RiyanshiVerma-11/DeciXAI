export default function WizardProgress({ step }) {
  const steps = ['Personal', 'Loan', 'Employment', 'Finance', 'Documents', 'Verification', 'Review'];
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {steps.map((label, index) => {
        const current = index + 1;
        const isActive = current === step;
        const isComplete = current < step;
        return (
          <div key={label} className={`rounded-full px-3 py-2 text-sm font-medium ${isActive ? 'bg-blue-600 text-white' : isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {current}. {label}
          </div>
        );
      })}
    </div>
  );
}
