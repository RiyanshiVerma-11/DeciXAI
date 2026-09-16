import { LoanApplication } from '../models/LoanApplication.js';
import { sanitizeInput, sanitizeString } from '../utils/sanitize.js';
import { upload } from '../utils/upload.js';

const createOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const evaluateLoan = (application) => {
  const { loanDetails, financialInfo, employmentDetails } = application;
  const monthlyIncome = Number(financialInfo?.monthlyIncome || 0);
  const monthlyExpenses = Number(financialInfo?.monthlyExpenses || 0);
  const totalEmi = (financialInfo?.existingLoans || []).reduce((acc, entry) => acc + Number(entry.emiAmount || 0), 0);
  const loanAmount = Number(loanDetails?.loanAmountRequired || 0);
  const tenure = Number(loanDetails?.preferredRepaymentTenure || 24);
  const debtToIncome = monthlyIncome > 0 ? (totalEmi + monthlyExpenses) / monthlyIncome : 0;
  const repaymentCapacity = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses - totalEmi) / Math.max(loanAmount, 1) : 0;

  let creditScore = Number(application.creditScore || 0);
  if (!creditScore) {
    creditScore = 650 + Math.floor(Math.random() * 200);
  }

  let status = 'Needs Manual Review';
  let interestRate = 12.5;
  let approvedTenure = tenure;
  let approvedEMI = 0;

  if (creditScore >= 700 && debtToIncome < 0.65 && repaymentCapacity > 0.003 && monthlyIncome > 0) {
    status = 'Approved';
    interestRate = 10.5;
  } else if (creditScore >= 600 && debtToIncome < 0.8 && repaymentCapacity > 0.001) {
    status = 'Needs Manual Review';
    interestRate = 13.5;
  } else {
    status = 'Rejected';
    interestRate = 16.0;
  }

  const principal = Math.max(loanAmount, 1);
  const monthlyRate = interestRate / 100 / 12;
  const monthlyPayment = monthlyRate > 0
    ? (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -approvedTenure))
    : principal / approvedTenure;
  approvedEMI = Math.round(monthlyPayment);
  const totalPayable = Math.round(approvedEMI * approvedTenure);

  return {
    status,
    creditScore,
    interestRate,
    approvedTenure,
    approvedEMI,
    totalPayable,
    reviewSummary: `Score ${creditScore} with debt-to-income ratio ${debtToIncome.toFixed(2)} and repayment capacity ${repaymentCapacity.toFixed(4)}.`,
  };
};

export const saveDraft = async (req, res) => {
  try {
    const payload = sanitizeInput(req.body);
    payload.userId = req.user?.id || 'demo-user';

    const existing = await LoanApplication.findOne({ _id: payload._id, userId: payload.userId });
    const application = existing
      ? await LoanApplication.findByIdAndUpdate(payload._id, { ...payload, status: 'draft' }, { new: true })
      : await LoanApplication.create({ ...payload, status: 'draft' });

    res.status(200).json({ success: true, application });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save draft.', error: error.message });
  }
};

export const getApplication = async (req, res) => {
  try {
    const application = await LoanApplication.findOne({ _id: req.params.id, userId: req.user?.id || 'demo-user' });
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }
    res.status(200).json({ success: true, application });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch application.', error: error.message });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    const documentType = sanitizeString(req.body.documentType || 'other');
    const applicationId = sanitizeString(req.body.applicationId || '');
    const userId = req.user?.id || 'demo-user';

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const application = await LoanApplication.findOne({ _id: applicationId, userId });
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    application.documents.push({
      fileName: req.file.filename,
      fileType: documentType,
      filePath: req.file.path,
    });
    await application.save();

    res.status(200).json({ success: true, document: application.documents[application.documents.length - 1] });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed.', error: error.message });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { mobileNumber } = sanitizeInput(req.body);
    const otpCode = createOtp();
    const application = await LoanApplication.findById(req.body.applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    application.verification.otpCode = otpCode;
    await application.save();

    res.status(200).json({ success: true, message: 'OTP sent successfully.', otpCode });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send OTP.', error: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { otpCode, applicationId } = sanitizeInput(req.body);
    const application = await LoanApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const isValid = application.verification.otpCode === String(otpCode);
    if (!isValid) {
      return res.status(400).json({ message: 'OTP verification failed.' });
    }

    application.verification.otpVerified = true;
    await application.save();
    res.status(200).json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify OTP.', error: error.message });
  }
};

export const submitApplication = async (req, res) => {
  try {
    const payload = sanitizeInput(req.body);
    const userId = req.user?.id || 'demo-user';
    const application = payload._id
      ? await LoanApplication.findOne({ _id: payload._id, userId })
      : await LoanApplication.create({ userId, ...payload, status: 'submitted' });

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const review = evaluateLoan({ ...application.toObject(), ...payload });
    application.set({
      ...payload,
      status: review.status === 'Approved' ? 'approved' : review.status === 'Rejected' ? 'rejected' : 'under_review',
      creditScore: review.creditScore,
      reviewSummary: review.reviewSummary,
      approvedInterestRate: review.interestRate,
      approvedEMI: review.approvedEMI,
      approvedTenure: review.approvedTenure,
      totalPayable: review.totalPayable,
    });
    await application.save();

    res.status(200).json({ success: true, application });
  } catch (error) {
    res.status(500).json({ message: 'Submission failed.', error: error.message });
  }
};

export const getStatus = async (req, res) => {
  try {
    const application = await LoanApplication.findOne({ _id: req.params.id, userId: req.user?.id || 'demo-user' });
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }
    res.status(200).json({ success: true, status: application.status, application });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch status.', error: error.message });
  }
};
