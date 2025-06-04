export interface User {
  id: string;
  email: string;
  stripe_id?: string;
  role: 'user' | 'admin';
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
  pricing_type: 'fixed' | 'sequential' | 'manual';
  price_data: PriceData;
  public_url: string;
  slug: string;
  created_at: string;
  paid_to_admin: boolean;
  is_active: boolean;
}

export interface Square {
  id: string;
  campaign_id: string;
  row: number;
  column: number;
  number: number;
  value: number;
  claimed_by?: string;
  donor_name?: string;
  payment_status: 'pending' | 'completed' | 'failed';
  payment_type: 'stripe' | 'cash';
  claimed_at?: string;
}

export interface Transaction {
  id: string;
  campaign_id: string;
  square_ids: string[];
  total: number;
  payment_method: 'stripe' | 'cash';
  donor_email?: string;
  donor_name?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripe_payment_intent_id?: string;
  timestamp: string;
}

export type PricingType = 'fixed' | 'sequential' | 'manual';

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
  column: number;
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
  email?: string;
  name?: string;
  anonymous?: boolean;
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


