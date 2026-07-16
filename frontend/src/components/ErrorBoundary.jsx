import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('DeciXAI UI Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl shadow-rose-900/5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl">
              ⚠️
            </div>
            <h2 className="mt-6 text-xl font-bold text-slate-900">Oops, something broke</h2>
            <p className="mt-3 text-sm text-slate-600">
              Our explainable engine encountered an unexpected UI error while parsing the data.
            </p>
            <div className="mt-6">
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Reload Application
              </button>
            </div>
            {this.state.error && (
              <div className="mt-6 rounded-xl bg-slate-100 p-4 text-left text-xs text-slate-500 overflow-x-auto">
                <code>{this.state.error.toString()}</code>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
