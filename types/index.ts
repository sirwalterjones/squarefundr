export interface User {
  id: string;
  email: string;
  stripe_id?: string;
  role: "user" | "admin";
  created_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  image_url: string;
  rows: number;
  columns: number;
  pricing_type: "fixed" | "sequential" | "manual";
  price_data: PriceData;
  public_url: string;
  slug: string;
  created_at: string;
  paid_to_admin: boolean;
  is_active: boolean;
  paypal_account_id?: string;
  paypal_email?: string;
  paypal_onboarding_complete?: boolean;
}

export interface Square {
  id: string;
  campaign_id: string;
  row: number;
  col: number;
  number: number;
  value: number;
  claimed_by?: string;
  donor_name?: string;
  payment_status: "pending" | "completed" | "failed";
  payment_type: "stripe" | "paypal" | "cash";
  claimed_at?: string;
}

export interface Transaction {
  id: string;
  campaign_id: string;
  square_ids: string; // JSON string format
  total: number;
  payment_method: "stripe" | "paypal" | "cash";
  donor_email?: string;
  donor_name?: string;
  status: "pending" | "completed" | "failed" | "refunded";
  paypal_order_id?: string;
  timestamp: string;
}

export type PricingType = "fixed" | "sequential" | "manual";

export interface PriceData {
  fixed?: number;
  sequential?: {
    start: number;
    increment: number;
  };
  manual?: { [key: string]: number }; // key is "row,col" format
}

export interface SelectedSquare {
  row: number;
  col: number;
  number: number;
  value: number;
}

export interface GridConfig {
  rows: number;
  columns: number;
  pricing_type: PricingType;
  price_data: PriceData;
}

export interface DonorInfo {
  email: string;
  name: string;
}

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSquares: SelectedSquare[];
  campaign: Campaign;
  onSuccess: () => void;
}

export interface SquareProps {
  square: Square;
  isSelected: boolean;
  isAvailable: boolean;
  onClick: () => void;
  campaign: Campaign;
}
