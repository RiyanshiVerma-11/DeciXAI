export default function StepLoanDetails({ data, onChange }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Step 2 — Loan Details</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <select className="rounded border p-3" value={data.loanType || ''} onChange={(e) => onChange({ loanType: e.target.value })}>
          <option value="">Select loan type</option>
          <option value="Personal">Personal</option>
          <option value="Education">Education</option>
          <option value="Business">Business</option>
          <option value="Home">Home</option>
        </select>
        <input className="rounded border p-3" type="number" placeholder="Loan amount required" value={data.loanAmountRequired || ''} onChange={(e) => onChange({ loanAmountRequired: e.target.value })} />
        <select className="rounded border p-3" value={data.purposeOfLoan || ''} onChange={(e) => onChange({ purposeOfLoan: e.target.value })}>
          <option value="">Select purpose</option>
          <option value="Medical">Medical</option>
          <option value="Education">Education</option>
          <option value="Business">Business</option>
          <option value="Home">Home</option>
          <option value="Other">Other</option>
        </select>
        <select className="rounded border p-3" value={data.preferredRepaymentTenure || ''} onChange={(e) => onChange({ preferredRepaymentTenure: e.target.value })}>
          <option value="">Repayment tenure</option>
          <option value="12">12 months</option>
          <option value="24">24 months</option>
          <option value="36">36 months</option>
          <option value="48">48 months</option>
          <option value="60">60 months</option>
        </select>
      </div>
      {data.purposeOfLoan === 'Other' && <input className="w-full rounded border p-3" placeholder="Please specify the purpose" value={data.otherPurpose || ''} onChange={(e) => onChange({ otherPurpose: e.target.value })} />}
    </div>
  );
}
