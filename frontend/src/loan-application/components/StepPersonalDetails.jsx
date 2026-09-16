export default function StepPersonalDetails({ data, onChange }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Step 1 — Basic Personal Details</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <input className="rounded border p-3" placeholder="Full name" value={data.fullName || ''} onChange={(e) => onChange({ fullName: e.target.value })} />
        <input className="rounded border p-3" type="date" value={data.dateOfBirth || ''} onChange={(e) => onChange({ dateOfBirth: e.target.value })} />
        <select className="rounded border p-3" value={data.gender || ''} onChange={(e) => onChange({ gender: e.target.value })}>
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <input className="rounded border p-3" placeholder="Mobile number" value={data.mobileNumber || ''} onChange={(e) => onChange({ mobileNumber: e.target.value })} />
        <input className="rounded border p-3" placeholder="Email" value={data.email || ''} onChange={(e) => onChange({ email: e.target.value })} />
        <input className="rounded border p-3" placeholder="PAN number" value={data.panNumber || ''} onChange={(e) => onChange({ panNumber: e.target.value })} />
        <input className="rounded border p-3" placeholder="Aadhaar number" value={data.aadhaarNumber || ''} onChange={(e) => onChange({ aadhaarNumber: e.target.value })} />
        <select className="rounded border p-3" value={data.maritalStatus || ''} onChange={(e) => onChange({ maritalStatus: e.target.value })}>
          <option value="">Marital status</option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
          <option value="Divorced">Divorced</option>
        </select>
      </div>
      <textarea className="w-full rounded border p-3" rows="3" placeholder="Current address" value={data.currentAddress || ''} onChange={(e) => onChange({ currentAddress: e.target.value })} />
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={Boolean(data.sameAsCurrentAddress)} onChange={(e) => onChange({ sameAsCurrentAddress: e.target.checked })} />
        Permanent address same as current address
      </label>
      {!data.sameAsCurrentAddress && <textarea className="w-full rounded border p-3" rows="3" placeholder="Permanent address" value={data.permanentAddress || ''} onChange={(e) => onChange({ permanentAddress: e.target.value })} />}
    </div>
  );
}
