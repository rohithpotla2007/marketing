export interface User {
  id: number;
  username: string;
  email?: string;
  full_name: string;
  role: 'admin' | 'warehouse';
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon_name?: string;
  product_count?: number;
  created_at: string;
}

export interface Product {
  id: number;
  product_code: string;
  name: string;
  description?: string;
  category_id: number;
  category_name?: string;
  image_url?: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  status: 'IN STOCK' | 'LOW STOCK' | 'OUT OF STOCK';
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  total: number;
  items: Product[];
}

export interface RestockResponse {
  product_id: number;
  product_name: string;
  product_code: string;
  previous_quantity: number;
  quantity_added: number;
  new_quantity: number;
  previous_status: string;
  new_status: string;
  message: string;
}

export interface RestockTransaction {
  id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  quantity_added: number;
  previous_quantity: number;
  new_quantity: number;
  username: string;
  notes?: string;
  created_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  product_image?: string;
  category_name?: string;
  quantity_requested: number;
  quantity_fulfilled: number;
  available_quantity: number;
}

export interface Order {
  id: number;
  order_number: string;
  user_id: number;
  username: string;
  status: 'PENDING' | 'ACCEPTED' | 'SHIPPED' | 'CANCELLED';
  total_items: number;
  total_quantity: number;
  fulfillment_ratio: number;
  priority_label: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface OrderListResponse {
  total: number;
  items: Order[];
}

export interface VerificationItem {
  id?: number;
  product_id: number;
  product_name: string;
  product_code: string;
  product_image?: string;
  expected_quantity: number;
  good_quantity: number;
  damaged_quantity: number;
  missing_quantity: number;
  is_replaced: boolean;
  needs_replacement: boolean;
  replacement_quantity_needed: number;
  available_stock_in_warehouse: number;
}

export interface OrderTracking {
  order_id: number;
  order_number: string;
  status: string;
  created_at: string;
  total_expected: number;
  total_good: number;
  total_damaged: number;
  total_missing: number;
  is_verified: boolean;
  can_ship: boolean;
  has_pending_replacement: boolean;
  items: VerificationItem[];
}

export interface DamageMissingRecord {
  id: number;
  order_id: number;
  order_number: string;
  product_id: number;
  product_name: string;
  product_code: string;
  product_image?: string;
  category_name?: string;
  damaged_quantity: number;
  missing_quantity: number;
  total_affected: number;
  status: 'REPORTED' | 'REPLACED' | 'RESOLVED';
  reported_by?: string;
  notes?: string;
  created_at: string;
}

export interface DamageMissingSummary {
  total_damaged_items: number;
  total_missing_items: number;
  total_affected_items: number;
  total_records: number;
  items: DamageMissingRecord[];
}

export interface DashboardSummary {
  total_products: number;
  total_units: number;
  low_stock_items: number;
  out_of_stock_items: number;
  pending_orders: number;
  ready_orders: number;
  shipped_orders: number;
  damaged_items: number;
  missing_items: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  total_units: number;
}

export interface StockStatusDistribution {
  status: string;
  count: number;
  total_units: number;
}

export interface OrderTimelinePoint {
  date: string;
  order_count: number;
  total_units: number;
}

export interface TopOrderedProduct {
  product_id: number;
  product_name: string;
  category_name: string;
  total_ordered_quantity: number;
  order_count: number;
}

export interface DamageVsMissingByCategory {
  category_name: string;
  damaged_units: number;
  missing_units: number;
  total_affected: number;
}

export interface RestockingTrendPoint {
  date: string;
  restocked_units: number;
  transaction_count: number;
}

export interface OrderStatusDistribution {
  status: string;
  count: number;
}

export interface AnalyticsData {
  summary: DashboardSummary;
  categories_distribution: CategoryDistribution[];
  stock_status_distribution: StockStatusDistribution[];
  orders_over_time: OrderTimelinePoint[];
  most_ordered_products: TopOrderedProduct[];
  damage_vs_missing: DamageVsMissingByCategory[];
  damage_missing_totals: {
    total_damaged: number;
    total_missing: number;
    total_affected: number;
  };
  restocking_activity: RestockingTrendPoint[];
  orders_by_status: OrderStatusDistribution[];
}

export interface AuditLog {
  id: number;
  action: string;
  user_id?: number;
  username: string;
  entity: string;
  entity_id?: string;
  details: string;
  created_at: string;
}

export interface Shipment {
  id: number;
  order_id: number;
  order_number: string;
  tracking_number: string;
  shipped_by: string;
  shipped_at: string;
  notes?: string;
}
