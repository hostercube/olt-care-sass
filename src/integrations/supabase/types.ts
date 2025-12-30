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
      alerts: {
        Row: {
          created_at: string
          device_id: string | null
          device_name: string | null
          id: string
          is_read: boolean
          message: string
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          id?: string
          is_read?: boolean
          message: string
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          type: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          id?: string
          is_read?: boolean
          message?: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: []
      }
      olts: {
        Row: {
          active_ports: number
          brand: Database["public"]["Enums"]["olt_brand"]
          created_at: string
          created_by: string | null
          id: string
          ip_address: string
          last_polled: string | null
          mikrotik_ip: string | null
          mikrotik_password_encrypted: string | null
          mikrotik_port: number | null
          mikrotik_username: string | null
          name: string
          olt_mode: Database["public"]["Enums"]["olt_mode"] | null
          password_encrypted: string
          port: number
          status: Database["public"]["Enums"]["connection_status"]
          total_ports: number
          updated_at: string
          username: string
        }
        Insert: {
          active_ports?: number
          brand: Database["public"]["Enums"]["olt_brand"]
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address: string
          last_polled?: string | null
          mikrotik_ip?: string | null
          mikrotik_password_encrypted?: string | null
          mikrotik_port?: number | null
          mikrotik_username?: string | null
          name: string
          olt_mode?: Database["public"]["Enums"]["olt_mode"] | null
          password_encrypted: string
          port?: number
          status?: Database["public"]["Enums"]["connection_status"]
          total_ports?: number
          updated_at?: string
          username: string
        }
        Update: {
          active_ports?: number
          brand?: Database["public"]["Enums"]["olt_brand"]
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address?: string
          last_polled?: string | null
          mikrotik_ip?: string | null
          mikrotik_password_encrypted?: string | null
          mikrotik_port?: number | null
          mikrotik_username?: string | null
          name?: string
          olt_mode?: Database["public"]["Enums"]["olt_mode"] | null
          password_encrypted?: string
          port?: number
          status?: Database["public"]["Enums"]["connection_status"]
          total_ports?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      onus: {
        Row: {
          created_at: string
          id: string
          last_offline: string | null
          last_online: string | null
          mac_address: string | null
          name: string
          olt_id: string
          onu_index: number
          pon_port: string
          pppoe_username: string | null
          router_name: string | null
          rx_power: number | null
          serial_number: string | null
          status: Database["public"]["Enums"]["connection_status"]
          tx_power: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_offline?: string | null
          last_online?: string | null
          mac_address?: string | null
          name: string
          olt_id: string
          onu_index: number
          pon_port: string
          pppoe_username?: string | null
          router_name?: string | null
          rx_power?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          tx_power?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_offline?: string | null
          last_online?: string | null
          mac_address?: string | null
          name?: string
          olt_id?: string
          onu_index?: number
          pon_port?: string
          pppoe_username?: string | null
          router_name?: string | null
          rx_power?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          tx_power?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onus_olt_id_fkey"
            columns: ["olt_id"]
            isOneToOne: false
            referencedRelation: "olts"
            referencedColumns: ["id"]
          },
        ]
      }
      power_readings: {
        Row: {
          id: string
          onu_id: string
          recorded_at: string
          rx_power: number
          tx_power: number
        }
        Insert: {
          id?: string
          onu_id: string
          recorded_at?: string
          rx_power: number
          tx_power: number
        }
        Update: {
          id?: string
          onu_id?: string
          recorded_at?: string
          rx_power?: number
          tx_power?: number
        }
        Relationships: [
          {
            foreignKeyName: "power_readings_onu_id_fkey"
            columns: ["onu_id"]
            isOneToOne: false
            referencedRelation: "onus"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authenticated: { Args: never; Returns: boolean }
    }
    Enums: {
      alert_severity: "critical" | "warning" | "info"
      alert_type:
        | "onu_offline"
        | "power_drop"
        | "olt_unreachable"
        | "high_latency"
      app_role: "admin" | "operator" | "viewer"
      connection_status: "online" | "offline" | "warning" | "unknown"
      olt_brand:
        | "ZTE"
        | "Huawei"
        | "Fiberhome"
        | "Nokia"
        | "BDCOM"
        | "VSOL"
        | "Other"
        | "DBC"
        | "CDATA"
        | "ECOM"
      olt_mode: "EPON" | "GPON"
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
      alert_severity: ["critical", "warning", "info"],
      alert_type: [
        "onu_offline",
        "power_drop",
        "olt_unreachable",
        "high_latency",
      ],
      app_role: ["admin", "operator", "viewer"],
      connection_status: ["online", "offline", "warning", "unknown"],
      olt_brand: [
        "ZTE",
        "Huawei",
        "Fiberhome",
        "Nokia",
        "BDCOM",
        "VSOL",
        "Other",
        "DBC",
        "CDATA",
        "ECOM",
      ],
      olt_mode: ["EPON", "GPON"],
    },
  },
} as const
