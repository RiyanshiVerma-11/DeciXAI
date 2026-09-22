import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../components/AuthContext';

const LoanApplicationContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8002`;
const api = axios.create({ baseURL: `${API_BASE}/loan-application` });

export const LoanApplicationProvider = ({ children }) => {
  const authContext = useAuth();
  const user = authContext?.user;

  const [formData, setFormData] = useState({
    personalDetails: {
      fullName: user?.name || '',
      email: user?.email || '',
    },
    loanDetails: {},
    employmentDetails: {},
    financialInfo: {},
    verification: {},
    documents: [],
  });
  const [applicationId, setApplicationId] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [offer, setOffer] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData((prev) => {
        const personal = prev.personalDetails || {};
        if (!personal.fullName || !personal.email) {
          return {
            ...prev,
            personalDetails: {
              ...personal,
              fullName: personal.fullName || user.name || '',
              email: personal.email || user.email || '',
            },
          };
        }
        return prev;
      });
    }
  }, [user]);

  const updateField = (section, payload) => {
    setFormData((prev) => ({ ...prev, [section]: { ...(prev[section] || {}), ...payload } }));
  };

  const saveDraft = async () => {
    setLoading(true);
    try {
      const payload = { ...formData, _id: applicationId, creditScore: formData.financialInfo?.creditScore };
      const response = await api.post('/save-draft', payload, {
        headers: { Authorization: 'Bearer demo-token' },
      });
      if (response.data?.application?._id) {
        setApplicationId(response.data.application._id);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitApplication = async () => {
    setLoading(true);
    try {
      const payload = { ...formData, _id: applicationId };
      const response = await api.post('/submit', payload, {
        headers: { Authorization: 'Bearer demo-token' },
      });
      const application = response.data?.application;
      setApplicationId(application?._id || applicationId);
      setOffer({
        ...application,
        interestRate: application?.approvedInterestRate,
        emi: application?.approvedEMI,
        tenure: application?.approvedTenure,
        totalPayable: application?.totalPayable,
        status: application?.status,
      });
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const runWhatIf = async (loanAmount) => {
    const payload = { ...formData, creditScore: formData.financialInfo?.creditScore, whatIfLoanAmount: loanAmount };
    const response = await api.post('/what-if', payload);
    return response.data?.review;
  };

  const uploadDocument = async (documentType, file) => {
    if (!file || !applicationId) return null;
    const formDataToSend = new FormData();
    formDataToSend.append('document', file);
    formDataToSend.append('documentType', documentType);
    formDataToSend.append('applicationId', applicationId);

    const response = await api.post('/upload-document', formDataToSend, {
      headers: {
        Authorization: 'Bearer demo-token',
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data?.document;
  };

  const value = useMemo(
    () => ({
      formData,
      setFormData,
      updateField,
      saveDraft,
      submitApplication,
      runWhatIf,
      uploadDocument,
      applicationId,
      setApplicationId,
      step,
      setStep,
      loading,
      offer,
      setOffer,
    }),
    [formData, applicationId, step, loading, offer]
  );

  return <LoanApplicationContext.Provider value={value}>{children}</LoanApplicationContext.Provider>;
};

export const useLoanApplication = () => {
  const context = useContext(LoanApplicationContext);
  if (!context) {
    throw new Error('useLoanApplication must be used inside LoanApplicationProvider');
  }
  return context;
};
