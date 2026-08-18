import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Layers,
  AlertTriangle,
  PackageX,
  Clock,
  CheckCircle2,
  Truck,
  AlertOctagon,
  HelpCircle,
  PlusCircle,
  PackagePlus,
  ShoppingCart,
  Activity,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { analyticsApi, activityApi, categoriesApi, productsApi } from '../services/api';
import { DashboardSummary, AuditLog, Category } from '../types';
import { StatCard } from '../components/common/StatCard';
import { MetricsSkeleton } from '../components/common/LoadingSkeleton';
import { Modal } from '../components/common/Modal';
import { useNotification } from '../context/NotificationContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    product_code: '',
    name: '',
    description: '',
    category_id: '',
    quantity: 10,
    low_stock_threshold: 10,
  });
  const [savingProduct, setSavingProduct] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [sumData, actData, catsData] = await Promise.all([
        analyticsApi.getSummary(),
        activityApi.getRecent(12),
        categoriesApi.getAll(),
      ]);
      setSummary(sumData);
      setActivities(actData);
      setCategories(catsData);
      if (catsData.length > 0 && !addForm.category_id) {
        setAddForm((prev) => ({ ...prev, category_id: String(catsData[0].id) }));
      }
    } catch {
      // Ignore background poll errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.product_code.trim() || !addForm.category_id) {
      error('Please fill in all required product fields');
      return;
    }

    setSavingProduct(true);
    try {
      await productsApi.create({
        product_code: addForm.product_code.trim().toUpperCase(),
        name: addForm.name.trim(),
        description: addForm.description.trim(),
        category_id: parseInt(addForm.category_id),
        quantity: Number(addForm.quantity) || 0,
        low_stock_threshold: Number(addForm.low_stock_threshold) || 10,
      });
      success(`Product '${addForm.name}' successfully added to inventory`);
      setIsAddModalOpen(false);
      setAddForm({
        product_code: '',
        name: '',
        description: '',
        category_id: categories.length > 0 ? String(categories[0].id) : '',
        quantity: 10,
        low_stock_threshold: 10,
      });
      fetchDashboardData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to create product';
      error(msg);
    } finally {
      setSavingProduct(false);
    }
  };

  const formatActivityTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'RESTOCK':
        return <PackagePlus className="w-4 h-4 text-emerald-400" />;
      case 'ORDER_CREATED':
        return <ShoppingCart className="w-4 h-4 text-sky-400" />;
      case 'ORDER_ACCEPTED':
        return <CheckCircle2 className="w-4 h-4 text-purple-400" />;
      case 'ORDER_SHIPPED':
        return <Truck className="w-4 h-4 text-emerald-400" />;
      case 'VERIFICATION_DONE':
        return <AlertOctagon className="w-4 h-4 text-amber-400" />;
      case 'REPLACEMENT_ISSUED':
        return <TrendingUp className="w-4 h-4 text-cyan-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            Warehouse Operations Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, stock synchronization, and fulfillment workflows
          </p>
        </div>

        {/* Top Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> + Add Product
          </button>
          <button
            onClick={() => navigate('/restocking')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <PackagePlus className="w-4 h-4 text-emerald-400" /> Restock Stock
          </button>
          <button
            onClick={() => navigate('/order-placement')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4 text-sky-400" /> Place Order
          </button>
        </div>
      </div>

      {/* KPI Counters Grid (9 Cards from DB) */}
      {loading && !summary ? (
        <MetricsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          <StatCard
            title="Total Products"
            value={summary?.total_products ?? 0}
            icon={<Boxes className="w-5 h-5 text-sky-400" />}
            subtitle="Unique catalog SKUs"
            onClick={() => navigate('/inventory')}
          />
          <StatCard
            title="Total Units on Hand"
            value={(summary?.total_units ?? 0).toLocaleString()}
            icon={<Layers className="w-5 h-5 text-emerald-400" />}
            subtitle="Central physical inventory"
            onClick={() => navigate('/inventory')}
          />
          <StatCard
            title="Low Stock Items"
            value={summary?.low_stock_items ?? 0}
            icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
            subtitle="At or below threshold"
            badge={
              (summary?.low_stock_items ?? 0) > 0
                ? { text: 'Needs Restock', type: 'warning' }
                : undefined
            }
            onClick={() => navigate('/low-stock')}
            accentColor={
              (summary?.low_stock_items ?? 0) > 0 ? 'border-amber-500/40 bg-amber-950/20' : ''
            }
          />
          <StatCard
            title="Out of Stock Items"
            value={summary?.out_of_stock_items ?? 0}
            icon={<PackageX className="w-5 h-5 text-rose-400" />}
            subtitle="0 units available"
            badge={
              (summary?.out_of_stock_items ?? 0) > 0
                ? { text: 'Critical', type: 'danger' }
                : undefined
            }
            onClick={() => navigate('/low-stock')}
            accentColor={
              (summary?.out_of_stock_items ?? 0) > 0 ? 'border-rose-500/40 bg-rose-950/20' : ''
            }
          />
          <StatCard
            title="Pending Orders"
            value={summary?.pending_orders ?? 0}
            icon={<Clock className="w-5 h-5 text-sky-400" />}
            subtitle="Awaiting acceptance"
            badge={
              (summary?.pending_orders ?? 0) > 0
                ? { text: 'Prioritized', type: 'info' }
                : undefined
            }
            onClick={() => navigate('/orders')}
          />
          <StatCard
            title="Ready for Processing"
            value={summary?.ready_orders ?? 0}
            icon={<CheckCircle2 className="w-5 h-5 text-purple-400" />}
            subtitle="Accepted / In verification"
            onClick={() => navigate('/tracking')}
          />
          <StatCard
            title="Shipped Orders"
            value={summary?.shipped_orders ?? 0}
            icon={<Truck className="w-5 h-5 text-emerald-400" />}
            subtitle="Dispatched history"
            onClick={() => navigate('/analysis')}
          />
          <StatCard
            title="Damaged Items"
            value={summary?.damaged_items ?? 0}
            icon={<AlertOctagon className="w-5 h-5 text-rose-400" />}
            subtitle="Reported on dock"
            onClick={() => navigate('/damaged-missing')}
          />
          <StatCard
            title="Missing Items"
            value={summary?.missing_items ?? 0}
            icon={<HelpCircle className="w-5 h-5 text-amber-400" />}
            subtitle="Discrepancy count"
            onClick={() => navigate('/damaged-missing')}
          />
        </div>
      )}

      {/* Main Bottom Section: Quick Links & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Action Shortcuts Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="wms-card p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Operational Shortcuts
            </h3>
            <div className="space-y-2.5">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-brand-300">
                      + Add New Product
                    </div>
                    <div className="text-[11px] text-slate-400">Add SKU to central database</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 group-hover:text-brand-400 transition-all" />
              </button>

              <button
                onClick={() => navigate('/restocking')}
                className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <PackagePlus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                      Restock Product
                    </div>
                    <div className="text-[11px] text-slate-400">Add inbound supplier quantity</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 group-hover:text-emerald-400 transition-all" />
              </button>

              <button
                onClick={() => navigate('/order-placement')}
                className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-sky-300">
                      Place Order
                    </div>
                    <div className="text-[11px] text-slate-400">Reserve inventory units</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 group-hover:text-sky-400 transition-all" />
              </button>

              <button
                onClick={() => navigate('/orders')}
                className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-purple-300">
                      View Pending Orders
                    </div>
                    <div className="text-[11px] text-slate-400">Fulfillment prioritization queue</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 group-hover:text-purple-400 transition-all" />
              </button>

              <button
                onClick={() => navigate('/low-stock')}
                className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300">
                      View Low & Out of Stock
                    </div>
                    <div className="text-[11px] text-slate-400">Critical threshold alerts</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 group-hover:text-amber-400 transition-all" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Activity Stream Panel */}
        <div className="lg:col-span-2">
          <div className="wms-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Warehouse Activity Stream
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Log
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px] pr-1">
              {activities.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">No activity recorded yet</div>
              ) : (
                activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-slate-800/90 border border-slate-700/60 shrink-0 mt-0.5">
                      {getActivityIcon(act.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">{act.details}</span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {formatActivityTime(act.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {act.action}
                        </span>
                        <span>by <strong className="text-slate-300">{act.username}</strong></span>
                        {act.entity_id && (
                          <span>• Entity: <span className="font-mono text-slate-300">{act.entity_id}</span></span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Warehouse Product"
        subtitle="Registers new SKU in central inventory database"
      >
        <form onSubmit={handleAddProductSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Product Code / SKU *</label>
              <input
                type="text"
                placeholder="e.g. SKU-ELEC-099"
                value={addForm.product_code}
                onChange={(e) => setAddForm({ ...addForm, product_code: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
              <select
                value={addForm.category_id}
                onChange={(e) => setAddForm({ ...addForm, category_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name *</label>
            <input
              type="text"
              placeholder="e.g. 4K Ultra Webcam"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Brief warehouse specification..."
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Stock Units *</label>
              <input
                type="number"
                min="0"
                value={addForm.quantity}
                onChange={(e) => setAddForm({ ...addForm, quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Low Stock Threshold *</label>
              <input
                type="number"
                min="1"
                value={addForm.low_stock_threshold}
                onChange={(e) =>
                  setAddForm({ ...addForm, low_stock_threshold: parseInt(e.target.value) || 10 })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingProduct}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-brand-600/30"
            >
              {savingProduct ? 'Creating SKU...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

function Zap(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
