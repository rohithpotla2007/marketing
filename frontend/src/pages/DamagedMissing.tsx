import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  HelpCircle,
  AlertTriangle,
  Search,
  CheckCircle2,
  Boxes,
  RefreshCw,
  PackageX,
} from 'lucide-react';
import { damagedMissingApi } from '../services/api';
import { DamageMissingSummary } from '../types';
import { StatCard } from '../components/common/StatCard';
import { ProductImage } from '../components/common/ProductImage';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useNotification } from '../context/NotificationContext';

export const DamagedMissing: React.FC = () => {
  const { error } = useNotification();
  const [data, setData] = useState<DamageMissingSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await damagedMissingApi.getAll({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setData(res);
    } catch {
      error('Failed to load damaged & missing products registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  const getRecordStatusBadge = (status: string) => {
    switch (status) {
      case 'REPORTED':
        return (
          <span className="px-2.5 py-1 rounded-full border border-amber-500/40 bg-amber-950/60 text-amber-300 text-[11px] font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> REPORTED
          </span>
        );
      case 'REPLACED':
        return (
          <span className="px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> REPLACED
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-1 rounded-full border border-sky-500/40 bg-sky-950/60 text-sky-300 text-[11px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-sky-400" /> RESOLVED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full border border-slate-700 bg-slate-800 text-slate-400 text-[11px] font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Damaged & Missing Product Audit
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registry of physical discrepancies, defective units, and warehouse replacement logs
          </p>
        </div>

        <button
          onClick={fetchRecords}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors self-start sm:self-auto"
          title="Refresh Discrepancy Records"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Damaged Items"
          value={data?.total_damaged_items ?? 0}
          icon={<AlertOctagon className="w-5 h-5 text-rose-400" />}
          subtitle="Physical damaged units on dock"
          accentColor="border-rose-500/30 bg-rose-950/20"
        />
        <StatCard
          title="Total Missing Items"
          value={data?.total_missing_items ?? 0}
          icon={<HelpCircle className="w-5 h-5 text-amber-400" />}
          subtitle="Quantity shortfalls identified"
          accentColor="border-amber-500/30 bg-amber-950/20"
        />
        <StatCard
          title="Total Affected Items"
          value={data?.total_affected_items ?? 0}
          icon={<PackageX className="w-5 h-5 text-purple-400" />}
          subtitle="Combined total variance"
          accentColor="border-purple-500/30 bg-purple-950/20"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: 'All Records', value: '' },
            { label: 'Reported', value: 'REPORTED' },
            { label: 'Replaced', value: 'REPLACED' },
            { label: 'Resolved', value: 'RESOLVED' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === tab.value
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            placeholder="Search by product name or Order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
        </form>
      </div>

      {/* Discrepancy Records Table */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No Damaged or Missing Records"
          description="There are currently no reported inventory discrepancies."
        />
      ) : (
        <div className="wms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="py-3.5 px-4">Product Details</th>
                  <th className="py-3.5 px-4">Related Order</th>
                  <th className="py-3.5 px-4 text-rose-400">Damaged Qty</th>
                  <th className="py-3.5 px-4 text-amber-400">Missing Qty</th>
                  <th className="py-3.5 px-4">Total Affected</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Inspector</th>
                  <th className="py-3.5 px-4">Remarks</th>
                  <th className="py-3.5 px-4">Date Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {data.items.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Product Cell */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={record.product_image}
                          alt={record.product_name}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-950 border border-slate-800 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-white text-xs">{record.product_name}</div>
                          <div className="font-mono text-[11px] text-brand-400">
                            {record.product_code} • {record.category_name}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-200">
                      {record.order_number}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-rose-400 text-sm">
                      {record.damaged_quantity}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm">
                      {record.missing_quantity}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                      {record.total_affected}
                    </td>

                    <td className="py-3 px-4">{getRecordStatusBadge(record.status)}</td>

                    <td className="py-3 px-4 text-slate-300">{record.reported_by || 'Staff'}</td>

                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate text-[11px]">
                      {record.notes || 'Discrepancy identified during verification'}
                    </td>

                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(record.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
