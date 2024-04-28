import { Component, ContextType, ErrorInfo, PropsWithChildren } from 'react';

import { ErrorContext } from './ErrorContext';
import { ErrorModal } from './ErrorModal';

interface ErrorBoundaryState {
  inBoundaryError: Error | null;
}

export class ErrorBoundary extends Component<PropsWithChildren<Record<string, unknown>>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { inBoundaryError: null };

  static contextType = ErrorContext;
  declare context: ContextType<typeof ErrorContext>;

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { inBoundaryError: error };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    console.error('Error caught by Error Boundary: ', error);
  }

  closeError = () => {
    this.setState({ inBoundaryError: null });
    this.context.setError(null);
  };

  get error() {
    return this.state.inBoundaryError || this.context.error;
  }

  render() {
    return (
      <>
        {!!this.error && <ErrorModal error={this.error} onClose={this.closeError} />}
        {this.props.children}
      </>
    );
  }
}
