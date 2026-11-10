import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-cobalt text-white hover:bg-cobalt/90',
  secondary: 'bg-white border border-line text-ink hover:bg-bg',
  danger: 'bg-coral text-white hover:bg-coral/90',
  ghost: 'text-ink hover:bg-line/60',
};

export default function Button({ variant = 'primary', loading = false, disabled, className = '', children, ...rest }) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}