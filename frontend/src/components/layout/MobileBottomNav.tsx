import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  PackagePlus,
  ShoppingCart,
  Truck,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMenu }) => {
  const quickLinks = [
    { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
    { to: '/inventory', label: 'Inventory', icon: Boxes, end: false },
    { to: '/restocking', label: 'Restock', icon: PackagePlus, end: false },
    { to: '/order-placement', label: 'Order', icon: ShoppingCart, end: false },
    { to: '/tracking', label: 'Tracking', icon: Truck, end: false },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-6 h-16 items-center px-1">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 relative ${
                  isActive
                    ? 'text-brand-400 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                  <span className="text-[10px] tracking-tight truncate max-w-full">{link.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 w-5 h-1 bg-brand-500 rounded-full shadow-[0_0_8px_rgba(2,132,199,0.8)]" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {/* More Menu Trigger */}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1.5 px-1 text-slate-400 hover:text-slate-200 rounded-xl transition-colors"
          aria-label="Open Full Navigation Menu"
        >
          <Menu className="w-5 h-5 mb-0.5 stroke-[1.75]" />
          <span className="text-[10px] font-medium tracking-tight">More</span>
        </button>
      </div>
    </div>
  );
};
