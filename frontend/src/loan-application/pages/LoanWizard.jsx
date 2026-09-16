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

export default function LoanWizard() {
  const { formData, updateField, saveDraft, submitApplication, step, setStep, loading, offer } = useLoanApplication();
  const [stepData, setStepData] = useState({});
  const [showOffer, setShowOffer] = useState(false);

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
  };

  if (showOffer && offer) {
    return <OfferPage />;
  }

  const nextStep = async () => {
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
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Finance Application</h1>
            <p className="text-slate-600">A guided finance application experience for DeciXAI.</p>
          </div>
        </div>
        <WizardProgress step={step} />
        <div className="rounded-xl border bg-slate-50 p-5">
          {CurrentComponent && (
            <CurrentComponent
              data={currentSection.key === 'review' ? formData : (formData[currentSection.key] || {})}
              onChange={handleChange}
              loanType={formData.loanDetails?.loanType}
              setStep={setStep}
              onSubmit={nextStep}
            />
          )}
        </div>
        <div className="mt-6 flex justify-between">
          <button className="rounded border px-4 py-2" onClick={previousStep} disabled={step === 1}>Back</button>
          <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={nextStep} disabled={loading}>{loading ? 'Working...' : step === sections.length ? 'Submit & Review' : 'Continue'}</button>
        </div>
      </div>
    </div>
  );
}
