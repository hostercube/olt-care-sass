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
      account_heads: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          tenant_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_heads_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "account_heads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_heads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      areas: {
        Row: {
          created_at: string
          description: string | null
          district: string | null
          district_id: string | null
          house_no: string | null
          id: string
          name: string
          olt_id: string | null
          road_no: string | null
          section_block: string | null
          tenant_id: string
          union_id: string | null
          union_name: string | null
          upazila: string | null
          upazila_id: string | null
          updated_at: string
          village: string | null
          village_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          district?: string | null
          district_id?: string | null
          house_no?: string | null
          id?: string
          name: string
          olt_id?: string | null
          road_no?: string | null
          section_block?: string | null
          tenant_id: string
          union_id?: string | null
          union_name?: string | null
          upazila?: string | null
          upazila_id?: string | null
          updated_at?: string
          village?: string | null
          village_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          district?: string | null
          district_id?: string | null
          house_no?: string | null
          id?: string
          name?: string
          olt_id?: string | null
          road_no?: string | null
          section_block?: string | null
          tenant_id?: string
          union_id?: string | null
          union_name?: string | null
          upazila?: string | null
          upazila_id?: string | null
          updated_at?: string
          village?: string | null
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_olt_id_fkey"
            columns: ["olt_id"]
            isOneToOne: false
            referencedRelation: "olts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_upazila_id_fkey"
            columns: ["upazila_id"]
            isOneToOne: false
            referencedRelation: "upazilas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          action: string
          customer_id: string | null
          details: Json | null
          error_message: string | null
          executed_at: string
          id: string
          rule_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          action: string
          customer_id?: string | null
          details?: Json | null
          error_message?: string | null
          executed_at?: string
          id?: string
          rule_id?: string | null
          status: string
          tenant_id: string
        }
        Update: {
          action?: string
          customer_id?: string | null
          details?: Json | null
          error_message?: string | null
          executed_at?: string
          id?: string
          rule_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "billing_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bandwidth_bill_collections: {
        Row: {
          amount: number
          client_id: string | null
          collection_date: string
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          payment_method: string | null
          receipt_number: string
          received_by: string | null
          remarks: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          collection_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          payment_method?: string | null
          receipt_number: string
          received_by?: string | null
          remarks?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          collection_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          payment_method?: string | null
          receipt_number?: string
          received_by?: string | null
          remarks?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bandwidth_bill_collections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "bandwidth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bandwidth_bill_collections_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "bandwidth_sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bandwidth_bill_collections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bandwidth_client_rates: {
        Row: {
          client_id: string
          created_at: string
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          item_id: string
          notes: string | null
          rate: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          item_id: string
          notes?: string | null
          rate?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string
          notes?: string | null
          rate?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bandwidth_client_rates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "bandwidth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bandwidth_client_rates_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "bandwidth_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bandwidth_client_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bandwidth_clients: {
        Row: {
          account_number: string | null
          activation_date: string | null
          address: string | null
          bank_details: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          mobile: string | null
          name: string
          notes: string | null
          nttn_info: string | null
          password_hash: string | null
          phone: string | null
          pop_name: string | null
          reference_by: string | null
          scr_link_id: string | null
          status: string | null
          tenant_id: string
          total_receivable: number | null
          updated_at: string
          username: string | null
          vlan_ip: string | null
          vlan_name: string | null
        }
        Insert: {
          account_number?: string | null
          activation_date?: string | null
          address?: string | null
          bank_details?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          mobile?: string | null
          name: string
          notes?: string | null
          nttn_info?: string | null
          password_hash?: string | null
          phone?: string | null
          pop_name?: string | null
          reference_by?: string | null
          scr_link_id?: string | null
          status?: string | null
          tenant_id: string
          total_receivable?: number | null
          updated_at?: string
          username?: string | null
          vlan_ip?: string | null
          vlan_name?: string | null
        }
        Update: {
          account_number?: string | null
          activation_date?: string | null
          address?: string | null
          bank_details?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          mobile?: string | null
          name?: string
          notes?: string | null
          nttn_info?: string | null
          password_hash?: string | null
          phone?: string | null
          pop_name?: string | null
          reference_by?: string | null
          scr_link_id?: string | null
          status?: string | null
          tenant_id?: string
          total_receivable?: number | null
          updated_at?: string
          username?: string | null
          vlan_ip?: string | null
          vlan_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bandwidth_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bandwidth_item_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bandwidth_item_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bandwidth_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          unit: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bandwidth_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "bandwidth_item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bandwidth_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bandwidth_provider_payments: {
        Row: {
          amount: number
          bill_id: string | null
          created_at: string
          created_by: string | null
          id: string
          paid_by: string | null
          payment_date: string
          payment_method: string | null
          payment_number: string
          provider_id: string | null
          remarks: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          bill_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          paid_by?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_number: string
          provider_id?: string | null
          remarks?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bill_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          paid_by?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_number?: string
          provider_id?: string | null
          remarks?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bandwidth_provider_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bandwidth_purchase_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bandwidth_provider_payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "bandwidth_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bandwidth_provider_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bandwidth_providers: {
        Row: {
          account_number: string | null
          address: string | null
          bank_details: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string
          total_due: number | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          bank_details?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
          total_due?: number | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          address?: string | null
          bank_details?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          total_due?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bandwidth_providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bandwidth_purchase_bill_items: {
        Row: {
          bill_id: string
          created_at: string
          description: string | null
          from_date: string | null
          id: string
          item_id: string | null
          item_name: string
          quantity: number | null
          rate: number | null
          to_date: string | null
          total: number | null
          unit: string | null
          vat_amount: number | null
          vat_percent: number | null
        }
        Insert: {
          bill_id: string
          created_at?: string
          description?: string | null
          from_date?: string | null
          id?: string
          item_id?: string | null
          item_name: string
          quantity?: number | null
          rate?: number | null
          to_date?: string | null
          total?: number | null
          unit?: string | null
          vat_amount?: number | null
          vat_percent?: number | null
        }
        Update: {
          bill_id?: string
          created_at?: string
          description?: string | null
          from_date?: string | null
          id?: string
          item_id?: string | null
          item_name?: string
          quantity?: number | null
          rate?: number | null
          to_date?: string | null
          total?: number | null
          unit?: string | null
          vat_amount?: number | null
          vat_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bandwidth_purchase_bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bandwidth_purchase_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bandwidth_purchase_bill_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "bandwidth_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bandwidth_purchase_bills: {
        Row: {
          attachment_url: string | null
          billing_date: string
          created_at: string
          created_by: string | null
          discount: number | null
          due_amount: number | null
          from_date: string | null
          id: string
          invoice_number: string
          paid_amount: number | null
          paid_by: string | null
          payment_method: string | null
          payment_status: string | null
          provider_id: string | null
          received_by: string | null
          remarks: string | null
          subtotal: number | null
          tenant_id: string
          to_date: string | null
          total_amount: number | null
          updated_at: string
          vat_amount: number | null
        }
        Insert: {
          attachment_url?: string | null
          billing_date?: string
          created_at?: string
          created_by?: string | null
          discount?: number | null
          due_amount?: number | null
          from_date?: string | null
          id?: string
          invoice_number: string
          paid_amount?: number | null
          paid_by?: string | null
          payment_method?: string | null
          payment_status?: string | null
          provider_id?: string | null
          received_by?: string | null
          remarks?: string | null
          subtotal?: number | null
          tenant_id: string
          to_date?: string | null
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
        }
        Update: {
          attachment_url?: string | null
          billing_date?: string
          created_at?: string
          created_by?: string | null
          discount?: number | null
          due_amount?: number | null
          from_date?: string | null
          id?: string
          invoice_number?: string
          paid_amount?: number | null
          paid_by?: string | null
          payment_method?: string | null
          payment_status?: string | null
          provider_id?: string | null
          received_by?: string | null
          remarks?: string | null
          subtotal?: number | null
          tenant_id?: string
          to_date?: string | null
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bandwidth_purchase_bills_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "bandwidth_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bandwidth_purchase_bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bandwidth_sales_invoice_items: {
        Row: {
          created_at: string
          description: string | null
          from_date: string | null
          id: string
          invoice_id: string
          item_id: string | null
          item_name: string
          quantity: number | null
          rate: number | null
          to_date: string | null
          total: number | null
          unit: string | null
          vat_amount: number | null
          vat_percent: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          from_date?: string | null
          id?: string
          invoice_id: string
          item_id?: string | null
          item_name: string
          quantity?: number | null
          rate?: number | null
          to_date?: string | null
          total?: number | null
          unit?: string | null
          vat_amount?: number | null
          vat_percent?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          from_date?: string | null
          id?: string
          invoice_id?: string
          item_id?: string | null
          item_name?: string
          quantity?: number | null
          rate?: number | null
          to_date?: string | null
          total?: number | null
          unit?: string | null
          vat_amount?: number | null
          vat_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bandwidth_sales_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "bandwidth_sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bandwidth_sales_invoice_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "bandwidth_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bandwidth_sales_invoices: {
        Row: {
          attachment_url: string | null
          billing_date: string
          client_id: string | null
          created_at: string
          created_by: string | null
          discount: number | null
          due_amount: number | null
          due_date: string | null
          from_date: string | null
          id: string
          invoice_number: string
          paid_amount: number | null
          payment_status: string | null
          remarks: string | null
          subtotal: number | null
          tenant_id: string
          to_date: string | null
          total_amount: number | null
          updated_at: string
          vat_amount: number | null
        }
        Insert: {
          attachment_url?: string | null
          billing_date?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number | null
          due_amount?: number | null
          due_date?: string | null
          from_date?: string | null
          id?: string
          invoice_number: string
          paid_amount?: number | null
          payment_status?: string | null
          remarks?: string | null
          subtotal?: number | null
          tenant_id: string
          to_date?: string | null
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
        }
        Update: {
          attachment_url?: string | null
          billing_date?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number | null
          due_amount?: number | null
          due_date?: string | null
          from_date?: string | null
          id?: string
          invoice_number?: string
          paid_amount?: number | null
          payment_status?: string | null
          remarks?: string | null
          subtotal?: number | null
          tenant_id?: string
          to_date?: string | null
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bandwidth_sales_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "bandwidth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bandwidth_sales_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          branch: string | null
          created_at: string
          current_balance: number | null
          id: string
          is_active: boolean | null
          routing_number: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          branch?: string | null
          created_at?: string
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          routing_number?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          branch?: string | null
          created_at?: string
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          routing_number?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_generations: {
        Row: {
          billing_month: string
          generated_at: string
          generated_by: string | null
          id: string
          notes: string | null
          status: string | null
          tenant_id: string
          total_amount: number | null
          total_bills: number | null
        }
        Insert: {
          billing_month: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          tenant_id: string
          total_amount?: number | null
          total_bills?: number | null
        }
        Update: {
          billing_month?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          tenant_id?: string
          total_amount?: number | null
          total_bills?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_generations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_rules: {
        Row: {
          action: string
          action_params: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          last_run: string | null
          name: string
          rule_type: string
          tenant_id: string
          trigger_condition: string | null
          trigger_days: number | null
          updated_at: string
        }
        Insert: {
          action: string
          action_params?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run?: string | null
          name: string
          rule_type: string
          tenant_id: string
          trigger_condition?: string | null
          trigger_days?: number | null
          updated_at?: string
        }
        Update: {
          action?: string
          action_params?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run?: string | null
          name?: string
          rule_type?: string
          tenant_id?: string
          trigger_condition?: string | null
          trigger_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bkash_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          customer_code: string | null
          customer_id: string | null
          id: string
          matched_at: string | null
          payment_id: string | null
          payment_type: string
          raw_payload: Json | null
          receiver_number: string | null
          reference: string | null
          sender_number: string | null
          status: string
          tenant_id: string
          trx_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          customer_code?: string | null
          customer_id?: string | null
          id?: string
          matched_at?: string | null
          payment_id?: string | null
          payment_type: string
          raw_payload?: Json | null
          receiver_number?: string | null
          reference?: string | null
          sender_number?: string | null
          status?: string
          tenant_id: string
          trx_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          customer_code?: string | null
          customer_id?: string | null
          id?: string
          matched_at?: string | null
          payment_id?: string | null
          payment_type?: string
          raw_payload?: Json | null
          receiver_number?: string | null
          reference?: string | null
          sender_number?: string | null
          status?: string
          tenant_id?: string
          trx_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bkash_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bkash_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      btrc_reports: {
        Row: {
          active_customers: number | null
          created_at: string
          disconnected_customers: number | null
          generated_at: string | null
          id: string
          new_customers: number | null
          report_data: Json | null
          report_period: string
          report_type: string
          status: string | null
          submitted_at: string | null
          tenant_id: string
          total_bandwidth: string | null
          total_customers: number | null
          total_revenue: number | null
        }
        Insert: {
          active_customers?: number | null
          created_at?: string
          disconnected_customers?: number | null
          generated_at?: string | null
          id?: string
          new_customers?: number | null
          report_data?: Json | null
          report_period: string
          report_type: string
          status?: string | null
          submitted_at?: string | null
          tenant_id: string
          total_bandwidth?: string | null
          total_customers?: number | null
          total_revenue?: number | null
        }
        Update: {
          active_customers?: number | null
          created_at?: string
          disconnected_customers?: number | null
          generated_at?: string | null
          id?: string
          new_customers?: number | null
          report_data?: Json | null
          report_period?: string
          report_type?: string
          status?: string | null
          submitted_at?: string | null
          tenant_id?: string
          total_bandwidth?: string | null
          total_customers?: number | null
          total_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "btrc_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_book: {
        Row: {
          balance: number | null
          created_at: string
          created_by: string | null
          credit: number | null
          debit: number | null
          entry_date: string
          id: string
          particulars: string
          payment_mode: string | null
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          voucher_no: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string
          created_by?: string | null
          credit?: number | null
          debit?: number | null
          entry_date?: string
          id?: string
          particulars: string
          payment_mode?: string | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          voucher_no?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string
          created_by?: string | null
          credit?: number | null
          debit?: number | null
          entry_date?: string
          id?: string
          particulars?: string
          payment_mode?: string | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          voucher_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_book_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_requests: {
        Row: {
          address: string | null
          area_id: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          email: string | null
          id: string
          nid_number: string | null
          notes: string | null
          package_id: string | null
          phone: string
          preferred_date: string | null
          referral_code: string | null
          rejection_reason: string | null
          request_number: string | null
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          area_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          email?: string | null
          id?: string
          nid_number?: string | null
          notes?: string | null
          package_id?: string | null
          phone: string
          preferred_date?: string | null
          referral_code?: string | null
          rejection_reason?: string | null
          request_number?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          area_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          email?: string | null
          id?: string
          nid_number?: string | null
          notes?: string | null
          package_id?: string | null
          phone?: string
          preferred_date?: string | null
          referral_code?: string | null
          rejection_reason?: string | null
          request_number?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "isp_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_apps_config: {
        Row: {
          android_app_url: string | null
          app_icon_url: string | null
          app_name: string | null
          created_at: string | null
          dashboard_announcement: string | null
          dashboard_announcement_enabled: boolean | null
          dashboard_banner_link: string | null
          dashboard_banner_url: string | null
          force_update_enabled: boolean | null
          ftp_enabled: boolean | null
          id: string
          ios_app_url: string | null
          live_tv_enabled: boolean | null
          maintenance_message: string | null
          maintenance_mode: boolean | null
          min_app_version: string | null
          news_enabled: boolean | null
          primary_color: string | null
          referral_enabled: boolean | null
          secondary_color: string | null
          speed_test_enabled: boolean | null
          splash_screen_url: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          android_app_url?: string | null
          app_icon_url?: string | null
          app_name?: string | null
          created_at?: string | null
          dashboard_announcement?: string | null
          dashboard_announcement_enabled?: boolean | null
          dashboard_banner_link?: string | null
          dashboard_banner_url?: string | null
          force_update_enabled?: boolean | null
          ftp_enabled?: boolean | null
          id?: string
          ios_app_url?: string | null
          live_tv_enabled?: boolean | null
          maintenance_message?: string | null
          maintenance_mode?: boolean | null
          min_app_version?: string | null
          news_enabled?: boolean | null
          primary_color?: string | null
          referral_enabled?: boolean | null
          secondary_color?: string | null
          speed_test_enabled?: boolean | null
          splash_screen_url?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          android_app_url?: string | null
          app_icon_url?: string | null
          app_name?: string | null
          created_at?: string | null
          dashboard_announcement?: string | null
          dashboard_announcement_enabled?: boolean | null
          dashboard_banner_link?: string | null
          dashboard_banner_url?: string | null
          force_update_enabled?: boolean | null
          ftp_enabled?: boolean | null
          id?: string
          ios_app_url?: string | null
          live_tv_enabled?: boolean | null
          maintenance_message?: string | null
          maintenance_mode?: boolean | null
          min_app_version?: string | null
          news_enabled?: boolean | null
          primary_color?: string | null
          referral_enabled?: boolean | null
          secondary_color?: string | null
          speed_test_enabled?: boolean | null
          splash_screen_url?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_apps_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_apps_links: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          open_in_browser: boolean | null
          requires_login: boolean | null
          sort_order: number | null
          tenant_id: string
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          open_in_browser?: boolean | null
          requires_login?: boolean | null
          sort_order?: number | null
          tenant_id: string
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          open_in_browser?: boolean | null
          requires_login?: boolean | null
          sort_order?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_apps_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_bills: {
        Row: {
          amount: number
          bill_date: string
          bill_number: string
          billing_month: string
          collected_by: string | null
          created_at: string
          customer_id: string
          discount: number | null
          due_date: string
          id: string
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["bill_status"]
          tax: number | null
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount?: number
          bill_date?: string
          bill_number: string
          billing_month: string
          collected_by?: string | null
          created_at?: string
          customer_id: string
          discount?: number | null
          due_date: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          tax?: number | null
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          bill_date?: string
          bill_number?: string
          billing_month?: string
          collected_by?: string | null
          created_at?: string
          customer_id?: string
          discount?: number | null
          due_date?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          tax?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_bills_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_imports: {
        Row: {
          completed_at: string | null
          created_at: string
          error_log: Json | null
          failed_count: number | null
          file_name: string
          id: string
          imported_by: string | null
          imported_count: number | null
          started_at: string | null
          status: string
          tenant_id: string
          total_rows: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_count?: number | null
          file_name: string
          id?: string
          imported_by?: string | null
          imported_count?: number | null
          started_at?: string | null
          status?: string
          tenant_id: string
          total_rows?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_count?: number | null
          file_name?: string
          id?: string
          imported_by?: string | null
          imported_count?: number | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          total_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_imports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payments: {
        Row: {
          amount: number
          bill_id: string | null
          collected_by: string | null
          created_at: string
          customer_id: string
          gateway_response: Json | null
          id: string
          notes: string | null
          payment_date: string
          payment_gateway: string | null
          payment_method: string
          tenant_id: string
          transaction_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          bill_id?: string | null
          collected_by?: string | null
          created_at?: string
          customer_id: string
          gateway_response?: Json | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_gateway?: string | null
          payment_method?: string
          tenant_id: string
          transaction_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          bill_id?: string | null
          collected_by?: string | null
          created_at?: string
          customer_id?: string
          gateway_response?: Json | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_gateway?: string | null
          payment_method?: string
          tenant_id?: string
          transaction_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "customer_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_recharges: {
        Row: {
          amount: number
          collected_by: string | null
          collected_by_name: string | null
          collected_by_type: string | null
          created_at: string
          customer_id: string
          discount: number | null
          id: string
          months: number | null
          new_expiry: string | null
          notes: string | null
          old_expiry: string | null
          original_payment_method: string | null
          paid_at: string | null
          paid_by: string | null
          paid_by_name: string | null
          payment_method: string | null
          recharge_date: string
          rejection_reason: string | null
          reseller_id: string | null
          status: string | null
          tenant_id: string
          transaction_id: string | null
        }
        Insert: {
          amount?: number
          collected_by?: string | null
          collected_by_name?: string | null
          collected_by_type?: string | null
          created_at?: string
          customer_id: string
          discount?: number | null
          id?: string
          months?: number | null
          new_expiry?: string | null
          notes?: string | null
          old_expiry?: string | null
          original_payment_method?: string | null
          paid_at?: string | null
          paid_by?: string | null
          paid_by_name?: string | null
          payment_method?: string | null
          recharge_date?: string
          rejection_reason?: string | null
          reseller_id?: string | null
          status?: string | null
          tenant_id: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          collected_by?: string | null
          collected_by_name?: string | null
          collected_by_type?: string | null
          created_at?: string
          customer_id?: string
          discount?: number | null
          id?: string
          months?: number | null
          new_expiry?: string | null
          notes?: string | null
          old_expiry?: string | null
          original_payment_method?: string | null
          paid_at?: string | null
          paid_by?: string | null
          paid_by_name?: string | null
          payment_method?: string | null
          recharge_date?: string
          rejection_reason?: string | null
          reseller_id?: string | null
          status?: string | null
          tenant_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_recharges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_recharges_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_recharges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_referrals: {
        Row: {
          bonus_amount: number | null
          bonus_paid_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          referral_code: string
          referred_customer_id: string | null
          referred_email: string | null
          referred_name: string | null
          referred_phone: string | null
          referrer_customer_id: string
          rejection_reason: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          bonus_amount?: number | null
          bonus_paid_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          referral_code: string
          referred_customer_id?: string | null
          referred_email?: string | null
          referred_name?: string | null
          referred_phone?: string | null
          referrer_customer_id: string
          rejection_reason?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          bonus_amount?: number | null
          bonus_paid_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          referral_code?: string
          referred_customer_id?: string | null
          referred_email?: string | null
          referred_name?: string | null
          referred_phone?: string | null
          referrer_customer_id?: string
          rejection_reason?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_referrals_referred_customer_id_fkey"
            columns: ["referred_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_referrals_referrer_customer_id_fkey"
            columns: ["referrer_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_referrals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          tenant_id: string
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          tenant_id: string
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          tenant_id?: string
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_wallet_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_wallet_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_withdraw_requests: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string
          id: string
          payment_details: Json | null
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id: string
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_withdraw_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_withdraw_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          area_id: string | null
          connection_date: string | null
          connection_type: string | null
          created_at: string
          customer_code: string | null
          customer_type_id: string | null
          due_amount: number | null
          email: string | null
          expiry_date: string | null
          id: string
          is_auto_disable: boolean | null
          last_activated_at: string | null
          last_caller_id: string | null
          last_deactivated_at: string | null
          last_ip_address: string | null
          last_payment_date: string | null
          mikrotik_id: string | null
          monthly_bill: number | null
          name: string
          nid_number: string | null
          notes: string | null
          onu_id: string | null
          onu_index: number | null
          onu_mac: string | null
          package_id: string | null
          phone: string | null
          pon_port: string | null
          pppoe_password: string | null
          pppoe_username: string | null
          referral_bonus_balance: number | null
          referral_code: string | null
          referred_by: string | null
          reseller_id: string | null
          router_mac: string | null
          status: Database["public"]["Enums"]["customer_status"]
          tenant_id: string
          updated_at: string
          wallet_balance: number | null
        }
        Insert: {
          address?: string | null
          area_id?: string | null
          connection_date?: string | null
          connection_type?: string | null
          created_at?: string
          customer_code?: string | null
          customer_type_id?: string | null
          due_amount?: number | null
          email?: string | null
          expiry_date?: string | null
          id?: string
          is_auto_disable?: boolean | null
          last_activated_at?: string | null
          last_caller_id?: string | null
          last_deactivated_at?: string | null
          last_ip_address?: string | null
          last_payment_date?: string | null
          mikrotik_id?: string | null
          monthly_bill?: number | null
          name: string
          nid_number?: string | null
          notes?: string | null
          onu_id?: string | null
          onu_index?: number | null
          onu_mac?: string | null
          package_id?: string | null
          phone?: string | null
          pon_port?: string | null
          pppoe_password?: string | null
          pppoe_username?: string | null
          referral_bonus_balance?: number | null
          referral_code?: string | null
          referred_by?: string | null
          reseller_id?: string | null
          router_mac?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tenant_id: string
          updated_at?: string
          wallet_balance?: number | null
        }
        Update: {
          address?: string | null
          area_id?: string | null
          connection_date?: string | null
          connection_type?: string | null
          created_at?: string
          customer_code?: string | null
          customer_type_id?: string | null
          due_amount?: number | null
          email?: string | null
          expiry_date?: string | null
          id?: string
          is_auto_disable?: boolean | null
          last_activated_at?: string | null
          last_caller_id?: string | null
          last_deactivated_at?: string | null
          last_ip_address?: string | null
          last_payment_date?: string | null
          mikrotik_id?: string | null
          monthly_bill?: number | null
          name?: string
          nid_number?: string | null
          notes?: string | null
          onu_id?: string | null
          onu_index?: number | null
          onu_mac?: string | null
          package_id?: string | null
          phone?: string | null
          pon_port?: string | null
          pppoe_password?: string | null
          pppoe_username?: string | null
          referral_bonus_balance?: number | null
          referral_code?: string | null
          referred_by?: string | null
          reseller_id?: string | null
          router_mac?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tenant_id?: string
          updated_at?: string
          wallet_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_customer_type_id_fkey"
            columns: ["customer_type_id"]
            isOneToOne: false
            referencedRelation: "customer_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_mikrotik_id_fkey"
            columns: ["mikrotik_id"]
            isOneToOne: false
            referencedRelation: "mikrotik_routers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_onu_id_fkey"
            columns: ["onu_id"]
            isOneToOne: false
            referencedRelation: "onus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "isp_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
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
      districts: {
        Row: {
          bn_name: string | null
          created_at: string
          division_id: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bn_name?: string | null
          created_at?: string
          division_id?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          bn_name?: string | null
          created_at?: string
          division_id?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "districts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          bn_name: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bn_name?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          bn_name?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "divisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          custom_recipients: string[] | null
          email_template_id: string | null
          failed_count: number | null
          id: string
          message: string
          name: string
          recipient_filter: Json | null
          recipient_type: string
          recipients: Json | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          sms_template_id: string | null
          status: string
          subject: string | null
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          custom_recipients?: string[] | null
          email_template_id?: string | null
          failed_count?: number | null
          id?: string
          message: string
          name: string
          recipient_filter?: Json | null
          recipient_type?: string
          recipients?: Json | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          sms_template_id?: string | null
          status?: string
          subject?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          custom_recipients?: string[] | null
          email_template_id?: string | null
          failed_count?: number | null
          id?: string
          message?: string
          name?: string
          recipient_filter?: Json | null
          recipient_type?: string
          recipients?: Json | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          sms_template_id?: string | null
          status?: string
          subject?: string | null
          total_recipients?: number | null
          updated_at?: string
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
          is_system: boolean | null
          name: string
          subject: string
          template_type: string
          tenant_id: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          subject: string
          template_type: string
          tenant_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          subject?: string
          template_type?: string
          tenant_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_ledger: {
        Row: {
          balance: number | null
          created_at: string
          created_by: string | null
          credit: number | null
          debit: number | null
          description: string | null
          employee_id: string
          entry_date: string
          id: string
          reference_id: string | null
          tenant_id: string
          transaction_type: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          created_by?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          employee_id: string
          entry_date?: string
          id?: string
          reference_id?: string | null
          tenant_id: string
          transaction_type: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          created_by?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          employee_id?: string
          entry_date?: string
          id?: string
          reference_id?: string | null
          tenant_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_ledger_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          bank_account: string | null
          basic_salary: number | null
          created_at: string
          department: string | null
          designation: string | null
          documents: Json | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          employee_code: string | null
          employee_type_id: string | null
          house_rent: number | null
          id: string
          joining_date: string | null
          medical_allowance: number | null
          name: string
          nid_number: string | null
          other_allowances: number | null
          phone: string | null
          photo_url: string | null
          status: string | null
          tenant_id: string
          transport_allowance: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          basic_salary?: number | null
          created_at?: string
          department?: string | null
          designation?: string | null
          documents?: Json | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          employee_code?: string | null
          employee_type_id?: string | null
          house_rent?: number | null
          id?: string
          joining_date?: string | null
          medical_allowance?: number | null
          name: string
          nid_number?: string | null
          other_allowances?: number | null
          phone?: string | null
          photo_url?: string | null
          status?: string | null
          tenant_id: string
          transport_allowance?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          basic_salary?: number | null
          created_at?: string
          department?: string | null
          designation?: string | null
          documents?: Json | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          employee_code?: string | null
          employee_type_id?: string | null
          house_rent?: number | null
          id?: string
          joining_date?: string | null
          medical_allowance?: number | null
          name?: string
          nid_number?: string | null
          other_allowances?: number | null
          phone?: string | null
          photo_url?: string | null
          status?: string | null
          tenant_id?: string
          transport_allowance?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_employee_type_id_fkey"
            columns: ["employee_type_id"]
            isOneToOne: false
            referencedRelation: "employee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          account_head_id: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          from_account: string | null
          id: string
          payment_method: string | null
          reference_no: string | null
          status: string | null
          tenant_id: string
          to_account: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          account_head_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          from_account?: string | null
          id?: string
          payment_method?: string | null
          reference_no?: string | null
          status?: string | null
          tenant_id: string
          to_account?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          account_head_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          from_account?: string | null
          id?: string
          payment_method?: string | null
          reference_no?: string | null
          status?: string | null
          tenant_id?: string
          to_account?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_account_head_id_fkey"
            columns: ["account_head_id"]
            isOneToOne: false
            referencedRelation: "account_heads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_brands_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          brand_id: string | null
          category_id: string | null
          color: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          id: string
          image_url: string | null
          location: string | null
          min_quantity: number | null
          name: string
          quantity: number | null
          sale_price: number | null
          size: string | null
          sku: string | null
          tenant_id: string
          unit_id: string | null
          unit_price: number | null
          updated_at: string
          warranty_period: string | null
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          min_quantity?: number | null
          name: string
          quantity?: number | null
          sale_price?: number | null
          size?: string | null
          sku?: string | null
          tenant_id: string
          unit_id?: string | null
          unit_price?: number | null
          updated_at?: string
          warranty_period?: string | null
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          min_quantity?: number | null
          name?: string
          quantity?: number | null
          sale_price?: number | null
          size?: string | null
          sku?: string | null
          tenant_id?: string
          unit_id?: string | null
          unit_price?: number | null
          updated_at?: string
          warranty_period?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "inventory_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          item_id: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          stock_after: number | null
          stock_before: number | null
          tenant_id: string
          total_value: number | null
          transaction_type: string
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          item_id: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          stock_after?: number | null
          stock_before?: number | null
          tenant_id: string
          total_value?: number | null
          transaction_type: string
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          stock_after?: number | null
          stock_before?: number | null
          tenant_id?: string
          total_value?: number | null
          transaction_type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_ledger_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          total_amount: number | null
          type: string
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          total_amount?: number | null
          type: string
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          total_amount?: number | null
          type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_units: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          short_name: string
          tenant_id: string
          unit_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          short_name: string
          tenant_id: string
          unit_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          short_name?: string
          tenant_id?: string
          unit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          amount: number
          created_at: string
          expected_return: number | null
          id: string
          investment_date: string
          investor_name: string
          notes: string | null
          return_date: string | null
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          expected_return?: number | null
          id?: string
          investment_date?: string
          investor_name: string
          notes?: string | null
          return_date?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          expected_return?: number | null
          id?: string
          investment_date?: string
          investor_name?: string
          notes?: string | null
          return_date?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      isp_packages: {
        Row: {
          billing_cycle: string | null
          created_at: string
          description: string | null
          download_speed: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          sort_order: number | null
          speed_unit: Database["public"]["Enums"]["speed_unit"]
          tenant_id: string
          updated_at: string
          upload_speed: number
          validity_days: number
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          description?: string | null
          download_speed?: number
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          sort_order?: number | null
          speed_unit?: Database["public"]["Enums"]["speed_unit"]
          tenant_id: string
          updated_at?: string
          upload_speed?: number
          validity_days?: number
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          description?: string | null
          download_speed?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          speed_unit?: Database["public"]["Enums"]["speed_unit"]
          tenant_id?: string
          updated_at?: string
          upload_speed?: number
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "isp_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string
          id: string
          leave_type_id: string | null
          remaining_days: number | null
          staff_id: string
          tenant_id: string
          total_days: number | null
          updated_at: string
          used_days: number | null
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          leave_type_id?: string | null
          remaining_days?: number | null
          staff_id: string
          tenant_id: string
          total_days?: number | null
          updated_at?: string
          used_days?: number | null
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          leave_type_id?: string | null
          remaining_days?: number | null
          staff_id?: string
          tenant_id?: string
          total_days?: number | null
          updated_at?: string
          used_days?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type_id: string | null
          reason: string | null
          rejection_reason: string | null
          staff_id: string
          start_date: string
          status: string
          tenant_id: string
          total_days: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          staff_id: string
          start_date: string
          status?: string
          tenant_id: string
          total_days?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          staff_id?: string
          start_date?: string
          status?: string
          tenant_id?: string
          total_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          max_days_per_year: number | null
          name: string
          short_name: string | null
          tenant_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_days_per_year?: number | null
          name: string
          short_name?: string | null
          tenant_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_days_per_year?: number | null
          name?: string
          short_name?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      location_visits: {
        Row: {
          area: string | null
          asn: string | null
          created_at: string | null
          device_type: string | null
          district: string | null
          full_address: string | null
          id: string
          ip_address: string | null
          isp_name: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          phone: string | null
          tenant_id: string
          thana: string | null
          token: string
          updated_at: string | null
          user_agent: string | null
          verified_at: string | null
          verified_by: string | null
          verified_status: string | null
          visited_at: string | null
        }
        Insert: {
          area?: string | null
          asn?: string | null
          created_at?: string | null
          device_type?: string | null
          district?: string | null
          full_address?: string | null
          id?: string
          ip_address?: string | null
          isp_name?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          phone?: string | null
          tenant_id: string
          thana?: string | null
          token: string
          updated_at?: string | null
          user_agent?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_status?: string | null
          visited_at?: string | null
        }
        Update: {
          area?: string | null
          asn?: string | null
          created_at?: string | null
          device_type?: string | null
          district?: string | null
          full_address?: string | null
          id?: string
          ip_address?: string | null
          isp_name?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          phone?: string | null
          tenant_id?: string
          thana?: string | null
          token?: string
          updated_at?: string | null
          user_agent?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_status?: string | null
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mikrotik_routers: {
        Row: {
          allow_customer_delete: boolean | null
          allow_queue_delete: boolean | null
          auto_disable_expired: boolean | null
          created_at: string
          expired_profile_name: string | null
          id: string
          ip_address: string
          is_primary: boolean | null
          last_synced: string | null
          name: string
          olt_id: string | null
          password_encrypted: string
          port: number | null
          status: string | null
          sync_pppoe: boolean | null
          sync_queues: boolean | null
          tenant_id: string
          updated_at: string
          use_expired_profile: boolean | null
          username: string
        }
        Insert: {
          allow_customer_delete?: boolean | null
          allow_queue_delete?: boolean | null
          auto_disable_expired?: boolean | null
          created_at?: string
          expired_profile_name?: string | null
          id?: string
          ip_address: string
          is_primary?: boolean | null
          last_synced?: string | null
          name: string
          olt_id?: string | null
          password_encrypted: string
          port?: number | null
          status?: string | null
          sync_pppoe?: boolean | null
          sync_queues?: boolean | null
          tenant_id: string
          updated_at?: string
          use_expired_profile?: boolean | null
          username: string
        }
        Update: {
          allow_customer_delete?: boolean | null
          allow_queue_delete?: boolean | null
          auto_disable_expired?: boolean | null
          created_at?: string
          expired_profile_name?: string | null
          id?: string
          ip_address?: string
          is_primary?: boolean | null
          last_synced?: string | null
          name?: string
          olt_id?: string | null
          password_encrypted?: string
          port?: number | null
          status?: string | null
          sync_pppoe?: boolean | null
          sync_queues?: boolean | null
          tenant_id?: string
          updated_at?: string
          use_expired_profile?: boolean | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "mikrotik_routers_olt_id_fkey"
            columns: ["olt_id"]
            isOneToOne: false
            referencedRelation: "olts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mikrotik_routers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_salaries: {
        Row: {
          absent_days: number | null
          allowances: number | null
          basic_salary: number | null
          bonus: number | null
          created_at: string
          deductions: number | null
          employee_id: string
          id: string
          leave_days: number | null
          net_salary: number | null
          notes: string | null
          overtime: number | null
          paid_amount: number | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          present_days: number | null
          salary_month: string
          status: string | null
          tenant_id: string
          updated_at: string
          working_days: number | null
        }
        Insert: {
          absent_days?: number | null
          allowances?: number | null
          basic_salary?: number | null
          bonus?: number | null
          created_at?: string
          deductions?: number | null
          employee_id: string
          id?: string
          leave_days?: number | null
          net_salary?: number | null
          notes?: string | null
          overtime?: number | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          present_days?: number | null
          salary_month: string
          status?: string | null
          tenant_id: string
          updated_at?: string
          working_days?: number | null
        }
        Update: {
          absent_days?: number | null
          allowances?: number | null
          basic_salary?: number | null
          bonus?: number | null
          created_at?: string
          deductions?: number | null
          employee_id?: string
          id?: string
          leave_days?: number | null
          net_salary?: number | null
          notes?: string | null
          overtime?: number | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          present_days?: number | null
          salary_month?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_salaries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      multi_collection_items: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          months: number | null
          multi_collection_id: string
          new_expiry: string | null
          old_expiry: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          id?: string
          months?: number | null
          multi_collection_id: string
          new_expiry?: string | null
          old_expiry?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          months?: number | null
          multi_collection_id?: string
          new_expiry?: string | null
          old_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multi_collection_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multi_collection_items_multi_collection_id_fkey"
            columns: ["multi_collection_id"]
            isOneToOne: false
            referencedRelation: "multi_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      multi_collections: {
        Row: {
          collected_by: string | null
          collection_date: string
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          status: string | null
          tenant_id: string
          total_amount: number | null
          total_customers: number | null
        }
        Insert: {
          collected_by?: string | null
          collection_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string | null
          tenant_id: string
          total_amount?: number | null
          total_customers?: number | null
        }
        Update: {
          collected_by?: string | null
          collection_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string | null
          tenant_id?: string
          total_amount?: number | null
          total_customers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "multi_collections_tenant_id_fkey"
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
          allowed_payment_gateways: string[] | null
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          max_areas: number | null
          max_customers: number | null
          max_mikrotiks: number | null
          max_olts: number | null
          max_onus: number | null
          max_resellers: number | null
          max_users: number | null
          name: string
          price_monthly: number
          price_yearly: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          allowed_payment_gateways?: string[] | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_areas?: number | null
          max_customers?: number | null
          max_mikrotiks?: number | null
          max_olts?: number | null
          max_onus?: number | null
          max_resellers?: number | null
          max_users?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          allowed_payment_gateways?: string[] | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_areas?: number | null
          max_customers?: number | null
          max_mikrotiks?: number | null
          max_olts?: number | null
          max_onus?: number | null
          max_resellers?: number | null
          max_users?: number | null
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
          bkash_mode: string | null
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
          bkash_mode?: string | null
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
          bkash_mode?: string | null
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
      payroll_runs: {
        Row: {
          created_at: string
          id: string
          month: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          tenant_id: string
          total_deductions: number | null
          total_gross: number | null
          total_net: number | null
          total_staff: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          tenant_id: string
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          total_staff?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          tenant_id?: string
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          total_staff?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          acknowledged_at: string | null
          areas_for_improvement: string | null
          comments: string | null
          created_at: string
          goals: string | null
          id: string
          overall_rating: number | null
          ratings: Json | null
          review_date: string
          review_period: string
          reviewer_id: string | null
          staff_id: string
          status: string
          strengths: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          areas_for_improvement?: string | null
          comments?: string | null
          created_at?: string
          goals?: string | null
          id?: string
          overall_rating?: number | null
          ratings?: Json | null
          review_date?: string
          review_period: string
          reviewer_id?: string | null
          staff_id: string
          status?: string
          strengths?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          areas_for_improvement?: string | null
          comments?: string | null
          created_at?: string
          goals?: string | null
          id?: string
          overall_rating?: number | null
          ratings?: Json | null
          review_date?: string
          review_period?: string
          reviewer_id?: string | null
          staff_id?: string
          status?: string
          strengths?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_notification_settings: {
        Row: {
          created_at: string
          days_before: number | null
          description: string | null
          email_enabled: boolean | null
          email_template: string | null
          id: string
          is_active: boolean | null
          name: string
          notification_type: string
          sms_enabled: boolean | null
          sms_template: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_before?: number | null
          description?: string | null
          email_enabled?: boolean | null
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notification_type: string
          sms_enabled?: boolean | null
          sms_template?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_before?: number | null
          description?: string | null
          email_enabled?: boolean | null
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notification_type?: string
          sms_enabled?: boolean | null
          sms_template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_public_settings: {
        Row: {
          auto_suspend_days: number
          captcha_site_key: string
          created_at: string
          currency: string
          currency_symbol: string
          date_format: string
          default_trial_days: number
          enable_captcha: boolean
          enable_signup: boolean
          key: string
          maintenance_message: string
          maintenance_mode: boolean
          platform_email: string | null
          platform_name: string | null
          platform_phone: string | null
          polling_server_url: string
          require_email_verification: boolean
          support_email: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          auto_suspend_days?: number
          captcha_site_key?: string
          created_at?: string
          currency?: string
          currency_symbol?: string
          date_format?: string
          default_trial_days?: number
          enable_captcha?: boolean
          enable_signup?: boolean
          key?: string
          maintenance_message?: string
          maintenance_mode?: boolean
          platform_email?: string | null
          platform_name?: string | null
          platform_phone?: string | null
          polling_server_url?: string
          require_email_verification?: boolean
          support_email?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          auto_suspend_days?: number
          captcha_site_key?: string
          created_at?: string
          currency?: string
          currency_symbol?: string
          date_format?: string
          default_trial_days?: number
          enable_captcha?: boolean
          enable_signup?: boolean
          key?: string
          maintenance_message?: string
          maintenance_mode?: boolean
          platform_email?: string | null
          platform_name?: string | null
          platform_phone?: string | null
          polling_server_url?: string
          require_email_verification?: boolean
          support_email?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      pos_customer_payments: {
        Row: {
          amount: number
          collected_by: string | null
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          reference: string | null
          sale_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          collected_by?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          sale_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          collected_by?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          sale_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pos_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_customer_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "pos_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_customer_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_customers: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string | null
          customer_code: string | null
          due_amount: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string
          total_purchase: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_code?: string | null
          due_amount?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
          total_purchase?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_code?: string | null
          due_amount?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          total_purchase?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sale_items: {
        Row: {
          created_at: string | null
          discount: number | null
          id: string
          item_id: string | null
          item_name: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          discount?: number | null
          id?: string
          item_id?: string | null
          item_name: string
          quantity?: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          discount?: number | null
          id?: string
          item_id?: string | null
          item_name?: string
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sale_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "pos_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sales: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number | null
          due_amount: number | null
          id: string
          invoice_number: string
          isp_customer_id: string | null
          notes: string | null
          paid_amount: number | null
          payment_method: string | null
          payment_reference: string | null
          sale_date: string | null
          send_sms: boolean | null
          sms_sent: boolean | null
          sold_by: string | null
          status: string | null
          subtotal: number | null
          tax: number | null
          tenant_id: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          due_amount?: number | null
          id?: string
          invoice_number: string
          isp_customer_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          sale_date?: string | null
          send_sms?: boolean | null
          sms_sent?: boolean | null
          sold_by?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          tenant_id: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          due_amount?: number | null
          id?: string
          invoice_number?: string
          isp_customer_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          sale_date?: string | null
          send_sms?: boolean | null
          sms_sent?: boolean | null
          sold_by?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pos_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_tenant_id_fkey"
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
      pppoe_profiles: {
        Row: {
          address_list: string | null
          created_at: string
          id: string
          is_synced: boolean | null
          local_address: string | null
          mikrotik_id: string | null
          mikrotik_profile_id: string | null
          name: string
          parent_queue: string | null
          rate_limit: string | null
          remote_address: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address_list?: string | null
          created_at?: string
          id?: string
          is_synced?: boolean | null
          local_address?: string | null
          mikrotik_id?: string | null
          mikrotik_profile_id?: string | null
          name: string
          parent_queue?: string | null
          rate_limit?: string | null
          remote_address?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address_list?: string | null
          created_at?: string
          id?: string
          is_synced?: boolean | null
          local_address?: string | null
          mikrotik_id?: string | null
          mikrotik_profile_id?: string | null
          name?: string
          parent_queue?: string | null
          rate_limit?: string | null
          remote_address?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pppoe_profiles_mikrotik_id_fkey"
            columns: ["mikrotik_id"]
            isOneToOne: false
            referencedRelation: "mikrotik_routers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pppoe_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          purchase_order_id: string
          quantity?: number
          received_quantity?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          discount: number | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string | null
          paid_amount: number | null
          status: string | null
          subtotal: number | null
          supplier_id: string | null
          tax: number | null
          tenant_id: string
          total: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount?: number | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string | null
          paid_amount?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax?: number | null
          tenant_id: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount?: number | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string | null
          paid_amount?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax?: number | null
          tenant_id?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_configs: {
        Row: {
          bonus_amount: number | null
          bonus_percentage: number | null
          bonus_type: string | null
          bonus_validity_days: number | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          min_referrals_for_bonus: number | null
          min_withdraw_amount: number | null
          referral_link_prefix: string | null
          tenant_id: string
          terms_and_conditions: string | null
          updated_at: string | null
          use_wallet_for_recharge: boolean | null
          withdraw_enabled: boolean | null
        }
        Insert: {
          bonus_amount?: number | null
          bonus_percentage?: number | null
          bonus_type?: string | null
          bonus_validity_days?: number | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          min_referrals_for_bonus?: number | null
          min_withdraw_amount?: number | null
          referral_link_prefix?: string | null
          tenant_id: string
          terms_and_conditions?: string | null
          updated_at?: string | null
          use_wallet_for_recharge?: boolean | null
          withdraw_enabled?: boolean | null
        }
        Update: {
          bonus_amount?: number | null
          bonus_percentage?: number | null
          bonus_type?: string | null
          bonus_validity_days?: number | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          min_referrals_for_bonus?: number | null
          min_withdraw_amount?: number | null
          referral_link_prefix?: string | null
          tenant_id?: string
          terms_and_conditions?: string | null
          updated_at?: string | null
          use_wallet_for_recharge?: boolean | null
          withdraw_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean | null
          manager_employee_id: string | null
          manager_reseller_id: string | null
          manager_staff_id: string | null
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          manager_employee_id?: string | null
          manager_reseller_id?: string | null
          manager_staff_id?: string | null
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          manager_employee_id?: string | null
          manager_reseller_id?: string | null
          manager_staff_id?: string | null
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_branches_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_branches_manager_reseller_id_fkey"
            columns: ["manager_reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_branches_manager_staff_id_fkey"
            columns: ["manager_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_custom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          permissions: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          permissions?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          permissions?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_login_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          reseller_id: string
          tenant_id: string
          token: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          reseller_id: string
          tenant_id: string
          token: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          reseller_id?: string
          tenant_id?: string
          token?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_login_tokens_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_login_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_permissions: {
        Row: {
          created_at: string
          id: string
          is_allowed: boolean | null
          permission_name: string
          reseller_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_allowed?: boolean | null
          permission_name: string
          reseller_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_allowed?: boolean | null
          permission_name?: string
          reseller_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_permissions_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          level: number
          name: string
          permissions: Json
          role_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          level?: number
          name: string
          permissions?: Json
          role_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          level?: number
          name?: string
          permissions?: Json
          role_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_topup_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          reseller_id: string
          status: string
          tenant_id: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          reseller_id: string
          status?: string
          tenant_id: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          reseller_id?: string
          status?: string
          tenant_id?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_topup_requests_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_topup_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          from_reseller_id: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          reseller_id: string
          tenant_id: string
          to_reseller_id: string | null
          type: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          from_reseller_id?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          reseller_id: string
          tenant_id: string
          to_reseller_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          from_reseller_id?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          reseller_id?: string
          tenant_id?: string
          to_reseller_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_transactions_from_reseller_id_fkey"
            columns: ["from_reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_transactions_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_transactions_to_reseller_id_fkey"
            columns: ["to_reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      resellers: {
        Row: {
          address: string | null
          allowed_mikrotik_ids: string[] | null
          allowed_olt_ids: string[] | null
          area_id: string | null
          balance: number | null
          branch_id: string | null
          branch_name: string | null
          can_add_customers: boolean | null
          can_control_sub_customers: boolean | null
          can_create_sub_reseller: boolean | null
          can_delete_customers: boolean | null
          can_edit_customers: boolean | null
          can_recharge_customers: boolean | null
          can_transfer_balance: boolean | null
          can_view_reports: boolean | null
          can_view_sub_customers: boolean | null
          commission_type: string | null
          commission_value: number | null
          created_at: string
          customer_rate: number | null
          email: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          level: number | null
          max_customers: number | null
          max_sub_resellers: number | null
          name: string
          nid_number: string | null
          parent_id: string | null
          password: string | null
          password_hash: string | null
          phone: string | null
          profile_photo: string | null
          rate_type: string | null
          role: string | null
          role_id: string | null
          tenant_id: string
          total_collections: number | null
          total_customers: number | null
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          address?: string | null
          allowed_mikrotik_ids?: string[] | null
          allowed_olt_ids?: string[] | null
          area_id?: string | null
          balance?: number | null
          branch_id?: string | null
          branch_name?: string | null
          can_add_customers?: boolean | null
          can_control_sub_customers?: boolean | null
          can_create_sub_reseller?: boolean | null
          can_delete_customers?: boolean | null
          can_edit_customers?: boolean | null
          can_recharge_customers?: boolean | null
          can_transfer_balance?: boolean | null
          can_view_reports?: boolean | null
          can_view_sub_customers?: boolean | null
          commission_type?: string | null
          commission_value?: number | null
          created_at?: string
          customer_rate?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          level?: number | null
          max_customers?: number | null
          max_sub_resellers?: number | null
          name: string
          nid_number?: string | null
          parent_id?: string | null
          password?: string | null
          password_hash?: string | null
          phone?: string | null
          profile_photo?: string | null
          rate_type?: string | null
          role?: string | null
          role_id?: string | null
          tenant_id: string
          total_collections?: number | null
          total_customers?: number | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          address?: string | null
          allowed_mikrotik_ids?: string[] | null
          allowed_olt_ids?: string[] | null
          area_id?: string | null
          balance?: number | null
          branch_id?: string | null
          branch_name?: string | null
          can_add_customers?: boolean | null
          can_control_sub_customers?: boolean | null
          can_create_sub_reseller?: boolean | null
          can_delete_customers?: boolean | null
          can_edit_customers?: boolean | null
          can_recharge_customers?: boolean | null
          can_transfer_balance?: boolean | null
          can_view_reports?: boolean | null
          can_view_sub_customers?: boolean | null
          commission_type?: string | null
          commission_value?: number | null
          created_at?: string
          customer_rate?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          level?: number | null
          max_customers?: number | null
          max_sub_resellers?: number | null
          name?: string
          nid_number?: string | null
          parent_id?: string | null
          password?: string | null
          password_hash?: string | null
          phone?: string | null
          profile_photo?: string | null
          rate_type?: string | null
          role?: string | null
          role_id?: string | null
          tenant_id?: string
          total_collections?: number | null
          total_customers?: number | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resellers_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resellers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "reseller_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resellers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resellers_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "reseller_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resellers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          absent_days: number | null
          absent_deduction: number | null
          bank_account: string | null
          basic_salary: number | null
          bonus: number | null
          commission: number | null
          created_at: string
          deductions: number | null
          gross_salary: number | null
          house_rent: number | null
          id: string
          late_days: number | null
          late_deduction: number | null
          loan_deduction: number | null
          medical_allowance: number | null
          month: string
          net_salary: number | null
          notes: string | null
          other_allowances: number | null
          overtime_pay: number | null
          payment_date: string | null
          payment_method: string | null
          payroll_run_id: string | null
          present_days: number | null
          staff_id: string
          status: string | null
          tax_deduction: number | null
          tenant_id: string
          transaction_ref: string | null
          transport_allowance: number | null
        }
        Insert: {
          absent_days?: number | null
          absent_deduction?: number | null
          bank_account?: string | null
          basic_salary?: number | null
          bonus?: number | null
          commission?: number | null
          created_at?: string
          deductions?: number | null
          gross_salary?: number | null
          house_rent?: number | null
          id?: string
          late_days?: number | null
          late_deduction?: number | null
          loan_deduction?: number | null
          medical_allowance?: number | null
          month: string
          net_salary?: number | null
          notes?: string | null
          other_allowances?: number | null
          overtime_pay?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payroll_run_id?: string | null
          present_days?: number | null
          staff_id: string
          status?: string | null
          tax_deduction?: number | null
          tenant_id: string
          transaction_ref?: string | null
          transport_allowance?: number | null
        }
        Update: {
          absent_days?: number | null
          absent_deduction?: number | null
          bank_account?: string | null
          basic_salary?: number | null
          bonus?: number | null
          commission?: number | null
          created_at?: string
          deductions?: number | null
          gross_salary?: number | null
          house_rent?: number | null
          id?: string
          late_days?: number | null
          late_deduction?: number | null
          loan_deduction?: number | null
          medical_allowance?: number | null
          month?: string
          net_salary?: number | null
          notes?: string | null
          other_allowances?: number | null
          overtime_pay?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payroll_run_id?: string | null
          present_days?: number | null
          staff_id?: string
          status?: string | null
          tax_deduction?: number | null
          tenant_id?: string
          transaction_ref?: string | null
          transport_allowance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          quantity: number
          sales_order_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          quantity?: number
          sales_order_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          quantity?: number
          sales_order_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          discount: number | null
          id: string
          notes: string | null
          order_date: string
          order_number: string | null
          paid_amount: number | null
          status: string | null
          subtotal: number | null
          tax: number | null
          tenant_id: string
          total: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string | null
          paid_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          tenant_id: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string | null
          paid_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          tenant_id?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_gateway_settings: {
        Row: {
          api_key: string | null
          api_secret: string | null
          api_url: string | null
          config: Json | null
          created_at: string
          id: string
          is_enabled: boolean | null
          password: string | null
          provider: string
          sender_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          api_url?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          password?: string | null
          provider?: string
          sender_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          api_url?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          password?: string | null
          provider?: string
          sender_id?: string | null
          updated_at?: string
          username?: string | null
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
      sms_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          failed_count: number | null
          group_filter: Json | null
          id: string
          message: string
          recipients: Json
          scheduled_at: string | null
          send_type: string
          sent_count: number | null
          started_at: string | null
          status: string
          template_id: string | null
          tenant_id: string
          total_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number | null
          group_filter?: Json | null
          id?: string
          message: string
          recipients?: Json
          scheduled_at?: string | null
          send_type?: string
          sent_count?: number | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id: string
          total_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number | null
          group_filter?: Json | null
          id?: string
          message?: string
          recipients?: Json
          scheduled_at?: string | null
          send_type?: string
          sent_count?: number | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string
          total_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sms_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          is_system: boolean | null
          message: string
          name: string
          template_type: string
          tenant_id: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          message: string
          name: string
          template_type: string
          tenant_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          message?: string
          name?: string
          template_type?: string
          tenant_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          can_login: boolean | null
          commission_rate: number | null
          created_at: string
          department: string | null
          designation: string | null
          email: string | null
          id: string
          is_active: boolean | null
          join_date: string | null
          name: string
          nid: string | null
          password: string | null
          phone: string | null
          role: string | null
          role_id: string | null
          salary: number | null
          salary_type: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          can_login?: boolean | null
          commission_rate?: number | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          join_date?: string | null
          name: string
          nid?: string | null
          password?: string | null
          phone?: string | null
          role?: string | null
          role_id?: string | null
          salary?: number | null
          salary_type?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          can_login?: boolean | null
          commission_rate?: number | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          join_date?: string | null
          name?: string
          nid?: string | null
          password?: string | null
          phone?: string | null
          role?: string | null
          role_id?: string | null
          salary?: number | null
          salary_type?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "tenant_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_attendance: {
        Row: {
          break_minutes: number | null
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          id: string
          late_minutes: number | null
          notes: string | null
          overtime_hours: number | null
          overtime_minutes: number | null
          shift_id: string | null
          source: string | null
          staff_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          id?: string
          late_minutes?: number | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_minutes?: number | null
          shift_id?: string | null
          source?: string | null
          staff_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          id?: string
          late_minutes?: number | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_minutes?: number | null
          shift_id?: string | null
          source?: string | null
          staff_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "staff_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_loan_repayments: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          reference: string | null
          staff_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
          staff_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
          staff_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "staff_loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_loan_repayments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_loan_repayments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_loans: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          disbursed_at: string | null
          id: string
          loan_type: string
          monthly_deduction: number | null
          reason: string | null
          remaining_amount: number
          staff_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          disbursed_at?: string | null
          id?: string
          loan_type?: string
          monthly_deduction?: number | null
          reason?: string | null
          remaining_amount: number
          staff_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          disbursed_at?: string | null
          id?: string
          loan_type?: string
          monthly_deduction?: number | null
          reason?: string | null
          remaining_amount?: number
          staff_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_loans_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_loans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          created_at: string
          id: string
          permissions: Json | null
          role: Database["public"]["Enums"]["staff_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["staff_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["staff_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shift_assignments: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean | null
          shift_id: string
          staff_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          shift_id: string
          staff_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          shift_id?: string
          staff_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "staff_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shift_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shift_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_active: boolean | null
          late_tolerance_minutes: number | null
          name: string
          start_time: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean | null
          late_tolerance_minutes?: number | null
          name: string
          start_time: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean | null
          late_tolerance_minutes?: number | null
          name?: string
          start_time?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_tenant_id_fkey"
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
      supplier_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          paid_by: string | null
          payment_date: string
          payment_method: string
          purchase_order_id: string | null
          reference: string | null
          supplier_id: string
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string
          payment_method?: string
          purchase_order_id?: string | null
          reference?: string | null
          supplier_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string
          payment_method?: string
          purchase_order_id?: string | null
          reference?: string | null
          supplier_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string
          current_balance: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          current_balance?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          current_balance?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_name: string | null
          assigned_to: string | null
          category: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          resolution_notes: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          tenant_id: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_name?: string | null
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          tenant_id: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_name?: string | null
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject?: string
          tenant_id?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_currencies: {
        Row: {
          code: string
          decimal_places: number | null
          is_active: boolean | null
          name: string
          symbol: string
        }
        Insert: {
          code: string
          decimal_places?: number | null
          is_active?: boolean | null
          name: string
          symbol: string
        }
        Update: {
          code?: string
          decimal_places?: number | null
          is_active?: boolean | null
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      system_languages: {
        Row: {
          code: string
          is_active: boolean | null
          is_rtl: boolean | null
          name: string
          native_name: string | null
        }
        Insert: {
          code: string
          is_active?: boolean | null
          is_rtl?: boolean | null
          name: string
          native_name?: string | null
        }
        Update: {
          code?: string
          is_active?: boolean | null
          is_rtl?: boolean | null
          name?: string
          native_name?: string | null
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
      tenant_backups: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          file_name: string
          file_size: number | null
          id: string
          status: string
          tenant_id: string
        }
        Insert: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          status?: string
          tenant_id: string
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_backups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_campaigns: {
        Row: {
          channel: string
          created_at: string | null
          created_by: string | null
          custom_recipients: string[] | null
          email_template_id: string | null
          failed_count: number | null
          id: string
          message: string
          name: string
          recipient_filter: Json | null
          recipient_type: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          sms_template_id: string | null
          status: string
          subject: string | null
          tenant_id: string
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          channel?: string
          created_at?: string | null
          created_by?: string | null
          custom_recipients?: string[] | null
          email_template_id?: string | null
          failed_count?: number | null
          id?: string
          message: string
          name: string
          recipient_filter?: Json | null
          recipient_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          sms_template_id?: string | null
          status?: string
          subject?: string | null
          tenant_id: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          created_by?: string | null
          custom_recipients?: string[] | null
          email_template_id?: string | null
          failed_count?: number | null
          id?: string
          message?: string
          name?: string
          recipient_filter?: Json | null
          recipient_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          sms_template_id?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_campaigns_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_custom_domains: {
        Row: {
          created_at: string
          dns_txt_record: string | null
          domain: string
          id: string
          is_verified: boolean | null
          nginx_config_path: string | null
          ssl_error: string | null
          ssl_expires_at: string | null
          ssl_issued_at: string | null
          ssl_provisioning_status: string | null
          ssl_status: string | null
          subdomain: string | null
          tenant_id: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          dns_txt_record?: string | null
          domain: string
          id?: string
          is_verified?: boolean | null
          nginx_config_path?: string | null
          ssl_error?: string | null
          ssl_expires_at?: string | null
          ssl_issued_at?: string | null
          ssl_provisioning_status?: string | null
          ssl_status?: string | null
          subdomain?: string | null
          tenant_id: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          dns_txt_record?: string | null
          domain?: string
          id?: string
          is_verified?: boolean | null
          nginx_config_path?: string | null
          ssl_error?: string | null
          ssl_expires_at?: string | null
          ssl_issued_at?: string | null
          ssl_provisioning_status?: string | null
          ssl_status?: string | null
          subdomain?: string | null
          tenant_id?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_custom_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_email_gateways: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          provider: string
          sender_email: string | null
          sender_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_username: string | null
          tenant_id: string
          updated_at: string | null
          use_tls: boolean | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          provider?: string
          sender_email?: string | null
          sender_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          tenant_id: string
          updated_at?: string | null
          use_tls?: boolean | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          provider?: string
          sender_email?: string | null
          sender_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          tenant_id?: string
          updated_at?: string | null
          use_tls?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_email_gateways_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_location_settings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          popup_description: string
          popup_enabled: boolean
          popup_title: string
          require_name: boolean
          require_phone: boolean
          tenant_id: string
          unique_token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          popup_description?: string
          popup_enabled?: boolean
          popup_title?: string
          require_name?: boolean
          require_phone?: boolean
          tenant_id: string
          unique_token: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          popup_description?: string
          popup_enabled?: boolean
          popup_title?: string
          require_name?: boolean
          require_phone?: boolean
          tenant_id?: string
          unique_token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_location_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_payment_gateways: {
        Row: {
          bkash_mode: string | null
          config: Json | null
          created_at: string | null
          display_name: string
          gateway: Database["public"]["Enums"]["payment_method"]
          id: string
          instructions: string | null
          is_enabled: boolean | null
          sandbox_mode: boolean | null
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          bkash_mode?: string | null
          config?: Json | null
          created_at?: string | null
          display_name: string
          gateway: Database["public"]["Enums"]["payment_method"]
          id?: string
          instructions?: string | null
          is_enabled?: boolean | null
          sandbox_mode?: boolean | null
          sort_order?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          bkash_mode?: string | null
          config?: Json | null
          created_at?: string | null
          display_name?: string
          gateway?: Database["public"]["Enums"]["payment_method"]
          id?: string
          instructions?: string | null
          is_enabled?: boolean | null
          sandbox_mode?: boolean | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payment_gateways_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          permissions: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          permissions?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          permissions?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sms_gateways: {
        Row: {
          api_key: string | null
          api_secret: string | null
          api_url: string | null
          config: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          password: string | null
          provider: string
          provider_name: string | null
          sender_id: string | null
          tenant_id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          api_url?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          password?: string | null
          provider?: string
          provider_name?: string | null
          sender_id?: string | null
          tenant_id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          api_url?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          password?: string | null
          provider?: string
          provider_name?: string | null
          sender_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sms_gateways_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          currency: string | null
          custom_domain: string | null
          customer_portal_enabled: boolean | null
          customer_registration_auto_approve: boolean | null
          customer_registration_auto_pppoe: boolean | null
          customer_registration_enabled: boolean | null
          dashboard_theme: string | null
          district: string | null
          division: string | null
          email: string
          favicon_url: string | null
          features: Json | null
          id: string
          invoice_footer: string | null
          invoice_header: string | null
          invoice_prefix: string | null
          invoice_terms: string | null
          landing_page_about_text: string | null
          landing_page_canonical_url: string | null
          landing_page_contact_address: string | null
          landing_page_contact_email: string | null
          landing_page_contact_phone: string | null
          landing_page_custom_menus: Json | null
          landing_page_custom_sections: Json | null
          landing_page_dark_mode: boolean | null
          landing_page_enabled: boolean | null
          landing_page_footer_style: string | null
          landing_page_ftp_enabled: boolean | null
          landing_page_ftp_servers: Json | null
          landing_page_ftp_url: string | null
          landing_page_header_style: string | null
          landing_page_hero_background_url: string | null
          landing_page_hero_badge_text: string | null
          landing_page_hero_primary_button_text: string | null
          landing_page_hero_primary_button_url: string | null
          landing_page_hero_secondary_button_text: string | null
          landing_page_hero_secondary_button_url: string | null
          landing_page_hero_slides: Json
          landing_page_hero_subtitle: string | null
          landing_page_hero_title: string | null
          landing_page_livetv_channels: Json | null
          landing_page_livetv_enabled: boolean | null
          landing_page_livetv_url: string | null
          landing_page_map_embed_code: string | null
          landing_page_map_link: string | null
          landing_page_meta_description: string | null
          landing_page_meta_title: string | null
          landing_page_og_image_url: string | null
          landing_page_section_order: Json | null
          landing_page_show_about: boolean | null
          landing_page_show_contact: boolean | null
          landing_page_show_coverage: boolean | null
          landing_page_show_features: boolean | null
          landing_page_show_footer_contact: boolean | null
          landing_page_show_footer_links: boolean | null
          landing_page_show_footer_social: boolean | null
          landing_page_show_login_button: boolean | null
          landing_page_show_packages: boolean | null
          landing_page_show_pay_bill_button: boolean | null
          landing_page_show_register_button: boolean | null
          landing_page_slug_locked: boolean | null
          landing_page_social_facebook: string | null
          landing_page_social_instagram: string | null
          landing_page_social_linkedin: string | null
          landing_page_social_tiktok: string | null
          landing_page_social_twitter: string | null
          landing_page_social_youtube: string | null
          landing_page_telegram: string | null
          landing_page_template: string | null
          landing_page_whatsapp: string | null
          language: string | null
          logo_url: string | null
          manual_features: Json | null
          manual_features_enabled: boolean | null
          manual_limits: Json | null
          max_areas: number | null
          max_customers: number | null
          max_mikrotiks: number | null
          max_olts: number | null
          max_onus: number | null
          max_resellers: number | null
          max_users: number | null
          name: string
          notes: string | null
          owner_name: string | null
          owner_user_id: string | null
          phone: string | null
          slug: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          subdomain: string | null
          subtitle: string | null
          suspended_at: string | null
          suspended_reason: string | null
          theme_color: string | null
          thermal_printer_enabled: boolean | null
          timezone: string | null
          trial_ends_at: string | null
          upazila: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          customer_portal_enabled?: boolean | null
          customer_registration_auto_approve?: boolean | null
          customer_registration_auto_pppoe?: boolean | null
          customer_registration_enabled?: boolean | null
          dashboard_theme?: string | null
          district?: string | null
          division?: string | null
          email: string
          favicon_url?: string | null
          features?: Json | null
          id?: string
          invoice_footer?: string | null
          invoice_header?: string | null
          invoice_prefix?: string | null
          invoice_terms?: string | null
          landing_page_about_text?: string | null
          landing_page_canonical_url?: string | null
          landing_page_contact_address?: string | null
          landing_page_contact_email?: string | null
          landing_page_contact_phone?: string | null
          landing_page_custom_menus?: Json | null
          landing_page_custom_sections?: Json | null
          landing_page_dark_mode?: boolean | null
          landing_page_enabled?: boolean | null
          landing_page_footer_style?: string | null
          landing_page_ftp_enabled?: boolean | null
          landing_page_ftp_servers?: Json | null
          landing_page_ftp_url?: string | null
          landing_page_header_style?: string | null
          landing_page_hero_background_url?: string | null
          landing_page_hero_badge_text?: string | null
          landing_page_hero_primary_button_text?: string | null
          landing_page_hero_primary_button_url?: string | null
          landing_page_hero_secondary_button_text?: string | null
          landing_page_hero_secondary_button_url?: string | null
          landing_page_hero_slides?: Json
          landing_page_hero_subtitle?: string | null
          landing_page_hero_title?: string | null
          landing_page_livetv_channels?: Json | null
          landing_page_livetv_enabled?: boolean | null
          landing_page_livetv_url?: string | null
          landing_page_map_embed_code?: string | null
          landing_page_map_link?: string | null
          landing_page_meta_description?: string | null
          landing_page_meta_title?: string | null
          landing_page_og_image_url?: string | null
          landing_page_section_order?: Json | null
          landing_page_show_about?: boolean | null
          landing_page_show_contact?: boolean | null
          landing_page_show_coverage?: boolean | null
          landing_page_show_features?: boolean | null
          landing_page_show_footer_contact?: boolean | null
          landing_page_show_footer_links?: boolean | null
          landing_page_show_footer_social?: boolean | null
          landing_page_show_login_button?: boolean | null
          landing_page_show_packages?: boolean | null
          landing_page_show_pay_bill_button?: boolean | null
          landing_page_show_register_button?: boolean | null
          landing_page_slug_locked?: boolean | null
          landing_page_social_facebook?: string | null
          landing_page_social_instagram?: string | null
          landing_page_social_linkedin?: string | null
          landing_page_social_tiktok?: string | null
          landing_page_social_twitter?: string | null
          landing_page_social_youtube?: string | null
          landing_page_telegram?: string | null
          landing_page_template?: string | null
          landing_page_whatsapp?: string | null
          language?: string | null
          logo_url?: string | null
          manual_features?: Json | null
          manual_features_enabled?: boolean | null
          manual_limits?: Json | null
          max_areas?: number | null
          max_customers?: number | null
          max_mikrotiks?: number | null
          max_olts?: number | null
          max_onus?: number | null
          max_resellers?: number | null
          max_users?: number | null
          name: string
          notes?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          phone?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          subdomain?: string | null
          subtitle?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          theme_color?: string | null
          thermal_printer_enabled?: boolean | null
          timezone?: string | null
          trial_ends_at?: string | null
          upazila?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          customer_portal_enabled?: boolean | null
          customer_registration_auto_approve?: boolean | null
          customer_registration_auto_pppoe?: boolean | null
          customer_registration_enabled?: boolean | null
          dashboard_theme?: string | null
          district?: string | null
          division?: string | null
          email?: string
          favicon_url?: string | null
          features?: Json | null
          id?: string
          invoice_footer?: string | null
          invoice_header?: string | null
          invoice_prefix?: string | null
          invoice_terms?: string | null
          landing_page_about_text?: string | null
          landing_page_canonical_url?: string | null
          landing_page_contact_address?: string | null
          landing_page_contact_email?: string | null
          landing_page_contact_phone?: string | null
          landing_page_custom_menus?: Json | null
          landing_page_custom_sections?: Json | null
          landing_page_dark_mode?: boolean | null
          landing_page_enabled?: boolean | null
          landing_page_footer_style?: string | null
          landing_page_ftp_enabled?: boolean | null
          landing_page_ftp_servers?: Json | null
          landing_page_ftp_url?: string | null
          landing_page_header_style?: string | null
          landing_page_hero_background_url?: string | null
          landing_page_hero_badge_text?: string | null
          landing_page_hero_primary_button_text?: string | null
          landing_page_hero_primary_button_url?: string | null
          landing_page_hero_secondary_button_text?: string | null
          landing_page_hero_secondary_button_url?: string | null
          landing_page_hero_slides?: Json
          landing_page_hero_subtitle?: string | null
          landing_page_hero_title?: string | null
          landing_page_livetv_channels?: Json | null
          landing_page_livetv_enabled?: boolean | null
          landing_page_livetv_url?: string | null
          landing_page_map_embed_code?: string | null
          landing_page_map_link?: string | null
          landing_page_meta_description?: string | null
          landing_page_meta_title?: string | null
          landing_page_og_image_url?: string | null
          landing_page_section_order?: Json | null
          landing_page_show_about?: boolean | null
          landing_page_show_contact?: boolean | null
          landing_page_show_coverage?: boolean | null
          landing_page_show_features?: boolean | null
          landing_page_show_footer_contact?: boolean | null
          landing_page_show_footer_links?: boolean | null
          landing_page_show_footer_social?: boolean | null
          landing_page_show_login_button?: boolean | null
          landing_page_show_packages?: boolean | null
          landing_page_show_pay_bill_button?: boolean | null
          landing_page_show_register_button?: boolean | null
          landing_page_slug_locked?: boolean | null
          landing_page_social_facebook?: string | null
          landing_page_social_instagram?: string | null
          landing_page_social_linkedin?: string | null
          landing_page_social_tiktok?: string | null
          landing_page_social_twitter?: string | null
          landing_page_social_youtube?: string | null
          landing_page_telegram?: string | null
          landing_page_template?: string | null
          landing_page_whatsapp?: string | null
          language?: string | null
          logo_url?: string | null
          manual_features?: Json | null
          manual_features_enabled?: boolean | null
          manual_limits?: Json | null
          max_areas?: number | null
          max_customers?: number | null
          max_mikrotiks?: number | null
          max_olts?: number | null
          max_onus?: number | null
          max_resellers?: number | null
          max_users?: number | null
          name?: string
          notes?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          phone?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          subdomain?: string | null
          subtitle?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          theme_color?: string | null
          thermal_printer_enabled?: boolean | null
          timezone?: string | null
          trial_ends_at?: string | null
          upazila?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      ticket_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          comment: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          is_internal: boolean | null
          tenant_id: string
          ticket_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          is_internal?: boolean | null
          tenant_id: string
          ticket_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          is_internal?: boolean | null
          tenant_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          payment_method: string | null
          receipt_url: string | null
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      unions: {
        Row: {
          bn_name: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
          upazila_id: string
          updated_at: string
        }
        Insert: {
          bn_name?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          upazila_id: string
          updated_at?: string
        }
        Update: {
          bn_name?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          upazila_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unions_upazila_id_fkey"
            columns: ["upazila_id"]
            isOneToOne: false
            referencedRelation: "upazilas"
            referencedColumns: ["id"]
          },
        ]
      }
      upazilas: {
        Row: {
          bn_name: string | null
          created_at: string
          district_id: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bn_name?: string | null
          created_at?: string
          district_id: string
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          bn_name?: string | null
          created_at?: string
          district_id?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upazilas_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upazilas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      villages: {
        Row: {
          bn_name: string | null
          created_at: string
          house_no: string | null
          id: string
          name: string
          road_no: string | null
          section_block: string | null
          tenant_id: string
          union_id: string
          updated_at: string
        }
        Insert: {
          bn_name?: string | null
          created_at?: string
          house_no?: string | null
          id?: string
          name: string
          road_no?: string | null
          section_block?: string | null
          tenant_id: string
          union_id: string
          updated_at?: string
        }
        Update: {
          bn_name?: string | null
          created_at?: string
          house_no?: string | null
          id?: string
          name?: string
          road_no?: string | null
          section_block?: string | null
          tenant_id?: string
          union_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "villages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "villages_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_customer_ticket_comment: {
        Args: {
          p_comment: string
          p_created_by_name?: string
          p_customer_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      add_wallet_transaction: {
        Args: {
          p_amount: number
          p_customer_id: string
          p_notes?: string
          p_reference_id?: string
          p_reference_type?: string
          p_type: string
        }
        Returns: string
      }
      authenticate_customer: {
        Args: { p_password: string; p_tenant_id: string; p_username: string }
        Returns: {
          address: string
          area_id: string
          customer_code: string
          due_amount: number
          email: string
          expiry_date: string
          id: string
          monthly_bill: number
          name: string
          package_id: string
          phone: string
          pppoe_username: string
          status: string
          tenant_id: string
        }[]
      }
      authenticate_customer_global: {
        Args: { p_password: string; p_username: string }
        Returns: {
          address: string
          area_id: string
          customer_code: string
          due_amount: number
          email: string
          expiry_date: string
          id: string
          monthly_bill: number
          name: string
          package_id: string
          phone: string
          pppoe_username: string
          status: string
          tenant_id: string
        }[]
      }
      count_sub_resellers: { Args: { p_reseller_id: string }; Returns: number }
      create_customer_self_recharge: {
        Args: {
          p_amount: number
          p_collected_by_name?: string
          p_collected_by_type?: string
          p_customer_id: string
          p_discount?: number
          p_months: number
          p_new_expiry: string
          p_notes?: string
          p_old_expiry: string
          p_payment_method: string
          p_status?: string
          p_tenant_id: string
        }
        Returns: string
      }
      create_customer_support_ticket: {
        Args: {
          p_category?: string
          p_customer_id: string
          p_description?: string
          p_priority?: string
          p_subject: string
        }
        Returns: {
          id: string
          ticket_number: string
        }[]
      }
      create_customer_wallet_topup_request: {
        Args: {
          p_amount: number
          p_customer_id: string
          p_payment_method: string
          p_tenant_id: string
          p_transaction_id: string
        }
        Returns: string
      }
      create_withdraw_request: {
        Args: {
          p_amount: number
          p_customer_id: string
          p_payment_details?: Json
          p_payment_method: string
        }
        Returns: string
      }
      export_tenant_data: { Args: { _tenant_id: string }; Returns: Json }
      generate_bill_number: { Args: { _tenant_id: string }; Returns: string }
      generate_customer_code: { Args: { _tenant_id: string }; Returns: string }
      generate_customer_referral_code: {
        Args: { p_customer_id: string }
        Returns: string
      }
      generate_employee_code: { Args: { _tenant_id: string }; Returns: string }
      generate_location_token: { Args: never; Returns: string }
      generate_po_number: { Args: { _tenant_id: string }; Returns: string }
      generate_request_number: { Args: { _tenant_id: string }; Returns: string }
      generate_so_number: { Args: { _tenant_id: string }; Returns: string }
      generate_ticket_number: { Args: { _tenant_id: string }; Returns: string }
      get_customer_apps_config: { Args: { p_tenant_id: string }; Returns: Json }
      get_customer_apps_links: {
        Args: { p_category?: string; p_tenant_id: string }
        Returns: {
          category: string
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          open_in_browser: boolean | null
          requires_login: boolean | null
          sort_order: number | null
          tenant_id: string
          title: string
          updated_at: string | null
          url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "customer_apps_links"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_customer_profile: {
        Args: { p_customer_id: string }
        Returns: {
          address: string
          connection_date: string
          customer_code: string
          download_speed: number
          due_amount: number
          email: string
          expiry_date: string
          id: string
          last_payment_date: string
          monthly_bill: number
          name: string
          onu_mac: string
          package_name: string
          package_price: number
          phone: string
          pppoe_username: string
          status: string
          tenant_id: string
          tenant_logo_url: string
          tenant_name: string
          tenant_primary_color: string
          upload_speed: number
        }[]
      }
      get_customer_referral_stats: {
        Args: { p_customer_id: string }
        Returns: {
          bonus_balance: number
          pending_referrals: number
          rejected_referrals: number
          successful_referrals: number
          total_bonus_earned: number
          total_referrals: number
        }[]
      }
      get_customer_wallet_balance: {
        Args: { p_customer_id: string }
        Returns: number
      }
      get_customer_wallet_transactions: {
        Args: { p_customer_id: string; p_limit?: number }
        Returns: {
          amount: number
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          tenant_id: string
          transaction_type: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "customer_wallet_transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_customer_withdraw_requests: {
        Args: { p_customer_id: string }
        Returns: {
          amount: number
          created_at: string | null
          customer_id: string
          id: string
          payment_details: Json | null
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "customer_withdraw_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_enabled_payment_methods: {
        Args: never
        Returns: {
          bkash_mode: string
          display_name: string
          gateway: string
          id: string
          instructions: string
          is_enabled: boolean
          sandbox_mode: boolean
          sort_order: number
        }[]
      }
      get_referral_config: { Args: { p_tenant_id: string }; Returns: Json }
      get_reseller_all_customers: {
        Args: { p_reseller_id: string }
        Returns: {
          address: string | null
          area_id: string | null
          connection_date: string | null
          connection_type: string | null
          created_at: string
          customer_code: string | null
          customer_type_id: string | null
          due_amount: number | null
          email: string | null
          expiry_date: string | null
          id: string
          is_auto_disable: boolean | null
          last_activated_at: string | null
          last_caller_id: string | null
          last_deactivated_at: string | null
          last_ip_address: string | null
          last_payment_date: string | null
          mikrotik_id: string | null
          monthly_bill: number | null
          name: string
          nid_number: string | null
          notes: string | null
          onu_id: string | null
          onu_index: number | null
          onu_mac: string | null
          package_id: string | null
          phone: string | null
          pon_port: string | null
          pppoe_password: string | null
          pppoe_username: string | null
          referral_bonus_balance: number | null
          referral_code: string | null
          referred_by: string | null
          reseller_id: string | null
          router_mac: string | null
          status: Database["public"]["Enums"]["customer_status"]
          tenant_id: string
          updated_at: string
          wallet_balance: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_reseller_descendants: {
        Args: { p_reseller_id: string }
        Returns: {
          balance: number
          id: string
          level: number
          name: string
          parent_id: string
          role: string
        }[]
      }
      get_tenant_enabled_payment_gateways: {
        Args: { p_tenant_id: string }
        Returns: {
          bkash_mode: string
          display_name: string
          gateway: string
          id: string
          instructions: string
          is_enabled: boolean
          sandbox_mode: boolean
          sort_order: number
        }[]
      }
      get_tenant_referral_domain: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      get_user_tenant_id: { Args: never; Returns: string }
      get_user_tenant_ids: { Args: never; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_tenant_gateways: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      is_authenticated: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_tenant_active: { Args: { _tenant_id: string }; Returns: boolean }
      is_tenant_landing_slug_available: {
        Args: { p_current_tenant_id: string; p_slug: string }
        Returns: boolean
      }
      list_customer_support_tickets: {
        Args: { p_customer_id: string; p_status?: string }
        Returns: {
          assigned_name: string | null
          assigned_to: string | null
          category: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          resolution_notes: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          tenant_id: string
          ticket_number: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "support_tickets"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_customer_ticket_comments: {
        Args: { p_customer_id: string; p_ticket_id: string }
        Returns: {
          comment: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          is_internal: boolean | null
          tenant_id: string
          ticket_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ticket_comments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      match_bkash_payment: {
        Args: {
          _amount: number
          _customer_code: string
          _tenant_id: string
          _trx_id: string
        }
        Returns: Json
      }
      process_withdraw_request: {
        Args: {
          p_action: string
          p_rejection_reason?: string
          p_request_id: string
        }
        Returns: boolean
      }
      queue_subscription_reminders: { Args: never; Returns: undefined }
      reseller_pay_customer: {
        Args: {
          p_amount: number
          p_customer_id: string
          p_months?: number
          p_reseller_id: string
        }
        Returns: Json
      }
      track_referral_signup: {
        Args: { p_referral_code: string; p_referred_customer_id: string }
        Returns: boolean
      }
      transfer_reseller_balance: {
        Args: {
          p_amount: number
          p_description?: string
          p_from_reseller_id: string
          p_to_reseller_id: string
        }
        Returns: Json
      }
      use_wallet_for_recharge:
        | {
            Args: {
              p_amount: number
              p_customer_id: string
              p_notes?: string
              p_reference_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_customer_id: string
              p_notes?: string
              p_reference_id?: string
            }
            Returns: Json
          }
    }
    Enums: {
      alert_severity: "critical" | "warning" | "info"
      alert_type:
        | "onu_offline"
        | "power_drop"
        | "olt_unreachable"
        | "high_latency"
      app_role: "admin" | "operator" | "viewer" | "super_admin"
      bill_status: "unpaid" | "paid" | "partial" | "overdue" | "cancelled"
      billing_cycle: "monthly" | "yearly"
      connection_status: "online" | "offline" | "warning" | "unknown"
      customer_status:
        | "active"
        | "expired"
        | "suspended"
        | "pending"
        | "cancelled"
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
      payment_method:
        | "sslcommerz"
        | "bkash"
        | "rocket"
        | "nagad"
        | "manual"
        | "uddoktapay"
        | "shurjopay"
        | "aamarpay"
        | "portwallet"
        | "piprapay"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      reseller_role: "reseller" | "sub_reseller" | "sub_sub_reseller"
      reseller_transaction_type:
        | "recharge"
        | "deduction"
        | "commission"
        | "refund"
        | "transfer_in"
        | "transfer_out"
        | "customer_payment"
      speed_unit: "mbps" | "gbps"
      staff_role: "admin" | "staff" | "technician" | "support" | "reseller"
      subscription_status:
        | "trial"
        | "active"
        | "expired"
        | "cancelled"
        | "pending"
      tenant_status: "active" | "suspended" | "pending" | "trial" | "cancelled"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "waiting" | "resolved" | "closed"
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
      bill_status: ["unpaid", "paid", "partial", "overdue", "cancelled"],
      billing_cycle: ["monthly", "yearly"],
      connection_status: ["online", "offline", "warning", "unknown"],
      customer_status: [
        "active",
        "expired",
        "suspended",
        "pending",
        "cancelled",
      ],
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
      payment_method: [
        "sslcommerz",
        "bkash",
        "rocket",
        "nagad",
        "manual",
        "uddoktapay",
        "shurjopay",
        "aamarpay",
        "portwallet",
        "piprapay",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
      reseller_role: ["reseller", "sub_reseller", "sub_sub_reseller"],
      reseller_transaction_type: [
        "recharge",
        "deduction",
        "commission",
        "refund",
        "transfer_in",
        "transfer_out",
        "customer_payment",
      ],
      speed_unit: ["mbps", "gbps"],
      staff_role: ["admin", "staff", "technician", "support", "reseller"],
      subscription_status: [
        "trial",
        "active",
        "expired",
        "cancelled",
        "pending",
      ],
      tenant_status: ["active", "suspended", "pending", "trial", "cancelled"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "waiting", "resolved", "closed"],
    },
  },
} as const
