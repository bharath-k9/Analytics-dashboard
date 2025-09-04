// src/components/YearlyStackedChart.tsx
import React from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

type Row = { year: string; q1:number; q2:number; q3:number; q4:number; total?: number }

const YearlyStackedChart: React.FC<{ data: Row[] }> = ({ data }) => {
  if (!data || data.length === 0) return <div className="p-6 text-muted-foreground">No yearly data</div>
  return (
    <div style={{ width: '100%', height: 420 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
          <Tooltip formatter={(value:any) => typeof value === 'number' ? value.toLocaleString() : value} />
          <Area type="monotone" dataKey="q1" stackId="1" stroke="#1f77b4" fill="#1f77b4" />
          <Area type="monotone" dataKey="q2" stackId="1" stroke="#2ca02c" fill="#2ca02c" />
          <Area type="monotone" dataKey="q3" stackId="1" stroke="#ff7f0e" fill="#ff7f0e" />
          <Area type="monotone" dataKey="q4" stackId="1" stroke="#9467bd" fill="#9467bd" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
export default YearlyStackedChart
