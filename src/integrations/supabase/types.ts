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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          device_id: string | null
          device_name: string | null
          id: string
          is_read: boolean
          message: string
          severity: Database["public"]["Enums"]["alert_severity"]
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_health_history: {
        Row: {
          cpu_percent: number | null
          device_id: string
          device_name: string
          device_type: string
          free_memory_bytes: number | null
          id: string
          memory_percent: number | null
          recorded_at: string
          total_memory_bytes: number | null
          uptime_seconds: number | null
        }
        Insert: {
          cpu_percent?: number | null
          device_id: string
          device_name: string
          device_type: string
          free_memory_bytes?: number | null
          id?: string
          memory_percent?: number | null
          recorded_at?: string
          total_memory_bytes?: number | null
          uptime_seconds?: number | null
        }
        Update: {
          cpu_percent?: number | null
          device_id?: string
          device_name?: string
          device_type?: string
          free_memory_bytes?: number | null
          id?: string
          memory_percent?: number | null
          recorded_at?: string
          total_memory_bytes?: number | null
          uptime_seconds?: number | null
        }
        Relationships: []
      }
      email_gateway_settings: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_enabled: boolean | null
          provider: string
          sender_email: string | null
          sender_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_username: string | null
          updated_at: string
          use_tls: boolean | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          provider?: string
          sender_email?: string | null
          sender_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string
          use_tls?: boolean | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          provider?: string
          sender_email?: string | null
          sender_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string
          use_tls?: boolean | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message: string
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          line_items: Json | null
          notes: string | null
          paid_at: string | null
          payment_id: string | null
          status: string
          subscription_id: string | null
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          invoice_number: string
          line_items?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_id?: string | null
          status?: string
          subscription_id?: string | null
          tax_amount?: number | null
          tenant_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          line_items?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_id?: string | null
          status?: string
          subscription_id?: string | null
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          alert_notifications: boolean
          created_at: string
          email_address: string | null
          email_enabled: boolean
          id: string
          phone_number: string | null
          reminder_days_before: number
          sms_enabled: boolean
          subscription_reminders: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          alert_notifications?: boolean
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean
          id?: string
          phone_number?: string | null
          reminder_days_before?: number
          sms_enabled?: boolean
          subscription_reminders?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          alert_notifications?: boolean
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean
          id?: string
          phone_number?: string | null
          reminder_days_before?: number
          sms_enabled?: boolean
          subscription_reminders?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          message: string
          notification_type: string
          recipient: string
          scheduled_at: string
          sent_at: string | null
          status: string
          subject: string | null
          tenant_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          notification_type: string
          recipient: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          notification_type?: string
          recipient?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      olt_debug_logs: {
        Row: {
          commands_sent: string[] | null
          connection_method: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          olt_id: string | null
          olt_name: string
          parsed_count: number | null
          raw_output: string | null
        }
        Insert: {
          commands_sent?: string[] | null
          connection_method?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          olt_id?: string | null
          olt_name: string
          parsed_count?: number | null
          raw_output?: string | null
        }
        Update: {
          commands_sent?: string[] | null
          connection_method?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          olt_id?: string | null
          olt_name?: string
          parsed_count?: number | null
          raw_output?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "olt_debug_logs_olt_id_fkey"
            columns: ["olt_id"]
            isOneToOne: false
            referencedRelation: "olts"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          total_ports?: number
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "olts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      onu_edit_history: {
        Row: {
          edited_at: string
          edited_by: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          onu_id: string
        }
        Insert: {
          edited_at?: string
          edited_by?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          onu_id: string
        }
        Update: {
          edited_at?: string
          edited_by?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          onu_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onu_edit_history_onu_id_fkey"
            columns: ["onu_id"]
            isOneToOne: false
            referencedRelation: "onus"
            referencedColumns: ["id"]
          },
        ]
      }
      onu_status_history: {
        Row: {
          changed_at: string
          duration_seconds: number | null
          id: string
          onu_id: string
          status: string
        }
        Insert: {
          changed_at?: string
          duration_seconds?: number | null
          id?: string
          onu_id: string
          status: string
        }
        Update: {
          changed_at?: string
          duration_seconds?: number | null
          id?: string
          onu_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "onu_status_history_onu_id_fkey"
            columns: ["onu_id"]
            isOneToOne: false
            referencedRelation: "onus"
            referencedColumns: ["id"]
          },
        ]
      }
      onus: {
        Row: {
          alive_time: string | null
          created_at: string
          distance: number | null
          hardware_version: string | null
          id: string
          last_offline: string | null
          last_online: string | null
          mac_address: string | null
          model_id: string | null
          name: string
          offline_reason: string | null
          olt_id: string
          onu_index: number
          pon_port: string
          pppoe_username: string | null
          router_mac: string | null
          router_name: string | null
          rx_power: number | null
          serial_number: string | null
          software_version: string | null
          status: Database["public"]["Enums"]["connection_status"]
          temperature: number | null
          tx_power: number | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          alive_time?: string | null
          created_at?: string
          distance?: number | null
          hardware_version?: string | null
          id?: string
          last_offline?: string | null
          last_online?: string | null
          mac_address?: string | null
          model_id?: string | null
          name: string
          offline_reason?: string | null
          olt_id: string
          onu_index: number
          pon_port: string
          pppoe_username?: string | null
          router_mac?: string | null
          router_name?: string | null
          rx_power?: number | null
          serial_number?: string | null
          software_version?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          temperature?: number | null
          tx_power?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          alive_time?: string | null
          created_at?: string
          distance?: number | null
          hardware_version?: string | null
          id?: string
          last_offline?: string | null
          last_online?: string | null
          mac_address?: string | null
          model_id?: string | null
          name?: string
          offline_reason?: string | null
          olt_id?: string
          onu_index?: number
          pon_port?: string
          pppoe_username?: string | null
          router_mac?: string | null
          router_name?: string | null
          rx_power?: number | null
          serial_number?: string | null
          software_version?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          temperature?: number | null
          tx_power?: number | null
          updated_at?: string
          vendor_id?: string | null
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
      packages: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_olts: number
          max_onus: number | null
          max_users: number
          name: string
          price_monthly: number
          price_yearly: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_olts?: number
          max_onus?: number | null
          max_users?: number
          name: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_olts?: number
          max_onus?: number | null
          max_users?: number
          name?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateway_settings: {
        Row: {
          config: Json | null
          created_at: string
          display_name: string
          gateway: Database["public"]["Enums"]["payment_method"]
          id: string
          instructions: string | null
          is_enabled: boolean | null
          sandbox_mode: boolean | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          display_name: string
          gateway: Database["public"]["Enums"]["payment_method"]
          id?: string
          instructions?: string | null
          is_enabled?: boolean | null
          sandbox_mode?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          display_name?: string
          gateway?: Database["public"]["Enums"]["payment_method"]
          id?: string
          instructions?: string | null
          is_enabled?: boolean | null
          sandbox_mode?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          description: string | null
          gateway_response: Json | null
          id: string
          invoice_number: string | null
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          tenant_id: string
          transaction_id: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          description?: string | null
          gateway_response?: Json | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          tenant_id: string
          transaction_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          gateway_response?: Json | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          tenant_id?: string
          transaction_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      sms_gateway_settings: {
        Row: {
          api_key: string | null
          api_url: string | null
          config: Json | null
          created_at: string
          id: string
          is_enabled: boolean | null
          provider: string
          sender_id: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          provider?: string
          sender_id?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          provider?: string
          sender_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message: string
          phone_number: string
          provider_response: Json | null
          sent_at: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          phone_number: string
          provider_response?: Json | null
          sent_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          phone_number?: string
          provider_response?: Json | null
          sent_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at: string | null
          cancelled_reason: string | null
          created_at: string
          ends_at: string
          id: string
          package_id: string
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          auto_renew?: boolean | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          ends_at: string
          id?: string
          package_id: string
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          auto_renew?: boolean | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          package_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      tenant_users: {
        Row: {
          created_at: string
          id: string
          is_owner: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_owner?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_owner?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          custom_domain: string | null
          email: string
          features: Json | null
          id: string
          logo_url: string | null
          max_olts: number | null
          max_users: number | null
          name: string
          notes: string | null
          owner_user_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          subdomain: string | null
          suspended_at: string | null
          suspended_reason: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          custom_domain?: string | null
          email: string
          features?: Json | null
          id?: string
          logo_url?: string | null
          max_olts?: number | null
          max_users?: number | null
          name: string
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          subdomain?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          custom_domain?: string | null
          email?: string
          features?: Json | null
          id?: string
          logo_url?: string | null
          max_olts?: number | null
          max_users?: number | null
          name?: string
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          subdomain?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string
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
      get_user_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authenticated: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_tenant_active: { Args: { _tenant_id: string }; Returns: boolean }
      queue_subscription_reminders: { Args: never; Returns: undefined }
    }
    Enums: {
      alert_severity: "critical" | "warning" | "info"
      alert_type:
        | "onu_offline"
        | "power_drop"
        | "olt_unreachable"
        | "high_latency"
      app_role: "admin" | "operator" | "viewer" | "super_admin"
      billing_cycle: "monthly" | "yearly"
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
      payment_method: "sslcommerz" | "bkash" | "rocket" | "nagad" | "manual"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      subscription_status: "active" | "expired" | "cancelled" | "pending"
      tenant_status: "active" | "suspended" | "trial" | "cancelled"
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
      app_role: ["admin", "operator", "viewer", "super_admin"],
      billing_cycle: ["monthly", "yearly"],
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
      payment_method: ["sslcommerz", "bkash", "rocket", "nagad", "manual"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      subscription_status: ["active", "expired", "cancelled", "pending"],
      tenant_status: ["active", "suspended", "trial", "cancelled"],
    },
  },
} as const
