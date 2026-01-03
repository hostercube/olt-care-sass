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
          created_at: string
          customer_id: string
          discount: number | null
          id: string
          months: number | null
          new_expiry: string | null
          notes: string | null
          old_expiry: string | null
          payment_method: string | null
          recharge_date: string
          reseller_id: string | null
          status: string | null
          tenant_id: string
          transaction_id: string | null
        }
        Insert: {
          amount?: number
          collected_by?: string | null
          created_at?: string
          customer_id: string
          discount?: number | null
          id?: string
          months?: number | null
          new_expiry?: string | null
          notes?: string | null
          old_expiry?: string | null
          payment_method?: string | null
          recharge_date?: string
          reseller_id?: string | null
          status?: string | null
          tenant_id: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          collected_by?: string | null
          created_at?: string
          customer_id?: string
          discount?: number | null
          id?: string
          months?: number | null
          new_expiry?: string | null
          notes?: string | null
          old_expiry?: string | null
          payment_method?: string | null
          recharge_date?: string
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
      customers: {
        Row: {
          address: string | null
          area_id: string | null
          connection_date: string | null
          created_at: string
          customer_code: string | null
          due_amount: number | null
          email: string | null
          expiry_date: string | null
          id: string
          is_auto_disable: boolean | null
          last_payment_date: string | null
          mikrotik_id: string | null
          monthly_bill: number | null
          name: string
          notes: string | null
          onu_id: string | null
          onu_index: number | null
          onu_mac: string | null
          package_id: string | null
          phone: string | null
          pon_port: string | null
          pppoe_password: string | null
          pppoe_username: string | null
          reseller_id: string | null
          router_mac: string | null
          status: Database["public"]["Enums"]["customer_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          area_id?: string | null
          connection_date?: string | null
          created_at?: string
          customer_code?: string | null
          due_amount?: number | null
          email?: string | null
          expiry_date?: string | null
          id?: string
          is_auto_disable?: boolean | null
          last_payment_date?: string | null
          mikrotik_id?: string | null
          monthly_bill?: number | null
          name: string
          notes?: string | null
          onu_id?: string | null
          onu_index?: number | null
          onu_mac?: string | null
          package_id?: string | null
          phone?: string | null
          pon_port?: string | null
          pppoe_password?: string | null
          pppoe_username?: string | null
          reseller_id?: string | null
          router_mac?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          area_id?: string | null
          connection_date?: string | null
          created_at?: string
          customer_code?: string | null
          due_amount?: number | null
          email?: string | null
          expiry_date?: string | null
          id?: string
          is_auto_disable?: boolean | null
          last_payment_date?: string | null
          mikrotik_id?: string | null
          monthly_bill?: number | null
          name?: string
          notes?: string | null
          onu_id?: string | null
          onu_index?: number | null
          onu_mac?: string | null
          package_id?: string | null
          phone?: string | null
          pon_port?: string | null
          pppoe_password?: string | null
          pppoe_username?: string | null
          reseller_id?: string | null
          router_mac?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tenant_id?: string
          updated_at?: string
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
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          min_quantity: number | null
          name: string
          quantity: number | null
          sale_price: number | null
          sku: string | null
          tenant_id: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          min_quantity?: number | null
          name: string
          quantity?: number | null
          sale_price?: number | null
          sku?: string | null
          tenant_id: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          min_quantity?: number | null
          name?: string
          quantity?: number | null
          sale_price?: number | null
          sku?: string | null
          tenant_id?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
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
      mikrotik_routers: {
        Row: {
          auto_disable_expired: boolean | null
          created_at: string
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
          username: string
        }
        Insert: {
          auto_disable_expired?: boolean | null
          created_at?: string
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
          username: string
        }
        Update: {
          auto_disable_expired?: boolean | null
          created_at?: string
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
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_areas: number | null
          max_customers: number | null
          max_mikrotiks: number | null
          max_olts: number
          max_onus: number | null
          max_resellers: number | null
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
          max_areas?: number | null
          max_customers?: number | null
          max_mikrotiks?: number | null
          max_olts?: number
          max_onus?: number | null
          max_resellers?: number | null
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
          max_areas?: number | null
          max_customers?: number | null
          max_mikrotiks?: number | null
          max_olts?: number
          max_onus?: number | null
          max_resellers?: number | null
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
      reseller_branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean | null
          manager_reseller_id: string | null
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
          manager_reseller_id?: string | null
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
          manager_reseller_id?: string | null
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_branches_manager_reseller_id_fkey"
            columns: ["manager_reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
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
          password_hash: string | null
          phone: string | null
          profile_photo: string | null
          rate_type: string | null
          role: string | null
          tenant_id: string
          total_collections: number | null
          total_customers: number | null
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          address?: string | null
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
          password_hash?: string | null
          phone?: string | null
          profile_photo?: string | null
          rate_type?: string | null
          role?: string | null
          tenant_id: string
          total_collections?: number | null
          total_customers?: number | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          address?: string | null
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
          password_hash?: string | null
          phone?: string | null
          profile_photo?: string | null
          rate_type?: string | null
          role?: string | null
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
          basic_salary: number | null
          bonus: number | null
          commission: number | null
          created_at: string
          deductions: number | null
          id: string
          month: string
          net_salary: number | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          staff_id: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          basic_salary?: number | null
          bonus?: number | null
          commission?: number | null
          created_at?: string
          deductions?: number | null
          id?: string
          month: string
          net_salary?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          staff_id: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          basic_salary?: number | null
          bonus?: number | null
          commission?: number | null
          created_at?: string
          deductions?: number | null
          id?: string
          month?: string
          net_salary?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          staff_id?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
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
          phone: string | null
          role: string | null
          salary: number | null
          salary_type: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
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
          phone?: string | null
          role?: string | null
          salary?: number | null
          salary_type?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
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
          phone?: string | null
          role?: string | null
          salary?: number | null
          salary_type?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_tenant_id_fkey"
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
      tenant_custom_domains: {
        Row: {
          created_at: string
          dns_txt_record: string | null
          domain: string
          id: string
          is_verified: boolean | null
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
      tenant_payment_gateways: {
        Row: {
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
          district: string | null
          division: string | null
          email: string
          features: Json | null
          id: string
          language: string | null
          logo_url: string | null
          max_olts: number | null
          max_users: number | null
          name: string
          notes: string | null
          owner_name: string | null
          owner_user_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          subdomain: string | null
          suspended_at: string | null
          suspended_reason: string | null
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
          district?: string | null
          division?: string | null
          email: string
          features?: Json | null
          id?: string
          language?: string | null
          logo_url?: string | null
          max_olts?: number | null
          max_users?: number | null
          name: string
          notes?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          subdomain?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
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
          district?: string | null
          division?: string | null
          email?: string
          features?: Json | null
          id?: string
          language?: string | null
          logo_url?: string | null
          max_olts?: number | null
          max_users?: number | null
          name?: string
          notes?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          subdomain?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          upazila?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
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
      count_sub_resellers: { Args: { p_reseller_id: string }; Returns: number }
      export_tenant_data: { Args: { _tenant_id: string }; Returns: Json }
      generate_bill_number: { Args: { _tenant_id: string }; Returns: string }
      generate_customer_code: { Args: { _tenant_id: string }; Returns: string }
      generate_employee_code: { Args: { _tenant_id: string }; Returns: string }
      generate_po_number: { Args: { _tenant_id: string }; Returns: string }
      generate_request_number: { Args: { _tenant_id: string }; Returns: string }
      generate_so_number: { Args: { _tenant_id: string }; Returns: string }
      get_reseller_all_customers: {
        Args: { p_reseller_id: string }
        Returns: {
          address: string | null
          area_id: string | null
          connection_date: string | null
          created_at: string
          customer_code: string | null
          due_amount: number | null
          email: string | null
          expiry_date: string | null
          id: string
          is_auto_disable: boolean | null
          last_payment_date: string | null
          mikrotik_id: string | null
          monthly_bill: number | null
          name: string
          notes: string | null
          onu_id: string | null
          onu_index: number | null
          onu_mac: string | null
          package_id: string | null
          phone: string | null
          pon_port: string | null
          pppoe_password: string | null
          pppoe_username: string | null
          reseller_id: string | null
          router_mac: string | null
          status: Database["public"]["Enums"]["customer_status"]
          tenant_id: string
          updated_at: string
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
      get_user_tenant_id: { Args: never; Returns: string }
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
      match_bkash_payment: {
        Args: {
          _amount: number
          _customer_code: string
          _tenant_id: string
          _trx_id: string
        }
        Returns: Json
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
      transfer_reseller_balance: {
        Args: {
          p_amount: number
          p_description?: string
          p_from_reseller_id: string
          p_to_reseller_id: string
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
      subscription_status: ["active", "expired", "cancelled", "pending"],
      tenant_status: ["active", "suspended", "trial", "cancelled"],
    },
  },
} as const
