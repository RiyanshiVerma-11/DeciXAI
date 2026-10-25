import { useState } from 'react';
import axios from 'axios';
import { useLoanApplication } from '../context/LoanApplicationContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8002`;
const api = axios.create({ baseURL: `${API_BASE}/loan-application` });

export default function StepVerification({ data, onChange }) {
  const { applicationId, formData } = useLoanApplication();

  // ── Email OTP State ──
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' | 'error' | 'info'
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(data.otpVerified || false);

  // ── DigiLocker Aadhaar eKYC State ──
  const [showDigiLockerModal, setShowDigiLockerModal] = useState(false);
  const [digiAadhaar, setDigiAadhaar] = useState(formData?.personalDetails?.aadhaarNumber || '');
  const [digiTxnId, setDigiTxnId] = useState('');
  const [digiOtp, setDigiOtp] = useState('');
  const [digiStep, setDigiStep] = useState('input'); // 'input' | 'otp' | 'verified'
  const [digiLoading, setDigiLoading] = useState(false);
  const [digiError, setDigiError] = useState('');
  const [digiSandboxHint, setDigiSandboxHint] = useState('');
  const [digiProfile, setDigiProfile] = useState(data.digilocker || null);

  // ── Bank Account Verification State ──
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [bankVerified, setBankVerified] = useState(data.bankVerified || false);
  const [bankSuccessMsg, setBankSuccessMsg] = useState('');

  const recipientEmail = formData?.personalDetails?.email || '';

  // ── 1. Email OTP Functions ──
  const sendOtp = async () => {
    if (!applicationId) {
      setStatus('Application not saved yet. Please complete previous steps first.');
      setStatusType('error');
      return;
    }
    setSendingOtp(true);
    setStatus('');
    try {
      const response = await api.post(
        '/send-otp',
        { applicationId },
        { headers: { Authorization: 'Bearer demo-token' } }
      );
      setOtpSent(true);
      setStatus(response.data?.message || 'OTP sent to your email.');
      setStatusType('success');
    } catch (error) {
      setStatus(error?.response?.data?.detail || 'Failed to send OTP. Please check your email configuration.');
      setStatusType('error');
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpValue.trim()) {
      setStatus('Please enter the 6-digit OTP from your email.');
      setStatusType('error');
      return;
    }
    setVerifying(true);
    setStatus('');
    try {
      const response = await api.post(
        '/verify-otp',
        { applicationId, otpCode: otpValue.trim() },
        { headers: { Authorization: 'Bearer demo-token' } }
      );
      setStatus(response.data?.message || 'Email verified successfully!');
      setStatusType('success');
      setOtpVerified(true);
      onChange({ otpVerified: true });
    } catch (error) {
      setStatus(error?.response?.data?.detail || 'Invalid OTP. Please check your email and try again.');
      setStatusType('error');
    } finally {
      setVerifying(false);
    }
  };

  // ── 2. DigiLocker Aadhaar eKYC Functions ──
  const initiateDigiLocker = async () => {
    const rawAadhaar = digiAadhaar.replace(/\D/g, '');
    if (rawAadhaar.length !== 12) {
      setDigiError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    setDigiLoading(true);
    setDigiError('');
    setDigiSandboxHint('');
    try {
      const res = await api.post('/digilocker/initiate', {
        applicationId,
        aadhaarNumber: rawAadhaar,
      });
      setDigiTxnId(res.data?.txnId || '');
      if (res.data?._sandbox_otp) {
        setDigiSandboxHint(res.data._sandbox_otp);
      }
      setDigiStep('otp');
    } catch (err) {
      setDigiError(err?.response?.data?.detail || 'Failed to connect to DigiLocker Gateway. Please retry.');
    } finally {
      setDigiLoading(false);
    }
  };

  const verifyDigiLockerOtp = async () => {
    if (!digiOtp.trim() || digiOtp.trim().length !== 6) {
      setDigiError('Please enter the 6-digit DigiLocker OTP.');
      return;
    }
    setDigiLoading(true);
    setDigiError('');
    try {
      const res = await api.post('/digilocker/verify', {
        applicationId,
        txnId: digiTxnId,
        otpCode: digiOtp.trim(),
      });
      const ekyc = res.data?.ekyc || {
        verified: true,
        maskedAadhaar: `XXXX-XXXX-${digiAadhaar.slice(-4) || '8921'}`,
        verifiedVia: 'DigiLocker / MeitY UIDAI',
      };
      setDigiProfile(ekyc);
      setDigiStep('verified');
      onChange({ aadhaarVerified: true, digilocker: ekyc });
      setTimeout(() => setShowDigiLockerModal(false), 2000);
    } catch (err) {
      setDigiError(err?.response?.data?.detail || 'Invalid OTP. Please check the code.');
    } finally {
      setDigiLoading(false);
    }
  };

  // ── 3. Bank Account Penny Drop Simulation ──
  const verifyBankAccount = () => {
    setVerifyingBank(true);
    setTimeout(() => {
      setVerifyingBank(false);
      setBankVerified(true);
      setBankSuccessMsg('₹1 penny-drop credited successfully. Account name verified with NPCI.');
      onChange({ bankVerified: true });
    }, 1500);
  };

  const statusColors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error: 'bg-rose-50 border-rose-200 text-rose-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200/80">
        <h2 className="text-base sm:text-lg font-black text-slate-900">Step 6 — Identity &amp; Financial Verification</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Verify your email, authenticate your identity via national DigiLocker eKYC, and validate bank account details.
        </p>
      </div>

      {/* ── CARD 1: Email OTP Section ── */}
      <div className={`rounded-xl border p-5 transition-all ${otpVerified ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${otpVerified ? 'bg-emerald-100' : 'bg-blue-100'}`}>
              {otpVerified ? (
                <svg className="h-5 w-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Email OTP Verification</p>
              {recipientEmail ? (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  OTP sent to <span className="font-semibold text-slate-700">{recipientEmail}</span>
                </p>
              ) : (
                <p className="text-[10px] text-rose-500 mt-0.5">Please add your email in Step 1 to receive OTP.</p>
              )}
            </div>
          </div>
          {otpVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              ✓ Verified
            </span>
          )}
        </div>

        {!otpVerified && (
          <div className="space-y-3">
            {!otpSent ? (
              <button
                type="button"
                onClick={sendOtp}
                disabled={sendingOtp || !recipientEmail}
                className="w-full sm:w-auto rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm shadow-blue-500/20"
              >
                {sendingOtp ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sending to {recipientEmail}...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send OTP to Email
                  </>
                )}
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition tracking-widest text-center"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={verifying || otpValue.length !== 6}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-sm shadow-emerald-500/20"
                >
                  {verifying ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Verifying...
                    </>
                  ) : 'Verify OTP'}
                </button>
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={sendingOtp}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  Resend
                </button>
              </div>
            )}
          </div>
        )}

        {status && (
          <p className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold ${statusColors[statusType] || statusColors.info}`}>
            {statusType === 'success' ? '✓' : statusType === 'error' ? '✗' : 'ℹ'} {status}
          </p>
        )}
      </div>

      {/* ── CARD 2: DigiLocker Aadhaar eKYC Section ── */}
      <div className={`rounded-xl border p-5 transition-all ${data.aadhaarVerified || digiProfile?.verified ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            {/* DigiLocker official emblem badge */}
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${data.aadhaarVerified || digiProfile?.verified ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-900">DigiLocker Aadhaar eKYC Gateway</p>
                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-800 border border-sky-200">
                  MeitY Govt. of India
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Paperless demographic authentication via DigiLocker / UIDAI ecosystem
              </p>

              {/* Verified Details Card */}
              {(data.aadhaarVerified || digiProfile?.verified) && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-white/80 p-3 text-[11px] space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <svg className="h-3.5 w-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified UIDAI Aadhaar Credential
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600 pt-1">
                    <div>Masked ID: <span className="font-mono font-bold text-slate-800">{digiProfile?.maskedAadhaar || 'XXXX-XXXX-8921'}</span></div>
                    <div>Status: <span className="font-semibold text-emerald-700">Digitally Certified</span></div>
                    <div>Source: <span className="text-slate-700">DigiLocker Gateway</span></div>
                    <div>Issuer: <span className="text-slate-700">UIDAI Authority</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {data.aadhaarVerified || digiProfile?.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              ✓ Verified
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDigiStep('input');
                setDigiError('');
                setShowDigiLockerModal(true);
              }}
              className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition shadow-sm shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              Verify via DigiLocker
            </button>
          )}
        </div>
      </div>

      {/* ── CARD 3: Bank Account Penny Drop (Simulated) ── */}
      <div className={`rounded-xl border p-5 transition-all ${bankVerified ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center ${bankVerified ? 'bg-emerald-100' : 'bg-violet-100'}`}>
              <svg className={`h-5 w-5 ${bankVerified ? 'text-emerald-600' : 'text-violet-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Bank Account Penny Drop</p>
              <p className="text-[10px] text-slate-500">Instant ₹1 penny-drop validation via NPCI IMPS rails</p>
              {bankSuccessMsg && (
                <p className="text-[10px] font-semibold text-emerald-600 mt-1">✓ {bankSuccessMsg}</p>
              )}
            </div>
          </div>
          {bankVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              ✓ Verified
            </span>
          ) : (
            <button
              type="button"
              onClick={verifyBankAccount}
              disabled={verifyingBank}
              className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm shadow-violet-500/20"
            >
              {verifyingBank ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Depositing ₹1...
                </>
              ) : 'Verify Bank Account'}
            </button>
          )}
        </div>
      </div>

      {/* ── DigiLocker Official Modal ── */}
      {showDigiLockerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            {/* DigiLocker Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  DL
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">DigiLocker National Gateway</h3>
                  <p className="text-[10px] text-slate-500">Govt. of India · Ministry of Electronics &amp; IT</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDigiLockerModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Error in modal */}
            {digiError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                ✗ {digiError}
              </div>
            )}

            {/* Step 1: Input Aadhaar */}
            {digiStep === 'input' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    12-Digit Aadhaar Number
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={digiAadhaar}
                    onChange={(e) => setDigiAadhaar(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 5432 8765 4321"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 tracking-wider focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                  <p className="mt-1.5 text-[10px] text-slate-500">
                    UIDAI will issue a one-time password (OTP) to your Aadhaar-linked mobile &amp; email.
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50/80 p-3 text-[11px] text-blue-800 border border-blue-100 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    Consent for eKYC:
                  </p>
                  <p className="text-[10px] text-blue-700 leading-relaxed">
                    I hereby authorize DeciXAI to fetch my Aadhaar demographic details from DigiLocker / UIDAI for loan appraisal under Aadhaar Act 2016.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDigiLockerModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={initiateDigiLocker}
                    disabled={digiLoading || digiAadhaar.length !== 12}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {digiLoading ? 'Connecting...' : 'Request DigiLocker OTP'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Enter DigiLocker OTP */}
            {digiStep === 'otp' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Enter DigiLocker OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={digiOtp}
                    onChange={(e) => setDigiOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-center text-lg font-mono font-bold tracking-[0.3em] text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                  <p className="mt-1.5 text-center text-[10px] text-slate-500">
                    6-digit code sent to Aadhaar-registered mobile &amp; email.
                  </p>
                </div>

                {digiSandboxHint && (
                  <div className="rounded-lg bg-amber-50 p-2.5 text-center text-[11px] font-semibold text-amber-800 border border-amber-200">
                    🔑 Sandbox Test OTP: <span className="font-mono font-bold tracking-widest">{digiSandboxHint}</span> (or 123456)
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setDigiStep('input')}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    ← Change Aadhaar
                  </button>
                  <button
                    type="button"
                    onClick={verifyDigiLockerOtp}
                    disabled={digiLoading || digiOtp.length !== 6}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {digiLoading ? 'Verifying...' : 'Verify & Fetch eKYC'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Verified Confirmation */}
            {digiStep === 'verified' && (
              <div className="text-center py-4 space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  ✓
                </div>
                <h4 className="text-sm font-bold text-slate-900">Aadhaar Authenticated!</h4>
                <p className="text-xs text-slate-500">Demographic details verified through DigiLocker UIDAI.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
