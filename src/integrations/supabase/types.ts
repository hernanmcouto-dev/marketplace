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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      orders: {
        Row: {
          created_at: string
          customer_address: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          order_items: Json
          order_number: number
          payment_method: string
          payment_proof_url: string | null
          seller_id: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_address: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id?: string
          order_items: Json
          order_number?: number
          payment_method: string
          payment_proof_url?: string | null
          seller_id?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_address?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          order_items?: Json
          order_number?: number
          payment_method?: string
          payment_proof_url?: string | null
          seller_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_page_presets: {
        Row: {
          created_at: string
          id: string
          name: string
          pages: number[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pages: number[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pages?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          public_url: string
          shopify_product_id: string | null
          sku: string
          storage_path: string
          supplier_id: string | null
          updated_at: string | null
          uploaded_to_shopify: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          public_url: string
          shopify_product_id?: string | null
          sku: string
          storage_path: string
          supplier_id?: string | null
          updated_at?: string | null
          uploaded_to_shopify?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          public_url?: string
          shopify_product_id?: string | null
          sku?: string
          storage_path?: string
          supplier_id?: string | null
          updated_at?: string | null
          uploaded_to_shopify?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          bulk_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sale_type: string
          sku: string
          stock: number | null
          supplier_code: string | null
          supplier_id: string | null
          tags: string[] | null
          unit_price: number
          units_per_package: number | null
          updated_at: string
        }
        Insert: {
          bulk_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sale_type?: string
          sku: string
          stock?: number | null
          supplier_code?: string | null
          supplier_id?: string | null
          tags?: string[] | null
          unit_price?: number
          units_per_package?: number | null
          updated_at?: string
        }
        Update: {
          bulk_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sale_type?: string
          sku?: string
          stock?: number | null
          supplier_code?: string | null
          supplier_id?: string | null
          tags?: string[] | null
          unit_price?: number
          units_per_package?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string | null
          cuit_dni: string
          email: string
          full_name: string
          id: string
          localidad: string
          provincia: string
          telefono: string
          transporte_preferido: string
          updated_at: string | null
          valor_declarado: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          cuit_dni: string
          email: string
          full_name: string
          id: string
          localidad: string
          provincia: string
          telefono: string
          transporte_preferido: string
          updated_at?: string | null
          valor_declarado: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          cuit_dni?: string
          email?: string
          full_name?: string
          id?: string
          localidad?: string
          provincia?: string
          telefono?: string
          transporte_preferido?: string
          updated_at?: string | null
          valor_declarado?: string
        }
        Relationships: []
      }
      sellers: {
        Row: {
          code: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_config: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      supplier_products: {
        Row: {
          cost_price: number
          id: string
          imported_at: string
          product_name: string | null
          product_sku: string | null
          sale_price: number
          shopify_product_id: string
          supplier_id: string
          units_per_package: number | null
        }
        Insert: {
          cost_price: number
          id?: string
          imported_at?: string
          product_name?: string | null
          product_sku?: string | null
          sale_price: number
          shopify_product_id: string
          supplier_id: string
          units_per_package?: number | null
        }
        Update: {
          cost_price?: number
          id?: string
          imported_at?: string
          product_name?: string | null
          product_sku?: string | null
          sale_price?: number
          shopify_product_id?: string
          supplier_id?: string
          units_per_package?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          code: string
          color: string | null
          created_at: string
          discount_percentage: number
          id: string
          markup_percentage: number
          minimum_purchase_amount: number | null
          name: string
          sale_type: Database["public"]["Enums"]["sale_type"]
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          discount_percentage?: number
          id?: string
          markup_percentage?: number
          minimum_purchase_amount?: number | null
          name: string
          sale_type?: Database["public"]["Enums"]["sale_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          discount_percentage?: number
          id?: string
          markup_percentage?: number
          minimum_purchase_amount?: number | null
          name?: string
          sale_type?: Database["public"]["Enums"]["sale_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      supplier_products_public: {
        Row: {
          id: string | null
          product_name: string | null
          product_sku: string | null
          shopify_product_id: string | null
          supplier_id: string | null
          units_per_package: number | null
        }
        Insert: {
          id?: string | null
          product_name?: string | null
          product_sku?: string | null
          shopify_product_id?: string | null
          supplier_id?: string | null
          units_per_package?: number | null
        }
        Update: {
          id?: string | null
          product_name?: string | null
          product_sku?: string | null
          shopify_product_id?: string | null
          supplier_id?: string | null
          units_per_package?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers_public: {
        Row: {
          code: string | null
          color: string | null
          id: string | null
          minimum_purchase_amount: number | null
          name: string | null
          sale_type: Database["public"]["Enums"]["sale_type"] | null
        }
        Insert: {
          code?: string | null
          color?: string | null
          id?: string | null
          minimum_purchase_amount?: number | null
          name?: string | null
          sale_type?: Database["public"]["Enums"]["sale_type"] | null
        }
        Update: {
          code?: string | null
          color?: string | null
          id?: string | null
          minimum_purchase_amount?: number | null
          name?: string | null
          sale_type?: Database["public"]["Enums"]["sale_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      sale_type: "unitario" | "bulto"
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
      app_role: ["admin", "user"],
      sale_type: ["unitario", "bulto"],
    },
  },
} as const
