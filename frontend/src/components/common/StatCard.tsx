import React, { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  badge?: {
    text: string;
    type: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
  onClick?: () => void;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  badge,
  onClick,
  accentColor = 'border-slate-800',
}) => {
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'danger':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'info':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`wms-card p-5 relative overflow-hidden group ${accentColor} ${
        onClick ? 'cursor-pointer hover:border-brand-500/50 hover:bg-slate-900 transition-all' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{title}</p>
          <div className="text-2xl lg:text-3xl font-black text-white tracking-tight">{value}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200 shadow-inner group-hover:scale-105 transition-transform">
          {icon}
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
        <span className="truncate">{subtitle || 'Live database metric'}</span>
        {badge && (
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getBadgeColor(badge.type)}`}>
            {badge.text}
          </span>
        )}
        {onClick && !badge && (
          <span className="text-brand-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            View <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  );
};
