import React, { useState, useEffect } from 'react';
import {
  Search,
  PlusCircle,
  Filter,
  Package,
  Layers,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Smartphone,
  ShoppingBag,
  Armchair,
  Gamepad2,
  Shirt,
  Tv,
  Trophy,
} from 'lucide-react';
import { productsApi, categoriesApi } from '../services/api';
import { Product, Category } from '../types';
import { StockBadge } from '../components/common/StockBadge';
import { ProductImage } from '../components/common/ProductImage';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { useNotification } from '../context/NotificationContext';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Electronics: <Cpu className="w-3.5 h-3.5" />,
  Mobiles: <Smartphone className="w-3.5 h-3.5" />,
  Groceries: <ShoppingBag className="w-3.5 h-3.5" />,
  Furniture: <Armchair className="w-3.5 h-3.5" />,
  Toys: <Gamepad2 className="w-3.5 h-3.5" />,
  Fashion: <Shirt className="w-3.5 h-3.5" />,
  'Home Appliances': <Tv className="w-3.5 h-3.5" />,
  Sports: <Trophy className="w-3.5 h-3.5" />,
};

export const Inventory: React.FC = () => {
  const { success, error } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Add Product Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    product_code: '',
    name: '',
    description: '',
    category_id: '',
    quantity: 15,
    low_stock_threshold: 10,
  });
  const [saving, setSaving] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const [prodsRes, catsRes] = await Promise.all([
        productsApi.getAll({
          category_id: selectedCategory || undefined,
          search: searchQuery || undefined,
          status: statusFilter || undefined,
        }),
        categoriesApi.getAll(),
      ]);
      setProducts(prodsRes.items);
      setCategories(catsRes);
      if (catsRes.length > 0 && !addForm.category_id) {
        setAddForm((prev) => ({ ...prev, category_id: String(catsRes[0].id) }));
      }
    } catch {
      error('Failed to load warehouse inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedCategory, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventory();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.product_code.trim() || !addForm.category_id) {
      error('Please complete all required product fields');
      return;
    }

    setSaving(true);
    try {
      await productsApi.create({
        product_code: addForm.product_code.trim().toUpperCase(),
        name: addForm.name.trim(),
        description: addForm.description.trim(),
        category_id: parseInt(addForm.category_id),
        quantity: Number(addForm.quantity) || 0,
        low_stock_threshold: Number(addForm.low_stock_threshold) || 10,
      });
      success(`Added '${addForm.name}' to warehouse inventory`);
      setIsAddModalOpen(false);
      setAddForm({
        product_code: '',
        name: '',
        description: '',
        category_id: categories.length > 0 ? String(categories[0].id) : '',
        quantity: 15,
        low_stock_threshold: 10,
      });
      fetchInventory();
    } catch (err: any) {
      error(err?.response?.data?.detail || 'Error saving product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Heading & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Central Inventory Repository
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time stock on hand, reservations, and configurable threshold levels
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchInventory}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Inventory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> + Add Product
          </button>
        </div>
      </div>

      {/* Category Filter Pills (All 8 categories) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 flex items-center gap-1.5 ${
            selectedCategory === null
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 border border-brand-500'
              : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> All Categories
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 border border-brand-500'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {CATEGORY_ICONS[cat.name] || <Package className="w-3.5 h-3.5" />}
              <span>{cat.name}</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                {cat.product_count ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Stock Status Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by product name, SKU / ID, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Stock Statuses</option>
              <option value="IN STOCK">In Stock (&gt;10)</option>
              <option value="LOW STOCK">Low Stock (1-10)</option>
              <option value="OUT OF STOCK">Out of Stock (0)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchInventory}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No Warehouse Products Found"
          description="No products matched your category or search filter criteria."
          actionText="Clear Filters"
          onAction={() => {
            setSelectedCategory(null);
            setSearchQuery('');
            setStatusFilter('');
            fetchInventory();
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((product) => (
            <div
              key={product.id}
              className="wms-card wms-card-hover p-4 flex flex-col justify-between group"
            >
              {/* Top: Image & Status */}
              <div>
                <div className="relative mb-3.5">
                  <ProductImage
                    src={product.image_url}
                    alt={product.name}
                    category={product.category_name}
                    className="w-full h-44 rounded-xl object-cover bg-slate-950 border border-slate-800/80"
                  />
                  <div className="absolute top-2.5 right-2.5">
                    <StockBadge status={product.status} size="sm" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{product.product_code}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-sans font-semibold">
                      {product.category_name}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {product.description || 'Warehouse inventory stock unit'}
                  </p>
                </div>
              </div>

              {/* Bottom: Stock Metrics */}
              <div className="mt-4 pt-3.5 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Available Units:</span>
                  <span className="text-base font-extrabold text-white font-mono">
                    {product.available_quantity} <span className="text-xs font-normal text-slate-400">units</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <span>Physical: <strong className="text-slate-300">{product.quantity}</strong></span>
                  <span>Reserved: <strong className="text-amber-400">{product.reserved_quantity}</strong></span>
                  <span>Threshold: <strong className="text-slate-300">{product.low_stock_threshold}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Inventory Item"
        subtitle="Specify product SKU, category and warehouse threshold"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Product Code (SKU) *</label>
              <input
                type="text"
                placeholder="SKU-ELEC-010"
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
              placeholder="e.g. Wireless Ergonomic Barcode Scanner"
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
              placeholder="Detailed specifications..."
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
              disabled={saving}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-brand-600/30"
            >
              {saving ? 'Creating...' : 'Save to Inventory'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
