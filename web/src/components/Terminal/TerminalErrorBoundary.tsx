import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class TerminalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Terminal Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="terminal-error-boundary">
          <div className="error-message df-error df-error--alarm">
            <h3 className="df-heading-2">Terminal Error</h3>
            <p className="df-body">
              Something went wrong with the terminal. Please refresh the page.
            </p>
            <div className="error-actions">
              <button
                onClick={() => window.location.reload()}
                className="error-reload-button df-control df-label"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TerminalErrorBoundary;
