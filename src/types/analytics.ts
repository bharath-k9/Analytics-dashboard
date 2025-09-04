// src/types/analytics.ts
export interface MonthlyTrend { 
  monthISO: string
  monthLabel: string
  revenue: number
  orders: number
  ts: number 
}

export interface YearlyRow { 
  year: string
  q1: number
  q2: number
  q3: number
  q4: number
  total: number 
}

export interface CategoryPerformance {
  category: string
  product_category_name: string
  total_revenue: number
  items_sold: number
  avg_price: number
}

export interface ProductData {
  product_id: string
  product_category_name: string
  product_display_name: string
  revenue: number
  units_sold: number
  avg_price: number
  seller_count?: number
}

export interface StateData {
  state: string
  customers: number
  revenue: number
  sellers?: number
  topProductName?: string
  topProductRevenue?: number
  topProductCategory?: string
}

export interface StateAnalysis {
  state: string
  totalRevenue: number
  totalCustomers: number
  totalSellers: number
  topProduct: {
    id: string
    displayName: string
    category: string
    revenue: number
    units: number
  } | null
  allProducts: {
    id: string
    displayName: string
    category: string
    revenue: number
    units: number
  }[]
}

export interface SellerPerformance {
  seller_id: string
  seller_city: string
  seller_state: string
  total_orders: number
  total_revenue: number
  unique_products: number
  avg_item_price: number
}

