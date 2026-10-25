export default function StepEmploymentDetails({ data, onChange, loanType, validationErrors = [] }) {
  const isEducationLoan = loanType === 'Education';
  const isBusinessLoan = loanType === 'Business';

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
      <div className="pb-3 border-b border-slate-200/80">
        <h2 className="text-base sm:text-lg font-black text-slate-900">
          Step 3 — {isEducationLoan ? 'Education & Guarantor Details' : isBusinessLoan ? 'Business & Enterprise Details' : 'Employment & Income Details'}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {isEducationLoan
            ? 'Provide university and co-borrower / guarantor information for education loan assessment.'
            : isBusinessLoan
            ? 'Enter business operating metrics and annual turnover for credit line evaluation.'
            : 'Detail your current employer, designation, and experience for income stability evaluation.'}
        </p>
      </div>

      {isEducationLoan ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              College / University Name <span className="text-rose-500">*</span>
            </label>
            <input
              className={inputClass('College')}
              placeholder="e.g. IIT Delhi, BITS Pilani"
              value={data.collegeName || ''}
              onChange={(e) => onChange({ collegeName: e.target.value })}
            />
            {errorHint('College')}
          </div>

          <div>
            <label className={labelClass}>
              Course / Degree Program <span className="text-rose-500">*</span>
            </label>
            <input
              className={inputClass('Course')}
              placeholder="e.g. B.Tech Computer Science, MBA"
              value={data.course || ''}
              onChange={(e) => onChange({ course: e.target.value })}
            />
            {errorHint('Course')}
          </div>

          <div>
            <label className={labelClass}>Year of Study</label>
            <input
              className={inputClass('Year')}
              placeholder="e.g. 1st Year, 3rd Semester"
              value={data.yearOfStudy || ''}
              onChange={(e) => onChange({ yearOfStudy: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Admission / Roll Details</label>
            <input
              className={inputClass('Admission')}
              placeholder="Admission enrollment / registration ID"
              value={data.admissionDetails || ''}
              onChange={(e) => onChange({ admissionDetails: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Guarantor / Co-applicant Name</label>
            <input
              className={inputClass('guarantorName')}
              placeholder="Parent or Guardian's Full Name"
              value={data.guarantorName || ''}
              onChange={(e) => onChange({ guarantorName: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Guarantor Relation</label>
            <input
              className={inputClass('guarantorRelation')}
              placeholder="e.g. Father, Mother, Guardian"
              value={data.guarantorRelation || ''}
              onChange={(e) => onChange({ guarantorRelation: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Guarantor PAN</label>
            <input
              className={inputClass('guarantorPan')}
              placeholder="e.g. ABCDE1234F"
              maxLength={10}
              value={data.guarantorPan || ''}
              onChange={(e) => onChange({ guarantorPan: e.target.value.toUpperCase() })}
            />
          </div>

          <div>
            <label className={labelClass}>Guarantor Annual Income (₹)</label>
            <input
              className={inputClass('guarantorIncome')}
              type="number"
              placeholder="e.g. 800000"
              value={data.guarantorIncome || ''}
              onChange={(e) => onChange({ guarantorIncome: e.target.value })}
            />
          </div>
        </div>
      ) : isBusinessLoan ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              Business / Entity Name <span className="text-rose-500">*</span>
            </label>
            <input
              className={inputClass('Business Name')}
              placeholder="e.g. Nexa Logistics Pvt Ltd"
              value={data.businessName || ''}
              onChange={(e) => onChange({ businessName: e.target.value })}
            />
            {errorHint('Business Name')}
          </div>

          <div>
            <label className={labelClass}>
              Annual Revenue / Income (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              className={inputClass('Annual Income')}
              type="number"
              placeholder="e.g. 3500000"
              value={data.annualIncome || ''}
              onChange={(e) => onChange({ annualIncome: e.target.value })}
            />
            {errorHint('Annual Income')}
          </div>

          <div>
            <label className={labelClass}>Business Legal Structure</label>
            <select
              className={inputClass('businessType')}
              value={data.businessType || ''}
              onChange={(e) => onChange({ businessType: e.target.value })}
            >
              <option value="">Select entity type</option>
              <option value="Sole Proprietorship">Sole Proprietorship</option>
              <option value="Partnership">Partnership</option>
              <option value="LLP">Limited Liability Partnership (LLP)</option>
              <option value="Private Limited">Private Limited (Pvt Ltd)</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Years in Continuous Operation</label>
            <input
              className={inputClass('yearsInBusiness')}
              type="number"
              placeholder="e.g. 4"
              value={data.yearsInBusiness || ''}
              onChange={(e) => onChange({ yearsInBusiness: e.target.value })}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              Employer / Organization Name <span className="text-rose-500">*</span>
            </label>
            <input
              className={inputClass('Company Name')}
              placeholder="e.g. Infosys, TCS, Google"
              value={data.companyName || ''}
              onChange={(e) => onChange({ companyName: e.target.value })}
            />
            {errorHint('Company Name')}
          </div>

          <div>
            <label className={labelClass}>
              Job Title / Designation <span className="text-rose-500">*</span>
            </label>
            <input
              className={inputClass('Designation')}
              placeholder="e.g. Senior Software Engineer"
              value={data.designation || ''}
              onChange={(e) => onChange({ designation: e.target.value })}
            />
            {errorHint('Designation')}
          </div>

          <div>
            <label className={labelClass}>
              Net Monthly In-Hand Salary (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              className={inputClass('Monthly Salary')}
              type="number"
              placeholder="e.g. 85000"
              value={data.monthlySalary || ''}
              onChange={(e) => onChange({ monthlySalary: e.target.value })}
            />
            {errorHint('Monthly Salary')}
          </div>

          <div>
            <label className={labelClass}>Total Work Experience (Years)</label>
            <input
              className={inputClass('workExperienceYears')}
              type="number"
              placeholder="e.g. 5"
              value={data.workExperienceYears || ''}
              onChange={(e) => onChange({ workExperienceYears: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
