import { useState, useEffect } from 'react'

export default function AuditTrail() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      // Connect to the backend API we created in Phase 3
      const res = await fetch('http://127.0.0.1:8000/api/v1/audit/history?limit=50')
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch audit logs', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Decision Audit Trail</h1>
          <p className="mt-2 text-slate-600">Verifiable, immutable ledger of all AI decisions (Patent Requirement #4)</p>
        </div>
        <button 
          onClick={fetchLogs} 
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Refresh Logs
        </button>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading immutable ledger...</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No decisions audited yet. Try making a prediction!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold">Request ID</th>
                  <th className="px-6 py-4 font-semibold">Endpoint</th>
                  <th className="px-6 py-4 font-semibold">Latency</th>
                  <th className="px-6 py-4 font-semibold">Inputs (Masked)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log, idx) => (
                  <tr key={log.request_id || idx} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                      {new Date(log.timestamp * 1000).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-xs">
                      {log.request_id?.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold uppercase text-cyan-800">
                        {log.path}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {log.elapsed_ms} ms
                    </td>
                    <td className="max-w-[300px] truncate px-6 py-4 font-mono text-xs text-slate-400">
                      {JSON.stringify(log.payload || {}).substring(0, 100)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
