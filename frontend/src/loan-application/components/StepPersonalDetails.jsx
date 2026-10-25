import { useEffect } from 'react';
import { useAuth } from '../../components/AuthContext';

export default function StepPersonalDetails({ data, onChange, validationErrors = [] }) {
  const { user } = useAuth() || {};

  useEffect(() => {
    if (user) {
      const updates = {};
      if (!data.fullName && user.name) updates.fullName = user.name;
      if (!data.email && user.email) updates.email = user.email;
      if (Object.keys(updates).length > 0) {
        onChange(updates);
      }
    }
  }, [user]);

  // Check if a field has an error (match by field label keyword)
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
      <p className="mt-1 text-[10px] font-semibold text-rose-500 flex items-center gap-1">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        This field is required
      </p>
    ) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">Step 1 — Basic Personal Details</h2>
          <p className="text-xs text-slate-500">Provide your identity details for KYC verification and credit underwriting.</p>
        </div>
        {user && (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Auto-filled from account
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            Full Name <span className="text-rose-500">*</span>
            <span className="text-blue-600 font-normal lowercase ml-1">(from account)</span>
          </label>
          <input
            className={inputClass('Full Name')}
            placeholder="Full Name"
            value={data.fullName || user?.name || ''}
            onChange={(e) => onChange({ fullName: e.target.value })}
          />
          {errorHint('Full Name')}
        </div>

        <div>
          <label className={labelClass}>Date of Birth <span className="text-rose-500">*</span></label>
          <input
            className={inputClass('Date of Birth')}
            type="date"
            value={data.dateOfBirth || ''}
            onChange={(e) => onChange({ dateOfBirth: e.target.value })}
          />
          {errorHint('Date of Birth')}
        </div>

        <div>
          <label className={labelClass}>Gender <span className="text-rose-500">*</span></label>
          <select
            className={inputClass('Gender')}
            value={data.gender || ''}
            onChange={(e) => onChange({ gender: e.target.value })}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errorHint('Gender')}
        </div>

        <div>
          <label className={labelClass}>Mobile Number <span className="text-rose-500">*</span></label>
          <input
            className={inputClass('Mobile Number')}
            placeholder="10-digit mobile number"
            maxLength={10}
            value={data.mobileNumber || ''}
            onChange={(e) => onChange({ mobileNumber: e.target.value.replace(/\D/g, '') })}
          />
          {errorHint('Mobile Number')}
        </div>

        <div>
          <label className={labelClass}>
            Email Address <span className="text-rose-500">*</span>
            <span className="text-blue-600 font-normal lowercase ml-1">(from account)</span>
          </label>
          <input
            className={inputClass('Email Address')}
            type="email"
            placeholder="name@example.com"
            value={data.email || user?.email || ''}
            onChange={(e) => onChange({ email: e.target.value })}
          />
          {errorHint('Email Address')}
        </div>

        <div>
          <label className={labelClass}>PAN Number</label>
          <input
            className={`${inputClass('PAN')} uppercase`}
            placeholder="ABCDE1234F"
            maxLength={10}
            value={data.panNumber || ''}
            onChange={(e) => onChange({ panNumber: e.target.value.toUpperCase() })}
          />
        </div>

        <div>
          <label className={labelClass}>Aadhaar Number</label>
          <input
            className={inputClass('Aadhaar')}
            placeholder="12-digit Aadhaar"
            maxLength={12}
            value={data.aadhaarNumber || ''}
            onChange={(e) => onChange({ aadhaarNumber: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>Marital Status</label>
          <select
            className={inputClass('Marital')}
            value={data.maritalStatus || ''}
            onChange={(e) => onChange({ maritalStatus: e.target.value })}
          >
            <option value="">Select Marital Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Current Address <span className="text-rose-500">*</span></label>
        <textarea
          className={inputClass('Current Address')}
          rows={3}
          placeholder="Flat / House No, Street, Landmark, City, State, Pincode"
          value={data.currentAddress || ''}
          onChange={(e) => onChange({ currentAddress: e.target.value })}
        />
        {errorHint('Current Address')}
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
        <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            checked={Boolean(data.sameAsCurrentAddress)}
            onChange={(e) => onChange({ sameAsCurrentAddress: e.target.checked })}
          />
          <span>Permanent address same as current address</span>
        </label>
      </div>

      {!data.sameAsCurrentAddress && (
        <div>
          <label className={labelClass}>Permanent Address</label>
          <textarea
            className={inputClass('Permanent')}
            rows={3}
            placeholder="Permanent Address details"
            value={data.permanentAddress || ''}
            onChange={(e) => onChange({ permanentAddress: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
