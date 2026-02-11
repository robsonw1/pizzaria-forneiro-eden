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
      clientes: {
        Row: {
          id: string
          email: string
          name: string
          phone: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          phone: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          phone?: string
          created_at?: string
        }
        Relationships: []
      }
      leads_bdr: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          created_at?: string
        }
        Relationships: []
      }
      lista_de_bloqueios: {
        Row: {
          id: string
          email: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      n8n_chat_history: {
        Row: {
          id: string
          conversation_id: string
          user_message: string
          bot_response: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_message: string
          bot_response: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_message?: string
          bot_response?: string
          created_at?: string
        }
        Relationships: []
      }
      neighborhoods: {
        Row: {
          id: string
          name: string
          delivery_fee: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          delivery_fee: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          delivery_fee?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          size: string | null
          price: number
          total_price: number
          custom_ingredients: string | null
          paid_ingredients: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          size?: string | null
          price: number
          total_price: number
          custom_ingredients?: string | null
          paid_ingredients?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          size?: string | null
          price?: number
          total_price?: number
          custom_ingredients?: string | null
          paid_ingredients?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          customer_name: string
          customer_phone: string
          customer_email: string
          street: string
          number: string
          complement: string | null
          reference: string | null
          neighborhood: string
          city: string
          zip_code: string
          delivery_type: string
          delivery_fee: number
          payment_method: string
          subtotal: number
          total: number
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id: string
          customer_name: string
          customer_phone: string
          customer_email: string
          street: string
          number: string
          complement?: string | null
          reference?: string | null
          neighborhood: string
          city: string
          zip_code: string
          delivery_type: string
          delivery_fee: number
          payment_method: string
          subtotal: number
          total: number
          status: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_name?: string
          customer_phone?: string
          customer_email?: string
          street?: string
          number?: string
          complement?: string | null
          reference?: string | null
          neighborhood?: string
          city?: string
          zip_code?: string
          delivery_type?: string
          delivery_fee?: number
          payment_method?: string
          subtotal?: number
          total?: number
          status?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          description: string
          category: string
          price: number | null
          price_small: number | null
          price_large: number | null
          image: string | null
          is_popular: boolean
          is_new: boolean
          is_vegetarian: boolean
          is_active: boolean
          is_customizable: boolean
          data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          category: string
          price?: number | null
          price_small?: number | null
          price_large?: number | null
          image?: string | null
          is_popular?: boolean
          is_new?: boolean
          is_vegetarian?: boolean
          is_active?: boolean
          is_customizable?: boolean
          data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category?: string
          price?: number | null
          price_small?: number | null
          price_large?: number | null
          image?: string | null
          is_popular?: boolean
          is_new?: boolean
          is_vegetarian?: boolean
          is_active?: boolean
          is_customizable?: boolean
          data?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          store_name: string
          store_phone: string
          store_email: string
          store_address: string
          store_city: string
          store_zip_code: string
          delivery_fee_default: number
          min_order_value: number
          max_orders_per_day: number | null
          operation_start_time: string
          operation_end_time: string
          weekend_start_time: string | null
          weekend_end_time: string | null
          days_closed: string | null
          currency: string
          printnode_printer_id: string | null
          print_mode: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_name: string
          store_phone: string
          store_email: string
          store_address: string
          store_city: string
          store_zip_code: string
          delivery_fee_default: number
          min_order_value: number
          max_orders_per_day?: number | null
          operation_start_time: string
          operation_end_time: string
          weekend_start_time?: string | null
          weekend_end_time?: string | null
          days_closed?: string | null
          currency?: string
          printnode_printer_id?: string | null
          print_mode?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_name?: string
          store_phone?: string
          store_email?: string
          store_address?: string
          store_city?: string
          store_zip_code?: string
          delivery_fee_default?: number
          min_order_value?: number
          max_orders_per_day?: number | null
          operation_start_time?: string
          operation_end_time?: string
          weekend_start_time?: string | null
          weekend_end_time?: string | null
          days_closed?: string | null
          currency?: string
          printnode_printer_id?: string | null
          print_mode?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
          mercadopago_access_token: string | null
          mercadopago_refresh_token: string | null
          mercadopago_user_id: string | null
          mercadopago_merchant_account_id: string | null
          mercadopago_connected_at: string | null
          mercadopago_token_expires_at: string | null
          mercadopago_oauth_state: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
          mercadopago_access_token?: string | null
          mercadopago_refresh_token?: string | null
          mercadopago_user_id?: string | null
          mercadopago_merchant_account_id?: string | null
          mercadopago_connected_at?: string | null
          mercadopago_token_expires_at?: string | null
          mercadopago_oauth_state?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
          mercadopago_access_token?: string | null
          mercadopago_refresh_token?: string | null
          mercadopago_user_id?: string | null
          mercadopago_merchant_account_id?: string | null
          mercadopago_connected_at?: string | null
          mercadopago_token_expires_at?: string | null
          mercadopago_oauth_state?: string | null
        }
        Relationships: []
      }
      printnode_config: {
        Row: {
          id: string
          tenant_id: string | null
          api_key: string
          printer_id: string
          is_active: boolean
          auto_print: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          api_key: string
          printer_id: string
          is_active?: boolean
          auto_print?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          api_key?: string
          printer_id?: string
          is_active?: boolean
          auto_print?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printnode_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

