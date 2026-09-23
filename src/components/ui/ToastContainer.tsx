import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { Toast } from '@/hooks/useToast';

const ICONS = { success: CheckCircle, error: XCircle, info: Info, warning: AlertTriangle };
const COLORS = { success: '#00ff9d', error: '#ff3b5c', info: '#00e5ff', warning: '#ffb800' };

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 md:bottom-6">
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        const color = COLORS[t.type];
        return (
          <div key={t.id} className="flex items-center gap-3 rounded-xl border bg-[#0d0d18]/95 p-3 shadow-lg backdrop-blur-md animate-slide-up" style={{ borderColor: `${color}40` }} role="alert">
            <Icon size={18} style={{ color }} className="flex-shrink-0" />
            <p className="flex-1 font-body text-sm text-raiden-text">{t.message}</p>
            <button onClick={() => onDismiss(t.id)} className="flex-shrink-0 text-raiden-muted hover:text-raiden-text" aria-label="Dismiss"><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}
