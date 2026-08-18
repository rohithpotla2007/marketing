import React, { useState, useEffect } from 'react';
import { Menu, Bell, Database, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { inventoryMonitoringApi, ordersApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  const fetchAlerts = async () => {
    try {
      const [lowStock, orders] = await Promise.all([
        inventoryMonitoringApi.getLowStock(),
        ordersApi.getAll({ status: 'PENDING', limit: 50 }),
      ]);
      setLowStockCount(lowStock.length);
      setPendingOrdersCount(orders.total);
    } catch {
      // Ignore background poll errors
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const totalAlerts = lowStockCount + pendingOrdersCount;

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left section: Hamburger and Location */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 font-medium">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Central DB Synchronized
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
            Atomic Inventory Source of Truth
          </span>
        </div>
      </div>

      {/* Right section: System stats, alerts, and user */}
      <div className="flex items-center gap-3">
        <button
          onClick={fetchAlerts}
          title="Refresh Data"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center animate-bounce">
                {totalAlerts}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Warehouse Notifications
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {totalAlerts} Alert{totalAlerts === 1 ? '' : 's'}
                </span>
              </div>

              <div className="divide-y divide-slate-800 text-xs">
                {lowStockCount > 0 && (
                  <div
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/low-stock');
                    }}
                    className="p-3.5 hover:bg-slate-800/80 cursor-pointer transition-colors flex items-start gap-2.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0" />
                    <div>
                      <div className="font-semibold text-amber-200">
                        {lowStockCount} Products at Low Stock Threshold
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Click to review items and initiate restocking replenishment.
                      </div>
                    </div>
                  </div>
                )}

                {pendingOrdersCount > 0 && (
                  <div
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/orders');
                    }}
                    className="p-3.5 hover:bg-slate-800/80 cursor-pointer transition-colors flex items-start gap-2.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-sky-400 mt-1 shrink-0" />
                    <div>
                      <div className="font-semibold text-sky-200">
                        {pendingOrdersCount} Pending Order{pendingOrdersCount === 1 ? '' : 's'} Awaiting Acceptance
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Prioritized by stock availability score.
                      </div>
                    </div>
                  </div>
                )}

                {totalAlerts === 0 && (
                  <div className="p-6 text-center text-slate-400">
                    All inventory and orders in normal state
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-800">
          <div className="text-right">
            <div className="text-xs font-bold text-white">{user?.username}</div>
            <div className="text-[10px] font-semibold text-emerald-400">Online</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-brand-600/30 border border-brand-500/40 text-brand-300 font-bold flex items-center justify-center text-xs">
            {user?.username?.substring(0, 2).toUpperCase() || 'SF'}
          </div>
        </div>
      </div>
    </header>
  );
};
