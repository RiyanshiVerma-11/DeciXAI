import { useState } from 'react';
import axios from 'axios';
import { useLoanApplication } from '../context/LoanApplicationContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8002`;
const api = axios.create({ baseURL: `${API_BASE}/loan-application` });

export default function StepVerification({ data, onChange }) {
  const { applicationId } = useLoanApplication();
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [status, setStatus] = useState('');

  const sendOtp = async () => {
    try {
      const response = await api.post('/send-otp', { applicationId }, { headers: { Authorization: 'Bearer demo-token' } });
      setOtpSent(true);
      setStatus(response.data?.message || 'OTP sent.');
    } catch (error) {
      setStatus('OTP send failed.');
    }
  };

  const verifyOtp = async () => {
    try {
      const response = await api.post('/verify-otp', { applicationId, otpCode: otpValue }, { headers: { Authorization: 'Bearer demo-token' } });
      setStatus(response.data?.message || 'Verified.');
      onChange({ otpVerified: true });
    } catch (error) {
      setStatus('Verification failed.');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Step 6 — Verification</h2>
      <div className="rounded border bg-white p-4">
        <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={sendOtp}>Send OTP</button>
        {otpSent && (
          <div className="mt-3 flex gap-2">
            <input className="rounded border p-3" placeholder="6-digit OTP" value={otpValue} onChange={(e) => setOtpValue(e.target.value)} />
            <button className="rounded bg-emerald-600 px-4 py-2 text-white" onClick={verifyOtp}>Verify OTP</button>
          </div>
        )}
        {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
      </div>
      <div className="rounded border bg-white p-4">
        <button className="rounded bg-slate-800 px-4 py-2 text-white" onClick={() => { onChange({ aadhaarVerified: true }); setStatus('Aadhaar verification simulated successfully.'); }}>Verify via Aadhaar</button>
      </div>
      <div className="rounded border bg-white p-4">
        <button className="rounded bg-amber-600 px-4 py-2 text-white" onClick={() => { onChange({ bankVerified: true }); setStatus('Bank account verified with penny-drop simulation.'); }}>Verify bank account</button>
      </div>
    </div>
  );
}
