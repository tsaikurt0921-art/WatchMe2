import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "應用程式發生錯誤，請嘗試重新整理。";
      
      try {
        // Check if it's our JSON error from handleFirestoreError
        const firestoreError = JSON.parse(this.state.error?.message || "");
        if (firestoreError.error) {
          errorMessage = `資料庫存取錯誤: ${firestoreError.error} (操作: ${firestoreError.operationType})`;
        }
      } catch (e) {
        // Not a JSON error, use default or error message
        if (this.state.error?.message) {
          errorMessage = this.state.error.message;
        }
      }

      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center space-y-6">
            <div className="inline-flex p-4 bg-red-50 rounded-full text-red-500">
              <AlertCircle size={48} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">發生了一些問題</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              <RefreshCw size={18} /> 重新整理頁面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
