export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      campaigns: {
        Row: {
          columns: number
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          paid_to_admin: boolean | null
          paypal_account_id: string | null
          paypal_email: string | null
          paypal_onboarding_complete: boolean | null
          price_data: Json | null
          price_per_square: number | null
          pricing_type: string | null
          public_url: string | null
          rows: number
          slug: string
          sold_squares: number
          title: string
          total_squares: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          columns?: number
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          paid_to_admin?: boolean | null
          paypal_account_id?: string | null
          paypal_email?: string | null
          paypal_onboarding_complete?: boolean | null
          price_data?: Json | null
          price_per_square?: number | null
          pricing_type?: string | null
          public_url?: string | null
          rows?: number
          slug: string
          sold_squares?: number
          title: string
          total_squares: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          columns?: number
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          paid_to_admin?: boolean | null
          paypal_account_id?: string | null
          paypal_email?: string | null
          paypal_onboarding_complete?: boolean | null
          price_data?: Json | null
          price_per_square?: number | null
          pricing_type?: string | null
          public_url?: string | null
          rows?: number
          slug?: string
          sold_squares?: number
          title?: string
          total_squares?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          buyer_email: string | null
          buyer_name: string | null
          campaign_id: string
          created_at: string | null
          id: string
          square_id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          buyer_email?: string | null
          buyer_name?: string | null
          campaign_id: string
          created_at?: string | null
          id?: string
          square_id: string
          status: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          buyer_email?: string | null
          buyer_name?: string | null
          campaign_id?: string
          created_at?: string | null
          id?: string
          square_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      squares: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          campaign_id: string | null
          claimed_at: string | null
          claimed_by: string | null
          col: number
          col_num: number
          created_at: string | null
          donor_name: string | null
          id: string
          is_sold: boolean | null
          number: number
          payment_status: string
          payment_type: string
          position: number | null
          price: number | null
          row: number
          row_num: number
          sold_at: string | null
          updated_at: string | null
          value: number
        }
        Insert: {
          buyer_email?: string | null
          buyer_name?: string | null
          campaign_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          col?: number
          col_num: number
          created_at?: string | null
          donor_name?: string | null
          id?: string
          is_sold?: boolean | null
          number?: number
          payment_status?: string
          payment_type?: string
          position?: number | null
          price?: number | null
          row?: number
          row_num: number
          sold_at?: string | null
          updated_at?: string | null
          value?: number
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string | null
          campaign_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          col?: number
          col_num?: number
          created_at?: string | null
          donor_name?: string | null
          id?: string
          is_sold?: boolean | null
          number?: number
          payment_status?: string
          payment_type?: string
          position?: number | null
          price?: number | null
          row?: number
          row_num?: number
          sold_at?: string | null
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "squares_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          campaign_id: string
          donor_email: string | null
          donor_name: string | null
          id: string
          payment_method: string
          square_ids: string[]
          status: string
          stripe_payment_intent_id: string | null
          timestamp: string | null
          total: number
        }
        Insert: {
          campaign_id: string
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          payment_method: string
          square_ids: string[]
          status?: string
          stripe_payment_intent_id?: string | null
          timestamp?: string | null
          total: number
        }
        Update: {
          campaign_id?: string
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          payment_method?: string
          square_ids?: string[]
          status?: string
          stripe_payment_intent_id?: string | null
          timestamp?: string | null
          total?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
