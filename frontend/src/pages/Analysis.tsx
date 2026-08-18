import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Boxes,
  ShoppingCart,
  AlertOctagon,
  PackagePlus,
  RefreshCw,
  TrendingUp,
  PieChart as PieIcon,
  Layers,
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import { AnalyticsData } from '../types';
import { StatCard } from '../components/common/StatCard';
import { CategoryBarChart } from '../components/charts/CategoryBarChart';
import { StockStatusDonut } from '../components/charts/StockStatusDonut';
import { OrderTimelineChart } from '../components/charts/OrderTimelineChart';
import { MostOrderedProductsChart } from '../components/charts/MostOrderedProductsChart';
import { DamageVsMissingChart } from '../components/charts/DamageVsMissingChart';
import { RestockingTrendChart } from '../components/charts/RestockingTrendChart';
import { OrderStatusDonut } from '../components/charts/OrderStatusDonut';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { useNotification } from '../context/NotificationContext';

export const Analysis: React.FC = () => {
  const { error } = useNotification();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.getDashboardData();
      setData(res);
    } catch {
      error('Failed to load database analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Warehouse Intelligence & Business Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Computed in real-time from active relational database transactions and audit logs
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors self-start sm:self-auto"
          title="Recalculate Analytics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Top Level Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Catalog SKUs"
            value={data.summary.total_products}
            icon={<Boxes className="w-5 h-5 text-sky-400" />}
            subtitle="Active items"
          />
          <StatCard
            title="Total Units on Hand"
            value={data.summary.total_units.toLocaleString()}
            icon={<Layers className="w-5 h-5 text-emerald-400" />}
            subtitle="Physical stock"
          />
          <StatCard
            title="Fulfilled Dispatches"
            value={data.summary.shipped_orders}
            icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
            subtitle="Shipped orders"
          />
          <StatCard
            title="Discrepancies Recorded"
            value={data.damage_missing_totals.total_affected}
            icon={<AlertOctagon className="w-5 h-5 text-rose-400" />}
            subtitle="Damaged + Missing"
          />
        </div>
      )}

      {loading || !data ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="space-y-8">
          {/* Section 1: Inventory & Categorization Breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
              <Boxes className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                1. Inventory Volume & Stock Status Breakdown
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Products by Category Bar Chart */}
              <div className="lg:col-span-7 wms-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Products & Physical Units by Category
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">8 Categories</span>
                </div>
                <CategoryBarChart data={data.categories_distribution} />
              </div>

              {/* Stock Status Donut */}
              <div className="lg:col-span-5 wms-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Stock Health Status Distribution
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">In Stock vs Low vs Out</span>
                </div>
                <StockStatusDonut data={data.stock_status_distribution} />
              </div>
            </div>
          </div>

          {/* Section 2: Order Fulfillment & Product Demand */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
              <ShoppingCart className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                2. Order Demand & Fulfillment Timeline
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Orders Timeline Area Chart */}
              <div className="lg:col-span-7 wms-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Order Ingestion & Units Volume Over Time
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">Timeline Activity</span>
                </div>
                <OrderTimelineChart data={data.orders_over_time} />
              </div>

              {/* Most Ordered Products */}
              <div className="lg:col-span-5 wms-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Top High-Demand Product SKUs
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">Ordered Quantity</span>
                </div>
                <MostOrderedProductsChart data={data.most_ordered_products} />
              </div>
            </div>
          </div>

          {/* Section 3: Discrepancy & Inbound Restocking Analytics */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                3. Dock Discrepancies & Replenishment Trends
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Damaged vs Missing by Category */}
              <div className="lg:col-span-6 wms-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Damaged vs Missing Products by Category
                  </h4>
                  <span className="text-[11px] font-mono text-rose-400">Quality Variance</span>
                </div>
                <DamageVsMissingChart data={data.damage_vs_missing} />
              </div>

              {/* Restocking Activity Trend */}
              <div className="lg:col-span-6 wms-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Inbound Restocking Velocity Over Time
                  </h4>
                  <span className="text-[11px] font-mono text-emerald-400">Restocked Units</span>
                </div>
                <RestockingTrendChart data={data.restocking_activity} />
              </div>
            </div>
          </div>

          {/* Section 4: Order Status Breakdown */}
          <div className="wms-card p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-brand-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Order Status Portfolio Distribution
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Pending / Accepted / Shipped / Cancelled
              </span>
            </div>
            <div className="max-w-md mx-auto">
              <OrderStatusDonut data={data.orders_by_status} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
