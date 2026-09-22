import React, { useState, useEffect, useRef } from 'react'
import { fetchMockInterviewQuestions, evaluateInterviewResponse } from '../../api'

const SAMPLE_JDS = [
  {
    title: 'Staff AI / ML Systems Engineer',
    desc: 'Seeking an AI Engineer to design and deploy LLM agents, vector retrieval pipelines, and high-performance inference APIs. Requirements: Python, PyTorch, LangChain/LlamaIndex, PostgreSQL, Docker, and distributed caching.',
  },
  {
    title: 'Senior Full-Stack Product Engineer',
    desc: 'Looking for a Senior Full-Stack Engineer to build customer-facing web apps and microservices. Requirements: React, TypeScript, Node.js/Python, REST/GraphQL APIs, SQL databases, and automated CI/CD testing.',
  },
  {
    title: 'Distributed Backend Systems Engineer',
    desc: 'Backend Systems Engineer responsible for low-latency distributed services handling 100k requests/sec. Requirements: Python/Go, Kafka messaging, Redis cache, horizontal scaling, and zero-downtime database migrations.',
  },
]

export default function MockInterviewStudio({
  targetRole,
  skillGaps,
  bestFitRole,
  bestFitSkillGaps,
  candidateProfile,
  resumeData,
}) {
  const role = targetRole || 'Software Engineer'

  // Extract detected projects & skills from resume or candidate profile
  // Prioritize actual parsed resume profile first over initial dummy placeholders
  const parsedProjects =
    resumeData?.parsed_profile?.projects ||
    resumeData?.parsed_data?.projects ||
    resumeData?.projects ||
    null

  const rawProjects =
    parsedProjects && parsedProjects.length > 0
      ? parsedProjects
      : candidateProfile?.projects &&
        !candidateProfile?.projects?.includes('Decentralized Ledger System')
      ? candidateProfile.projects
      : parsedProjects || candidateProfile?.projects || []

  const detectedProjects = Array.isArray(rawProjects)
    ? rawProjects
    : typeof rawProjects === 'string'
    ? rawProjects.split(',').map((p) => p.trim()).filter(Boolean)
    : []

  const parsedSkills =
    resumeData?.parsed_profile?.skills ||
    resumeData?.parsed_data?.skills ||
    resumeData?.skills ||
    null

  const rawSkills =
    parsedSkills && parsedSkills.length > 0
      ? parsedSkills
      : candidateProfile?.skills && candidateProfile.skills.length > 4
      ? candidateProfile.skills
      : parsedSkills || candidateProfile?.skills || []

  const detectedSkills = Array.isArray(rawSkills)
    ? rawSkills
    : typeof rawSkills === 'string'
    ? rawSkills.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  const projectDescriptions =
    resumeData?.parsed_profile?.project_descriptions ||
    candidateProfile?.project_descriptions ||
    []

  const effectiveBestFitRole =
    bestFitRole ||
    candidateProfile?.interest ||
    targetRole ||
    'AI Systems & Machine Learning Engineer'

  const effectiveBestFitGaps =
    bestFitSkillGaps && bestFitSkillGaps.length > 0
      ? bestFitSkillGaps
      : skillGaps && skillGaps.length > 0
      ? skillGaps
      : ['System Design', 'Cloud Architecture']

  // 3-Option Source Selection states
  const defaultMode = detectedProjects.length > 0 ? 'resume' : 'best_fit'
  const [interviewMode, setInterviewMode] = useState(defaultMode)
  const [selectedProject, setSelectedProject] = useState(
    detectedProjects[0] || 'All Resume Projects'
  )
  const [jobDescription, setJobDescription] = useState('')
  const [sourceMode, setSourceMode] = useState(defaultMode)
  const [sourceProject, setSourceProject] = useState(detectedProjects[0] || '')

  // Questions & evaluation states
  const [questions, setQuestions] = useState([])
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState(null)
  const [evalError, setEvalError] = useState(null)
  const [showModelAnswer, setShowModelAnswer] = useState(false)

  // Voice Dictation (Speech-to-Text) & TTS states
  const [isRecording, setIsRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechError, setSpeechError] = useState(null)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false)
  const recognitionRef = useRef(null)

  // Key tracking to reactively re-generate when a real resume is uploaded
  const projectsKey = detectedProjects.join('|||')
  const prevProjectsKeyRef = useRef('')
  const hasInitializedRef = useRef(false)

  // Check speech recognition support and clean up on unmount
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    setSpeechSupported(Boolean(SpeechRec))
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Generate Questions handler
  const handleGenerateQuestions = async (
    modeToUse = interviewMode,
    projectOverride = null
  ) => {
    if (isRecording) {
      stopRecording()
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeakingQuestion(false)
    }
    setLoadingQuestions(true)
    setEvaluation(null)
    setUserAnswer('')
    setEvalError(null)
    setShowModelAnswer(false)

    const activeRole =
      modeToUse === 'best_fit'
        ? effectiveBestFitRole
        : targetRole || 'Software Engineer'
    const activeGaps =
      modeToUse === 'best_fit' ? effectiveBestFitGaps : skillGaps || []

    const activeProject =
      projectOverride !== null ? projectOverride : selectedProject

    try {
      const res = await fetchMockInterviewQuestions({
        role: activeRole,
        skill_gaps: activeGaps,
        mode: modeToUse,
        candidate_profile: {
          ...(candidateProfile || {}),
          projects: detectedProjects,
          skills: detectedSkills,
          project_descriptions: projectDescriptions,
          course: candidateProfile?.course || 'Computer Science',
        },
        job_description: modeToUse === 'jd' ? jobDescription : '',
        focus_project:
          modeToUse === 'resume' && activeProject !== 'All Resume Projects'
            ? activeProject
            : null,
      })
      if (res?.questions?.length) {
        setQuestions(res.questions)
        setSelectedQuestionIdx(0)
        setSourceMode(modeToUse)
        setSourceProject(activeProject)
      }
    } catch (err) {
      console.error('Failed to generate mock interview questions:', err)
    } finally {
      setLoadingQuestions(false)
    }
  }

  // Reactive effect when detectedProjects change (e.g. resume uploaded and parsed)
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      prevProjectsKeyRef.current = projectsKey
      handleGenerateQuestions(interviewMode, detectedProjects[0] || 'All Resume Projects')
      return
    }

    if (projectsKey && projectsKey !== prevProjectsKeyRef.current) {
      prevProjectsKeyRef.current = projectsKey
      const newActiveProj = detectedProjects[0] || 'All Resume Projects'
      setSelectedProject(newActiveProj)
      if (interviewMode === 'resume') {
        handleGenerateQuestions('resume', newActiveProj)
      }
    }
  }, [projectsKey])

  const currentQ = questions[selectedQuestionIdx]

  const handleEvaluate = async () => {
    if (isRecording) {
      stopRecording()
    }
    if (!userAnswer.trim()) return
    setEvaluating(true)
    setEvalError(null)
    setShowModelAnswer(false)
    try {
      const res = await evaluateInterviewResponse({
        question: currentQ?.question || '',
        user_answer: userAnswer,
        role: sourceMode === 'best_fit' ? effectiveBestFitRole : role,
      })
      setEvaluation(res)
    } catch (err) {
      setEvalError(err.message || 'Evaluation failed. Please provide a more detailed response.')
    } finally {
      setEvaluating(false)
    }
  }

  const handleSelectQuestion = (idx) => {
    if (isRecording) {
      stopRecording()
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeakingQuestion(false)
    }
    setSelectedQuestionIdx(idx)
    setUserAnswer('')
    setEvaluation(null)
    setEvalError(null)
    setShowModelAnswer(false)
    setInterimTranscript('')
    setSpeechError(null)
  }

  // Voice Speech-to-Text handler
  const startRecording = () => {
    setSpeechError(null)
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec) {
      setSpeechError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
        setIsSpeakingQuestion(false)
      }

      const recognition = new SpeechRec()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsRecording(true)
        setSpeechError(null)
      }

      recognition.onresult = (event) => {
        let interim = ''
        let finalTranscripts = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscripts += (finalTranscripts ? ' ' : '') + trans.trim()
          } else {
            interim += trans
          }
        }
        if (finalTranscripts) {
          setUserAnswer((prev) => (prev ? `${prev.trim()} ${finalTranscripts.trim()}` : finalTranscripts.trim()))
        }
        setInterimTranscript(interim)
      }

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission was denied. Please allow microphone access in your browser.')
          setIsRecording(false)
        } else if (event.error === 'no-speech') {
          // Keep active or ignore silence
        } else {
          setSpeechError(`Microphone notice: ${event.error}`)
          setIsRecording(false)
        }
      }

      recognition.onend = () => {
        setIsRecording(false)
        setInterimTranscript('')
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setSpeechError(err.message || 'Failed to start microphone.')
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setIsRecording(false)
    setInterimTranscript('')
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleReadQuestion = () => {
    if (!window.speechSynthesis) return
    if (isSpeakingQuestion) {
      window.speechSynthesis.cancel()
      setIsSpeakingQuestion(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(currentQ?.question || '')
    utterance.rate = 0.95
    utterance.onend = () => setIsSpeakingQuestion(false)
    utterance.onerror = () => setIsSpeakingQuestion(false)
    setIsSpeakingQuestion(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 sm:p-7 shadow-xl shadow-slate-200/50 backdrop-blur-md">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 mb-5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 border border-violet-200 mb-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
          AI Mock Interview Studio
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          🎙️ Tailored Mock Interviewer &amp; STAR Grader
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Practice rigorous technical &amp; behavioral interview questions with voice dictation, speech synthesis, and real-time STAR method evaluation.
        </p>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3 SOURCE OPTIONS SELECTOR */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/70 via-purple-50/40 to-white p-4 mb-6 shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b border-violet-100 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Select Question Source:
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Choose how your interview questions are formulated
            </span>
          </div>
        </div>

        {/* 3 Segmented Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3.5">
          <button
            type="button"
            onClick={() => {
              setInterviewMode('resume')
              handleGenerateQuestions('resume')
            }}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition border cursor-pointer ${
              interviewMode === 'resume'
                ? 'bg-white text-violet-800 border-violet-400 shadow-sm ring-2 ring-violet-400/20'
                : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'
            }`}
          >
            <span className="text-base">📄</span>
            <div className="text-left">
              <span className="block leading-tight font-extrabold">1. From Resume</span>
              <span className="text-[10px] text-slate-400 font-normal">Grill on actual projects &amp; stack</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setInterviewMode('best_fit')
              handleGenerateQuestions('best_fit')
            }}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition border cursor-pointer ${
              interviewMode === 'best_fit'
                ? 'bg-white text-violet-800 border-violet-400 shadow-sm ring-2 ring-violet-400/20'
                : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'
            }`}
          >
            <span className="text-base">🎯</span>
            <div className="text-left">
              <span className="block leading-tight font-extrabold">2. Best Fit Role</span>
              <span className="text-[10px] text-slate-400 font-normal">Challenge predicted skill gaps</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setInterviewMode('jd')
              if (jobDescription.trim()) {
                handleGenerateQuestions('jd')
              }
            }}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition border cursor-pointer ${
              interviewMode === 'jd'
                ? 'bg-white text-violet-800 border-violet-400 shadow-sm ring-2 ring-violet-400/20'
                : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'
            }`}
          >
            <span className="text-base">📋</span>
            <div className="text-left">
              <span className="block leading-tight font-extrabold">3. According to JD</span>
              <span className="text-[10px] text-slate-400 font-normal">Directly from target Job Description</span>
            </div>
          </button>
        </div>

        {/* Option Configuration Details */}
        <div className="bg-white rounded-xl border border-violet-100 p-3.5 text-xs space-y-3">
          {interviewMode === 'resume' ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <span>🚀</span> Focus on Candidate Project:
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {detectedSkills.length > 0 ? `${detectedSkills.length} skills detected on resume` : 'Standard engineering profile'}
                </span>
              </div>

              {detectedProjects.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProject('All Resume Projects')
                      handleGenerateQuestions('resume', 'All Resume Projects')
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition border cursor-pointer ${
                      selectedProject === 'All Resume Projects'
                        ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ★ All Projects Combined
                  </button>
                  {detectedProjects.map((proj, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedProject(proj)
                        handleGenerateQuestions('resume', proj)
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition border cursor-pointer ${
                        selectedProject === proj
                          ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {proj}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  No specific projects detected from intake. Questions will focus on core backend, algorithms, and system reliability based on your declared stack.
                </p>
              )}
            </div>
          ) : interviewMode === 'best_fit' ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Target Role:</span>
                  <span className="rounded-md bg-violet-100 border border-violet-200 px-2 py-0.5 font-black text-violet-900 text-xs">
                    {effectiveBestFitRole}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">AI Model Predicted Best Fit</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Targeted Gaps to Challenge:
                </span>
                {effectiveBestFitGaps.map((gap, gIdx) => (
                  <span
                    key={gIdx}
                    className="rounded bg-rose-50 border border-rose-200 text-rose-700 font-semibold px-2 py-0.5 text-[11px]"
                  >
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="font-bold text-slate-700 text-xs">
                  Paste Target Job Description (JD):
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Presets:</span>
                  {SAMPLE_JDS.map((sample, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setJobDescription(sample.desc)}
                      className="rounded bg-slate-100 hover:bg-violet-100 text-slate-700 hover:text-violet-800 px-2 py-0.5 text-[10px] font-bold border border-slate-200 transition cursor-pointer"
                    >
                      {sample.title.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={3}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste key requirements, qualifications, and responsibilities from a LinkedIn, Indeed, or company job posting..."
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          )}

          {/* Action Row: Generate Button & Active Source Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-violet-100/60">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Questions:</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                {sourceMode === 'resume'
                  ? `📄 Resume Projects (${sourceProject || 'All'})`
                  : sourceMode === 'best_fit'
                  ? `🎯 Best Fit (${effectiveBestFitRole})`
                  : '📋 Job Description'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleGenerateQuestions(interviewMode)}
              disabled={loadingQuestions || (interviewMode === 'jd' && !jobDescription.trim())}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-violet-500/20 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loadingQuestions ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Generating Questions...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Generate Interview Questions</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* QUESTIONS & PRACTICE WORKSPACE */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {loadingQuestions ? (
        <div className="py-16 text-center text-xs text-slate-500 font-semibold space-y-2">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent mb-1" />
          <p className="font-bold text-slate-700">Synthesizing tailored interview questions with Bar Raiser criteria...</p>
          <p className="text-[11px] text-slate-400">Targeting {interviewMode === 'resume' ? `resume projects (${selectedProject})` : interviewMode === 'best_fit' ? effectiveBestFitRole : 'Job Description'}</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 space-y-2">
          <p>No questions generated yet. Click "Generate Interview Questions" above to begin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Question Navigation */}
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Interview Questions ({questions.length})
              </span>
              <span className="text-[10px] text-violet-600 font-bold uppercase tracking-wider">
                Select to Answer
              </span>
            </div>
            {questions.map((q, idx) => {
              const isSelected = idx === selectedQuestionIdx
              return (
                <button
                  key={q.id || idx}
                  type="button"
                  onClick={() => handleSelectQuestion(idx)}
                  className={`w-full text-left rounded-xl p-3 text-xs transition border cursor-pointer ${
                    isSelected
                      ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[10px] font-mono font-bold uppercase ${isSelected ? 'text-violet-200' : 'text-violet-600'}`}>
                      {q.type}
                    </span>
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-violet-200' : 'text-slate-400'}`}>
                      Q{idx + 1}
                    </span>
                  </div>
                  <p className="font-bold line-clamp-2 leading-relaxed">
                    {q.question}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Right: Question Details & Answer Input */}
          <div className="lg:col-span-8 space-y-5">
            {/* Active Question Banner */}
            <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-700">
                  <span>{currentQ?.type} Question</span>
                  <span>•</span>
                  <span>{currentQ?.category}</span>
                </div>
                {typeof window !== 'undefined' && 'speechSynthesis' in window && (
                  <button
                    type="button"
                    onClick={handleReadQuestion}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                      isSpeakingQuestion
                        ? 'bg-violet-600 text-white shadow-sm ring-2 ring-violet-400/40 animate-pulse'
                        : 'bg-white border border-violet-200 text-violet-700 hover:bg-violet-100 shadow-2xs'
                    }`}
                    title={isSpeakingQuestion ? 'Stop reading' : 'Read question aloud'}
                  >
                    <span>{isSpeakingQuestion ? '⏹️' : '🔊'}</span>
                    <span>{isSpeakingQuestion ? 'Stop Reading' : 'Listen Question'}</span>
                  </button>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                {currentQ?.question}
              </h3>

              {/* Hints */}
              {currentQ?.hints && currentQ.hints.length > 0 && (
                <div className="mt-3 pt-3 border-t border-violet-100/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    💡 Interviewer Hints &amp; Focus Areas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentQ.hints.map((hint, hIdx) => (
                      <span key={hIdx} className="rounded bg-white/80 border border-violet-200/60 px-2 py-0.5 text-[11px] text-slate-600 font-medium">
                        {hint}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Candidate Answer Textarea with Mic Dictation */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Your Response (Use STAR Method for Behavioral):
                  </label>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md">
                    {userAnswer.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>

                {/* Voice Input & Action Controls */}
                <div className="flex items-center gap-1.5">
                  {userAnswer && (
                    <button
                      type="button"
                      onClick={() => setUserAnswer('')}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                      title="Clear text"
                    >
                      <span>✕</span>
                      <span>Clear</span>
                    </button>
                  )}

                  {speechSupported ? (
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-sm cursor-pointer ${
                        isRecording
                          ? 'bg-rose-600 text-white shadow-rose-500/30 ring-2 ring-rose-500/50 animate-pulse'
                          : 'bg-violet-50 text-violet-700 border border-violet-300 hover:bg-violet-100 hover:border-violet-400'
                      }`}
                      title={isRecording ? 'Click to stop voice recording' : 'Click to dictate your answer by voice'}
                    >
                      {isRecording ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </span>
                          <span>Stop Mic (Listening...)</span>
                        </>
                      ) : (
                        <>
                          <span>🎙️</span>
                          <span>Speak Answer</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      (Mic supported in Chrome/Edge)
                    </span>
                  )}
                </div>
              </div>

              {/* Active Voice Dictation Audio Waves Live Bar */}
              {isRecording && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-rose-50 via-pink-50 to-rose-50 border border-rose-200 px-3.5 py-2 text-xs text-rose-800 shadow-inner animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-end gap-0.5 h-3.5">
                      <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0ms] h-full" />
                      <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:150ms] h-2/3" />
                      <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:300ms] h-full" />
                      <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:450ms] h-1/2" />
                    </div>
                    <span className="font-bold">
                      Microphone Active: Speak your interview answer clearly into the mic...
                    </span>
                  </div>
                  {interimTranscript && (
                    <span className="italic text-rose-600 truncate max-w-xs font-mono text-[11px] bg-white/80 px-2 py-0.5 rounded border border-rose-200">
                      "{interimTranscript}"
                    </span>
                  )}
                </div>
              )}

              {speechError && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-center justify-between gap-2">
                  <span>⚠️ {speechError}</span>
                  <button
                    type="button"
                    onClick={() => setSpeechError(null)}
                    className="text-amber-600 hover:text-amber-900 font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              <textarea
                rows={6}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Explain the situation, task, actions you executed, and measurable outcome (or click 'Speak Answer' to dictate with your microphone)..."
                className="w-full rounded-xl border border-slate-200 p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-sans leading-relaxed"
              />

              {evalError && (
                <p className="mt-2 text-xs text-rose-600 font-semibold">{evalError}</p>
              )}

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Tip: Quantify results with metrics for maximum STAR rating.
                </span>
                <button
                  type="button"
                  onClick={handleEvaluate}
                  disabled={evaluating || !userAnswer.trim()}
                  className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-violet-700 transition shadow-md shadow-violet-500/20 disabled:opacity-40 cursor-pointer flex items-center gap-2"
                >
                  {evaluating ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Grading Answer...</span>
                    </>
                  ) : (
                    'Grade My Answer (STAR)'
                  )}
                </button>
              </div>
            </div>

            {/* Evaluation Results Card */}
            {evaluation && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Overall Evaluation Score
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900 font-mono">
                        {evaluation.overall_score} / 10
                      </span>
                      <span className={`text-xs font-bold ${evaluation.overall_score >= 7.5 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {evaluation.overall_score >= 7.5 ? 'Strong Delivery' : 'Needs Optimization'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowModelAnswer(!showModelAnswer)}
                    className="rounded-xl border border-violet-300 bg-white px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50 transition cursor-pointer"
                  >
                    {showModelAnswer ? 'Hide Staff Answer' : 'View Staff Model Answer'}
                  </button>
                </div>

                {/* STAR Breakdown Bars */}
                {evaluation.star_breakdown && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(evaluation.star_breakdown).map(([key, val]) => (
                      <div key={key} className="rounded-lg bg-white border border-slate-200 p-2.5 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          {key}
                        </span>
                        <span className="text-base font-black text-slate-800 font-mono">
                          {val}/10
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-3">
                    <span className="font-bold text-emerald-800 block mb-1">✓ What Went Well:</span>
                    <ul className="space-y-1 text-emerald-900">
                      {evaluation.strengths?.map((str, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-1.5">
                          <span className="text-emerald-500">•</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3">
                    <span className="font-bold text-amber-800 block mb-1">⚠️ Actionable Improvements:</span>
                    <ul className="space-y-1 text-amber-900">
                      {evaluation.improvements?.map((imp, iIdx) => (
                        <li key={iIdx} className="flex items-start gap-1.5">
                          <span className="text-amber-500">•</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Staff-level Exemplary Answer */}
                {showModelAnswer && evaluation.exemplary_answer && (
                  <div className="rounded-xl border border-violet-200 bg-white p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700 block mb-1">
                      Staff Engineer Exemplary Response:
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed italic">
                      "{evaluation.exemplary_answer}"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
