import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { OrderStatusDistribution } from '../../types';

interface OrderStatusDonutProps {
  data: OrderStatusDistribution[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#0ea5e9',
  ACCEPTED: '#8b5cf6',
  SHIPPED: '#10b981',
  CANCELLED: '#ef4444',
};

export const OrderStatusDonut: React.FC<OrderStatusDonutProps> = ({ data }) => {
  const chartData = data.filter((d) => d.count > 0);

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData.length > 0 ? chartData : [{ status: 'No Orders', count: 1 }]}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
          >
            {chartData.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#64748b'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '12px',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
