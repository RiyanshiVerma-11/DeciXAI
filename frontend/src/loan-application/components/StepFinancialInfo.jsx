import { useState, useEffect } from 'react';

export default function StepFinancialInfo({ data, onChange }) {
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Step 4 — Financial Information</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <input className="rounded border p-3" type="number" placeholder="Monthly income" value={data.monthlyIncome || ''} onChange={(e) => onChange({ monthlyIncome: e.target.value })} />
        <input className="rounded border p-3" type="number" placeholder="Monthly expenses" value={data.monthlyExpenses || ''} onChange={(e) => onChange({ monthlyExpenses: e.target.value })} />
        <input className="rounded border p-3" type="number" min="300" max="850" placeholder="Verified credit score (300-850)" value={data.creditScore || ''} onChange={(e) => onChange({ creditScore: e.target.value })} />
        <input className="rounded border p-3" placeholder="Bank account number" value={data.bankAccountNumber || ''} onChange={(e) => onChange({ bankAccountNumber: e.target.value })} />
        <input className="rounded border p-3" placeholder="IFSC" value={data.ifsc || ''} onChange={(e) => onChange({ ifsc: e.target.value })} />
      </div>
      <div className="rounded border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-slate-700">Existing loans / EMIs</h3>
          <button type="button" className="rounded bg-slate-100 px-3 py-1 text-sm" onClick={addRow}>Add row</button>
        </div>
        {rows.map((row, index) => (
          <div key={index} className="mb-3 grid gap-2 md:grid-cols-4">
            <input className="rounded border p-2" placeholder="Loan name" value={row.loanName} onChange={(e) => updateRow(index, 'loanName', e.target.value)} />
            <input className="rounded border p-2" type="number" placeholder="EMI" value={row.emiAmount} onChange={(e) => updateRow(index, 'emiAmount', e.target.value)} />
            <input className="rounded border p-2" type="number" placeholder="Outstanding" value={row.outstandingBalance} onChange={(e) => updateRow(index, 'outstandingBalance', e.target.value)} />
            <button type="button" className="rounded bg-rose-100 px-2 py-2 text-sm text-rose-700" onClick={() => removeRow(index)}>Remove</button>
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={Boolean(data.consentForCreditCheck)} onChange={(e) => onChange({ consentForCreditCheck: e.target.checked })} />
        I consent to a credit score check.
      </label>
    </div>
  );
}
