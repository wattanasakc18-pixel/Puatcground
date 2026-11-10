const BASE = 'w-full min-h-11 px-3 rounded-xl border border-line bg-white focus:border-cobalt';

export function Field({ label, error, required, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-coral">*</span>}
      </label>
      {children}
      {error && <p className="text-coral text-sm mt-1">{error}</p>}
    </div>
  );
}

export function Input({ className = '', ...rest }) {
  return <input className={`${BASE} ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }) {
  return <select className={`${BASE} ${className}`} {...rest}>{children}</select>;
}

export function Textarea({ className = '', ...rest }) {
  return <textarea className={`${BASE} py-2 min-h-24 ${className}`} {...rest} />;
}