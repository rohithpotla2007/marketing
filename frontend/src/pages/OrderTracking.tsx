import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  PackageCheck,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Boxes,
  Sparkles,
} from 'lucide-react';
import { trackingApi } from '../services/api';
import { OrderTracking as OrderTrackingType, VerificationItem } from '../types';
import { ProductImage } from '../components/common/ProductImage';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { useNotification } from '../context/NotificationContext';

export const OrderTracking: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, warning } = useNotification();

  const [orders, setOrders] = useState<OrderTrackingType[]>([]);
  const [loading, setLoading] = useState(true);

  // Local verification edits state: orderId -> productId -> { damaged: number, missing: number }
  const [inspectionInputs, setInspectionInputs] = useState<
    Record<number, Record<number, { damaged: number; missing: number; notes: string }>>
  >({});

  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [replacingKey, setReplacingKey] = useState<string | null>(null);
  const [shippingOrderId, setShippingOrderId] = useState<number | null>(null);

  const fetchTrackingOrders = async () => {
    setLoading(true);
    try {
      const data = await trackingApi.getAll();
      setOrders(data);

      // Initialize verification inputs from existing records
      const initialInputs: Record<number, Record<number, { damaged: number; missing: number; notes: string }>> = {};
      data.forEach((ord) => {
        initialInputs[ord.order_id] = {};
        ord.items.forEach((item) => {
          initialInputs[ord.order_id][item.product_id] = {
            damaged: item.damaged_quantity || 0,
            missing: item.missing_quantity || 0,
            notes: '',
          };
        });
      });
      setInspectionInputs((prev) => ({ ...initialInputs, ...prev }));
    } catch {
      error('Failed to load tracking orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingOrders();
  }, []);

  const handleInputChange = (
    orderId: number,
    productId: number,
    field: 'damaged' | 'missing',
    value: number
  ) => {
    const safeVal = Math.max(0, value || 0);
    setInspectionInputs((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [productId]: {
          ...prev[orderId]?.[productId],
          [field]: safeVal,
        },
      },
    }));
  };

  const handleSaveVerification = async (order: OrderTrackingType) => {
    const orderInputs = inspectionInputs[order.order_id] || {};

    // Validate all items in this order
    const payloadItems = [];
    for (const item of order.items) {
      const current = orderInputs[item.product_id] || { damaged: 0, missing: 0, notes: '' };
      const totalDiscrepancy = current.damaged + current.missing;

      if (totalDiscrepancy > item.expected_quantity) {
        error(
          `Validation Error on '${item.product_name}': Damaged (${current.damaged}) + Missing (${current.missing}) = ${totalDiscrepancy}, which exceeds expected quantity of ${item.expected_quantity}.`
        );
        return;
      }

      payloadItems.push({
        product_id: item.product_id,
        damaged_quantity: current.damaged,
        missing_quantity: current.missing,
        notes: current.notes || undefined,
      });
    }

    setSavingOrderId(order.order_id);
    try {
      await trackingApi.verify(order.order_id, { items: payloadItems });
      success(`Physical verification saved for Order #${order.order_number}!`, 'Inspection Verified');
      await fetchTrackingOrders();
    } catch (err: any) {
      error(err?.response?.data?.detail || 'Verification save failed');
    } finally {
      setSavingOrderId(null);
    }
  };

  const handleIssueReplacement = async (orderId: number, item: VerificationItem) => {
    const key = `${orderId}-${item.product_id}`;
    setReplacingKey(key);

    try {
      const res = await trackingApi.replace(orderId, {
        product_id: item.product_id,
        reason: `Replaced ${item.damaged_quantity} damaged and ${item.missing_quantity} missing units`,
      });

      success(res.message, 'Replacement Issued');
      await fetchTrackingOrders();
    } catch (err: any) {
      error(err?.response?.data?.detail || 'Replacement stock deduction failed');
    } finally {
      setReplacingKey(null);
    }
  };

  const handleShipOrder = async (order: OrderTrackingType) => {
    if (!order.can_ship) {
      error('Cannot ship order with unreplaced damaged or missing items. Issue replacement first.');
      return;
    }

    setShippingOrderId(order.order_id);
    try {
      const shipment = await trackingApi.ship(order.order_id, 'Final warehouse dispatched order');
      success(
        `Order ${order.order_number} successfully dispatched! Tracking Number: ${shipment.tracking_number}`,
        'Order Dispatched'
      );
      await fetchTrackingOrders();
    } catch (err: any) {
      error(err?.response?.data?.detail || 'Shipment dispatch failed');
    } finally {
      setShippingOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Order Placement & Tracking Verification
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Conduct dock inspections, enter damaged / missing product counts, execute replacements, and ship orders
          </p>
        </div>

        <button
          onClick={fetchTrackingOrders}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors self-start sm:self-auto"
          title="Refresh Tracking Queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Accepted Orders List */}
      {loading ? (
        <TableSkeleton rows={3} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No Accepted Orders Awaiting Verification"
          description="Orders must be accepted from the Orders module before undergoing physical inspection."
          actionText="View Orders Queue"
          onAction={() => navigate('/orders')}
        />
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const orderInputs = inspectionInputs[order.order_id] || {};
            const isSaving = savingOrderId === order.order_id;
            const isShipping = shippingOrderId === order.order_id;

            return (
              <div
                key={order.order_id}
                className="wms-card p-6 border-slate-800 space-y-6 shadow-xl"
              >
                {/* Order Header Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-lg font-black text-white font-mono">
                      {order.order_number}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs font-bold">
                      {order.status}
                    </span>
                    {order.has_pending_replacement && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                        <AlertOctagon className="w-3.5 h-3.5" /> Requires Replacement
                      </span>
                    )}
                    {order.can_ship && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Shipment
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400">
                    Total Order Units: <strong className="text-white font-mono">{order.total_expected}</strong>
                  </div>
                </div>

                {/* Items Verification Table */}
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Physical Product Inspection & Discrepancy Breakdown
                  </div>

                  <div className="space-y-3">
                    {order.items.map((item) => {
                      const input = orderInputs[item.product_id] || {
                        damaged: item.damaged_quantity || 0,
                        missing: item.missing_quantity || 0,
                        notes: '',
                      };
                      const goodCalculated = Math.max(
                        0,
                        item.expected_quantity - (input.damaged + input.missing)
                      );
                      const isInvalid = input.damaged + input.missing > item.expected_quantity;
                      const isReplacing = replacingKey === `${order.order_id}-${item.product_id}`;

                      return (
                        <div
                          key={item.product_id}
                          className={`p-4 rounded-xl bg-slate-950 border transition-all ${
                            isInvalid
                              ? 'border-rose-500/60 bg-rose-950/10'
                              : item.needs_replacement
                              ? 'border-amber-500/40 bg-amber-950/10'
                              : 'border-slate-800'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Product Info */}
                            <div className="flex items-center gap-3 min-w-[240px]">
                              <ProductImage
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-14 h-14 rounded-lg object-cover bg-slate-900 border border-slate-800 shrink-0"
                              />
                              <div>
                                <h4 className="text-xs font-bold text-white">{item.product_name}</h4>
                                <div className="text-[11px] font-mono text-brand-400">
                                  {item.product_code}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  Expected: <strong className="text-white font-mono">{item.expected_quantity}</strong> units
                                </div>
                              </div>
                            </div>

                            {/* Inputs Group: Good, Damaged, Missing */}
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              {/* Good (Calculated) */}
                              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center min-w-[80px]">
                                <div className="text-[10px] text-slate-400 uppercase font-semibold">Good</div>
                                <div className="text-sm font-bold text-emerald-400 font-mono">
                                  {goodCalculated}
                                </div>
                              </div>

                              {/* Damaged Input */}
                              <div className="space-y-1">
                                <label className="block text-[10px] uppercase font-bold text-rose-400">
                                  Damaged
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={item.expected_quantity}
                                  value={input.damaged}
                                  onChange={(e) =>
                                    handleInputChange(
                                      order.order_id,
                                      item.product_id,
                                      'damaged',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 px-2.5 py-1.5 bg-slate-900 border border-rose-500/40 rounded-lg text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-rose-400"
                                />
                              </div>

                              {/* Missing Input */}
                              <div className="space-y-1">
                                <label className="block text-[10px] uppercase font-bold text-amber-400">
                                  Missing
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={item.expected_quantity}
                                  value={input.missing}
                                  onChange={(e) =>
                                    handleInputChange(
                                      order.order_id,
                                      item.product_id,
                                      'missing',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 px-2.5 py-1.5 bg-slate-900 border border-amber-500/40 rounded-lg text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-amber-400"
                                />
                              </div>

                              {/* Warehouse replacement availability */}
                              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                                Warehouse Stock: <strong className="text-white font-mono">{item.available_stock_in_warehouse}</strong> units
                              </div>
                            </div>

                            {/* Replacement Action Button */}
                            <div className="flex items-center gap-2">
                              {item.needs_replacement && (
                                <button
                                  type="button"
                                  onClick={() => handleIssueReplacement(order.order_id, item)}
                                  disabled={isReplacing}
                                  className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-lg text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0"
                                >
                                  {isReplacing ? (
                                    <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Sparkles className="w-3.5 h-3.5" />
                                      <span>REPLACE ({item.replacement_quantity_needed} Units)</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {item.is_replaced && (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Replaced & Fulfilled
                                </span>
                              )}
                            </div>
                          </div>

                          {isInvalid && (
                            <div className="mt-2 text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                              <AlertOctagon className="w-4 h-4 shrink-0" />
                              <span>
                                Validation Error: Damaged + Missing cannot exceed expected quantity ({item.expected_quantity}).
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Actions: Save Verification & Ship Order */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleSaveVerification(order)}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold border border-slate-700 shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <PackageCheck className="w-4 h-4 text-brand-400" />
                        <span>Save Physical Inspection Data</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShipOrder(order)}
                    disabled={!order.can_ship || isShipping}
                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2 ${
                      order.can_ship
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/30'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {isShipping ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Truck className="w-4 h-4" />
                        <span>ORDER SHIPPED</span>
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
