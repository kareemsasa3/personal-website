import { Component, ErrorInfo, ReactNode } from "react";
import { Link } from "react-router-dom";
import { markAppReady } from "../../utils/appReady";
import "./ErrorBoundary.css";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // A route that fails before its first commit never marks the app ready;
    // reveal the error UI instead of leaving the static shell in place.
    markAppReady();

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
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="error-boundary">
          <div className="error-content df-error df-error--alarm">
            <h1 className="df-heading-2">Oops! Something went wrong</h1>
            <p className="df-body">
              We&apos;re sorry, but something unexpected happened. Please try
              refreshing the page or navigating back to the home page.
            </p>

            <div className="error-actions">
              <button
                onClick={() => window.location.reload()}
                className="error-button primary df-control df-label"
              >
                Refresh Page
              </button>
              <Link to="/" className="error-button secondary df-control df-label">
                Go Home
              </Link>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary className="df-control df-control--latch df-label">
                  Error Details (Development)
                </summary>
                <pre className="error-stack df-code">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
