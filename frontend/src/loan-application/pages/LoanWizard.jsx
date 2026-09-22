import { useMemo, useState } from 'react';
import WizardProgress from '../components/WizardProgress';
import StepPersonalDetails from '../components/StepPersonalDetails';
import StepLoanDetails from '../components/StepLoanDetails';
import StepEmploymentDetails from '../components/StepEmploymentDetails';
import StepFinancialInfo from '../components/StepFinancialInfo';
import StepDocuments from '../components/StepDocuments';
import StepVerification from '../components/StepVerification';
import StepReview from '../components/StepReview';
import OfferPage from './OfferPage';
import { useLoanApplication } from '../context/LoanApplicationContext';

// ─── Per-step mandatory field validators ────────────────────────────────────
function validatePersonalDetails(data) {
  const errors = [];
  if (!data.fullName?.trim()) errors.push('Full Name');
  if (!data.dateOfBirth) errors.push('Date of Birth');
  if (!data.gender) errors.push('Gender');
  if (!data.mobileNumber?.trim()) errors.push('Mobile Number');
  else if (!/^\d{10}$/.test(data.mobileNumber.trim())) errors.push('Mobile Number (must be 10 digits)');
  if (!data.email?.trim()) errors.push('Email Address');
  else if (!data.email.includes('@')) errors.push('Email Address (invalid format)');
  if (!data.currentAddress?.trim()) errors.push('Current Address');
  return errors;
}

function validateLoanDetails(data) {
  const errors = [];
  if (!data.loanType) errors.push('Loan Product Type');
  if (!data.loanAmountRequired || Number(data.loanAmountRequired) <= 0) errors.push('Loan Amount Required');
  if (!data.purposeOfLoan) errors.push('Primary Purpose');
  if (!data.preferredRepaymentTenure) errors.push('Preferred Tenure');
  return errors;
}

function validateEmploymentDetails(data, loanType) {
  const errors = [];
  if (loanType === 'Education') {
    if (!data.collegeName?.trim()) errors.push('College / University Name');
    if (!data.course?.trim()) errors.push('Course');
  } else if (loanType === 'Business') {
    if (!data.businessName?.trim()) errors.push('Business Name');
    if (!data.annualIncome || Number(data.annualIncome) <= 0) errors.push('Annual Income');
  } else {
    if (!data.companyName?.trim()) errors.push('Company Name');
    if (!data.designation?.trim()) errors.push('Designation');
    if (!data.monthlySalary || Number(data.monthlySalary) <= 0) errors.push('Monthly Salary');
  }
  return errors;
}

function validateFinancialInfo(data) {
  const errors = [];
  if (!data.monthlyIncome || Number(data.monthlyIncome) <= 0) errors.push('Monthly Income');
  if (!data.monthlyExpenses || Number(data.monthlyExpenses) < 0) errors.push('Monthly Expenses');
  if (!data.creditScore || Number(data.creditScore) < 300 || Number(data.creditScore) > 850)
    errors.push('Verified Credit Score (must be 300–850)');
  return errors;
}

// Steps 5 (documents) and 6 (verification) are optional/skippable from UI perspective
function validateStep(stepKey, data, loanType) {
  switch (stepKey) {
    case 'personalDetails': return validatePersonalDetails(data);
    case 'loanDetails': return validateLoanDetails(data);
    case 'employmentDetails': return validateEmploymentDetails(data, loanType);
    case 'financialInfo': return validateFinancialInfo(data);
    default: return [];
  }
}

export default function LoanWizard() {
  const { formData, updateField, saveDraft, submitApplication, step, setStep, loading, offer } = useLoanApplication();
  const [stepData, setStepData] = useState({});
  const [showOffer, setShowOffer] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  const sections = useMemo(
    () => [
      { key: 'personalDetails', component: StepPersonalDetails },
      { key: 'loanDetails', component: StepLoanDetails },
      { key: 'employmentDetails', component: StepEmploymentDetails },
      { key: 'financialInfo', component: StepFinancialInfo },
      { key: 'documents', component: StepDocuments },
      { key: 'verification', component: StepVerification },
      { key: 'review', component: StepReview },
    ],
    []
  );

  const currentSection = sections[step - 1];
  const CurrentComponent = currentSection?.component;

  const handleChange = (payload) => {
    updateField(currentSection.key, payload);
    setStepData((prev) => ({ ...prev, ...payload }));
    // Clear errors when user starts filling fields
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  if (showOffer && offer) {
    return <OfferPage />;
  }

  const nextStep = async () => {
    // Run validation for current step
    const currentData = currentSection.key === 'review' ? formData : (formData[currentSection.key] || {});
    const errors = validateStep(currentSection.key, currentData, formData.loanDetails?.loanType);

    if (errors.length > 0) {
      setValidationErrors(errors);
      // Scroll to top of form to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationErrors([]);

    if (step < sections.length) {
      await saveDraft();
      setStep(step + 1);
      return;
    }

    const result = await submitApplication();
    if (result?.application) {
      setShowOffer(true);
    }
  };

  const previousStep = () => {
    if (step > 1) {
      setValidationErrors([]);
      setStep(step - 1);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-xl shadow-slate-200/50">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Finance &amp; Credit Studio
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Finance &amp; Credit Intelligence</h1>
            <p className="text-sm text-slate-500 mt-0.5">Intelligent loan underwriting workflow with deterministic approval models, risk analysis, and XAI counterfactuals.</p>
          </div>
        </div>
        <WizardProgress step={step} />

        {/* ── Validation Error Banner ── */}
        {validationErrors.length > 0 && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 animate-in slide-in-from-top-2">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-[12px] font-bold text-rose-700 mb-1">Please fill the required fields before continuing:</p>
              <ul className="space-y-0.5">
                {validationErrors.map((err) => (
                  <li key={err} className="text-[11px] text-rose-600 font-medium flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-rose-400 flex-shrink-0" />
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5 sm:p-7">
          {CurrentComponent && (
            <CurrentComponent
              data={currentSection.key === 'review' ? formData : (formData[currentSection.key] || {})}
              onChange={handleChange}
              loanType={formData.loanDetails?.loanType}
              setStep={setStep}
              onSubmit={nextStep}
              validationErrors={validationErrors}
            />
          )}
        </div>
        <div className="mt-6 flex items-center justify-between pt-5 border-t border-slate-100">
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            onClick={previousStep}
            disabled={step === 1}
          >
            Back
          </button>
          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            onClick={nextStep}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Processing...
              </>
            ) : step === sections.length ? 'Submit & Review' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
