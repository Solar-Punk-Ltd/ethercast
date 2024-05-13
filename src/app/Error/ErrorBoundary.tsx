import { Component, ContextType, ErrorInfo, PropsWithChildren } from 'react';

import { ErrorContext } from './ErrorContext';
import { ErrorModal } from './ErrorModal';

interface ErrorBoundaryState {
  inBoundaryError: Error | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<PropsWithChildren<Record<string, unknown>>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { inBoundaryError: null, errorCount: 0 };

  static contextType = ErrorContext;
  declare context: ContextType<typeof ErrorContext>;

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    console.error('Error caught by Error Boundary: ', error);
    this.setState((prevState) => ({
      inBoundaryError: error,
      errorCount: prevState.errorCount + 1,
    }));
  }
  closeError = () => {
    this.setState({ inBoundaryError: null, errorCount: 0 });
    this.context.setError(null);
  };

  get error() {
    return this.state.inBoundaryError || this.context.error;
  }

  render() {
    return (
      <>
        {!!this.error && <ErrorModal error={this.error} onClose={this.closeError} />}
        {this.state.errorCount > 3 ? null : this.props.children}
      </>
    );
  }
}
