import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Truck,
  Search,
  ArrowRight,
  ShieldAlert,
  Boxes,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { ordersApi } from '../services/api';
import { Order } from '../types';
import { ProductImage } from '../components/common/ProductImage';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useNotification } from '../context/NotificationContext';

export const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getAll({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setOrders(res.items);
    } catch {
      error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleAcceptOrder = async (order: Order) => {
    setAcceptingId(order.id);
    try {
      const updated = await ordersApi.accept(order.id);
      success(
        `Order ${updated.order_number} accepted! Moved to Order Placement & Tracking for verification.`,
        'Order Accepted'
      );
      await fetchOrders();
    } catch (err: any) {
      error(err?.response?.data?.detail || 'Failed to accept order');
    } finally {
      setAcceptingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> PENDING
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="px-2.5 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> ACCEPTED
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> SHIPPED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full border border-slate-700 bg-slate-800 text-slate-400 text-xs font-bold">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (ratio: number, label: string) => {
    if (ratio >= 0.999) {
      return (
        <span className="px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-400" /> {label}
        </span>
      );
    } else if (ratio >= 0.5) {
      return (
        <span className="px-2.5 py-1 rounded-full border border-amber-500/40 bg-amber-950/60 text-amber-300 text-[11px] font-bold flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-amber-400" /> {label}
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-1 rounded-full border border-rose-500/40 bg-rose-950/60 text-rose-300 text-[11px] font-bold flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-rose-400" /> {label}
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Orders Fulfillment & Prioritization Queue
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Orders automatically ranked by real-time warehouse fulfillment availability ratio
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrders}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/tracking')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span>Open Tracking Module</span>
            <ArrowRight className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: 'All Orders', value: '' },
            { label: 'Pending Queue', value: 'PENDING' },
            { label: 'Accepted Orders', value: 'ACCEPTED' },
            { label: 'Shipped History', value: 'SHIPPED' },
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
            placeholder="Search by Order # or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
        </form>
      </div>

      {/* Orders List */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No Orders Found"
          description="There are currently no orders in this status category."
          actionText="Place a New Order"
          onAction={() => navigate('/order-placement')}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isPending = order.status === 'PENDING';
            const isAccepting = acceptingId === order.id;

            return (
              <div
                key={order.id}
                className="wms-card p-5 border-slate-800 hover:border-slate-700 transition-all space-y-4"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-base font-mono font-black text-white">
                      {order.order_number}
                    </span>
                    {getStatusBadge(order.status)}
                    {getPriorityBadge(order.fulfillment_ratio, order.priority_label)}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>Operator: <strong className="text-slate-300">{order.username}</strong></span>
                    <span>•</span>
                    <span className="font-mono">{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Grouped Products Under This Order */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3"
                    >
                      <ProductImage
                        src={item.product_image}
                        alt={item.product_name}
                        category={item.category_name}
                        className="w-14 h-14 rounded-lg object-cover bg-slate-900 border border-slate-800 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{item.product_name}</div>
                        <div className="text-[11px] font-mono text-brand-400">{item.product_code}</div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                          <span>
                            Ordered: <strong className="text-white font-bold">{item.quantity_requested}</strong>
                          </span>
                          <span>
                            Warehouse: <strong className="text-emerald-400 font-bold">{item.available_quantity}</strong> avail
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Bar & Accept Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-400">
                    Total: <strong className="text-white">{order.total_items} items</strong> ({order.total_quantity} units)
                    {order.notes && <span className="ml-2 italic text-slate-500">— {order.notes}</span>}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {isPending && (
                      <button
                        onClick={() => handleAcceptOrder(order)}
                        disabled={isAccepting}
                        className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all"
                      >
                        {isAccepting ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>ACCEPT ORDER</span>
                          </>
                        )}
                      </button>
                    )}

                    {order.status === 'ACCEPTED' && (
                      <button
                        onClick={() => navigate('/tracking')}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <span>Verify in Tracking</span>
                        <ArrowRight className="w-4 h-4 text-purple-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
