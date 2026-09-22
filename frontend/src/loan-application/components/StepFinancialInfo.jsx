import { useState, useEffect } from 'react';

export default function StepFinancialInfo({ data, onChange, validationErrors = [] }) {
  const [rows, setRows] = useState(data.existingLoans || [{ loanName: '', emiAmount: '', outstandingBalance: '' }]);

  useEffect(() => {
    onChange({ existingLoans: rows });
  }, [rows]);

  const updateRow = (index, field, value) => {
    const nextRows = [...rows];
    nextRows[index][field] = value;
    setRows(nextRows);
  };

  const addRow = () => setRows([...rows, { loanName: '', emiAmount: '', outstandingBalance: '' }]);
  const removeRow = (index) => {
    const nextRows = rows.filter((_, i) => i !== index);
    setRows(nextRows.length ? nextRows : [{ loanName: '', emiAmount: '', outstandingBalance: '' }]);
  };

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

  const tableInputClass = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition';

  return (
    <div className="space-y-5">
      <div className="pb-3 border-b border-slate-200/80">
        <h2 className="text-base sm:text-lg font-black text-slate-900">Step 4 — Financial Information</h2>
        <p className="text-xs text-slate-500">Income, expenses, and existing loan obligations for credit underwriting.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Monthly Income (₹) <span className="text-rose-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
            <input
              className={`${inputClass('Monthly Income')} pl-8 font-mono`}
              type="number"
              placeholder="e.g. 75000"
              value={data.monthlyIncome || ''}
              onChange={(e) => onChange({ monthlyIncome: e.target.value })}
            />
          </div>
          {errorHint('Monthly Income')}
        </div>

        <div>
          <label className={labelClass}>Monthly Expenses (₹) <span className="text-rose-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
            <input
              className={`${inputClass('Monthly Expenses')} pl-8 font-mono`}
              type="number"
              placeholder="e.g. 30000"
              value={data.monthlyExpenses || ''}
              onChange={(e) => onChange({ monthlyExpenses: e.target.value })}
            />
          </div>
          {errorHint('Monthly Expenses')}
        </div>

        <div>
          <label className={labelClass}>Verified Credit Score (300–850) <span className="text-rose-500">*</span></label>
          <input
            className={`${inputClass('Credit Score')} font-mono`}
            type="number"
            min="300"
            max="850"
            placeholder="e.g. 720"
            value={data.creditScore || ''}
            onChange={(e) => onChange({ creditScore: e.target.value })}
          />
          {errorHint('Credit Score')}
        </div>

        <div>
          <label className={labelClass}>Bank Account Number</label>
          <input
            className={inputClass('bank')}
            placeholder="Bank account number"
            value={data.bankAccountNumber || ''}
            onChange={(e) => onChange({ bankAccountNumber: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>IFSC Code</label>
          <input
            className={`${inputClass('ifsc')} uppercase`}
            placeholder="SBIN0001234"
            maxLength={11}
            value={data.ifsc || ''}
            onChange={(e) => onChange({ ifsc: e.target.value.toUpperCase() })}
          />
        </div>
      </div>

      {/* Existing Loans Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Existing Loans / EMIs</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">List any active EMI obligations (leave blank if none)</p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-200 transition"
            onClick={addRow}
          >
            + Add Row
          </button>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2 mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Loan Name</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">EMI (₹/mo)</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Outstanding (₹)</span>
            <span />
          </div>
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-4 gap-2">
              <input className={tableInputClass} placeholder="e.g. Car Loan" value={row.loanName} onChange={(e) => updateRow(index, 'loanName', e.target.value)} />
              <input className={tableInputClass} type="number" placeholder="5000" value={row.emiAmount} onChange={(e) => updateRow(index, 'emiAmount', e.target.value)} />
              <input className={tableInputClass} type="number" placeholder="150000" value={row.outstandingBalance} onChange={(e) => updateRow(index, 'outstandingBalance', e.target.value)} />
              <button
                type="button"
                className="rounded-lg bg-rose-50 px-2 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-100 transition"
                onClick={() => removeRow(index)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
        <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            checked={Boolean(data.consentForCreditCheck)}
            onChange={(e) => onChange({ consentForCreditCheck: e.target.checked })}
          />
          <span>I consent to a credit score check by the underwriting team.</span>
        </label>
      </div>
    </div>
  );
}
