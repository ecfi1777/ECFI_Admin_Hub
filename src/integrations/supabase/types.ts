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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      builders: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      crew_members: {
        Row: {
          created_at: string
          crew_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          crew_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          crew_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note_date: string
          notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note_date: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note_date?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      inspection_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inspectors: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      phases: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_documents: {
        Row: {
          category: string
          content_type: string | null
          created_at: string
          created_by: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          category: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_statuses: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          authorization_numbers: string | null
          basement_type: string | null
          builder_id: string | null
          county: string | null
          created_at: string
          created_by: string | null
          full_address: string | null
          google_drive_url: string | null
          id: string
          location_id: string | null
          lot_number: string
          notes: string | null
          permit_number: string | null
          status_id: string | null
          updated_at: string
          wall_height: string | null
        }
        Insert: {
          authorization_numbers?: string | null
          basement_type?: string | null
          builder_id?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          full_address?: string | null
          google_drive_url?: string | null
          id?: string
          location_id?: string | null
          lot_number: string
          notes?: string | null
          permit_number?: string | null
          status_id?: string | null
          updated_at?: string
          wall_height?: string | null
        }
        Update: {
          authorization_numbers?: string | null
          basement_type?: string | null
          builder_id?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          full_address?: string | null
          google_drive_url?: string | null
          id?: string
          location_id?: string | null
          lot_number?: string
          notes?: string | null
          permit_number?: string | null
          status_id?: string | null
          updated_at?: string
          wall_height?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "project_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      pump_vendors: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_entries: {
        Row: {
          concrete_notes: string | null
          created_at: string
          created_by: string | null
          crew_id: string | null
          crew_notes: string | null
          crew_yards_poured: number | null
          deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
          id: string
          inspection_amount: number | null
          inspection_invoice_number: string | null
          inspection_notes: string | null
          inspection_type_id: string | null
          inspector_id: string | null
          invoice_complete: boolean
          invoice_number: string | null
          notes: string | null
          order_number: string | null
          order_status: string | null
          phase_id: string | null
          project_id: string | null
          pump_invoice_amount: number | null
          pump_invoice_number: string | null
          pump_notes: string | null
          pump_vendor_id: string | null
          qty_ordered: string | null
          ready_mix_invoice_amount: number | null
          ready_mix_invoice_number: string | null
          ready_mix_yards_billed: number | null
          scheduled_date: string
          start_time: string | null
          supplier_id: string | null
          to_be_invoiced: boolean
          updated_at: string
        }
        Insert: {
          concrete_notes?: string | null
          created_at?: string
          created_by?: string | null
          crew_id?: string | null
          crew_notes?: string | null
          crew_yards_poured?: number | null
          deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          inspection_amount?: number | null
          inspection_invoice_number?: string | null
          inspection_notes?: string | null
          inspection_type_id?: string | null
          inspector_id?: string | null
          invoice_complete?: boolean
          invoice_number?: string | null
          notes?: string | null
          order_number?: string | null
          order_status?: string | null
          phase_id?: string | null
          project_id?: string | null
          pump_invoice_amount?: number | null
          pump_invoice_number?: string | null
          pump_notes?: string | null
          pump_vendor_id?: string | null
          qty_ordered?: string | null
          ready_mix_invoice_amount?: number | null
          ready_mix_invoice_number?: string | null
          ready_mix_yards_billed?: number | null
          scheduled_date: string
          start_time?: string | null
          supplier_id?: string | null
          to_be_invoiced?: boolean
          updated_at?: string
        }
        Update: {
          concrete_notes?: string | null
          created_at?: string
          created_by?: string | null
          crew_id?: string | null
          crew_notes?: string | null
          crew_yards_poured?: number | null
          deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          inspection_amount?: number | null
          inspection_invoice_number?: string | null
          inspection_notes?: string | null
          inspection_type_id?: string | null
          inspector_id?: string | null
          invoice_complete?: boolean
          invoice_number?: string | null
          notes?: string | null
          order_number?: string | null
          order_status?: string | null
          phase_id?: string | null
          project_id?: string | null
          pump_invoice_amount?: number | null
          pump_invoice_number?: string | null
          pump_notes?: string | null
          pump_vendor_id?: string | null
          qty_ordered?: string | null
          ready_mix_invoice_amount?: number | null
          ready_mix_invoice_number?: string | null
          ready_mix_yards_billed?: number | null
          scheduled_date?: string
          start_time?: string | null
          supplier_id?: string | null
          to_be_invoiced?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_entries_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_inspection_type_id_fkey"
            columns: ["inspection_type_id"]
            isOneToOne: false
            referencedRelation: "inspection_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "inspectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_pump_vendor_id_fkey"
            columns: ["pump_vendor_id"]
            isOneToOne: false
            referencedRelation: "pump_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
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
    Enums: {},
  },
} as const
