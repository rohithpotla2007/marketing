import React from 'react';

interface StockBadgeProps {
  status: 'IN STOCK' | 'LOW STOCK' | 'OUT OF STOCK' | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StockBadge: React.FC<StockBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toUpperCase();

  let colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let dotClass = 'bg-emerald-400';

  if (normalized === 'LOW STOCK') {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    dotClass = 'bg-amber-400';
  } else if (normalized === 'OUT OF STOCK') {
    colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    dotClass = 'bg-rose-400';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-semibold',
    md: 'px-2.5 py-1 text-xs font-bold tracking-wide',
    lg: 'px-3 py-1.5 text-sm font-bold tracking-wide',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm ${colorClasses} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass} animate-pulse`} />
      {normalized}
    </span>
  );
};
