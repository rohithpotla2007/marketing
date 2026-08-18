import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="wms-card p-4 animate-pulse">
    <div className="w-full h-36 bg-slate-800 rounded-lg mb-3" />
    <div className="h-4 bg-slate-800 rounded w-3/4 mb-2" />
    <div className="h-3 bg-slate-800/60 rounded w-1/2 mb-4" />
    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
      <div className="h-4 bg-slate-800 rounded w-1/3" />
      <div className="h-6 bg-slate-800 rounded-full w-20" />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="w-full animate-pulse space-y-3">
    <div className="h-10 bg-slate-800/80 rounded-lg w-full" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-14 bg-slate-900/60 border border-slate-800/80 rounded-lg w-full" />
    ))}
  </div>
);

export const MetricsSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="wms-card p-5 h-32 flex flex-col justify-between">
        <div className="h-3 bg-slate-800 rounded w-1/2" />
        <div className="h-8 bg-slate-800 rounded w-3/4" />
        <div className="h-3 bg-slate-800/60 rounded w-1/3" />
      </div>
    ))}
  </div>
);
