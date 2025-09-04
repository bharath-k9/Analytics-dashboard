// FIXED useAnalytics.ts - Corrected Overall Metrics Calculation
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Remove duplicate interface declarations - use only these
export interface MonthlyTrend { 
  monthISO: string
  monthLabel: string
  revenue: number
  orders: number
  ts: number 
}

export interface StateAnalysis {
  state: string
  totalRevenue: number
  totalCustomers: number
  totalSellers?: number
  topProduct: {
    id: string
    displayName?: string
    category?: string
    revenue: number
    units: number
  } | null
  allProducts: {
    id: string
    displayName?: string
    category?: string
    revenue: number
    units: number
  }[]
}

function toNumber(v: any): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

function parseDateToISO(v: any): string | null {
  if (v === null || v === undefined) return null
  const d = new Date(String(v))
  if (!Number.isNaN(d.getTime())) return d.toISOString()
  const s = String(v).trim()
  const mm = s.match(/^(\d{4})-(\d{1,2})$/)
  if (mm) {
    const y = Number(mm[1]), m = Number(mm[4]) - 1
    const dd = new Date(Date.UTC(y, m, 1))
    return dd.toISOString()
  }
  const parsed = Date.parse(s)
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString()
  return null
}

// Helper function to safely query Supabase with proper error handling
 async function safeSupabaseQuery(query: PromiseLike<any>, viewName: string) {
  try {
    const result = await query
    if (result.error) {
      console.warn(`⚠️ Warning: Failed to query ${viewName}:`, result.error.message)
      return { data: null, error: result.error }
    }
    return result
  } catch (error: any) {
    console.warn(`⚠️ Warning: Exception when querying ${viewName}:`, error.message)
    return { data: null, error }
  }
}

export function useAnalytics() {
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([])
  const [categoryPerformance, setCategoryPerformance] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [customersByState, setCustomersByState] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [stateAnalysis, setStateAnalysis] = useState<StateAnalysis[]>([])
  const [overall, setOverall] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sellerPerformance, setSellerPerformance] = useState<any[]>([])

  useEffect(() => {
    let mounted = true
    
    async function loadData() {
      setLoading(true)
      setError(null)
      
      try {
        console.log('🔄 Starting analytics data load...')
        
        // Use individual safe queries with proper Promise returns
        const queries = [
          { name: 'monthly_revenue', query: supabase.from('monthly_revenue').select('*').then(res => res) },
          { name: 'category_sales', query: supabase.from('category_sales').select('*').then(res => res) },
          { name: 'payment_methods', query: supabase.from('payment_methods').select('*').then(res => res) },
          { name: 'customers_by_state', query: supabase.from('customers_by_state').select('*').then(res => res) },
          { name: 'top_products', query: supabase.from('top_products').select('*').limit(500).then(res => res) },
          { name: 'top_products_by_state', query: supabase.from('top_products_by_state').select('*').limit(2000).then(res => res) },
          { name: 'top_product_per_state', query: supabase.from('top_product_per_state').select('*').then(res => res) }
        ]

        // Execute queries with proper error handling
        const results: Record<string, any> = {}
        for (const { name, query } of queries) {
          const result = await safeSupabaseQuery(query, name)
          results[name] = result
        }

        if (!mounted) return

        // Initialize processed data variables for metrics calculation
        let processedMonthlyData: MonthlyTrend[] = []
        let processedCustomersData: any[] = []

        // Process monthly trends
        const monthlyResult = results['monthly_revenue']
        if (monthlyResult.data && !monthlyResult.error) {
          const monthlyData = monthlyResult.data.map((row: any) => {
            const monthISO = parseDateToISO(row.month || row.month_iso)
            return {
              monthISO: monthISO || row.month || '',
              monthLabel: row.month_label || (monthISO ? new Date(monthISO).toLocaleString('default', { month: 'short', year: 'numeric' }) : ''),
              revenue: toNumber(row.revenue || row.total_revenue),
              orders: toNumber(row.orders || row.order_count),
              ts: monthISO ? new Date(monthISO).getTime() : 0
            }
          }).filter((item: any) => item.monthISO)
          
          monthlyData.sort((a: any, b: any) => a.ts - b.ts)
          processedMonthlyData = monthlyData
          setMonthlyTrends(monthlyData)
          console.log(`✅ Loaded ${monthlyData.length} monthly trend records`)
        } else {
          console.warn('⚠️ Monthly trends view not available, using empty data')
          setMonthlyTrends([])
        }

        // Process categories
        const categoryResult = results['category_sales']
        if (categoryResult.data && !categoryResult.error) {
          const categoryData = categoryResult.data.map((row: any) => ({
            product_category_name: row.product_category_name || row.category || 'Unknown',
            total_revenue: toNumber(row.total_revenue || row.revenue),
            items_sold: toNumber(row.items_sold || row.orders_count),
            avg_price: toNumber(row.avg_price || (row.total_revenue / Math.max(1, row.items_sold)))
          })).sort((a: any, b: any) => b.total_revenue - a.total_revenue)
          
          setCategoryPerformance(categoryData)
          console.log(`✅ Loaded ${categoryData.length} category records`)
        } else {
          console.warn('⚠️ Category sales view not available, using empty data')
          setCategoryPerformance([])
        }

        // Process payment methods
        const paymentResult = results['payment_methods']
        if (paymentResult.data && !paymentResult.error) {
          const paymentData = paymentResult.data.map((row: any) => ({
            payment_type: row.payment_type || 'Unknown',
            count: toNumber(row.count || row.total_count)
          })).sort((a: any, b: any) => b.count - a.count)
          
          setPaymentMethods(paymentData)
          console.log(`✅ Loaded ${paymentData.length} payment method records`)
        } else {
          console.warn('⚠️ Payment methods view not available, using empty data')
          setPaymentMethods([])
        }

        // Process customers by state
        const customersResult = results['customers_by_state']
        if (customersResult.data && !customersResult.error) {
          const customersData = customersResult.data.map((row: any) => ({
            state: row.state || 'Unknown',
            customers: toNumber(row.customers || row.customer_count),
            revenue: toNumber(row.revenue || row.total_revenue),
            sellers: toNumber(row.sellers || 0)
          })).sort((a: any, b: any) => b.revenue - a.revenue)
          
          processedCustomersData = customersData
          setCustomersByState(customersData)
          console.log(`✅ Loaded ${customersData.length} customer state records`)
        } else {
          console.warn('⚠️ Customers by state view not available, using empty data')
          setCustomersByState([])
        }

        // Process top products
        const productsResult = results['top_products']
        if (productsResult.data && !productsResult.error) {
          const productsData = productsResult.data.map((row: any) => ({
            product_id: row.product_id || '',
            product_category_name: row.product_category_name || 'Unknown',
            product_display_name: row.product_display_name || row.product_id || 'Unknown Product',
            revenue: toNumber(row.revenue || row.total_revenue),
            units_sold: toNumber(row.units_sold || row.quantity),
            avg_price: toNumber(row.avg_price || (row.revenue / Math.max(1, row.units_sold))),
            seller_count: toNumber(row.seller_count || 0)
          })).sort((a: any, b: any) => b.revenue - a.revenue)
          
          setTopProducts(productsData)
          console.log(`✅ Loaded ${productsData.length} product records`)
        } else {
          console.warn('⚠️ Top products view not available, using empty data')
          setTopProducts([])
        }

        // Process state analysis (combining multiple views)
        if (customersResult.data && !customersResult.error) {
          const stateMap = new Map<string, StateAnalysis>()
          
          // Initialize with customer data
          customersResult.data.forEach((row: any) => {
            const state = String(row.state ?? '').trim().toUpperCase()
            if (!state) return
            
            stateMap.set(state, {
              state,
              totalRevenue: toNumber(row.revenue),
              totalCustomers: toNumber(row.customers),
              totalSellers: toNumber(row.sellers || 0),
              topProduct: null,
              allProducts: []
            })
          })

          // Add top product data if available
          const topProductResult = results['top_product_per_state']
          if (topProductResult.data && !topProductResult.error) {
            topProductResult.data.forEach((row: any) => {
              const state = String(row.state ?? '').trim().toUpperCase()
              const existing = stateMap.get(state)
              if (existing) {
                existing.topProduct = {
                  id: row.product_id,
                  displayName: row.product_display_name || row.product_id,
                  category: row.product_category_name || 'Unknown',
                  revenue: toNumber(row.total_revenue),
                  units: toNumber(row.units_sold)
                }
              }
            })
          }

          // Add all products data if available
          const allProductsResult = results['top_products_by_state']
          if (allProductsResult.data && !allProductsResult.error) {
            const productsByState = new Map<string, any[]>()
            allProductsResult.data.forEach((row: any) => {
              const state = String(row.state ?? '').trim().toUpperCase()
              if (!productsByState.has(state)) {
                productsByState.set(state, [])
              }
              productsByState.get(state)!.push({
                id: row.product_id,
                displayName: row.product_display_name || row.product_id,
                category: row.product_category_name || 'Unknown',
                revenue: toNumber(row.total_revenue),
                units: toNumber(row.units_sold)
              })
            })

            productsByState.forEach((products, state) => {
              const existing = stateMap.get(state)
              if (existing) {
                existing.allProducts = products
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 15)
              }
            })
          }

          const stateAnalysisArray = Array.from(stateMap.values())
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
          setStateAnalysis(stateAnalysisArray)
          console.log(`✅ Processed ${stateAnalysisArray.length} state analysis records`)
        }

        // Set empty seller performance for now
        setSellerPerformance([])

        // Calculate overall metrics from processed data directly
        const totalRevenue = processedMonthlyData.reduce((sum, record) => sum + record.revenue, 0)
        const totalOrders = processedMonthlyData.reduce((sum, record) => sum + record.orders, 0) 
        const totalCustomers = processedCustomersData.reduce((sum, record) => sum + record.customers, 0)
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

        const calculatedOverall = {
          totalRevenue,
          totalOrders,
          totalCustomers,
          avgOrderValue
        }

        setOverall(calculatedOverall)
        
        console.log('📊 Overall Metrics Calculated:', {
          totalRevenue: `$${totalRevenue.toLocaleString()}`,
          totalOrders: totalOrders.toLocaleString(),
          totalCustomers: totalCustomers.toLocaleString(),
          avgOrderValue: `$${avgOrderValue.toFixed(2)}`
        })

        console.log('✅ Analytics loaded successfully with graceful error handling')

      } catch (err: any) {
        console.error('❌ Critical error loading analytics:', err)
        setError(err?.message ?? String(err))
        
        // Set default empty data to prevent UI breaks
        setMonthlyTrends([])
        setCategoryPerformance([])
        setPaymentMethods([])
        setCustomersByState([])
        setTopProducts([])
        setStateAnalysis([])
        setSellerPerformance([])
        setOverall({
          totalRevenue: 0,
          totalOrders: 0,
          totalCustomers: 0,
          avgOrderValue: 0
        })
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()
    return () => { mounted = false }
  }, [])

  return {
    overall,
    monthlyTrends,
    categoryPerformance,
    paymentMethods,
    customersByState,
    topProducts,
    stateAnalysis,
    sellerPerformance,
    loading,
    error
  }
}
