import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  full = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'premium';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  full?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl btn-press transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'text-sm px-3.5 py-2',
    md: 'text-sm px-5 py-2.5',
    lg: 'text-base px-6 py-3.5',
  };
  const variants = {
    primary:
      'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/35 hover:brightness-105',
    secondary: 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-md',
    outline:
      'border-2 border-neutral-200 text-neutral-800 hover:border-orange-400 hover:text-orange-600 bg-white',
    ghost: 'text-neutral-700 hover:bg-neutral-100',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20',
    premium:
      'bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:brightness-105',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = '',
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-neutral-200/80 shadow-sm ${hover ? 'card-hover' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  color = 'orange',
}: {
  children: ReactNode;
  color?: 'orange' | 'green' | 'red' | 'amber' | 'neutral' | 'blue';
}) {
  const colors = {
    orange: 'bg-orange-100 text-orange-700 ring-orange-200',
    green: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    red: 'bg-red-100 text-red-700 ring-red-200',
    amber: 'bg-amber-100 text-amber-800 ring-amber-200',
    neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
    blue: 'bg-blue-100 text-blue-700 ring-blue-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${colors[color]}`}>
      {children}
    </span>
  );
}

export function Spinner({ size = 24, label }: { size?: number; label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-6 text-neutral-500">
      <Loader2 size={size} className="animate-spin text-orange-500" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  disabled = false,
  className = '',
}: {
  label?: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</span>
      )}
      <input
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none transition disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
      />
    </label>
  );
}
