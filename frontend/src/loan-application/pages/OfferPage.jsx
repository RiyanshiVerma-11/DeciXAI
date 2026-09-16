import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoanApplication } from '../context/LoanApplicationContext';

export default function OfferPage() {
  const navigate = useNavigate();
  const { offer, setOffer, formData, runWhatIf } = useLoanApplication();
  const submittedAmount = Number(formData.loanDetails?.loanAmountRequired || offer?.metrics?.loanAmount || 0);
  const [scenarioAmount, setScenarioAmount] = useState(submittedAmount);
  const [scenario, setScenario] = useState(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  useEffect(() => {
    if (submittedAmount) setScenarioAmount(submittedAmount);
  }, [submittedAmount]);

  const updateScenario = async (value) => {
    setScenarioAmount(value);
    setScenarioLoading(true);
    try {
      setScenario(await runWhatIf(value));
    } finally {
      setScenarioLoading(false);
    }
  };

  const isApproved = offer?.status === 'approved';
  const statusTone = isApproved ? 'border-emerald-200 bg-emerald-50' : offer?.status === 'rejected' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50';
  const reasons = offer?.reasons || (offer?.reviewSummary ? [offer.reviewSummary] : []);
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-slate-900">Loan Decision</h1>
        <p className="mt-2 text-slate-600">This result uses the information you submitted. No credit score or offer values are invented.</p>
        <div className={`mt-6 rounded-xl border p-6 ${statusTone}`}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Approval status</p>
              <p className="text-xl font-semibold text-slate-900">{offer?.status || 'under_review'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Interest rate</p>
              <p className="text-xl font-semibold text-slate-900">{offer?.interestRate ?? 'Pending'}{offer?.interestRate != null ? '%' : ''}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">EMI</p>
              <p className="text-xl font-semibold text-slate-900">{offer?.emi != null ? `₹${offer.emi}` : 'Not available'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Tenure</p>
              <p className="text-xl font-semibold text-slate-900">{offer?.tenure ?? 'Pending'}{offer?.tenure != null ? ' months' : ''}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total payable</p>
              <p className="text-xl font-semibold text-slate-900">{offer?.totalPayable != null ? `₹${offer.totalPayable}` : 'Not available'}</p>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-white/70 bg-white/70 p-4">
            <h2 className="font-semibold text-slate-900">Why this decision?</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </div>
          <div className="mt-4 rounded-lg border border-white/70 bg-white/70 p-4">
            <h2 className="font-semibold text-slate-900">How to improve</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {(offer?.suggestions || []).map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
            </ul>
          </div>
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div><h2 className="font-semibold text-slate-900">What-if loan amount</h2><p className="text-sm text-slate-600">See how changing only the requested amount affects the decision.</p></div>
              <span className="font-semibold text-slate-900">₹{scenarioAmount}</span>
            </div>
            <input className="mt-4 w-full" type="range" min="10000" max={Math.max(submittedAmount * 2, 100000)} step="5000" value={scenarioAmount} onChange={(event) => updateScenario(Number(event.target.value))} />
            {scenarioLoading && <p className="mt-2 text-sm text-slate-500">Calculating scenario...</p>}
            {scenario && <p className="mt-2 text-sm text-slate-700">Scenario: <strong>{scenario.status}</strong>. {scenario.reviewSummary}</p>}
          </div>
          {isApproved && <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" /> Accept terms and conditions
          </label>}
          {isApproved && <button className="mt-4 rounded bg-emerald-600 px-4 py-2 text-white" onClick={() => { setOffer((prev) => ({ ...prev, status: 'Disbursed' })); navigate('/'); }}>Confirm &amp; Disburse</button>}
        </div>
      </div>
    </div>
  );
}
