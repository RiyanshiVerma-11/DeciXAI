import { useNavigate } from 'react-router-dom';
import { useLoanApplication } from '../context/LoanApplicationContext';

export default function OfferPage() {
  const navigate = useNavigate();
  const { offer, setOffer } = useLoanApplication();
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-slate-900">Loan Offer</h1>
        <p className="mt-2 text-slate-600">Review the terms and confirm disbursement.</p>
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Approval status</p>
              <p className="text-xl font-semibold text-emerald-700">{offer?.status || 'Approved'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Interest rate</p>
              <p className="text-xl font-semibold text-slate-900">{offer?.interestRate || 10.5}%</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">EMI</p>
              <p className="text-xl font-semibold text-slate-900">₹{offer?.emi || 0}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Tenure</p>
              <p className="text-xl font-semibold text-slate-900">{offer?.tenure || 24} months</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total payable</p>
              <p className="text-xl font-semibold text-slate-900">₹{offer?.totalPayable || 0}</p>
            </div>
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" /> Accept terms and conditions
          </label>
          <button className="mt-4 rounded bg-emerald-600 px-4 py-2 text-white" onClick={() => { setOffer((prev) => ({ ...prev, status: 'Disbursed' })); navigate('/'); }}>Confirm & Disburse</button>
        </div>
      </div>
    </div>
  );
}
