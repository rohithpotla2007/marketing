import axios from 'axios';
import {
  User,
  Category,
  Product,
  ProductListResponse,
  RestockResponse,
  RestockTransaction,
  Order,
  OrderListResponse,
  OrderTracking,
  DamageMissingSummary,
  DashboardSummary,
  AnalyticsData,
  AuditLog,
  Shipment,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for attaching auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stockflow_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling 401 unauthenticated requests
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('stockflow_token');
        localStorage.removeItem('stockflow_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authApi = {
  login: async (credentials: { username: string; password: string }) => {
    const response = await api.post<{
      access_token: string;
      token_type: string;
      user_id: number;
      username: string;
      full_name: string;
      role: 'admin' | 'warehouse';
    }>('/auth/login', credentials);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

// Categories Service
export const categoriesApi = {
  getAll: async () => {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },
};

// Products Service
export const productsApi = {
  getAll: async (params?: {
    category_id?: number;
    search?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }) => {
    const response = await api.get<ProductListResponse>('/products', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  },
  create: async (productData: {
    product_code: string;
    name: string;
    description?: string;
    category_id: number;
    image_url?: string;
    quantity: number;
    low_stock_threshold: number;
  }) => {
    const response = await api.post<Product>('/products', productData);
    return response.data;
  },
  update: async (id: number, productData: Partial<Product>) => {
    const response = await api.put<Product>(`/products/${id}`, productData);
    return response.data;
  },
};

// Restocking Service
export const restockApi = {
  restock: async (data: { product_id: number; quantity_added: number; notes?: string }) => {
    const response = await api.post<RestockResponse>('/restocks', data);
    return response.data;
  },
  getHistory: async (limit: number = 50) => {
    const response = await api.get<RestockTransaction[]>('/restocks', { params: { limit } });
    return response.data;
  },
};

// Orders Service
export const ordersApi = {
  getAll: async (params?: { status?: string; search?: string; skip?: number; limit?: number }) => {
    const response = await api.get<OrderListResponse>('/orders', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Order>(`/orders/${id}`);
    return response.data;
  },
  create: async (data: { items: { product_id: number; quantity: number }[]; notes?: string }) => {
    const response = await api.post<Order>('/orders', data);
    return response.data;
  },
  accept: async (orderId: number) => {
    const response = await api.post<Order>(`/orders/${orderId}/accept`);
    return response.data;
  },
};

// Tracking & Verification Service
export const trackingApi = {
  getAll: async (search?: string) => {
    const response = await api.get<OrderTracking[]>('/tracking', { params: { search } });
    return response.data;
  },
  getById: async (orderId: number) => {
    const response = await api.get<OrderTracking>(`/tracking/${orderId}`);
    return response.data;
  },
  verify: async (
    orderId: number,
    data: { items: { product_id: number; damaged_quantity: number; missing_quantity: number; notes?: string }[] }
  ) => {
    const response = await api.post<OrderTracking>(`/tracking/${orderId}/verify`, data);
    return response.data;
  },
  replace: async (orderId: number, data: { product_id: number; reason?: string }) => {
    const response = await api.post<{
      success: boolean;
      order_id: number;
      product_id: number;
      product_name: string;
      quantity_replaced: number;
      previous_quantity: number;
      new_quantity: number;
      message: string;
    }>(`/tracking/${orderId}/replace`, data);
    return response.data;
  },
  ship: async (orderId: number, notes?: string) => {
    const response = await api.post<Shipment>(`/tracking/${orderId}/ship`, { notes });
    return response.data;
  },
  getShipments: async (limit: number = 50) => {
    const response = await api.get<Shipment[]>('/tracking/history/shipments', { params: { limit } });
    return response.data;
  },
};

// Damaged & Missing Service
export const damagedMissingApi = {
  getAll: async (params?: { status?: string; category_id?: number; search?: string }) => {
    const response = await api.get<DamageMissingSummary>('/damaged-missing', { params });
    return response.data;
  },
};

// Low Stock & Out of Stock Service
export const inventoryMonitoringApi = {
  getLowStock: async () => {
    const response = await api.get<Product[]>('/inventory/low-stock');
    return response.data;
  },
  getOutOfStock: async () => {
    const response = await api.get<Product[]>('/inventory/out-of-stock');
    return response.data;
  },
};

// Analytics Service
export const analyticsApi = {
  getDashboardData: async () => {
    const response = await api.get<AnalyticsData>('/analytics');
    return response.data;
  },
  getSummary: async () => {
    const response = await api.get<DashboardSummary>('/analytics/summary');
    return response.data;
  },
};

// Activity Log Service
export const activityApi = {
  getRecent: async (limit: number = 25) => {
    const response = await api.get<AuditLog[]>('/activity', { params: { limit } });
    return response.data;
  },
};

// System Health
export const healthApi = {
  check: async () => {
    const response = await api.get<{ status: string; app_name: string; database: string }>('/health');
    return response.data;
  },
};

export default api;
