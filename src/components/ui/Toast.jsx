import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] space-y-2 w-[calc(100%-2rem)] max-w-sm" role="status">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-xl px-4 py-3 text-white shadow-lg ${t.type === 'error' ? 'bg-coral' : 'bg-ink'}`}
          >
            {t.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <p className="text-sm">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}