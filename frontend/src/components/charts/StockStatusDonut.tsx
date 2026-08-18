import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { StockStatusDistribution } from '../../types';

interface StockStatusDonutProps {
  data: StockStatusDistribution[];
}

const COLORS: Record<string, string> = {
  'IN STOCK': '#10b981',
  'LOW STOCK': '#f59e0b',
  'OUT OF STOCK': '#ef4444',
};

export const StockStatusDonut: React.FC<StockStatusDonutProps> = ({ data }) => {
  const chartData = data.filter((d) => d.count > 0);

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData.length > 0 ? chartData : [{ status: 'No Data', count: 1 }]}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
          >
            {chartData.map((entry) => (
              <Cell key={entry.status} fill={COLORS[entry.status] || '#64748b'} />
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
