import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  PackagePlus,
  ArrowRight,
  History,
  CheckCircle2,
  Boxes,
  Layers,
  Sparkles,
} from 'lucide-react';
import { productsApi, restockApi } from '../services/api';
import { Product, RestockTransaction } from '../types';
import { StockBadge } from '../components/common/StockBadge';
import { ProductImage } from '../components/common/ProductImage';
import { useNotification } from '../context/NotificationContext';

export const Restocking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preSelectedId = searchParams.get('product_id');

  const { success, error } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [restockQty, setRestockQty] = useState<number>(20);
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<RestockTransaction[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [prodsRes, histRes] = await Promise.all([
        productsApi.getAll({ limit: 100 }),
        restockApi.getHistory(30),
      ]);
      setProducts(prodsRes.items);
      setHistory(histRes);

      if (preSelectedId) {
        const found = prodsRes.items.find((p) => p.id === parseInt(preSelectedId));
        if (found) {
          setSelectedProduct(found);
        }
      } else if (prodsRes.items.length > 0) {
        // Default to USB-C Cable or first item
        const usb = prodsRes.items.find((p) => p.name.includes('USB-C Cable'));
        setSelectedProduct(usb || prodsRes.items[0]);
      }
    } catch {
      error('Failed to load restocking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [preSelectedId]);

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setSearchQuery('');
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      error('Please select a product to restock');
      return;
    }
    if (restockQty <= 0) {
      error('Restock quantity must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const res = await restockApi.restock({
        product_id: selectedProduct.id,
        quantity_added: restockQty,
        notes: notes.trim() || undefined,
      });

      success(res.message, 'Inventory Restocked');

      // Refresh product data & history
      const updatedProduct = await productsApi.getById(selectedProduct.id);
      setSelectedProduct(updatedProduct);

      const [prodsRes, histRes] = await Promise.all([
        productsApi.getAll({ limit: 100 }),
        restockApi.getHistory(30),
      ]);
      setProducts(prodsRes.items);
      setHistory(histRes);
      setNotes('');
    } catch (err: any) {
      error(err?.response?.data?.detail || 'Restock transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.product_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.category_name && p.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const projectedQuantity = selectedProduct ? selectedProduct.quantity + (restockQty || 0) : 0;
  const projectedStatus = selectedProduct
    ? projectedQuantity > selectedProduct.low_stock_threshold
      ? 'IN STOCK'
      : projectedQuantity > 0
      ? 'LOW STOCK'
      : 'OUT OF STOCK'
    : 'IN STOCK';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          Inbound Restocking Module
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Perform atomic warehouse restocking transactions and review historical audit logs
        </p>
      </div>

      {/* Main Restock Card with Prominent Search */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Selector & Action Panel */}
        <div className="lg:col-span-7 space-y-5">
          <div className="wms-card p-6">
            {/* Prominent Search Input */}
            <div className="relative mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Search Inventory Item to Restock
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Type product name, SKU, or category to select..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors shadow-inner"
                />
              </div>

              {/* Autocomplete Dropdown List */}
              {searchQuery.trim() && (
                <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-20 max-h-60 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">No matching products</div>
                  ) : (
                    filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="px-4 py-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800/60 last:border-0 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-mono text-xs shrink-0">
                            <Boxes className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{p.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {p.product_code} • {p.category_name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-slate-300">
                            {p.quantity} units
                          </span>
                          <StockBadge status={p.status} size="sm" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected Product Interactive Card */}
            {selectedProduct ? (
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <ProductImage
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    category={selectedProduct.category_name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover shrink-0 border border-slate-800"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-brand-400 font-bold">
                        {selectedProduct.product_code}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                        {selectedProduct.category_name}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white">{selectedProduct.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{selectedProduct.description}</p>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-xs text-slate-400">
                        Current Physical Stock:{' '}
                        <strong className="text-white font-mono text-sm">{selectedProduct.quantity}</strong> units
                      </span>
                      <StockBadge status={selectedProduct.status} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Restock Form Controls */}
                <form onSubmit={handleRestockSubmit} className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Restock Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={restockQty}
                        onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-base font-bold text-white font-mono focus:outline-none focus:border-brand-500 shadow-inner"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Inbound Shipment Notes
                      </label>
                      <input
                        type="text"
                        placeholder="Supplier freight PO #, batch code..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  {/* Restock Button */}
                  <button
                    type="submit"
                    disabled={submitting || restockQty <= 0}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 group"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <PackagePlus className="w-5 h-5" />
                        <span>RESTOCK INVENTORY (+{restockQty} Units)</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Select a product from the search bar above to begin restocking.
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Calculation & Status Transition Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="wms-card p-6 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Atomic Transaction Stock Simulator
                </h3>
              </div>

              {selectedProduct ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Current Warehouse Stock:</span>
                      <span className="font-bold text-white text-sm">{selectedProduct.quantity} units</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-emerald-400">
                      <span>Inbound Restock Quantity:</span>
                      <span className="font-bold text-sm">+{restockQty || 0} units</span>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                      <span className="text-slate-300 font-bold font-sans">New Projected Stock:</span>
                      <span className="text-xl font-black text-emerald-400">{projectedQuantity} units</span>
                    </div>
                  </div>

                  {/* Status Change Preview */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Automatic Stock Status Transition
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <StockBadge status={selectedProduct.status} size="sm" />
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                      <StockBadge status={projectedStatus} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-400 pt-2 leading-relaxed">
                      Threshold rule: When quantity exceeds {selectedProduct.low_stock_threshold} units, status automatically shifts from{' '}
                      <strong className="text-amber-400">LOW STOCK</strong> to{' '}
                      <strong className="text-emerald-400">IN STOCK</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Awaiting product selection...
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 mt-4 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>All restocks are committed atomically with rollback protection.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Restock History Table */}
      <div className="wms-card p-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Restocking Transaction History
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{history.length} Inbound Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                <th className="pb-3 pr-4">Tx ID</th>
                <th className="pb-3 pr-4">Product Name</th>
                <th className="pb-3 pr-4">SKU</th>
                <th className="pb-3 pr-4 text-emerald-400">Added Qty</th>
                <th className="pb-3 pr-4">Previous &rarr; New</th>
                <th className="pb-3 pr-4">Operator</th>
                <th className="pb-3 pr-4">Notes</th>
                <th className="pb-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    No restocking transactions recorded yet
                  </td>
                </tr>
              ) : (
                history.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors font-mono">
                    <td className="py-3 pr-4 text-slate-400">#{tx.id}</td>
                    <td className="py-3 pr-4 font-sans font-bold text-white">{tx.product_name}</td>
                    <td className="py-3 pr-4 text-brand-400">{tx.product_code}</td>
                    <td className="py-3 pr-4 text-emerald-400 font-bold">+{tx.quantity_added}</td>
                    <td className="py-3 pr-4 text-slate-300">
                      {tx.previous_quantity} &rarr; <strong className="text-white">{tx.new_quantity}</strong>
                    </td>
                    <td className="py-3 pr-4 text-slate-300 font-sans">{tx.username}</td>
                    <td className="py-3 pr-4 text-slate-400 font-sans max-w-xs truncate">
                      {tx.notes || 'Inbound shipment receipt'}
                    </td>
                    <td className="py-3 text-slate-500 text-[11px]">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
