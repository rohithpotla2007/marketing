import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Layers,
  Package,
  Boxes,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { productsApi, categoriesApi, ordersApi } from '../services/api';
import { Product, Category } from '../types';
import { StockBadge } from '../components/common/StockBadge';
import { ProductImage } from '../components/common/ProductImage';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useNotification } from '../context/NotificationContext';

export const OrderPlacement: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, warning } = useNotification();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderQuantities, setOrderQuantities] = useState<Record<number, number>>({});
  const [orderNotes, setOrderNotes] = useState<Record<number, string>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [prodsRes, catsRes] = await Promise.all([
        productsApi.getAll({
          category_id: selectedCategory || undefined,
          search: searchQuery || undefined,
        }),
        categoriesApi.getAll(),
      ]);
      setProducts(prodsRes.items);
      setCategories(catsRes);

      // Default quantities to 1
      const initialQty: Record<number, number> = {};
      prodsRes.items.forEach((p) => {
        initialQty[p.id] = initialQty[p.id] || (p.available_quantity > 0 ? 1 : 0);
      });
      setOrderQuantities((prev) => ({ ...initialQty, ...prev }));
    } catch {
      error('Failed to load products for order placement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleQuantityChange = (productId: number, delta: number, maxAvailable: number) => {
    const current = orderQuantities[productId] || 1;
    const next = Math.max(1, Math.min(maxAvailable, current + delta));
    setOrderQuantities((prev) => ({ ...prev, [productId]: next }));
  };

  const handlePlaceOrder = async (product: Product) => {
    const qty = orderQuantities[product.id] || 1;
    if (qty <= 0) {
      error('Please select an order quantity greater than 0');
      return;
    }
    if (qty > product.available_quantity) {
      error(`Requested quantity (${qty}) exceeds available stock (${product.available_quantity})`);
      return;
    }

    setSubmittingId(product.id);
    try {
      const createdOrder = await ordersApi.create({
        items: [{ product_id: product.id, quantity: qty }],
        notes: orderNotes[product.id] || `Internal customer dispatch request for ${product.name}`,
      });

      success(
        `Order ${createdOrder.order_number} placed for ${qty} units of ${product.name}! Status: PENDING (Reserved: +${qty} units)`,
        'Order Placed Successfully'
      );

      // Refresh product quantities from database
      await fetchProducts();
    } catch (err: any) {
      error(err?.response?.data?.detail || 'Order placement failed');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Warehouse Order Placement
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Initiate internal customer order requests and reserve inventory allocations
          </p>
        </div>

        <button
          onClick={() => navigate('/orders')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>View Orders Queue</span>
          <ArrowRight className="w-4 h-4 text-brand-400" />
        </button>
      </div>

      {/* Category Pills */}
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 border border-brand-500'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search items to place order by SKU, name, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </form>

      {/* Product Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No Available Products"
          description="No inventory items found matching your criteria."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((product) => {
            const requestedQty = orderQuantities[product.id] || (product.available_quantity > 0 ? 1 : 0);
            const isOutOfStock = product.available_quantity <= 0;
            const isSubmitting = submittingId === product.id;

            return (
              <div
                key={product.id}
                className="wms-card wms-card-hover p-4 flex flex-col justify-between group"
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
                    <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                  </div>

                  {/* Stock Availability Details */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Available to Order:</span>
                    <span
                      className={`font-mono font-extrabold text-sm ${
                        product.available_quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {product.available_quantity} units
                    </span>
                  </div>
                </div>

                {/* Bottom: Quantity Stepper & Place Order Button */}
                <div className="mt-4 pt-3.5 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Order Quantity:</span>
                    <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(product.id, -1, product.available_quantity)}
                        disabled={isOutOfStock || requestedQty <= 1}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-sm text-white">
                        {requestedQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(product.id, 1, product.available_quantity)}
                        disabled={isOutOfStock || requestedQty >= product.available_quantity}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlaceOrder(product)}
                    disabled={isOutOfStock || isSubmitting}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 ${
                      isOutOfStock
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                        : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/30'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>{isOutOfStock ? 'OUT OF STOCK' : 'PLACE ORDER'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
