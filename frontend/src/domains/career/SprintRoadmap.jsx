import React, { useState, useEffect } from 'react'
import { fetchSprintRoadmap } from '../../api'

export default function SprintRoadmap({ targetRole, skillGaps }) {
  const role = targetRole || 'Software Engineer'
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeSprint, setActiveSprint] = useState(1)

  // LocalStorage state for completed weeks
  const storageKey = `decixai_sprint_progress_${role.replace(/\s+/g, '_').toLowerCase()}`
  const [completedWeeks, setCompletedWeeks] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(completedWeeks))
    } catch {}
  }, [completedWeeks, storageKey])

  useEffect(() => {
    let isCurrent = true
    const loadRoadmap = async () => {
      setLoading(true)
      try {
        const res = await fetchSprintRoadmap({
          target_role: role,
          skill_gaps: skillGaps || [],
        })
        if (isCurrent && res?.sprints) {
          setRoadmap(res)
        }
      } catch (err) {
        console.error('Failed to load roadmap', err)
      } finally {
        if (isCurrent) setLoading(false)
      }
    }
    loadRoadmap()
    return () => {
      isCurrent = false
    }
  }, [role, skillGaps])

  const toggleWeekCompleted = (weekNum) => {
    setCompletedWeeks((prev) =>
      prev.includes(weekNum) ? prev.filter((w) => w !== weekNum) : [...prev, weekNum]
    )
  }

  const handleResetProgress = () => {
    setCompletedWeeks([])
  }

  const totalWeeks = roadmap?.total_weeks || 12
  const progressPercent = Math.round((completedWeeks.length / totalWeeks) * 100)
  const currentSprintData = roadmap?.sprints?.find((s) => s.sprint_number === activeSprint)

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 sm:p-7 shadow-xl shadow-slate-200/50 backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            90-Day Execution Engine
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            📅 90-Day Interactive Sprint Roadmap
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            A week-by-week action plan for <strong>{role}</strong> with verified free resources and progress tracking.
          </p>
        </div>

        {/* Progress Tracker Widget */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 min-w-[200px]">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
            <span>Sprint Progress</span>
            <span className="font-mono text-emerald-600">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden mb-1">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
            <span>{completedWeeks.length} of {totalWeeks} weeks done</span>
            {completedWeeks.length > 0 && (
              <button
                type="button"
                onClick={handleResetProgress}
                className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500 font-semibold animate-pulse">
          Generating customized 90-day learning roadmap...
        </div>
      ) : !roadmap ? (
        <div className="py-8 text-center text-xs text-slate-400">
          Roadmap unavailable.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sprint Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            {roadmap.sprints?.map((sprint) => {
              const isActive = sprint.sprint_number === activeSprint
              return (
                <button
                  key={sprint.sprint_number}
                  type="button"
                  onClick={() => setActiveSprint(sprint.sprint_number)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{sprint.name}</span>
                  <span className="ml-1.5 opacity-60 text-[11px]">({sprint.weeks_range})</span>
                </button>
              )
            })}
          </div>

          {/* Current Sprint Info Banner */}
          {currentSprintData && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-0.5">
                Sprint Objective
              </span>
              <p className="text-xs font-bold text-slate-800">
                {currentSprintData.objective}
              </p>
            </div>
          )}

          {/* Week Cards in Active Sprint */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentSprintData?.weeks?.map((weekItem) => {
              const isDone = completedWeeks.includes(weekItem.week)
              return (
                <div
                  key={weekItem.week}
                  className={`rounded-2xl border p-4 transition-all duration-200 ${
                    isDone
                      ? 'border-emerald-200 bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black font-mono ${
                        isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isDone ? '✓' : `W${weekItem.week}`}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">
                        {weekItem.title}
                      </h3>
                    </div>

                    {/* Completion Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleWeekCompleted(weekItem.week)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition cursor-pointer shrink-0 ${
                        isDone
                          ? 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isDone ? 'Completed' : 'Mark Done'}
                    </button>
                  </div>

                  {/* Milestones */}
                  <div className="mt-3 space-y-1 text-xs text-slate-600 pl-1">
                    {weekItem.milestones?.map((m, mIdx) => (
                      <div key={mIdx} className="flex items-start gap-1.5">
                        <span className="text-slate-400">•</span>
                        <span className="leading-relaxed">{m}</span>
                      </div>
                    ))}
                  </div>

                  {/* Deliverable Badge */}
                  {weekItem.deliverable && (
                    <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-2 text-[11px] text-slate-700">
                      <span className="font-bold text-indigo-600 mr-1">Weekly Output:</span>
                      {weekItem.deliverable}
                    </div>
                  )}

                  {/* Verified Free Study Links */}
                  {weekItem.resources && weekItem.resources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                      {weekItem.resources.map((res, rIdx) => (
                        <a
                          key={rIdx}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 px-2 py-0.5 text-[10px] font-bold transition"
                        >
                          <span>🔗</span>
                          <span>{res.name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
