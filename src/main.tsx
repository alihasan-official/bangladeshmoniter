import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 1. HIGH-FIDELITY INSTRUMENTATION FOR STARTUP AND UNHANDLED EXCEPTIONS
interface ErrorLogs {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  error?: string;
  type: 'window' | 'promise' | 'react';
}

const capturedErrors: ErrorLogs[] = [];

const renderDiagnostics = (title: string, mainMsg: string, details?: any) => {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="background-color: #0d0e12; color: #f1f5f9; font-family: monospace; padding: 24px; min-height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; gap: 16px;">
        <div style="border: 1px solid #ff3b30; background-color: rgba(255,59,48,0.1); padding: 16px; border-radius: 4px;">
          <h1 style="margin: 0 0 8px 0; font-size: 18px; color: #ff3b30; letter-spacing: 1px; font-weight: bold;">
            CRITICAL TACTICAL FAULT DETECTED — ${title.toUpperCase()}
          </h1>
          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #cbd5e1;">
            ${mainMsg}
          </p>
        </div>
        <div style="background-color: #12141a; border: 1px solid #1a1d24; padding: 16px; border-radius: 4px; flex: 1;">
          <h2 style="margin: 0 0 12px 0; font-size: 13px; color: #006a4e; border-b: 1px solid #1a1d24; padding-bottom: 8px;">
            DIAGNOSTICS & TELEMETRY STREAM
          </h2>
          <pre style="margin: 0; font-size: 12px; line-height: 1.6; color: #94a3b8; white-space: pre-wrap; overflow-x: auto;">
${JSON.stringify(details || capturedErrors, null, 2)}
          </pre>
        </div>
        <div style="text-align: center; font-size: 10px; color: #64748b;">
          BANGLADESHMONTOR v2.0 — SECURED FAULT ISOLATION SUBSYSTEM
        </div>
      </div>
    `;
  }
};

window.addEventListener('error', (event) => {
  const errLog: ErrorLogs = {
    message: event.message,
    source: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack || event.error?.toString(),
    type: 'window',
  };
  capturedErrors.push(errLog);
  console.error('Captured window error:', event);
  renderDiagnostics('Global Window Unhandled Exception', event.message, errLog);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const errLog: ErrorLogs = {
    message: reason?.message || String(reason),
    error: reason?.stack || String(reason),
    type: 'promise',
  };
  capturedErrors.push(errLog);
  console.error('Captured unhandled promise rejection:', event);
  renderDiagnostics('Unhandled Promise Rejection', errLog.message, errLog);
});


// 2. GLOBAL REACT PRODUCTION ERROR BOUNDARY TO PREVENT BLANK SCREENS
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('React Error Boundary Caught:', error, errorInfo);

    const errLog: ErrorLogs = {
      message: error.message,
      error: error.stack,
      source: errorInfo.componentStack || undefined,
      type: 'react',
    };
    capturedErrors.push(errLog);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          backgroundColor: '#0d0e12',
          color: '#f1f5f9',
          fontFamily: 'monospace',
          padding: '24px',
          minHeight: '100vh',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            border: '1px solid #ff3b30',
            backgroundColor: 'rgba(255, 59, 48, 0.1)',
            padding: '16px',
            borderRadius: '4px'
          }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#ff3b30', letterSpacing: '1px', fontWeight: 'bold' }}>
              REACT RUNTIME ERROR TRAPPED
            </h1>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: '#cbd5e1' }}>
              {this.state.error?.message || 'Unknown React component level error.'}
            </p>
          </div>
          <div style={{
            backgroundColor: '#12141a',
            border: '1px solid #1a1d24',
            padding: '16px',
            borderRadius: '4px',
            flex: 1
          }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#006a4e', borderBottom: '1px solid #1a1d24', paddingBottom: '8px' }}>
              COMPONENT STACKTRACE & LOGS
            </h2>
            <pre style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: '#94a3b8', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
{this.state.error?.stack}
{"\n\nComponent Stack:\n"}
{this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px',
              backgroundColor: '#006a4e',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            RE-LAUNCH TACTICAL CONTROL PLATFORM
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
