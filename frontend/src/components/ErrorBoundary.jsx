import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // In production, replace with a proper error reporting service (e.g. Sentry)
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-hun-cream px-4 text-center">
          <p className="text-xs tracking-[0.4em] uppercase text-hun-brown mb-6">Đã xảy ra lỗi</p>
          <h1 className="font-serif text-4xl font-bold text-hun-black mb-4">Rất tiếc!</h1>
          <p className="text-gray-500 mb-8 max-w-sm">
            Trang không thể tải được. Vui lòng thử làm mới trình duyệt.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Tải lại trang
          </button>
          {import.meta.env.DEV && (
            <pre className="mt-8 text-left text-xs text-red-500 bg-red-50 p-4 rounded max-w-2xl overflow-auto">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
