import { Component, ErrorInfo, ReactNode } from "react";
import { Link } from "react-router-dom";
import "./ErrorBoundary.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console for debugging
    console.error(
      "AppErrorBoundary caught a critical error:",
      error,
      errorInfo
    );

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // In a production app, you would also log to an error reporting service
    // Example: logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary app-error">
          <div className="error-content df-error df-error--alarm">
            <h1 className="df-heading-2">Critical Error</h1>
            <p className="df-body">
              We&apos;re sorry, but the application has encountered a critical
              error. This has been logged and our team will investigate.
            </p>

            <div className="error-actions">
              <button
                onClick={() => window.location.reload()}
                className="error-button primary df-control df-label"
              >
                Reload Application
              </button>
              <Link to="/" className="error-button secondary df-control df-label">
                Try Home Page
              </Link>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary className="df-control df-control--latch df-label">
                  Technical Details (Development)
                </summary>
                <div className="error-info">
                  <h4 className="df-label">Error Message:</h4>
                  <pre className="error-message df-code">
                    {this.state.error.message}
                  </pre>

                  <h4 className="df-label">Error Stack:</h4>
                  <pre className="error-stack df-code">{this.state.error.stack}</pre>

                  {this.state.errorInfo && (
                    <>
                      <h4 className="df-label">Component Stack:</h4>
                      <pre className="error-stack df-code">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
