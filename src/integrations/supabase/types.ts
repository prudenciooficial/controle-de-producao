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
      losses: {
        Row: {
          batch_number: string | null
          created_at: string
          date: string
          id: string
          machine: string
          notes: string | null
          product_type: string
          production_batch_id: string
          quantity: number
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          date: string
          id?: string
          machine: string
          notes?: string | null
          product_type: string
          production_batch_id: string
          quantity: number
          unit_of_measure: string
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          date?: string
          id?: string
          machine?: string
          notes?: string | null
          product_type?: string
          production_batch_id?: string
          quantity?: number
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "losses_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      material_batches: {
        Row: {
          batch_number: string
          created_at: string
          expiry_date: string | null
          has_report: boolean | null
          id: string
          material_id: string
          quantity: number
          remaining_quantity: number
          supplied_quantity: number
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          expiry_date?: string | null
          has_report?: boolean | null
          id?: string
          material_id: string
          quantity: number
          remaining_quantity: number
          supplied_quantity: number
          unit_of_measure: string
          updated_at?: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          expiry_date?: string | null
          has_report?: boolean | null
          id?: string
          material_id?: string
          quantity?: number
          remaining_quantity?: number
          supplied_quantity?: number
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_batches_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          type: string
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type: string
          unit_of_measure: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: string
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          batch_number: string
          created_at: string
          expiry_date: string | null
          has_report: boolean | null
          id: string
          material_id: string
          order_id: string
          quantity: number
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          expiry_date?: string | null
          has_report?: boolean | null
          id?: string
          material_id: string
          order_id: string
          quantity: number
          unit_of_measure: string
          updated_at?: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          expiry_date?: string | null
          has_report?: boolean | null
          id?: string
          material_id?: string
          order_id?: string
          quantity?: number
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          date: string
          id: string
          invoice_number: string
          notes: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          invoice_number: string
          notes?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      produced_items: {
        Row: {
          batch_number: string
          created_at: string
          id: string
          product_id: string
          production_batch_id: string
          quantity: number
          remaining_quantity: number
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          id?: string
          product_id: string
          production_batch_id: string
          quantity: number
          remaining_quantity: number
          unit_of_measure: string
          updated_at?: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          id?: string
          product_id?: string
          production_batch_id?: string
          quantity?: number
          remaining_quantity?: number
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produced_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produced_items_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batches: {
        Row: {
          batch_number: string
          created_at: string
          id: string
          mix_count: number
          mix_day: string
          notes: string | null
          production_date: string
          updated_at: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          id?: string
          mix_count: number
          mix_day: string
          notes?: string | null
          production_date: string
          updated_at?: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          id?: string
          mix_count?: number
          mix_day?: string
          notes?: string | null
          production_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          fecula_conversion_factor: number | null
          id: string
          name: string
          production_prediction_factor: number | null
          unit_of_measure: string
          updated_at: string
          weight_factor: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          fecula_conversion_factor?: number | null
          id?: string
          name: string
          production_prediction_factor?: number | null
          unit_of_measure: string
          updated_at?: string
          weight_factor?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          fecula_conversion_factor?: number | null
          id?: string
          name?: string
          production_prediction_factor?: number | null
          unit_of_measure?: string
          updated_at?: string
          weight_factor?: number | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          produced_item_id: string
          product_id: string
          quantity: number
          sale_id: string
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          produced_item_id: string
          product_id: string
          quantity: number
          sale_id: string
          unit_of_measure: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          produced_item_id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_produced_item_id_fkey"
            columns: ["produced_item_id"]
            isOneToOne: false
            referencedRelation: "produced_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          customer_name: string
          date: string
          id: string
          invoice_number: string
          notes: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          date: string
          id?: string
          invoice_number: string
          notes?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          date?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          code: string | null
          contacts: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          contacts?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          contacts?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      used_materials: {
        Row: {
          created_at: string
          id: string
          material_batch_id: string
          production_batch_id: string
          quantity: number
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_batch_id: string
          production_batch_id: string
          quantity: number
          unit_of_measure: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          material_batch_id?: string
          production_batch_id?: string
          quantity?: number
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "used_materials_material_batch_id_fkey"
            columns: ["material_batch_id"]
            isOneToOne: false
            referencedRelation: "material_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "used_materials_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abort_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      end_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
