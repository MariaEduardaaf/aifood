// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "WAITER" | "KITCHEN";
  active: boolean;
  created_at: string;
}

// Table types
export interface Table {
  id: string;
  label: string;
  qr_token: string;
  active: boolean;
  created_at: string;
  _count?: {
    calls: number;
  };
}

// Call types
export type CallType = "CALL_WAITER" | "REQUEST_BILL";
export type CallStatus = "OPEN" | "RESOLVED";

export interface Call {
  id: string;
  type: CallType;
  status: CallStatus;
  created_at: string;
  resolved_at?: string;
  table: {
    id: string;
    label: string;
  };
  resolver?: {
    id: string;
    name: string;
  };
}

export interface OpenCall {
  id: string;
  type: CallType;
  created_at: string;
}

export interface PendingRating {
  id: string;
  type: CallType;
  resolved_at: string;
}

// Menu types
export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  category_id: string;
  category?: Category;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  items?: MenuItem[];
}

// Metrics types
export interface Metrics {
  totalCalls: number;
  resolvedCalls: number;
  averageResponseTime: number;
  callsByType: {
    CALL_WAITER: number;
    REQUEST_BILL: number;
  };
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<number, number>;
}

// Settings types
export interface Settings {
  restaurantName: string;
  primaryColor: string;
  logoUrl: string | null;
}
