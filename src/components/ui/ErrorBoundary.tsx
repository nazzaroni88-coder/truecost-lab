import { Component, type ErrorInfo, type ReactNode } from 'react';
import { IconWarning } from './Icons';

interface Props {
  children: ReactNode;
  /** Called when the user asks to reset (e.g. reset inputs). */
  onReset?: () => void;
  label?: string;
}
interface State {
  error: Error | null;
}

/** Keeps a rendering error in one section from blanking the whole page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('TrueCost render error', error, info.componentStack);
  }
  componentDidUpdate(prev: Props) {
    if (prev.children !== this.props.children && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card card-pad" role="alert">
        <div className="callout callout-warning">
          <IconWarning />
          <div>
            <strong>Something went wrong showing {this.props.label ?? 'this section'}.</strong>
            <div style={{ marginTop: 4 }}>Try changing an input, or reset the scenario. If it keeps happening, the inputs may be outside the ranges the model supports.</div>
            {this.props.onReset && (
              <button type="button" className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => (this.setState({ error: null }), this.props.onReset?.())}>
                Reset inputs
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
