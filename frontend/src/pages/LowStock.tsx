import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  PackageX,
  PackagePlus,
  ArrowRight,
  RefreshCw,
  Boxes,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { inventoryMonitoringApi } from '../services/api';
import { Product } from '../types';
import { StockBadge } from '../components/common/StockBadge';
import { ProductImage } from '../components/common/ProductImage';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useNotification } from '../context/NotificationContext';

export const LowStock: React.FC = () => {
  const navigate = useNavigate();
  const { error } = useNotification();

  const [activeTab, setActiveTab] = useState<'low' | 'out'>('low');
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStockAlerts = async () => {
    setLoading(true);
    try {
      const [low, out] = await Promise.all([
        inventoryMonitoringApi.getLowStock(),
        inventoryMonitoringApi.getOutOfStock(),
      ]);
      setLowStockProducts(low);
      setOutOfStockProducts(out);
    } catch {
      error('Failed to load stock alert data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockAlerts();
  }, []);

  const displayedProducts = activeTab === 'low' ? lowStockProducts : outOfStockProducts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Low Stock & Out of Stock Monitoring
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated threshold triggers for warehouse replenishment prioritization
          </p>
        </div>

        <button
          onClick={fetchStockAlerts}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors self-start sm:self-auto"
          title="Refresh Stock Alert Thresholds"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Dual Section Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('low')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'low'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Low Stock Items (1 - 10 Units)</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-mono">
            {lowStockProducts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('out')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'out'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent'
          }`}
        >
          <PackageX className="w-4 h-4 text-rose-400" />
          <span>Out of Stock Items (0 Units)</span>
          <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 text-[10px] font-mono">
            {outOfStockProducts.length}
          </span>
        </button>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : displayedProducts.length === 0 ? (
        <EmptyState
          title={activeTab === 'low' ? 'No Low Stock Items' : 'No Out of Stock Items'}
          description={
            activeTab === 'low'
              ? 'All active catalog items are maintained above their low stock threshold.'
              : 'All catalog items have positive available stock.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {displayedProducts.map((product) => (
            <div
              key={product.id}
              className={`wms-card p-4 flex flex-col justify-between group border transition-all ${
                activeTab === 'out'
                  ? 'border-rose-500/30 hover:border-rose-500/60 bg-rose-950/10'
                  : 'border-amber-500/30 hover:border-amber-500/60 bg-amber-950/10'
              }`}
            >
              <div>
                <div className="relative mb-3.5">
                  <ProductImage
                    src={product.image_url}
                    alt={product.name}
                    category={product.category_name}
                    className="w-full h-40 rounded-xl object-cover bg-slate-950 border border-slate-800"
                  />
                  <div className="absolute top-2.5 right-2.5">
                    <StockBadge status={product.status} size="sm" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{product.product_code}</span>
                    <span>{product.category_name}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                </div>

                {/* Stock Details */}
                <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Physical Stock:</span>
                    <strong
                      className={`text-sm ${
                        product.quantity > 0 ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'
                      }`}
                    >
                      {product.quantity} units
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Configured Threshold:</span>
                    <span className="text-slate-300">{product.low_stock_threshold} units</span>
                  </div>
                </div>
              </div>

              {/* Direct Restock Shortcut Button */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => navigate(`/restocking?product_id=${product.id}`)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all group"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>RESTOCK ITEM</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
