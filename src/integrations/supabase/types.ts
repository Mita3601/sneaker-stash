export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_name: string | null
          account_number: string
          created_at: string
          id: string
          is_default: boolean
          provider: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          created_at?: string
          id?: string
          is_default?: boolean
          provider: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          created_at?: string
          id?: string
          is_default?: boolean
          provider?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fraud_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_alerts: {
        Row: {
          created_at: string
          difference: number
          id: string
          reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difference?: number
          id?: string
          reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difference?: number
          id?: string
          reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fraud_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          bonus_amount: number
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          sort_order: number
        }
        Insert: {
          bonus_amount: number
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
          sort_order?: number
        }
        Update: {
          bonus_amount?: number
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          daily_yield: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          total_yield: number
          vip_level: string | null
        }
        Insert: {
          created_at?: string
          daily_yield: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          total_yield: number
          vip_level?: string | null
        }
        Update: {
          created_at?: string
          daily_yield?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          total_yield?: number
          vip_level?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          country_code: string
          created_at: string
          id: string
          is_frozen: boolean
          last_checkin_at: string | null
          phone: string
          referral_code: string | null
          referred_by: string | null
          total_bonus: number
          total_deposits: number
          total_withdrawals: number
        }
        Insert: {
          balance?: number
          country_code?: string
          created_at?: string
          id: string
          is_frozen?: boolean
          last_checkin_at?: string | null
          phone: string
          referral_code?: string | null
          referred_by?: string | null
          total_bonus?: number
          total_deposits?: number
          total_withdrawals?: number
        }
        Update: {
          balance?: number
          country_code?: string
          created_at?: string
          id?: string
          is_frozen?: boolean
          last_checkin_at?: string | null
          phone?: string
          referral_code?: string | null
          referred_by?: string | null
          total_bonus?: number
          total_deposits?: number
          total_withdrawals?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "fraud_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_backup_20260807: {
        Row: {
          balance: number | null
          country_code: string | null
          created_at: string | null
          id: string | null
          is_frozen: boolean | null
          last_checkin_at: string | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          total_bonus: number | null
          total_deposits: number | null
          total_withdrawals: number | null
        }
        Insert: {
          balance?: number | null
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          is_frozen?: boolean | null
          last_checkin_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_bonus?: number | null
          total_deposits?: number | null
          total_withdrawals?: number | null
        }
        Update: {
          balance?: number | null
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          is_frozen?: boolean | null
          last_checkin_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_bonus?: number | null
          total_deposits?: number | null
          total_withdrawals?: number | null
        }
        Relationships: []
      }
      profiles_pre_restore_20260807: {
        Row: {
          balance: number | null
          country_code: string | null
          created_at: string | null
          id: string | null
          is_frozen: boolean | null
          last_checkin_at: string | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          total_bonus: number | null
          total_deposits: number | null
          total_withdrawals: number | null
        }
        Insert: {
          balance?: number | null
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          is_frozen?: boolean | null
          last_checkin_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_bonus?: number | null
          total_deposits?: number | null
          total_withdrawals?: number | null
        }
        Update: {
          balance?: number | null
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          is_frozen?: boolean | null
          last_checkin_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_bonus?: number | null
          total_deposits?: number | null
          total_withdrawals?: number | null
        }
        Relationships: []
      }
      profiles_pre_restore_20260807_2: {
        Row: {
          balance: number | null
          country_code: string | null
          created_at: string | null
          id: string | null
          is_frozen: boolean | null
          last_checkin_at: string | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          total_bonus: number | null
          total_deposits: number | null
          total_withdrawals: number | null
        }
        Insert: {
          balance?: number | null
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          is_frozen?: boolean | null
          last_checkin_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_bonus?: number | null
          total_deposits?: number | null
          total_withdrawals?: number | null
        }
        Update: {
          balance?: number | null
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          is_frozen?: boolean | null
          last_checkin_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_bonus?: number | null
          total_deposits?: number | null
          total_withdrawals?: number | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          fee: number
          id: string
          metadata: Json | null
          net_amount: number | null
          processed_by: string | null
          reference: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          fee?: number
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          processed_by?: string | null
          reference?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          fee?: number
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          processed_by?: string | null
          reference?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fraud_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_missions: {
        Row: {
          bonus_claimed: boolean
          id: string
          is_completed: boolean
          mission_id: string
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_claimed?: boolean
          id?: string
          is_completed?: boolean
          mission_id: string
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_claimed?: boolean
          id?: string
          is_completed?: boolean
          mission_id?: string
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_missions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fraud_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_missions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_products: {
        Row: {
          id: string
          last_claim_date: string | null
          product_id: string
          purchase_date: string
          status: string
          total_earned: number
          user_id: string
        }
        Insert: {
          id?: string
          last_claim_date?: string | null
          product_id: string
          purchase_date?: string
          status?: string
          total_earned?: number
          user_id: string
        }
        Update: {
          id?: string
          last_claim_date?: string | null
          product_id?: string
          purchase_date?: string
          status?: string
          total_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fraud_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_products_backup_20260807: {
        Row: {
          id: string | null
          last_claim_date: string | null
          product_id: string | null
          purchase_date: string | null
          status: string | null
          total_earned: number | null
          user_id: string | null
        }
        Insert: {
          id?: string | null
          last_claim_date?: string | null
          product_id?: string | null
          purchase_date?: string | null
          status?: string | null
          total_earned?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string | null
          last_claim_date?: string | null
          product_id?: string | null
          purchase_date?: string | null
          status?: string | null
          total_earned?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_products_pre_restore_20260807: {
        Row: {
          id: string | null
          last_claim_date: string | null
          product_id: string | null
          purchase_date: string | null
          status: string | null
          total_earned: number | null
          user_id: string | null
        }
        Insert: {
          id?: string | null
          last_claim_date?: string | null
          product_id?: string | null
          purchase_date?: string | null
          status?: string | null
          total_earned?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string | null
          last_claim_date?: string | null
          product_id?: string | null
          purchase_date?: string | null
          status?: string | null
          total_earned?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_products_pre_restore_20260807_2: {
        Row: {
          id: string | null
          last_claim_date: string | null
          product_id: string | null
          purchase_date: string | null
          status: string | null
          total_earned: number | null
          user_id: string | null
        }
        Insert: {
          id?: string | null
          last_claim_date?: string | null
          product_id?: string | null
          purchase_date?: string | null
          status?: string | null
          total_earned?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string | null
          last_claim_date?: string | null
          product_id?: string | null
          purchase_date?: string | null
          status?: string | null
          total_earned?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      fraud_audit: {
        Row: {
          created_at: string | null
          db_balance: number | null
          id: string | null
          is_frozen: boolean | null
          phone: string | null
          theoretical_balance: number | null
        }
        Insert: {
          created_at?: string | null
          db_balance?: number | null
          id?: string | null
          is_frozen?: boolean | null
          phone?: string | null
          theoretical_balance?: never
        }
        Update: {
          created_at?: string | null
          db_balance?: number | null
          id?: string | null
          is_frozen?: boolean | null
          phone?: string | null
          theoretical_balance?: never
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_balance: {
        Args: { _amount: number; _reason: string; _user_id: string }
        Returns: Json
      }
      admin_grant_product: {
        Args: { _product_id: string; _user_id: string }
        Returns: Json
      }
      admin_review_transaction: {
        Args: { _approve: boolean; _tx_id: string }
        Returns: Json
      }
      admin_set_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: Json
      }
      admin_toggle_freeze: {
        Args: { _frozen: boolean; _reason: string; _user_id: string }
        Returns: Json
      }
      claim_daily_checkin: { Args: never; Returns: Json }
      claim_mission: { Args: { _mission_id: string }; Returns: Json }
      claim_yield: { Args: { _user_product_id: string }; Returns: Json }
      create_deposit: {
        Args: { _amount: number; _reference: string }
        Returns: Json
      }
      distribute_commissions: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      get_referral_tree: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      purchase_product: { Args: { _product_id: string }; Returns: Json }
      rebuild_profiles_and_user_products: { Args: never; Returns: undefined }
      refresh_missions: { Args: { _user_id: string }; Returns: undefined }
      repay_referral_commissions: { Args: never; Returns: undefined }
      request_withdrawal: {
        Args: { _amount: number; _bank_account_id: string }
        Returns: Json
      }
      revoke_wrong_sponsor_products: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "user" | "promoter" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "promoter", "admin"],
    },
  },
} as const
