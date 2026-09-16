export default function StepReview({ data, onChange, setStep, onSubmit }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Step 7 — Review & Submit</h2>
      <div className="rounded border bg-white p-4">
        <h3 className="mb-2 font-semibold text-slate-700">Summary</h3>
        <pre className="whitespace-pre-wrap text-sm text-slate-600">{JSON.stringify(data, null, 2)}</pre>
      </div>
      <div className="flex gap-3">
        <button className="rounded border px-4 py-2" onClick={() => setStep(1)}>Edit</button>
        <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={onSubmit}>Submit</button>
      </div>
    </div>
  );
}
