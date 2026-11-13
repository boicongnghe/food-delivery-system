import { Component } from 'react'

class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application render error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
            <h1 className="text-xl font-bold text-slate-900">Đã có lỗi xảy ra</h1>
            <p className="mt-2 text-sm text-slate-600">
              Trang không thể hiển thị. Vui lòng tải lại để tiếp tục.
            </p>
            <button
              type="button"
              className="mt-6 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
