// Complete WebAnalyticsDashboard.tsx with Dynamic Year Selector
import React, { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAnalytics } from '@/hooks/useAnalytics'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Calendar,
  MapPin,
  Award,
  BarChart3
} from 'lucide-react'

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  BarChart
} from 'recharts'

import BrazilChoropleth from './BrazilChoropleth'

// Types
type YearlyData = {
  year: string
  q1: number
  q2: number
  q3: number
  q4: number
  total: number
}

type MonthlyTrendData = {
  monthLabel: string
  monthISO?: string
  revenue: number
  orders: number
}

// Utility functions
const formatCompact = (v: number) => {
  if (!isFinite(v)) return '0'
  const abs = Math.abs(v)
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(3)}M`
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}k`
  return v.toString()
}

// function heatColor(value: number, min: number, max: number) {
//   if (max === min) return '#ff7043'
//   const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)))
//   const hue = 120 - ratio * 120
//   return `hsl(${hue}, 85%, ${50 - ratio * 20}%)`
// }

// Enhanced Product Display Component
const EnhancedProductList: React.FC<{ products: any[] }> = ({ products }) => {
  return (
    <div className="space-y-2">
      {products.slice(0, 15).map((p, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
          <div className="flex-1">
            <p className="font-medium text-sm">{p.product_display_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                {p.product_category_name}
              </span>
              {p.seller_count && (
                <span className="text-xs text-muted-foreground">
                  {p.seller_count} sellers
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">${p.revenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {p.units_sold.toLocaleString()} units
            </p>
            <p className="text-xs text-muted-foreground">
              Avg: ${p.avg_price.toFixed(2)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Add this new component for seller analytics
const SellerAnalytics: React.FC<{ sellers: any[] }> = ({ sellers }) => {
  if (!sellers || sellers.length === 0) {
    return <div className="p-6 text-muted-foreground">No seller data available</div>
  }

  const topSellers = sellers.slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Sellers by Revenue</h3>
          <div className="space-y-3">
            {topSellers.map((seller, index) => (
              <div key={seller.seller_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {seller.seller_city}, {seller.seller_state}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {seller.unique_products} unique products
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    ${seller.total_revenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {seller.total_orders} orders
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Seller Distribution by State</h3>
          <div className="space-y-2">
            {(Object.entries(
              sellers.reduce((acc, seller) => {
                const state = seller.seller_state
                if (!acc[state]) acc[state] = { count: 0, revenue: 0 }
                acc[state].count += 1
                acc[state].revenue += seller.total_revenue
                return acc
              }, {} as Record<string, { count: number; revenue: number }>)
            ) as Array<[string, { count: number; revenue: number }]>)
              .sort(([, a], [, b]) => b.revenue - a.revenue)
              .slice(0, 10)
              .map(([state, data]) => (
                <div key={state} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{state}</span>
                  <div className="text-right">
                    <div className="font-semibold text-sm">
                      ${formatCompact(data.revenue)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {data.count} sellers
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* Monthly combo chart */
const MonthlyComboChart: React.FC<{ data: MonthlyTrendData[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="p-6 text-muted-foreground">No monthly data available</div>
  }

  const chartData = data.map(d => ({
    ...d,
    label: d.monthLabel || (d.monthISO ? new Date(d.monthISO).toLocaleString('default', { month: 'short', year: 'numeric' }) : '')
  }))

  const maxRevenue = Math.max(...chartData.map(c => Number(c.revenue || 0)), 1)
  const maxOrders = Math.max(...chartData.map(c => Number(c.orders || 0)), 1)

  return (
    <div style={{ width: '100%', height: 380 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" interval={0} tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
            domain={[0, Math.ceil(maxRevenue * 1.15)]}
          />
          <YAxis yAxisId="right" orientation="right" domain={[0, Math.ceil(maxOrders * 1.15)]} />
          <Tooltip formatter={(value: any, name: any) => {
            if (typeof value === 'number') return [value.toLocaleString(), name]
            return [value, name]
          }} />
          <Bar yAxisId="left" dataKey="revenue" fill="#1f77b4" barSize={18} />
          <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#ff7300" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/* Yearly stacked area chart */
const YearlyStackedChart: React.FC<{ data: YearlyData[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="p-6 text-muted-foreground">No yearly data available</div>
  }

  const chartData = data.map(d => ({
    year: d.year,
    q1: Number(d.q1 || 0),
    q2: Number(d.q2 || 0),
    q3: Number(d.q3 || 0),
    q4: Number(d.q4 || 0),
    total: Number(d.total || 0)
  }))

  const maxTotal = Math.max(...chartData.map(d => d.total), 1)

  return (
    <div style={{ width: '100%', height: 420 }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis tickFormatter={(v) => `$${Math.round(Number(v) / 1000000)}M`} domain={[0, Math.ceil(maxTotal * 1.1)]} />
          <Tooltip formatter={(val: any) => (typeof val === 'number' ? val.toLocaleString() : val)} />
          <Area type="monotone" dataKey="q1" stackId="1" stroke="#1f77b4" fill="#1f77b4" fillOpacity={0.85} />
          <Area type="monotone" dataKey="q2" stackId="1" stroke="#2ca02c" fill="#2ca02c" fillOpacity={0.75} />
          <Area type="monotone" dataKey="q3" stackId="1" stroke="#ff7f0e" fill="#ff7f0e" fillOpacity={0.7} />
          <Area type="monotone" dataKey="q4" stackId="1" stroke="#9467bd" fill="#9467bd" fillOpacity={0.7} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* State Revenue Chart */
const StateRevenueChart: React.FC<{ data: any[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="p-6 text-muted-foreground">No state revenue data available</div>
  }

  const chartData = data
    .slice(0, 10)
    .map(d => ({
      state: d.state,
      revenue: d.totalRevenue,
      customers: d.totalCustomers
    }))

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="state" />
          <YAxis tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
          <Tooltip 
            formatter={(value: any, name: any) => {
              if (name === 'revenue') return [`$${Number(value).toLocaleString()}`, 'Revenue']
              return [Number(value).toLocaleString(), 'Customers']
            }}
          />
          <Bar dataKey="revenue" fill="#1f77b4" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* State Product Analysis Component */
const StateProductAnalysis: React.FC<{ stateAnalysis: any[] }> = ({ stateAnalysis }) => {
  const [selectedState, setSelectedState] = useState<string>('')
  
  const selectedStateData = useMemo(() => {
    return stateAnalysis.find(s => s.state === selectedState) || null
  }, [stateAnalysis, selectedState])

  const topStates = stateAnalysis.slice(0, 15)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Top States by Revenue</h3>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a state for details" />
              </SelectTrigger>
              <SelectContent>
                {topStates.map((state) => (
                  <SelectItem key={state.state} value={state.state}>
                    {state.state} - ${formatCompact(state.totalRevenue)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {topStates.map((state, index) => (
              <div
                key={state.state}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  selectedState === state.state 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setSelectedState(state.state)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-sm">{state.state}</span>
                  {index < 3 && <Award className="h-3 w-3 text-yellow-500" />}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Revenue</div>
                  <div className="font-bold text-lg">${formatCompact(state.totalRevenue)}</div>
                  <div className="text-xs text-muted-foreground">
                    {state.totalCustomers.toLocaleString()} customers
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">State Revenue Chart</h3>
          <StateRevenueChart data={stateAnalysis} />
        </Card>
      </div>

      {selectedStateData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{selectedStateData.state}</h3>
                <p className="text-muted-foreground">State Performance Overview</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-700">
                  ${formatCompact(selectedStateData.totalRevenue)}
                </div>
                <div className="text-sm text-blue-600">Total Revenue</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-700">
                  {selectedStateData.totalCustomers.toLocaleString()}
                </div>
                <div className="text-sm text-green-600">Customers</div>
              </div>
            </div>

            {selectedStateData.topProduct && (
              <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-orange-600" />
                  <span className="font-semibold text-orange-800">Top Product</span>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">{selectedStateData.topProduct.name || selectedStateData.topProduct.id}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedStateData.topProduct.category || 'Uncategorized'}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-lg">
                      ${selectedStateData.topProduct.revenue.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedStateData.topProduct.units} units sold
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Product Performance</h3>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {selectedStateData.allProducts.slice(0, 15).map(
                (product: { id: string; name?: string; category?: string; revenue: number; units: number }, index: number) => (
                  <div key={`${product.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {product.name || product.id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {product.category || 'Uncategorized'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">
                        ${product.revenue.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {product.units} units
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

const WebAnalyticsDashboard: React.FC = () => {
  const {
    overall,
    monthlyTrends,
    categoryPerformance,
    paymentMethods,
    topProducts,
    customersByState,
    stateAnalysis,
    sellerPerformance,
    loading,
    error
  } = useAnalytics()

  // Dynamic year selector based on real data
  const [selectedYear, setSelectedYear] = useState<string>('all')
  
  // Extract available years from monthlyTrends data
  const availableYears = useMemo(() => {
    if (!monthlyTrends || monthlyTrends.length === 0) return []
    
    const years = monthlyTrends.map(trend => {
      if (trend.monthISO) {
        return new Date(trend.monthISO).getFullYear()
      }
      return null
    }).filter(year => year !== null)
    
    const uniqueYears = [...new Set(years)].sort((a, b) => b - a) // Most recent first
    return uniqueYears
  }, [monthlyTrends])

  // Filter data based on selected year
  const filteredData = useMemo(() => {
    if (selectedYear === 'all') {
      return {
        monthlyTrends,
        categoryPerformance,
        paymentMethods,
        customersByState,
        topProducts,
        stateAnalysis,
        sellerPerformance,
        overall
      }
    }

    const targetYear = parseInt(selectedYear)
    
    // Filter monthly trends by year
    const filteredMonthlyTrends = monthlyTrends.filter(trend => {
      if (trend.monthISO) {
        return new Date(trend.monthISO).getFullYear() === targetYear
      }
      return false
    })

    // Recalculate overall metrics for filtered data
    const totalRevenue = filteredMonthlyTrends.reduce((sum, record) => sum + record.revenue, 0)
    const totalOrders = filteredMonthlyTrends.reduce((sum, record) => sum + record.orders, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    const filteredOverall = {
      totalRevenue,
      totalOrders,
      totalCustomers: overall?.totalCustomers || 0, // Keep original as it's not time-based
      avgOrderValue
    }

    return {
      monthlyTrends: filteredMonthlyTrends,
      categoryPerformance, // Keep original - not time filtered in this version
      paymentMethods, // Keep original
      customersByState, // Keep original  
      topProducts, // Keep original
      stateAnalysis, // Keep original
      sellerPerformance, // Keep original
      overall: filteredOverall
    }
  }, [selectedYear, monthlyTrends, categoryPerformance, paymentMethods, customersByState, topProducts, stateAnalysis, sellerPerformance, overall])

  const monthlyChartData = useMemo<MonthlyTrendData[]>(() => {
    if (!filteredData.monthlyTrends || filteredData.monthlyTrends.length === 0) return []

    const arr = filteredData.monthlyTrends.map((m: any) => {
      let label = ''
      let iso = undefined

      if (m.monthLabel) {
        label = m.monthLabel
        iso = m.monthISO ?? m.month
      } else if (m.monthISO) {
        iso = m.monthISO
        const d = new Date(m.monthISO)
        label = isNaN(d.getTime()) ? String(m.monthISO).slice(0, 7) : d.toLocaleString('default', { month: 'short', year: 'numeric' })
      } else if (m.month) {
        iso = m.month
        const d = new Date(m.month)
        label = isNaN(d.getTime()) ? String(m.month).slice(0, 7) : d.toLocaleString('default', { month: 'short', year: 'numeric' })
      }

      return {
        monthLabel: label,
        monthISO: iso,
        revenue: Number(m.revenue ?? m.total ?? 0) || 0,
        orders: Number(m.orders ?? m.order_count ?? 0) || 0
      } as MonthlyTrendData
    })

    const seen = new Set<string>()
    return arr.map((r) => {
      let label = r.monthLabel
      if (!label) {
        const d = r.monthISO ? new Date(r.monthISO) : null
        label = d && !isNaN(d.getTime()) ? d.toLocaleString('default', { month: 'short', year: 'numeric' }) : label
      }
      if (seen.has(label)) {
        const year = r.monthISO ? new Date(r.monthISO).getFullYear() : ''
        label = `${label} ${year}`
      }
      seen.add(label)
      return { ...r, monthLabel: label }
    })
  }, [filteredData.monthlyTrends])

  const yearlyData = useMemo<YearlyData[]>(() => {
    if (!monthlyChartData || monthlyChartData.length === 0) return []
    const map: Record<string, { q1:number; q2:number; q3:number; q4:number; total:number }> = {}
    monthlyChartData.forEach(m => {
      let d: Date | null = null
      if (m.monthISO) {
        const parsed = new Date(String(m.monthISO))
        if (!isNaN(parsed.getTime())) d = parsed
      }
      if (!d && m.monthLabel) {
        const parsed = new Date(m.monthLabel)
        if (!isNaN(parsed.getTime())) d = parsed
      }
      if (!d) {
        const parsed = new Date(m.monthLabel?.slice(0, 11) || '')
        if (!isNaN(parsed.getTime())) d = parsed
      }
      if (!d) return
      const year = String(d.getFullYear())
      const month = d.getMonth() + 1
      const q = Math.ceil(month / 3)
      if (!map[year]) map[year] = { q1:0, q2:0, q3:0, q4:0, total:0 }
      map[year][`q${q}` as 'q1'|'q2'|'q3'|'q4'] += Number(m.revenue || 0)
      map[year].total += Number(m.revenue || 0)
    })
    const res = Object.entries(map).map(([y, st]) => ({ year: y, ...st }))
    res.sort((a, b) => Number(a.year) - Number(b.year))
    return res
  }, [monthlyChartData])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Data</div>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  const totalRevenue = filteredData.overall?.totalRevenue ?? 0
  const totalOrders = filteredData.overall?.totalOrders ?? 0
  const totalCustomers = filteredData.overall?.totalCustomers ?? 0
  const avgOrderValue = filteredData.overall?.avgOrderValue ?? 0

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header with Dynamic Year Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            E-commerce business insights and metrics
            {selectedYear !== 'all' && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                {selectedYear} Data
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Dynamic Year Selector */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" aria-label="calendar">
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Data Summary Info */}
      {selectedYear !== 'all' && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-800">
                Showing {selectedYear} Data
              </span>
            </div>
            <div className="text-sm text-blue-600">
              {monthlyChartData.length} months of data available
            </div>
          </div>
        </Card>
      )}

      {/* KPI Cards - Updated with filtered data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 hover:shadow-2xl transform hover:-translate-y-1 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total Revenue {selectedYear !== 'all' && `(${selectedYear})`}
              </p>
              <p className="text-3xl font-bold text-foreground">
                ${formatCompact(Number(totalRevenue || 0))}
              </p>
              <div className="flex items-center mt-2 text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" /> 
                {selectedYear !== 'all' ? 'Year Filter' : 'Live'}
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full shadow-inner">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-2xl transform hover:-translate-y-1 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total Orders {selectedYear !== 'all' && `(${selectedYear})`}
              </p>
              <p className="text-3xl font-bold text-foreground">
                {formatCompact(Number(totalOrders || 0))}
              </p>
              <div className="flex items-center mt-2 text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" /> 
                {selectedYear !== 'all' ? 'Year Filter' : 'Live'}
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-full">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-2xl transform hover:-translate-y-1 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-3xl font-bold text-foreground">
                {formatCompact(Number(totalCustomers || 0))}
              </p>
              <div className="flex items-center mt-2 text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" /> All Time
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-2xl transform hover:-translate-y-1 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Avg Order Value {selectedYear !== 'all' && `(${selectedYear})`}
              </p>
              <p className="text-3xl font-bold text-foreground">
                ${Number(avgOrderValue || 0).toFixed(2)}
              </p>
              <div className="flex items-center mt-2 text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" /> 
                {selectedYear !== 'all' ? 'Year Filter' : 'Live'}
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-full">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Charts - Updated with filtered data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Revenue Trends</h3>
            <div className="text-sm text-muted-foreground">
              {selectedYear !== 'all' ? `${selectedYear} Performance` : 'Monthly Performance'}
            </div>
          </div>
          <MonthlyComboChart data={monthlyChartData} />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Sales by Category</h3>
            <div className="text-sm text-muted-foreground">Top Categories</div>
          </div>
          <div className="space-y-3">
            {(filteredData.categoryPerformance || []).slice(0, 6).map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.product_category_name ?? c.category ?? 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{(c.items_sold ?? c.orders_count ?? 0).toLocaleString()} items</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${Number(c.total_revenue ?? c.revenue ?? 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Full width area (tabs) */}
      <Tabs defaultValue="yearly" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="yearly">Yearly Overview</TabsTrigger>
          <TabsTrigger value="monthly">Customer Heatmap</TabsTrigger>
          <TabsTrigger value="products">Product Analytics</TabsTrigger>
          <TabsTrigger value="state">State Analysis</TabsTrigger>
          <TabsTrigger value="sellers">Seller Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="yearly" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Year-wise Sales (Stacked View)</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded" /> <span className="text-xs">Q1</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded" /> <span className="text-xs">Q2</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded" /> <span className="text-xs">Q3</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-500 rounded" /> <span className="text-xs">Q4</span></div>
              </div>
            </div>
            <YearlyStackedChart data={yearlyData} />
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <Card className="p-6">
            <BrazilChoropleth data={(filteredData.customersByState || []).map((r: any) => ({ state: r.state, customers: Number(r.customers ?? r.count ?? 0) }))} showAllLabels={false} labelThreshold={1000}/>
          </Card>
        </TabsContent>

        <TabsContent value="sellers" className="space-y-6">
          <SellerAnalytics sellers={filteredData.sellerPerformance || []} />
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Top Products</h3>
              <EnhancedProductList products={filteredData.topProducts || []} />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
              <div className="space-y-2">
                {(filteredData.paymentMethods || []).map((pm: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm">{pm.payment_type}</span>
                    <span className="font-semibold">{pm.count?.toLocaleString?.() ?? pm.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="state" className="space-y-6">
          <StateProductAnalysis stateAnalysis={filteredData.stateAnalysis || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default WebAnalyticsDashboard
