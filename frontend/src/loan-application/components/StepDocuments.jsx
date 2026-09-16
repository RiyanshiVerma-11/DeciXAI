import { useState } from 'react';
import { useLoanApplication } from '../context/LoanApplicationContext';

export default function StepDocuments({ data, onChange, loanType }) {
  const { uploadDocument, applicationId } = useLoanApplication();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpload = async (event, label) => {
    const file = event.target.files?.[0];
    if (!file || !applicationId) {
      setMessage('Create or save the application first.');
      return;
    }
    setUploading(true);
    try {
      const document = await uploadDocument(label, file);
      const nextDocuments = [...(data.documents || []), document];
      onChange({ documents: nextDocuments });
      setMessage(`${file.name} uploaded successfully.`);
    } catch (error) {
      setMessage('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const uploadFields = [
    { label: 'aadhaar', title: 'Aadhaar card' },
    { label: 'pan', title: 'PAN card' },
    { label: 'photo', title: 'Photo' },
    { label: 'address-proof', title: 'Address proof' },
    { label: 'salary-slip', title: 'Salary slips' },
    { label: 'bank-statement', title: 'Bank statements' },
  ];

  if (loanType === 'Education') uploadFields.push({ label: 'college-docs', title: 'Admission letter / fee structure' });
  if (loanType === 'Business') uploadFields.push({ label: 'itr', title: 'ITR' });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Step 5 — Document Upload</h2>
      {uploadFields.map((field) => (
        <div key={field.label} className="rounded border bg-white p-4">
          <label className="mb-2 block font-medium text-slate-700">{field.title}</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => handleUpload(event, field.label)} />
        </div>
      ))}
      {uploading && <p className="text-sm text-blue-600">Uploading…</p>}
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </div>
  );
}
