// src/components/MonthlyComboChart.tsx
import React from 'react'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

type Row = { monthLabel: string; revenue: number; orders: number }

const MonthlyComboChart: React.FC<{ data: Row[] }> = ({ data }) => {
  if (!data || data.length === 0) return <div className="p-6 text-muted-foreground">No monthly data</div>
  // ensure labels
  const chartData = data.map(d => ({ ...d }))
  return (
    <div style={{ width: '100%', height: 360 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" minTickGap={12} />
          <YAxis yAxisId="left" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip formatter={(value:any) => typeof value === 'number' ? value.toLocaleString() : value} />
          <Bar yAxisId="left" dataKey="revenue" barSize={24} />
          <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#ff7300" dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
export default MonthlyComboChart
