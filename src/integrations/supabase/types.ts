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
      global_settings: {
        Row: {
          conservant_conversion_factor: number | null
          conservant_usage_factor: number | null
          created_at: string
          fecula_conversion_factor: number | null
          id: string
          production_prediction_factor: number | null
          updated_at: string
        }
        Insert: {
          conservant_conversion_factor?: number | null
          conservant_usage_factor?: number | null
          created_at?: string
          fecula_conversion_factor?: number | null
          id?: string
          production_prediction_factor?: number | null
          updated_at?: string
        }
        Update: {
          conservant_conversion_factor?: number | null
          conservant_usage_factor?: number | null
          created_at?: string
          fecula_conversion_factor?: number | null
          id?: string
          production_prediction_factor?: number | null
          updated_at?: string
        }
        Relationships: []
      }
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
          {
            foreignKeyName: "losses_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_summary"
            referencedColumns: ["production_batch_id"]
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
          order_item_id: string | null
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
          order_item_id?: string | null
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
          order_item_id?: string | null
          quantity?: number
          remaining_quantity?: number
          supplied_quantity?: number
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_material_batches_order_item"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_batches_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_batches_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_current_material_stock"
            referencedColumns: ["material_id"]
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
            foreignKeyName: "order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_current_material_stock"
            referencedColumns: ["material_id"]
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
            foreignKeyName: "produced_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_current_product_stock"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "produced_items_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produced_items_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_summary"
            referencedColumns: ["production_batch_id"]
          },
        ]
      }
      production_batches: {
        Row: {
          batch_number: string
          created_at: string
          id: string
          is_mix_only: boolean
          mix_count: number
          mix_day: string
          mix_production_batch_id: string | null
          notes: string | null
          production_date: string
          status: string
          updated_at: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          id?: string
          is_mix_only?: boolean
          mix_count: number
          mix_day: string
          mix_production_batch_id?: string | null
          notes?: string | null
          production_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          id?: string
          is_mix_only?: boolean
          mix_count?: number
          mix_day?: string
          mix_production_batch_id?: string | null
          notes?: string | null
          production_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_mix_production_batch_id_fkey"
            columns: ["mix_production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_mix_production_batch_id_fkey"
            columns: ["mix_production_batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_summary"
            referencedColumns: ["production_batch_id"]
          },
        ]
      }
      products: {
        Row: {
          conservant_conversion_factor: number | null
          conservant_usage_factor: number | null
          created_at: string
          description: string | null
          fecula_conversion_factor: number | null
          id: string
          name: string
          notes: string | null
          production_prediction_factor: number | null
          type: string | null
          unit_of_measure: string
          updated_at: string
          weight_factor: number | null
        }
        Insert: {
          conservant_conversion_factor?: number | null
          conservant_usage_factor?: number | null
          created_at?: string
          description?: string | null
          fecula_conversion_factor?: number | null
          id?: string
          name: string
          notes?: string | null
          production_prediction_factor?: number | null
          type?: string | null
          unit_of_measure: string
          updated_at?: string
          weight_factor?: number | null
        }
        Update: {
          conservant_conversion_factor?: number | null
          conservant_usage_factor?: number | null
          created_at?: string
          description?: string | null
          fecula_conversion_factor?: number | null
          id?: string
          name?: string
          notes?: string | null
          production_prediction_factor?: number | null
          type?: string | null
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
            foreignKeyName: "sale_items_produced_item_id_fkey"
            columns: ["produced_item_id"]
            isOneToOne: false
            referencedRelation: "v_current_product_stock"
            referencedColumns: ["produced_item_id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_current_product_stock"
            referencedColumns: ["product_id"]
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
      system_logs: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string | null
          entity_schema: string
          entity_table: string
          id: string
          new_data: Json | null
          old_data: Json | null
          user_display_name: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id?: string | null
          entity_schema?: string
          entity_table: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_display_name?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string | null
          entity_schema?: string
          entity_table?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_display_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      used_materials: {
        Row: {
          created_at: string
          id: string
          material_batch_id: string
          mix_count_used: number | null
          production_batch_id: string
          quantity: number
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_batch_id: string
          mix_count_used?: number | null
          production_batch_id: string
          quantity: number
          unit_of_measure: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          material_batch_id?: string
          mix_count_used?: number | null
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
            foreignKeyName: "used_materials_material_batch_id_fkey"
            columns: ["material_batch_id"]
            isOneToOne: false
            referencedRelation: "v_current_material_stock"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "used_materials_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "used_materials_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "v_production_summary"
            referencedColumns: ["production_batch_id"]
          },
        ]
      }
    }
    Views: {
      v_current_material_stock: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          has_report: boolean | null
          material_id: string | null
          material_name: string | null
          material_type: string | null
          original_quantity: number | null
          remaining_quantity: number | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_current_product_stock: {
        Row: {
          batch_number: string | null
          created_at: string | null
          original_quantity: number | null
          produced_item_id: string | null
          product_id: string | null
          product_name: string | null
          product_type: string | null
          production_date: string | null
          remaining_quantity: number | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_production_summary: {
        Row: {
          batch_number: string | null
          created_at: string | null
          materials_count: number | null
          mix_count: number | null
          mix_day: string | null
          production_batch_id: string | null
          production_date: string | null
          products_count: number | null
          total_weight_kg: number | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      abort_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      auditoria_completa_estoque: {
        Args: Record<PropertyKey, never>
        Returns: {
          relatorio: string
        }[]
      }
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_total_weight: {
        Args: { production_batch_id: string }
        Returns: number
      }
      check_material_stock: {
        Args: { material_batch_id: string; required_quantity: number }
        Returns: boolean
      }
      detectar_inconsistencias_estoque: {
        Args: Record<PropertyKey, never>
        Returns: {
          material_id: string
          batch_id: string
          material_nome: string
          lote_material: string
          estoque_atual: number
          estoque_esperado: number
          diferenca: number
          data_deteccao: string
        }[]
      }
      end_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_global_settings: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          fecula_conversion_factor: number
          production_prediction_factor: number
          conservant_conversion_factor: number
          conservant_usage_factor: number
        }[]
      }
      get_material_stock_history: {
        Args: { material_id: string }
        Returns: {
          batch_number: string
          quantity: number
          remaining_quantity: number
          created_at: string
        }[]
      }
      verificar_integridade_estoque: {
        Args: Record<PropertyKey, never>
        Returns: {
          material_nome: string
          lote_material: string
          estoque_atual: number
          total_usado: number
          estoque_esperado: number
          diferenca: number
          status: string
        }[]
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
