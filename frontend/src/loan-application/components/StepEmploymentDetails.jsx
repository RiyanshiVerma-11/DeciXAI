export default function StepEmploymentDetails({ data, onChange, loanType }) {
  const isEducationLoan = loanType === 'Education';
  const isBusinessLoan = loanType === 'Business';

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Step 3 — Employment / Education Details</h2>
      {isEducationLoan ? (
        <div className="grid gap-4 md:grid-cols-2">
          <input className="rounded border p-3" placeholder="College/University name" value={data.collegeName || ''} onChange={(e) => onChange({ collegeName: e.target.value })} />
          <input className="rounded border p-3" placeholder="Course" value={data.course || ''} onChange={(e) => onChange({ course: e.target.value })} />
          <input className="rounded border p-3" placeholder="Year of study" value={data.yearOfStudy || ''} onChange={(e) => onChange({ yearOfStudy: e.target.value })} />
          <input className="rounded border p-3" placeholder="Admission details" value={data.admissionDetails || ''} onChange={(e) => onChange({ admissionDetails: e.target.value })} />
          <input className="rounded border p-3" placeholder="Guarantor name" value={data.guarantorName || ''} onChange={(e) => onChange({ guarantorName: e.target.value })} />
          <input className="rounded border p-3" placeholder="Guarantor relation" value={data.guarantorRelation || ''} onChange={(e) => onChange({ guarantorRelation: e.target.value })} />
          <input className="rounded border p-3" placeholder="Guarantor PAN" value={data.guarantorPan || ''} onChange={(e) => onChange({ guarantorPan: e.target.value })} />
          <input className="rounded border p-3" type="number" placeholder="Guarantor income" value={data.guarantorIncome || ''} onChange={(e) => onChange({ guarantorIncome: e.target.value })} />
        </div>
      ) : isBusinessLoan ? (
        <div className="grid gap-4 md:grid-cols-2">
          <input className="rounded border p-3" placeholder="Business name" value={data.businessName || ''} onChange={(e) => onChange({ businessName: e.target.value })} />
          <input className="rounded border p-3" type="number" placeholder="Annual income" value={data.annualIncome || ''} onChange={(e) => onChange({ annualIncome: e.target.value })} />
          <input className="rounded border p-3" placeholder="Business type" value={data.businessType || ''} onChange={(e) => onChange({ businessType: e.target.value })} />
          <input className="rounded border p-3" type="number" placeholder="Years in business" value={data.yearsInBusiness || ''} onChange={(e) => onChange({ yearsInBusiness: e.target.value })} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <input className="rounded border p-3" placeholder="Company name" value={data.companyName || ''} onChange={(e) => onChange({ companyName: e.target.value })} />
          <input className="rounded border p-3" placeholder="Designation" value={data.designation || ''} onChange={(e) => onChange({ designation: e.target.value })} />
          <input className="rounded border p-3" type="number" placeholder="Monthly salary" value={data.monthlySalary || ''} onChange={(e) => onChange({ monthlySalary: e.target.value })} />
          <input className="rounded border p-3" type="number" placeholder="Work experience (years)" value={data.workExperienceYears || ''} onChange={(e) => onChange({ workExperienceYears: e.target.value })} />
        </div>
      )}
    </div>
  );
}
