export default function StepLoanDetails({ data, onChange, validationErrors = [] }) {
  const hasError = (keyword) =>
    validationErrors.some((e) => e.toLowerCase().includes(keyword.toLowerCase()));

  const inputClass = (field) =>
    `w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
      hasError(field)
        ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20'
        : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-blue-500/20'
    }`;

  const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1';
  const errorHint = (field) =>
    hasError(field) ? (
      <p className="mt-1 text-[10px] font-semibold text-rose-500">This field is required</p>
    ) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">Step 2 — Loan Requirements</h2>
          <p className="text-xs text-slate-500">Specify your financing requirements, intended purpose, and preferred repayment tenure.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Loan Product Type <span className="text-rose-500">*</span></label>
          <select
            className={inputClass('Loan Product')}
            value={data.loanType || ''}
            onChange={(e) => onChange({ loanType: e.target.value })}
          >
            <option value="">Select Loan Type</option>
            <option value="Personal">Personal Loan</option>
            <option value="Education">Education Loan</option>
            <option value="Business">Business Loan</option>
            <option value="Home">Home Loan</option>
          </select>
          {errorHint('Loan Product')}
        </div>

        <div>
          <label className={labelClass}>Loan Amount Required (₹) <span className="text-rose-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
            <input
              className={`${inputClass('Loan Amount')} pl-8 font-mono`}
              type="number"
              placeholder="e.g. 500000"
              value={data.loanAmountRequired || ''}
              onChange={(e) => onChange({ loanAmountRequired: e.target.value })}
            />
          </div>
          {errorHint('Loan Amount')}
        </div>

        <div>
          <label className={labelClass}>Primary Purpose <span className="text-rose-500">*</span></label>
          <select
            className={inputClass('Purpose')}
            value={data.purposeOfLoan || ''}
            onChange={(e) => onChange({ purposeOfLoan: e.target.value })}
          >
            <option value="">Select Purpose</option>
            <option value="Medical">Medical Emergency</option>
            <option value="Education">Higher Education</option>
            <option value="Business">Business Expansion</option>
            <option value="Home">Home Renovation / Purchase</option>
            <option value="Other">Other Purpose</option>
          </select>
          {errorHint('Purpose')}
        </div>

        <div>
          <label className={labelClass}>Preferred Tenure <span className="text-rose-500">*</span></label>
          <select
            className={inputClass('Preferred Tenure')}
            value={data.preferredRepaymentTenure || ''}
            onChange={(e) => onChange({ preferredRepaymentTenure: e.target.value })}
          >
            <option value="">Select Repayment Tenure</option>
            <option value="12">12 months (1 Year)</option>
            <option value="24">24 months (2 Years)</option>
            <option value="36">36 months (3 Years)</option>
            <option value="48">48 months (4 Years)</option>
            <option value="60">60 months (5 Years)</option>
          </select>
          {errorHint('Preferred Tenure')}
        </div>
      </div>

      {data.purposeOfLoan === 'Other' && (
        <div>
          <label className={labelClass}>Specify Purpose Details</label>
          <input
            className={inputClass('other')}
            placeholder="Please specify your loan purpose details"
            value={data.otherPurpose || ''}
            onChange={(e) => onChange({ otherPurpose: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
