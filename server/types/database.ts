/**
 * Supabase database types — GENERATED, do not edit by hand.
 *
 * Source: live prod project `dxngbuinxutzirowbjgb` (public schema) after the
 * Prerequisite-P consolidation migrations were applied.
 * Regenerate via the Supabase MCP `generate_typescript_types` tool (or
 * `supabase gen types typescript`) and overwrite this file.
 */
/* eslint-disable */

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_key_backups: {
        Row: {
          ciphertext: string
          iterations: number
          iv: string
          salt: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          ciphertext: string
          iterations?: number
          iv: string
          salt: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          ciphertext?: string
          iterations?: number
          iv?: string
          salt?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      account_registry_backups: {
        Row: {
          ciphertext: string
          iv: string
          salt: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          ciphertext: string
          iv: string
          salt: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          ciphertext?: string
          iv?: string
          salt?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      ai_budget_configs: {
        Row: {
          hard_limit_enabled: boolean
          hard_limit_eur: number | null
          hard_limit_usd: number | null
          id: string
          monthly_budget_eur: number | null
          monthly_budget_usd: number | null
          notify_emails: string[] | null
          organisation_id: string
          updated_at: string
          updated_by: string | null
          warn_at_100: boolean
          warn_at_50: boolean
          warn_at_80: boolean
        }
        Insert: {
          hard_limit_enabled?: boolean
          hard_limit_eur?: number | null
          hard_limit_usd?: number | null
          id?: string
          monthly_budget_eur?: number | null
          monthly_budget_usd?: number | null
          notify_emails?: string[] | null
          organisation_id: string
          updated_at?: string
          updated_by?: string | null
          warn_at_100?: boolean
          warn_at_50?: boolean
          warn_at_80?: boolean
        }
        Update: {
          hard_limit_enabled?: boolean
          hard_limit_eur?: number | null
          hard_limit_usd?: number | null
          id?: string
          monthly_budget_eur?: number | null
          monthly_budget_usd?: number | null
          notify_emails?: string[] | null
          organisation_id?: string
          updated_at?: string
          updated_by?: string | null
          warn_at_100?: boolean
          warn_at_50?: boolean
          warn_at_80?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_budget_configs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: true
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_budget_warnings: {
        Row: {
          acknowledged: boolean
          budget_amount: number
          created_at: string
          currency: string
          current_usage: number
          id: string
          organisation_id: string
          period_start: string
          threshold_percent: number
        }
        Insert: {
          acknowledged?: boolean
          budget_amount: number
          created_at?: string
          currency?: string
          current_usage: number
          id?: string
          organisation_id: string
          period_start: string
          threshold_percent: number
        }
        Update: {
          acknowledged?: boolean
          budget_amount?: number
          created_at?: string
          currency?: string
          current_usage?: number
          id?: string
          organisation_id?: string
          period_start?: string
          threshold_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_budget_warnings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_accounts: {
        Row: {
          account_status: string | null
          auto_recharge_amount: number | null
          auto_recharge_enabled: boolean
          auto_recharge_failure_reason: string | null
          auto_recharge_in_flight_at: string | null
          auto_recharge_last_at: string | null
          auto_recharge_pack_id: string | null
          auto_recharge_period_count: number
          auto_recharge_period_start: string | null
          auto_recharge_status: string | null
          auto_recharge_threshold: number
          created_at: string
          default_payment_method_id: string | null
          delete_requested_at: string | null
          dormant_at: string | null
          id: string
          locked_at: string | null
          purge_after: string | null
          purge_started_at: string | null
          purged_at: string | null
          monthly_credits: number
          monthly_reset_at: string
          organisation_id: string | null
          purchased_credits: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean
          subscription_current_period_end: string | null
          subscription_interval: string | null
          subscription_plan: string | null
          subscription_price_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_status?: string | null
          auto_recharge_amount?: number | null
          auto_recharge_enabled?: boolean
          auto_recharge_failure_reason?: string | null
          auto_recharge_in_flight_at?: string | null
          auto_recharge_last_at?: string | null
          auto_recharge_pack_id?: string | null
          auto_recharge_period_count?: number
          auto_recharge_period_start?: string | null
          auto_recharge_status?: string | null
          auto_recharge_threshold?: number
          created_at?: string
          default_payment_method_id?: string | null
          delete_requested_at?: string | null
          dormant_at?: string | null
          id?: string
          locked_at?: string | null
          purge_after?: string | null
          purge_started_at?: string | null
          purged_at?: string | null
          monthly_credits?: number
          monthly_reset_at: string
          organisation_id?: string | null
          purchased_credits?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at_period_end?: boolean
          subscription_current_period_end?: string | null
          subscription_interval?: string | null
          subscription_plan?: string | null
          subscription_price_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_status?: string | null
          auto_recharge_amount?: number | null
          auto_recharge_enabled?: boolean
          auto_recharge_failure_reason?: string | null
          auto_recharge_in_flight_at?: string | null
          auto_recharge_last_at?: string | null
          auto_recharge_pack_id?: string | null
          auto_recharge_period_count?: number
          auto_recharge_period_start?: string | null
          auto_recharge_status?: string | null
          auto_recharge_threshold?: number
          created_at?: string
          default_payment_method_id?: string | null
          delete_requested_at?: string | null
          dormant_at?: string | null
          id?: string
          locked_at?: string | null
          purge_after?: string | null
          purge_started_at?: string | null
          purged_at?: string | null
          monthly_credits?: number
          monthly_reset_at?: string
          organisation_id?: string | null
          purchased_credits?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at_period_end?: boolean
          subscription_current_period_end?: string | null
          subscription_interval?: string | null
          subscription_plan?: string | null
          subscription_price_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_credit_ledger: {
        Row: {
          account_id: string
          created_at: string
          credits: number
          feature_key: string | null
          id: string
          note: string | null
          type: string
          usage_log_id: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          credits: number
          feature_key?: string | null
          id?: string
          note?: string | null
          type: string
          usage_log_id?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          credits?: number
          feature_key?: string | null
          id?: string
          note?: string | null
          type?: string
          usage_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ai_credit_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          audio_minutes: number | null
          cache_miss_input_tokens: number
          cached_input_tokens: number
          case_id: string | null
          created_at: string
          credits_charged: number
          currency_rate_used: number | null
          error_code: string | null
          estimated_cost_eur: number | null
          estimated_cost_usd: number | null
          feature_key: string
          id: string
          input_tokens: number
          latency_ms: number | null
          metadata_json: Json
          mode: string | null
          model: string
          organisation_id: string | null
          output_tokens: number
          provider: string
          raw_usage_json: Json | null
          request_id: string | null
          request_kind: string
          success: boolean
          total_tokens: number
          usage_source: string
          user_id: string | null
        }
        Insert: {
          audio_minutes?: number | null
          cache_miss_input_tokens?: number
          cached_input_tokens?: number
          case_id?: string | null
          created_at?: string
          credits_charged?: number
          currency_rate_used?: number | null
          error_code?: string | null
          estimated_cost_eur?: number | null
          estimated_cost_usd?: number | null
          feature_key: string
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          metadata_json?: Json
          mode?: string | null
          model: string
          organisation_id?: string | null
          output_tokens?: number
          provider: string
          raw_usage_json?: Json | null
          request_id?: string | null
          request_kind?: string
          success?: boolean
          total_tokens?: number
          usage_source?: string
          user_id?: string | null
        }
        Update: {
          audio_minutes?: number | null
          cache_miss_input_tokens?: number
          cached_input_tokens?: number
          case_id?: string | null
          created_at?: string
          credits_charged?: number
          currency_rate_used?: number | null
          error_code?: string | null
          estimated_cost_eur?: number | null
          estimated_cost_usd?: number | null
          feature_key?: string
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          metadata_json?: Json
          mode?: string | null
          model?: string
          organisation_id?: string | null
          output_tokens?: number
          provider?: string
          raw_usage_json?: Json | null
          request_id?: string | null
          request_kind?: string
          success?: boolean
          total_tokens?: number
          usage_source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      cal_calendar_items: {
        Row: {
          assigned_user_id: string | null
          audit_metadata: Json
          case_id: string | null
          created_at: string
          created_by: string
          encrypted_payload: string | null
          end_time: string
          id: string
          location: string | null
          notes: string | null
          organisation_id: string
          patient_id: string | null
          priority: string | null
          reason: string | null
          start_time: string
          status: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          audit_metadata?: Json
          case_id?: string | null
          created_at?: string
          created_by: string
          encrypted_payload?: string | null
          end_time: string
          id?: string
          location?: string | null
          notes?: string | null
          organisation_id: string
          patient_id?: string | null
          priority?: string | null
          reason?: string | null
          start_time: string
          status?: string
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          audit_metadata?: Json
          case_id?: string | null
          created_at?: string
          created_by?: string
          encrypted_payload?: string | null
          end_time?: string
          id?: string
          location?: string | null
          notes?: string | null
          organisation_id?: string
          patient_id?: string | null
          priority?: string | null
          reason?: string | null
          start_time?: string
          status?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cal_calendar_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      cal_reschedule_log: {
        Row: {
          calendar_item_id: string
          created_at: string
          id: string
          new_end: string
          new_start: string
          previous_end: string
          previous_start: string
          reason: string | null
          user_id: string
        }
        Insert: {
          calendar_item_id: string
          created_at?: string
          id?: string
          new_end: string
          new_start: string
          previous_end: string
          previous_start: string
          reason?: string | null
          user_id: string
        }
        Update: {
          calendar_item_id?: string
          created_at?: string
          id?: string
          new_end?: string
          new_start?: string
          previous_end?: string
          previous_start?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cal_reschedule_log_calendar_item_id_fkey"
            columns: ["calendar_item_id"]
            isOneToOne: false
            referencedRelation: "cal_calendar_items"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_balances: {
        Row: {
          balance: number
          id: string
          plan: string
          updated_at: string
        }
        Insert: {
          balance?: number
          id: string
          plan?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          id?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      dc_ai_requests: {
        Row: {
          context_scope: string
          created_at: string
          discussion_id: string
          id: string
          prompt: string
          requester_user_id: string
          response_text: string | null
          status: string
        }
        Insert: {
          context_scope?: string
          created_at?: string
          discussion_id: string
          id?: string
          prompt: string
          requester_user_id: string
          response_text?: string | null
          status?: string
        }
        Update: {
          context_scope?: string
          created_at?: string
          discussion_id?: string
          id?: string
          prompt?: string
          requester_user_id?: string
          response_text?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dc_ai_requests_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "dc_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      dc_annotations: {
        Row: {
          author_user_id: string
          comment_body: string | null
          created_at: string
          discussion_id: string
          end_offset: number
          highlighted_text: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          section_id: string
          start_offset: number
        }
        Insert: {
          author_user_id: string
          comment_body?: string | null
          created_at?: string
          discussion_id: string
          end_offset: number
          highlighted_text: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          section_id: string
          start_offset: number
        }
        Update: {
          author_user_id?: string
          comment_body?: string | null
          created_at?: string
          discussion_id?: string
          end_offset?: number
          highlighted_text?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          section_id?: string
          start_offset?: number
        }
        Relationships: [
          {
            foreignKeyName: "dc_annotations_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "dc_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      dc_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json
          discussion_id: string
          id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          discussion_id: string
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          discussion_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dc_audit_logs_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "dc_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      dc_discussion_packages: {
        Row: {
          content: Json
          created_at: string
          created_by: string
          discussion_id: string
          id: string
          is_deidentified: boolean
          version: number
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by: string
          discussion_id: string
          id?: string
          is_deidentified?: boolean
          version?: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string
          discussion_id?: string
          id?: string
          is_deidentified?: boolean
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "dc_discussion_packages_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "dc_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      dc_discussions: {
        Row: {
          case_id: string
          created_at: string
          expires_at: string | null
          id: string
          owner_user_id: string
          resolution_summary: Json | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          owner_user_id: string
          resolution_summary?: Json | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          owner_user_id?: string
          resolution_summary?: Json | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dc_invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          discussion_id: string
          expires_at: string | null
          id: string
          invite_type: string
          invited_by: string
          invitee_email: string | null
          invitee_username: string | null
          permissions: Json
          revoked_at: string | null
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          discussion_id: string
          expires_at?: string | null
          id?: string
          invite_type: string
          invited_by: string
          invitee_email?: string | null
          invitee_username?: string | null
          permissions?: Json
          revoked_at?: string | null
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          discussion_id?: string
          expires_at?: string | null
          id?: string
          invite_type?: string
          invited_by?: string
          invitee_email?: string | null
          invitee_username?: string | null
          permissions?: Json
          revoked_at?: string | null
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "dc_invites_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "dc_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      dc_messages: {
        Row: {
          author_display_name: string | null
          author_user_id: string
          body: string
          created_at: string
          discussion_id: string
          edited_at: string | null
          id: string
          message_kind: string
          pinned: boolean
          pinned_at: string | null
          pinned_by: string | null
          quote_excerpt: Json | null
          reactions: Json
          reply_preview: Json | null
          reply_to_message_id: string | null
          transcript: Json | null
          voice_attachment: Json | null
        }
        Insert: {
          author_display_name?: string | null
          author_user_id: string
          body: string
          created_at?: string
          discussion_id: string
          edited_at?: string | null
          id?: string
          message_kind?: string
          pinned?: boolean
          pinned_at?: string | null
          pinned_by?: string | null
          quote_excerpt?: Json | null
          reactions?: Json
          reply_preview?: Json | null
          reply_to_message_id?: string | null
          transcript?: Json | null
          voice_attachment?: Json | null
        }
        Update: {
          author_display_name?: string | null
          author_user_id?: string
          body?: string
          created_at?: string
          discussion_id?: string
          edited_at?: string | null
          id?: string
          message_kind?: string
          pinned?: boolean
          pinned_at?: string | null
          pinned_by?: string | null
          quote_excerpt?: Json | null
          reactions?: Json
          reply_preview?: Json | null
          reply_to_message_id?: string | null
          transcript?: Json | null
          voice_attachment?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dc_messages_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "dc_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dc_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "dc_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      dc_participants: {
        Row: {
          discussion_id: string
          id: string
          invite_id: string | null
          joined_at: string
          permissions: Json
          revoked_at: string | null
          revoked_by: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          discussion_id: string
          id?: string
          invite_id?: string | null
          joined_at?: string
          permissions?: Json
          revoked_at?: string | null
          revoked_by?: string | null
          role: string
          status?: string
          user_id: string
        }
        Update: {
          discussion_id?: string
          id?: string
          invite_id?: string | null
          joined_at?: string
          permissions?: Json
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dc_participants_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "dc_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dc_participants_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "dc_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_catalogues: {
        Row: {
          active: boolean
          id: string
          imported_at: string
          language: string
          metadata_json: Json
          source: string
          system: Database["public"]["Enums"]["diagnosis_catalogue_system"]
          version: string
        }
        Insert: {
          active?: boolean
          id?: string
          imported_at?: string
          language?: string
          metadata_json?: Json
          source: string
          system: Database["public"]["Enums"]["diagnosis_catalogue_system"]
          version: string
        }
        Update: {
          active?: boolean
          id?: string
          imported_at?: string
          language?: string
          metadata_json?: Json
          source?: string
          system?: Database["public"]["Enums"]["diagnosis_catalogue_system"]
          version?: string
        }
        Relationships: []
      }
      diagnosis_codes: {
        Row: {
          code: string
          dsm_code: string
          dsm_label: string
          icd10_code: string
          icd10_label: string
          icd11_code: string
          icd11_label: string
          label_de: string
          search_text: string
          system: string
        }
        Insert: {
          code: string
          dsm_code?: string
          dsm_label?: string
          icd10_code: string
          icd10_label: string
          icd11_code?: string
          icd11_label?: string
          label_de: string
          search_text: string
          system: string
        }
        Update: {
          code?: string
          dsm_code?: string
          dsm_label?: string
          icd10_code?: string
          icd10_label?: string
          icd11_code?: string
          icd11_label?: string
          label_de?: string
          search_text?: string
          system?: string
        }
        Relationships: []
      }
      diagnosis_criteria_links: {
        Row: {
          created_at: string
          criteria_system: Database["public"]["Enums"]["diagnosis_criteria_system"]
          criteria_tree_id: string
          diagnosis_entry_id: string
          id: string
          support_status: Database["public"]["Enums"]["diagnosis_criteria_support_status"]
        }
        Insert: {
          created_at?: string
          criteria_system: Database["public"]["Enums"]["diagnosis_criteria_system"]
          criteria_tree_id: string
          diagnosis_entry_id: string
          id?: string
          support_status?: Database["public"]["Enums"]["diagnosis_criteria_support_status"]
        }
        Update: {
          created_at?: string
          criteria_system?: Database["public"]["Enums"]["diagnosis_criteria_system"]
          criteria_tree_id?: string
          diagnosis_entry_id?: string
          id?: string
          support_status?: Database["public"]["Enums"]["diagnosis_criteria_support_status"]
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_criteria_links_diagnosis_entry_id_fkey"
            columns: ["diagnosis_entry_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_entries: {
        Row: {
          block_code: string | null
          block_title: string | null
          catalogue_id: string
          chapter_code: string | null
          chapter_title: string | null
          code: string
          code_normalized: string
          created_at: string
          description: string | null
          hierarchy_level: number
          id: string
          is_category: boolean
          is_psychiatric: boolean
          is_residual_category: boolean
          is_selectable: boolean
          is_somatic: boolean
          metadata_json: Json
          parent_code: string | null
          search_text: string
          short_title: string | null
          source_uri: string | null
          source_version: string | null
          title: string
          updated_at: string
        }
        Insert: {
          block_code?: string | null
          block_title?: string | null
          catalogue_id: string
          chapter_code?: string | null
          chapter_title?: string | null
          code: string
          code_normalized: string
          created_at?: string
          description?: string | null
          hierarchy_level?: number
          id?: string
          is_category?: boolean
          is_psychiatric?: boolean
          is_residual_category?: boolean
          is_selectable?: boolean
          is_somatic?: boolean
          metadata_json?: Json
          parent_code?: string | null
          search_text: string
          short_title?: string | null
          source_uri?: string | null
          source_version?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          block_code?: string | null
          block_title?: string | null
          catalogue_id?: string
          chapter_code?: string | null
          chapter_title?: string | null
          code?: string
          code_normalized?: string
          created_at?: string
          description?: string | null
          hierarchy_level?: number
          id?: string
          is_category?: boolean
          is_psychiatric?: boolean
          is_residual_category?: boolean
          is_selectable?: boolean
          is_somatic?: boolean
          metadata_json?: Json
          parent_code?: string | null
          search_text?: string
          short_title?: string | null
          source_uri?: string | null
          source_version?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_entries_catalogue_id_fkey"
            columns: ["catalogue_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_catalogues"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_synonyms: {
        Row: {
          created_at: string
          diagnosis_entry_id: string
          id: string
          language: string
          normalized_term: string
          source: string
          term: string
        }
        Insert: {
          created_at?: string
          diagnosis_entry_id: string
          id?: string
          language?: string
          normalized_term: string
          source?: string
          term: string
        }
        Update: {
          created_at?: string
          diagnosis_entry_id?: string
          id?: string
          language?: string
          normalized_term?: string
          source?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_synonyms_diagnosis_entry_id_fkey"
            columns: ["diagnosis_entry_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      encrypted_workspace_snapshots: {
        Row: {
          case_id: string
          ciphertext: string
          created_at: string
          device_id: string
          id: string
          iv: string
          title_hint: string | null
          updated_at: string
          user_id: string
          version: number
          wrapped_key: string
        }
        Insert: {
          case_id: string
          ciphertext: string
          created_at?: string
          device_id: string
          id?: string
          iv: string
          title_hint?: string | null
          updated_at?: string
          user_id: string
          version?: number
          wrapped_key: string
        }
        Update: {
          case_id?: string
          ciphertext?: string
          created_at?: string
          device_id?: string
          id?: string
          iv?: string
          title_hint?: string | null
          updated_at?: string
          user_id?: string
          version?: number
          wrapped_key?: string
        }
        Relationships: []
      }
      GenerationLog: {
        Row: {
          aiMode: string
          completedAt: string | null
          createdAt: string
          creditsDeducted: boolean
          documentType: string
          errorMessage: string | null
          estimatedCredits: number
          estimatedInputTokens: number
          id: string
          inputTextLength: number
          model: string | null
          organisationId: string | null
          provider: string | null
          resultTextLength: number | null
          schemaId: string | null
          scope: string | null
          status: string
          tool: string | null
          userId: string | null
        }
        Insert: {
          aiMode: string
          completedAt?: string | null
          createdAt?: string
          creditsDeducted?: boolean
          documentType: string
          errorMessage?: string | null
          estimatedCredits: number
          estimatedInputTokens: number
          id: string
          inputTextLength: number
          model?: string | null
          organisationId?: string | null
          provider?: string | null
          resultTextLength?: number | null
          schemaId?: string | null
          scope?: string | null
          status: string
          tool?: string | null
          userId?: string | null
        }
        Update: {
          aiMode?: string
          completedAt?: string | null
          createdAt?: string
          creditsDeducted?: boolean
          documentType?: string
          errorMessage?: string | null
          estimatedCredits?: number
          estimatedInputTokens?: number
          id?: string
          inputTextLength?: number
          model?: string | null
          organisationId?: string | null
          provider?: string | null
          resultTextLength?: number | null
          schemaId?: string | null
          scope?: string | null
          status?: string
          tool?: string | null
          userId?: string | null
        }
        Relationships: []
      }
      int_clinical_object_mappings: {
        Row: {
          batch_id: string
          batch_kind: string
          created_at: string
          external_ref: string
          fhir_resource_type: string | null
          id: string
          local_id: string
          local_type: string
          metadata: Json
        }
        Insert: {
          batch_id: string
          batch_kind: string
          created_at?: string
          external_ref: string
          fhir_resource_type?: string | null
          id?: string
          local_id: string
          local_type: string
          metadata?: Json
        }
        Update: {
          batch_id?: string
          batch_kind?: string
          created_at?: string
          external_ref?: string
          fhir_resource_type?: string | null
          id?: string
          local_id?: string
          local_type?: string
          metadata?: Json
        }
        Relationships: []
      }
      int_export_batches: {
        Row: {
          adapter_type: Database["public"]["Enums"]["int_adapter_type"]
          case_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          metadata: Json
          object_types: string[]
          organisation_id: string
          status: string
          user_id: string
        }
        Insert: {
          adapter_type: Database["public"]["Enums"]["int_adapter_type"]
          case_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          object_types?: string[]
          organisation_id: string
          status?: string
          user_id: string
        }
        Update: {
          adapter_type?: Database["public"]["Enums"]["int_adapter_type"]
          case_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          object_types?: string[]
          organisation_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "int_export_batches_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      int_external_system_references: {
        Row: {
          case_id: string
          created_at: string
          external_id: string
          external_system: string
          id: string
          local_object_id: string
          local_object_type: string
          metadata: Json
          organisation_id: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          external_id: string
          external_system: string
          id?: string
          local_object_id: string
          local_object_type: string
          metadata?: Json
          organisation_id: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          external_id?: string
          external_system?: string
          id?: string
          local_object_id?: string
          local_object_type?: string
          metadata?: Json
          organisation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "int_external_system_references_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      int_import_batches: {
        Row: {
          adapter_type: Database["public"]["Enums"]["int_adapter_type"]
          completed_at: string | null
          created_at: string
          filename: string | null
          id: string
          metadata: Json
          organisation_id: string
          record_count: number
          status: string
          user_id: string
        }
        Insert: {
          adapter_type: Database["public"]["Enums"]["int_adapter_type"]
          completed_at?: string | null
          created_at?: string
          filename?: string | null
          id?: string
          metadata?: Json
          organisation_id: string
          record_count?: number
          status?: string
          user_id: string
        }
        Update: {
          adapter_type?: Database["public"]["Enums"]["int_adapter_type"]
          completed_at?: string | null
          created_at?: string
          filename?: string | null
          id?: string
          metadata?: Json
          organisation_id?: string
          record_count?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "int_import_batches_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      int_integration_adapters: {
        Row: {
          capabilities: Json
          created_at: string
          id: string
          type: Database["public"]["Enums"]["int_adapter_type"]
          updated_at: string
          version: string
        }
        Insert: {
          capabilities?: Json
          created_at?: string
          id?: string
          type: Database["public"]["Enums"]["int_adapter_type"]
          updated_at?: string
          version?: string
        }
        Update: {
          capabilities?: Json
          created_at?: string
          id?: string
          type?: Database["public"]["Enums"]["int_adapter_type"]
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      int_integration_connections: {
        Row: {
          adapter_type: Database["public"]["Enums"]["int_adapter_type"]
          config: Json
          created_at: string
          enabled: boolean
          id: string
          name: string
          organisation_id: string
          status: string
          updated_at: string
        }
        Insert: {
          adapter_type: Database["public"]["Enums"]["int_adapter_type"]
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          organisation_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          adapter_type?: Database["public"]["Enums"]["int_adapter_type"]
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          organisation_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "int_integration_connections_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      int_integration_event_logs: {
        Row: {
          action: string
          adapter_type: Database["public"]["Enums"]["int_adapter_type"] | null
          case_id: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json
          organisation_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          adapter_type?: Database["public"]["Enums"]["int_adapter_type"] | null
          case_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          organisation_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          adapter_type?: Database["public"]["Enums"]["int_adapter_type"] | null
          case_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          organisation_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "int_integration_event_logs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      int_integration_mappings: {
        Row: {
          connection_id: string
          created_at: string
          id: string
          mapping_rules: Json
          source_type: string
          target_type: string
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          id?: string
          mapping_rules?: Json
          source_type: string
          target_type: string
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          id?: string
          mapping_rules?: Json
          source_type?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "int_integration_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "int_integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      int_integration_sync_jobs: {
        Row: {
          completed_at: string | null
          connection_id: string
          created_at: string
          direction: string
          id: string
          metadata: Json
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          created_at?: string
          direction: string
          id?: string
          metadata?: Json
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          created_at?: string
          direction?: string
          id?: string
          metadata?: Json
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "int_integration_sync_jobs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "int_integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      int_terminology_mappings: {
        Row: {
          code: string
          created_at: string
          display: string | null
          id: string
          local_code: string
          metadata: Json
          system: string
        }
        Insert: {
          code: string
          created_at?: string
          display?: string | null
          id?: string
          local_code: string
          metadata?: Json
          system: string
        }
        Update: {
          code?: string
          created_at?: string
          display?: string | null
          id?: string
          local_code?: string
          metadata?: Json
          system?: string
        }
        Relationships: []
      }
      kb_ai_generations: {
        Row: {
          created_at: string
          duration_ms: number | null
          generic_name: string
          id: string
          model: string
          prompt_version: string
          provider: string
          raw_response: Json | null
          status: string
          substance_id: string | null
          token_count: number | null
          validated_payload: Json | null
          validation_errors: Json | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          generic_name: string
          id?: string
          model: string
          prompt_version?: string
          provider: string
          raw_response?: Json | null
          status: string
          substance_id?: string | null
          token_count?: number | null
          validated_payload?: Json | null
          validation_errors?: Json | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          generic_name?: string
          id?: string
          model?: string
          prompt_version?: string
          provider?: string
          raw_response?: Json | null
          status?: string
          substance_id?: string | null
          token_count?: number | null
          validated_payload?: Json | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_ai_generations_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_contribution_discussions: {
        Row: {
          author_display_name: string | null
          author_user_id: string
          body: string
          contribution_id: string | null
          created_at: string
          id: string
          substance_id: string | null
        }
        Insert: {
          author_display_name?: string | null
          author_user_id: string
          body: string
          contribution_id?: string | null
          created_at?: string
          id?: string
          substance_id?: string | null
        }
        Update: {
          author_display_name?: string | null
          author_user_id?: string
          body?: string
          contribution_id?: string | null
          created_at?: string
          id?: string
          substance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_contribution_discussions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "kb_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_contribution_discussions_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_contribution_reviews: {
        Row: {
          action: string
          contribution_id: string
          created_at: string
          id: string
          notes: string | null
          reviewer_id: string | null
        }
        Insert: {
          action: string
          contribution_id: string
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_id?: string | null
        }
        Update: {
          action?: string
          contribution_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_contribution_reviews_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "kb_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_contribution_votes: {
        Row: {
          contribution_id: string
          created_at: string
          id: string
          vote: string
          voter_user_id: string
        }
        Insert: {
          contribution_id: string
          created_at?: string
          id?: string
          vote: string
          voter_user_id: string
        }
        Update: {
          contribution_id?: string
          created_at?: string
          id?: string
          vote?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_contribution_votes_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "kb_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_contributions: {
        Row: {
          contribution_type: string
          created_at: string
          id: string
          license_accepted: boolean
          payload: Json
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitter_display_name: string | null
          submitter_user_id: string | null
          substance_id: string | null
        }
        Insert: {
          contribution_type: string
          created_at?: string
          id?: string
          license_accepted?: boolean
          payload?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitter_display_name?: string | null
          submitter_user_id?: string | null
          substance_id?: string | null
        }
        Update: {
          contribution_type?: string
          created_at?: string
          id?: string
          license_accepted?: boolean
          payload?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitter_display_name?: string | null
          submitter_user_id?: string | null
          substance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_contributions_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_country_preparations: {
        Row: {
          country_code: string
          created_at: string
          dosage_form: string
          id: string
          notes: string | null
          pzn: string | null
          route: string
          source_id: string | null
          strength_unit: string
          strength_value: string
          substance_id: string
          trade_name: string | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          country_code: string
          created_at?: string
          dosage_form: string
          id?: string
          notes?: string | null
          pzn?: string | null
          route: string
          source_id?: string | null
          strength_unit: string
          strength_value: string
          substance_id: string
          trade_name?: string | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          dosage_form?: string
          id?: string
          notes?: string | null
          pzn?: string | null
          route?: string
          source_id?: string | null
          strength_unit?: string
          strength_value?: string
          substance_id?: string
          trade_name?: string | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_country_preparations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "kb_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_country_preparations_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_dosage_guidance: {
        Row: {
          administration_notes: string | null
          administration_notes_de: string | null
          created_at: string
          id: string
          max_dose: string | null
          max_dose_de: string | null
          population: string
          population_de: string | null
          sort_order: number
          start_dose: string | null
          start_dose_de: string | null
          substance_id: string
          target_dose: string | null
          target_dose_de: string | null
          titration_notes: string | null
          titration_notes_de: string | null
        }
        Insert: {
          administration_notes?: string | null
          administration_notes_de?: string | null
          created_at?: string
          id?: string
          max_dose?: string | null
          max_dose_de?: string | null
          population?: string
          population_de?: string | null
          sort_order?: number
          start_dose?: string | null
          start_dose_de?: string | null
          substance_id: string
          target_dose?: string | null
          target_dose_de?: string | null
          titration_notes?: string | null
          titration_notes_de?: string | null
        }
        Update: {
          administration_notes?: string | null
          administration_notes_de?: string | null
          created_at?: string
          id?: string
          max_dose?: string | null
          max_dose_de?: string | null
          population?: string
          population_de?: string | null
          sort_order?: number
          start_dose?: string | null
          start_dose_de?: string | null
          substance_id?: string
          target_dose?: string | null
          target_dose_de?: string | null
          titration_notes?: string | null
          titration_notes_de?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_dosage_guidance_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_field_provenance: {
        Row: {
          confidence: string | null
          contribution_id: string | null
          contributor_user_id: string | null
          created_at: string
          field_path: string
          id: string
          source_citation: string | null
          source_type: string
          source_url: string | null
          substance_id: string
          value_snapshot: Json | null
        }
        Insert: {
          confidence?: string | null
          contribution_id?: string | null
          contributor_user_id?: string | null
          created_at?: string
          field_path: string
          id?: string
          source_citation?: string | null
          source_type: string
          source_url?: string | null
          substance_id: string
          value_snapshot?: Json | null
        }
        Update: {
          confidence?: string | null
          contribution_id?: string | null
          contributor_user_id?: string | null
          created_at?: string
          field_path?: string
          id?: string
          source_citation?: string | null
          source_type?: string
          source_url?: string | null
          substance_id?: string
          value_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_field_provenance_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "kb_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_field_provenance_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_interaction_notes: {
        Row: {
          clinical_management: string | null
          clinical_management_de: string | null
          created_at: string
          id: string
          interacts_with: string
          interacts_with_de: string | null
          mechanism: string | null
          mechanism_de: string | null
          severity: string
          sort_order: number
          substance_id: string
        }
        Insert: {
          clinical_management?: string | null
          clinical_management_de?: string | null
          created_at?: string
          id?: string
          interacts_with: string
          interacts_with_de?: string | null
          mechanism?: string | null
          mechanism_de?: string | null
          severity?: string
          sort_order?: number
          substance_id: string
        }
        Update: {
          clinical_management?: string | null
          clinical_management_de?: string | null
          created_at?: string
          id?: string
          interacts_with?: string
          interacts_with_de?: string | null
          mechanism?: string | null
          mechanism_de?: string | null
          severity?: string
          sort_order?: number
          substance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_interaction_notes_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_monitoring_recommendations: {
        Row: {
          created_at: string
          id: string
          interval_text: string | null
          interval_text_de: string | null
          parameter: string
          parameter_de: string | null
          priority: string
          rationale: string | null
          rationale_de: string | null
          sort_order: number
          substance_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_text?: string | null
          interval_text_de?: string | null
          parameter: string
          parameter_de?: string | null
          priority?: string
          rationale?: string | null
          rationale_de?: string | null
          sort_order?: number
          substance_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_text?: string | null
          interval_text_de?: string | null
          parameter?: string
          parameter_de?: string | null
          priority?: string
          rationale?: string | null
          rationale_de?: string | null
          sort_order?: number
          substance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_monitoring_recommendations_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_pharmacokinetics: {
        Row: {
          bioavailability_percent: number | null
          created_at: string
          half_life_hours: number | null
          half_life_note: string | null
          half_life_note_de: string | null
          id: string
          is_estimated: boolean
          protein_binding_percent: number | null
          source_note: string | null
          substance_id: string
          summary: string | null
          summary_de: string | null
          tdm_high: number | null
          tdm_low: number | null
          tdm_note: string | null
          tdm_note_de: string | null
          tdm_unit: string | null
          time_to_steady_state_days: number | null
          tmax_hours: number | null
          updated_at: string
        }
        Insert: {
          bioavailability_percent?: number | null
          created_at?: string
          half_life_hours?: number | null
          half_life_note?: string | null
          half_life_note_de?: string | null
          id?: string
          is_estimated?: boolean
          protein_binding_percent?: number | null
          source_note?: string | null
          substance_id: string
          summary?: string | null
          summary_de?: string | null
          tdm_high?: number | null
          tdm_low?: number | null
          tdm_note?: string | null
          tdm_note_de?: string | null
          tdm_unit?: string | null
          time_to_steady_state_days?: number | null
          tmax_hours?: number | null
          updated_at?: string
        }
        Update: {
          bioavailability_percent?: number | null
          created_at?: string
          half_life_hours?: number | null
          half_life_note?: string | null
          half_life_note_de?: string | null
          id?: string
          is_estimated?: boolean
          protein_binding_percent?: number | null
          source_note?: string | null
          substance_id?: string
          summary?: string | null
          summary_de?: string | null
          tdm_high?: number | null
          tdm_low?: number | null
          tdm_note?: string | null
          tdm_note_de?: string | null
          tdm_unit?: string | null
          time_to_steady_state_days?: number | null
          tmax_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_pharmacokinetics_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: true
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_receptor_affinities: {
        Row: {
          affinity_percent: number | null
          confidence: string
          created_at: string
          effect_type: string
          explanation: string | null
          explanation_de: string | null
          id: string
          is_estimated: boolean
          p_ki: number | null
          raw_ki_nm: number | null
          receptor: string
          sort_order: number
          source_id: string | null
          substance_id: string
        }
        Insert: {
          affinity_percent?: number | null
          confidence?: string
          created_at?: string
          effect_type?: string
          explanation?: string | null
          explanation_de?: string | null
          id?: string
          is_estimated?: boolean
          p_ki?: number | null
          raw_ki_nm?: number | null
          receptor: string
          sort_order?: number
          source_id?: string | null
          substance_id: string
        }
        Update: {
          affinity_percent?: number | null
          confidence?: string
          created_at?: string
          effect_type?: string
          explanation?: string | null
          explanation_de?: string | null
          id?: string
          is_estimated?: boolean
          p_ki?: number | null
          raw_ki_nm?: number | null
          receptor?: string
          sort_order?: number
          source_id?: string | null
          substance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_receptor_affinities_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "kb_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_receptor_affinities_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_releases: {
        Row: {
          created_at: string
          id: string
          is_current: boolean
          notes: string | null
          published_at: string
          snapshot_metadata: Json | null
          source: string
          synced_at: string
          version_label: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_current?: boolean
          notes?: string | null
          published_at: string
          snapshot_metadata?: Json | null
          source?: string
          synced_at: string
          version_label: string
        }
        Update: {
          created_at?: string
          id?: string
          is_current?: boolean
          notes?: string | null
          published_at?: string
          snapshot_metadata?: Json | null
          source?: string
          synced_at?: string
          version_label?: string
        }
        Relationships: []
      }
      kb_revision_history: {
        Row: {
          changes_summary: string | null
          created_at: string
          created_by: string | null
          id: string
          previous_snapshot: Json | null
          revision_type: string
          substance_id: string
        }
        Insert: {
          changes_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          previous_snapshot?: Json | null
          revision_type: string
          substance_id: string
        }
        Update: {
          changes_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          previous_snapshot?: Json | null
          revision_type?: string
          substance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_revision_history_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_side_effects: {
        Row: {
          created_at: string
          effect: string
          effect_de: string | null
          frequency: string
          id: string
          is_severe_risk: boolean
          note: string | null
          note_de: string | null
          severity: string
          sort_order: number
          substance_id: string
          system: string | null
          system_de: string | null
        }
        Insert: {
          created_at?: string
          effect: string
          effect_de?: string | null
          frequency?: string
          id?: string
          is_severe_risk?: boolean
          note?: string | null
          note_de?: string | null
          severity?: string
          sort_order?: number
          substance_id: string
          system?: string | null
          system_de?: string | null
        }
        Update: {
          created_at?: string
          effect?: string
          effect_de?: string | null
          frequency?: string
          id?: string
          is_severe_risk?: boolean
          note?: string | null
          note_de?: string | null
          severity?: string
          sort_order?: number
          substance_id?: string
          system?: string | null
          system_de?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_side_effects_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_sources: {
        Row: {
          accessed_at: string | null
          citation: string
          created_at: string
          id: string
          source_type: string
          substance_id: string | null
          url: string | null
        }
        Insert: {
          accessed_at?: string | null
          citation: string
          created_at?: string
          id?: string
          source_type?: string
          substance_id?: string | null
          url?: string | null
        }
        Update: {
          accessed_at?: string | null
          citation?: string
          created_at?: string
          id?: string
          source_type?: string
          substance_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_sources_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_substance_trade_names: {
        Row: {
          country_code: string | null
          created_at: string
          id: string
          is_primary: boolean
          substance_id: string
          trade_name: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          substance_id: string
          trade_name: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          substance_id?: string
          trade_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_substance_trade_names_substance_id_fkey"
            columns: ["substance_id"]
            isOneToOne: false
            referencedRelation: "kb_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_substances: {
        Row: {
          category: string | null
          clinical_pearls: string | null
          clinical_pearls_de: string | null
          contraindications: Json
          contraindications_de: Json | null
          country_default: string
          created_at: string
          generic_name: string
          geriatric_caution: string | null
          geriatric_caution_de: string | null
          hepatic_renal_caution: string | null
          hepatic_renal_caution_de: string | null
          id: string
          mechanism_summary: string | null
          mechanism_summary_de: string | null
          needs_clinical_review: boolean
          normalized_generic_name: string
          pharmacodynamic_profile: string | null
          pharmacodynamic_profile_de: string | null
          pregnancy_lactation_caution: string | null
          pregnancy_lactation_caution_de: string | null
          primary_psychiatric_uses: Json
          primary_psychiatric_uses_de: Json | null
          review_status: string
          severe_risks: Json
          severe_risks_de: Json | null
          source_quality: string
          status: string
          substance_class: string | null
          substance_class_de: string | null
          translated_at: string | null
          translation_status: string
          uncertainty_notes: string | null
          uncertainty_notes_de: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          clinical_pearls?: string | null
          clinical_pearls_de?: string | null
          contraindications?: Json
          contraindications_de?: Json | null
          country_default?: string
          created_at?: string
          generic_name: string
          geriatric_caution?: string | null
          geriatric_caution_de?: string | null
          hepatic_renal_caution?: string | null
          hepatic_renal_caution_de?: string | null
          id?: string
          mechanism_summary?: string | null
          mechanism_summary_de?: string | null
          needs_clinical_review?: boolean
          normalized_generic_name: string
          pharmacodynamic_profile?: string | null
          pharmacodynamic_profile_de?: string | null
          pregnancy_lactation_caution?: string | null
          pregnancy_lactation_caution_de?: string | null
          primary_psychiatric_uses?: Json
          primary_psychiatric_uses_de?: Json | null
          review_status?: string
          severe_risks?: Json
          severe_risks_de?: Json | null
          source_quality?: string
          status?: string
          substance_class?: string | null
          substance_class_de?: string | null
          translated_at?: string | null
          translation_status?: string
          uncertainty_notes?: string | null
          uncertainty_notes_de?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          clinical_pearls?: string | null
          clinical_pearls_de?: string | null
          contraindications?: Json
          contraindications_de?: Json | null
          country_default?: string
          created_at?: string
          generic_name?: string
          geriatric_caution?: string | null
          geriatric_caution_de?: string | null
          hepatic_renal_caution?: string | null
          hepatic_renal_caution_de?: string | null
          id?: string
          mechanism_summary?: string | null
          mechanism_summary_de?: string | null
          needs_clinical_review?: boolean
          normalized_generic_name?: string
          pharmacodynamic_profile?: string | null
          pharmacodynamic_profile_de?: string | null
          pregnancy_lactation_caution?: string | null
          pregnancy_lactation_caution_de?: string | null
          primary_psychiatric_uses?: Json
          primary_psychiatric_uses_de?: Json | null
          review_status?: string
          severe_risks?: Json
          severe_risks_de?: Json | null
          source_quality?: string
          status?: string
          substance_class?: string | null
          substance_class_de?: string | null
          translated_at?: string | null
          translation_status?: string
          uncertainty_notes?: string | null
          uncertainty_notes_de?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_base_drugs: {
        Row: {
          collection_id: string | null
          created_at: string
          data: Json
          generic_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          data: Json
          generic_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          data?: Json
          generic_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_base_preparations: {
        Row: {
          country_code: string | null
          created_at: string
          data: Json
          generic_name: string | null
          id: string
          substance_id: string | null
          trade_name: string | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          data: Json
          generic_name?: string | null
          id: string
          substance_id?: string | null
          trade_name?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          data?: Json
          generic_name?: string | null
          id?: string
          substance_id?: string | null
          trade_name?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      ks_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json
          id: string
          request_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          request_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ks_audit_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "ks_consultation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ks_consultation_requests: {
        Row: {
          access_type: string
          case_id: string
          clinical_question: string
          clinician_user_id: string
          consultant_email: string | null
          consultant_user_id: string | null
          consultant_username: string | null
          created_at: string
          deadline: string | null
          examination_requested: boolean
          expires_at: string | null
          id: string
          kurzanamnese: string
          legal_consent_note: string | null
          patient_identifier_mode: string
          reviewed_at: string | null
          reviewed_by: string | null
          revoked_at: string | null
          specialty: string
          status: string
          title: string
          updated_at: string
          urgency: string
        }
        Insert: {
          access_type: string
          case_id: string
          clinical_question: string
          clinician_user_id: string
          consultant_email?: string | null
          consultant_user_id?: string | null
          consultant_username?: string | null
          created_at?: string
          deadline?: string | null
          examination_requested?: boolean
          expires_at?: string | null
          id?: string
          kurzanamnese?: string
          legal_consent_note?: string | null
          patient_identifier_mode?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revoked_at?: string | null
          specialty: string
          status?: string
          title: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          access_type?: string
          case_id?: string
          clinical_question?: string
          clinician_user_id?: string
          consultant_email?: string | null
          consultant_user_id?: string | null
          consultant_username?: string | null
          created_at?: string
          deadline?: string | null
          examination_requested?: boolean
          expires_at?: string | null
          id?: string
          kurzanamnese?: string
          legal_consent_note?: string | null
          patient_identifier_mode?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revoked_at?: string | null
          specialty?: string
          status?: string
          title?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      ks_invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          invited_by: string
          invitee_email: string
          request_id: string
          revoked_at: string | null
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invited_by: string
          invitee_email: string
          request_id: string
          revoked_at?: string | null
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          invitee_email?: string
          request_id?: string
          revoked_at?: string | null
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "ks_invites_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "ks_consultation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ks_messages: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          message_type: string
          request_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          message_type: string
          request_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          message_type?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ks_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "ks_consultation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ks_participants: {
        Row: {
          id: string
          invite_id: string | null
          joined_at: string
          request_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invite_id?: string | null
          joined_at?: string
          request_id: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          invite_id?: string | null
          joined_at?: string
          request_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ks_participants_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "ks_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ks_participants_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "ks_consultation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ks_reports: {
        Row: {
          assessment: string
          created_at: string
          findings: string
          follow_up: string
          id: string
          limitations: string
          patient_examined: string
          recommendations: string
          request_id: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          assessment?: string
          created_at?: string
          findings?: string
          follow_up?: string
          id?: string
          limitations?: string
          patient_examined?: string
          recommendations?: string
          request_id: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          assessment?: string
          created_at?: string
          findings?: string
          follow_up?: string
          id?: string
          limitations?: string
          patient_examined?: string
          recommendations?: string
          request_id?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ks_reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "ks_consultation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ks_shared_items: {
        Row: {
          content: string
          created_at: string
          id: string
          item_key: string
          item_type: string
          label: string
          metadata: Json
          purged_at: string | null
          request_id: string
          sort_order: number
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          item_key: string
          item_type: string
          label: string
          metadata?: Json
          purged_at?: string | null
          request_id: string
          sort_order?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          item_key?: string
          item_type?: string
          label?: string
          metadata?: Json
          purged_at?: string | null
          request_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ks_shared_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "ks_consultation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      org_audit_logs: {
        Row: {
          action: string
          case_id: string | null
          created_at: string
          document_id: string | null
          id: string
          ip: string | null
          metadata: Json
          organisation_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          case_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
          organisation_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          case_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
          organisation_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_audit_logs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_calendar_keys: {
        Row: {
          created_at: string
          key_version: number
          organisation_id: string
          updated_at: string
          user_id: string
          wrapped_key: string
        }
        Insert: {
          created_at?: string
          key_version?: number
          organisation_id: string
          updated_at?: string
          user_id: string
          wrapped_key: string
        }
        Update: {
          created_at?: string
          key_version?: number
          organisation_id?: string
          updated_at?: string
          user_id?: string
          wrapped_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_calendar_keys_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_case_access: {
        Row: {
          case_id: string
          created_at: string
          granted_by: string | null
          granted_permissions: Json
          id: string
          organisation_id: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          granted_by?: string | null
          granted_permissions?: Json
          id?: string
          organisation_id: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          granted_by?: string | null
          granted_permissions?: Json
          id?: string
          organisation_id?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_case_access_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_case_access_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "org_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      org_case_vault_keys: {
        Row: {
          case_id: string
          created_at: string
          key_version: number
          organisation_id: string
          user_id: string
          wrapped_key: string
        }
        Insert: {
          case_id: string
          created_at?: string
          key_version?: number
          organisation_id: string
          user_id: string
          wrapped_key: string
        }
        Update: {
          case_id?: string
          created_at?: string
          key_version?: number
          organisation_id?: string
          user_id?: string
          wrapped_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_case_vault_keys_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_case_vault_snapshots: {
        Row: {
          case_id: string
          ciphertext: string
          iv: string
          organisation_id: string
          payload_version: number | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          case_id: string
          ciphertext: string
          iv: string
          organisation_id: string
          payload_version?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          case_id?: string
          ciphertext?: string
          iv?: string
          organisation_id?: string
          payload_version?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_case_vault_snapshots_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string
          email: string
          email_delivery_status: string
          expires_at: string | null
          id: string
          invited_by: string
          invited_name: string | null
          organisation_id: string
          role: string
          status: string
          therapy_discipline: string | null
          therapy_discipline_custom: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email: string
          email_delivery_status?: string
          expires_at?: string | null
          id?: string
          invited_by: string
          invited_name?: string | null
          organisation_id: string
          role: string
          status?: string
          therapy_discipline?: string | null
          therapy_discipline_custom?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email?: string
          email_delivery_status?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          invited_name?: string | null
          organisation_id?: string
          role?: string
          status?: string
          therapy_discipline?: string | null
          therapy_discipline_custom?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_member_vault_keys: {
        Row: {
          key_version: number
          organisation_id: string
          public_key_jwk: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          key_version?: number
          organisation_id: string
          public_key_jwk: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          key_version?: number
          organisation_id?: string
          public_key_jwk?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_member_vault_keys_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          organisation_id: string
          role: string
          settings: Json
          status: string
          therapy_discipline: string | null
          therapy_discipline_custom: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organisation_id: string
          role: string
          settings?: Json
          status?: string
          therapy_discipline?: string | null
          therapy_discipline_custom?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organisation_id?: string
          role?: string
          settings?: Json
          status?: string
          therapy_discipline?: string | null
          therapy_discipline_custom?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_module_access: {
        Row: {
          case_id: string | null
          created_at: string
          id: string
          module_name: string
          organisation_id: string
          permissions: Json
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          id?: string
          module_name: string
          organisation_id: string
          permissions?: Json
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string
          id?: string
          module_name?: string
          organisation_id?: string
          permissions?: Json
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_module_access_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_module_access_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "org_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      org_organisations: {
        Row: {
          created_at: string
          id: string
          is_personal: boolean
          name: string
          personal_owner_user_id: string | null
          settings: Json
          slug: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_personal?: boolean
          name: string
          personal_owner_user_id?: string | null
          settings?: Json
          slug: string
          tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_personal?: boolean
          name?: string
          personal_owner_user_id?: string | null
          settings?: Json
          slug?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_sites: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          organisation_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          organisation_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          organisation_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_sites_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_sso_config: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          organisation_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          organisation_id: string
          provider?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          organisation_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_sso_config_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: true
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_teams: {
        Row: {
          created_at: string
          id: string
          name: string
          organisation_id: string
          parent_id: string | null
          site_id: string | null
          team_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organisation_id: string
          parent_id?: string | null
          site_id?: string | null
          team_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organisation_id?: string
          parent_id?: string | null
          site_id?: string | null
          team_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_teams_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_teams_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_teams_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "org_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_cases: {
        Row: {
          account_id: string
          case_id: string
          created_at: string
          last_document_type: string | null
          last_opened: string
          updated_at: string
        }
        Insert: {
          account_id: string
          case_id: string
          created_at?: string
          last_document_type?: string | null
          last_opened?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          case_id?: string
          created_at?: string
          last_document_type?: string | null
          last_opened?: string
          updated_at?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          case_id: string | null
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          organisation_id: string | null
          owner_user_id: string
          patient_label: string | null
          priority: string | null
          text: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          case_id?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          organisation_id?: string | null
          owner_user_id: string
          patient_label?: string | null
          priority?: string | null
          text: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          case_id?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          organisation_id?: string | null
          owner_user_id?: string
          patient_label?: string | null
          priority?: string | null
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "org_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_contact_submissions: {
        Row: {
          category: string
          created_at: string
          id: string
          ip_hash: string
          locale: string | null
          success: boolean
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          ip_hash: string
          locale?: string | null
          success?: boolean
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          ip_hash?: string
          locale?: string | null
          success?: boolean
        }
        Relationships: []
      }
      user_legal_acceptances: {
        Row: {
          accepted_at: string
          avv_version: string | null
          created_at: string
          id: string
          locale: string | null
          privacy_version: string
          terms_version: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          avv_version?: string | null
          created_at?: string
          id?: string
          locale?: string | null
          privacy_version: string
          terms_version: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          avv_version?: string | null
          created_at?: string
          id?: string
          locale?: string | null
          privacy_version?: string
          terms_version?: string
          user_id?: string
        }
        Relationships: []
      }
      user_public_keys: {
        Row: {
          country_code: string
          created_at: string
          device_id: string
          id: string
          public_key_jwk: string
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          device_id: string
          id?: string
          public_key_jwk: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          device_id?: string
          id?: string
          public_key_jwk?: string
          updated_at?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          credits_per_period: number
          id: string
          max_redemptions: number
          period_months: number
          source: string
          status: string
          stripe_session_id: string | null
          total_periods: number
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          credits_per_period: number
          id?: string
          max_redemptions?: number
          period_months?: number
          source?: string
          status?: string
          stripe_session_id?: string | null
          total_periods: number
          updated_at?: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          credits_per_period?: number
          id?: string
          max_redemptions?: number
          period_months?: number
          source?: string
          status?: string
          stripe_session_id?: string | null
          total_periods?: number
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      voucher_redemptions: {
        Row: {
          created_at: string
          id: string
          last_grant_at: string | null
          next_grant_at: string | null
          periods_granted: number
          redeemed_at: string
          redeemed_by: string
          updated_at: string
          voucher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_grant_at?: string | null
          next_grant_at?: string | null
          periods_granted?: number
          redeemed_at?: string
          redeemed_by: string
          updated_at?: string
          voucher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_grant_at?: string | null
          next_grant_at?: string | null
          periods_granted?: number
          redeemed_at?: string
          redeemed_by?: string
          updated_at?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_period_grants: {
        Row: {
          credits: number
          granted_at: string
          id: string
          period_index: number
          redemption_id: string
        }
        Insert: {
          credits: number
          granted_at?: string
          id?: string
          period_index: number
          redemption_id: string
        }
        Update: {
          credits?: number
          granted_at?: string
          id?: string
          period_index?: number
          redemption_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_period_grants_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "voucher_redemptions"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          invite_code: string
          invitee_user: string | null
          referrer_user: string
          reward_credits: number
          rewarded_at: string | null
          signed_up_at: string | null
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          invite_code: string
          invitee_user?: string | null
          referrer_user: string
          reward_credits?: number
          rewarded_at?: string | null
          signed_up_at?: string | null
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          invitee_user?: string | null
          referrer_user?: string
          reward_credits?: number
          rewarded_at?: string | null
          signed_up_at?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_begin_unsubscribe: {
        Args: {
          p_user_id: string
          p_dormant_days?: number
        }
        Returns: Database['public']['Tables']['ai_credit_accounts']['Row']
      }
      account_cancel_delete: {
        Args: {
          p_user_id: string
        }
        Returns: Database['public']['Tables']['ai_credit_accounts']['Row']
      }
      account_claim_due_purges: {
        Args: {
          p_limit?: number
        }
        Returns: string[]
      }
      account_purge_data: {
        Args: {
          p_user_id: string
        }
        Returns: Database['public']['Tables']['ai_credit_accounts']['Row']
      }
      account_reactivate: {
        Args: {
          p_user_id: string
        }
        Returns: Database['public']['Tables']['ai_credit_accounts']['Row']
      }
      account_release_purge: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      account_request_delete: {
        Args: {
          p_user_id: string
          p_grace_days?: number
        }
        Returns: Database['public']['Tables']['ai_credit_accounts']['Row']
      }
      ai_credit_debit: {
        Args: {
          p_account_id: string
          p_credits: number
          p_feature_key: string
          p_note?: string
          p_usage_log_id?: string
        }
        Returns: boolean
      }
      ai_credit_ensure_account: {
        Args: {
          p_monthly_grant: number
          p_next_reset: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          id: string
          monthly_credits: number
          monthly_reset_at: string
          organisation_id: string | null
          purchased_credits: number
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_credit_apply_subscription: {
        Args: {
          p_user_id: string
          p_status: string
          p_plan: string
          p_interval: string
          p_customer_id: string
          p_subscription_id: string
          p_price_id: string
          p_current_period_end: string
          p_cancel_at_period_end: boolean
        }
        Returns: {
          created_at: string
          id: string
          locked_at: string | null
          monthly_credits: number
          monthly_reset_at: string
          organisation_id: string | null
          purchased_credits: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean
          subscription_current_period_end: string | null
          subscription_interval: string | null
          subscription_plan: string | null
          subscription_price_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_credit_auto_recharge_begin: {
        Args: {
          p_user_id: string
          p_max_per_period: number
          p_period: string
          p_cooldown: string
          p_stale: string
        }
        Returns: {
          auto_recharge_amount: number | null
          auto_recharge_enabled: boolean
          auto_recharge_failure_reason: string | null
          auto_recharge_in_flight_at: string | null
          auto_recharge_last_at: string | null
          auto_recharge_pack_id: string | null
          auto_recharge_period_count: number
          auto_recharge_period_start: string | null
          auto_recharge_status: string | null
          auto_recharge_threshold: number
          created_at: string
          default_payment_method_id: string | null
          id: string
          locked_at: string | null
          monthly_credits: number
          monthly_reset_at: string
          organisation_id: string | null
          purchased_credits: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean
          subscription_current_period_end: string | null
          subscription_interval: string | null
          subscription_plan: string | null
          subscription_price_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_credit_auto_recharge_finish: {
        Args: {
          p_user_id: string
          p_success: boolean
          p_disable: boolean
          p_failure_reason: string
        }
        Returns: {
          auto_recharge_amount: number | null
          auto_recharge_enabled: boolean
          auto_recharge_failure_reason: string | null
          auto_recharge_in_flight_at: string | null
          auto_recharge_last_at: string | null
          auto_recharge_pack_id: string | null
          auto_recharge_period_count: number
          auto_recharge_period_start: string | null
          auto_recharge_status: string | null
          auto_recharge_threshold: number
          created_at: string
          default_payment_method_id: string | null
          id: string
          locked_at: string | null
          monthly_credits: number
          monthly_reset_at: string
          organisation_id: string | null
          purchased_credits: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean
          subscription_current_period_end: string | null
          subscription_interval: string | null
          subscription_plan: string | null
          subscription_price_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_credit_set_auto_recharge: {
        Args: {
          p_user_id: string
          p_enabled: boolean
          p_threshold: number
          p_pack_id: string
          p_amount: number
        }
        Returns: {
          auto_recharge_amount: number | null
          auto_recharge_enabled: boolean
          auto_recharge_failure_reason: string | null
          auto_recharge_in_flight_at: string | null
          auto_recharge_last_at: string | null
          auto_recharge_pack_id: string | null
          auto_recharge_period_count: number
          auto_recharge_period_start: string | null
          auto_recharge_status: string | null
          auto_recharge_threshold: number
          created_at: string
          default_payment_method_id: string | null
          id: string
          locked_at: string | null
          monthly_credits: number
          monthly_reset_at: string
          organisation_id: string | null
          purchased_credits: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean
          subscription_current_period_end: string | null
          subscription_interval: string | null
          subscription_plan: string | null
          subscription_price_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_credit_set_payment_method: {
        Args: {
          p_user_id: string
          p_customer_id: string
          p_payment_method_id: string
        }
        Returns: {
          auto_recharge_amount: number | null
          auto_recharge_enabled: boolean
          auto_recharge_failure_reason: string | null
          auto_recharge_in_flight_at: string | null
          auto_recharge_last_at: string | null
          auto_recharge_pack_id: string | null
          auto_recharge_period_count: number
          auto_recharge_period_start: string | null
          auto_recharge_status: string | null
          auto_recharge_threshold: number
          created_at: string
          default_payment_method_id: string | null
          id: string
          locked_at: string | null
          monthly_credits: number
          monthly_reset_at: string
          organisation_id: string | null
          purchased_credits: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean
          subscription_current_period_end: string | null
          subscription_interval: string | null
          subscription_plan: string | null
          subscription_price_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_credit_grant_purchased: {
        Args: {
          p_account_id: string
          p_credits: number
          p_feature_key?: string
          p_note?: string
        }
        Returns: undefined
      }
      ai_credit_grant_subscription_period: {
        Args: {
          p_user_id: string
          p_credits: number
          p_current_period_end: string
          p_note: string
        }
        Returns: {
          created_at: string
          id: string
          locked_at: string | null
          monthly_credits: number
          monthly_reset_at: string
          organisation_id: string | null
          purchased_credits: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean
          subscription_current_period_end: string | null
          subscription_interval: string | null
          subscription_plan: string | null
          subscription_price_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_credit_set_lock: {
        Args: { p_user_id: string; p_locked: boolean }
        Returns: {
          created_at: string
          id: string
          locked_at: string | null
          monthly_credits: number
          monthly_reset_at: string
          organisation_id: string | null
          purchased_credits: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean
          subscription_current_period_end: string | null
          subscription_interval: string | null
          subscription_plan: string | null
          subscription_price_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_credit_start_trial: {
        Args: {
          p_user_id: string
          p_trial_credits: number
          p_trial_days: number
        }
        Returns: {
          created_at: string
          id: string
          locked_at: string | null
          monthly_credits: number
          monthly_reset_at: string
          organisation_id: string | null
          purchased_credits: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean
          subscription_current_period_end: string | null
          subscription_interval: string | null
          subscription_plan: string | null
          subscription_price_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_credit_refund: {
        Args: {
          p_account_id: string
          p_credits: number
          p_feature_key: string
          p_note?: string
          p_usage_log_id?: string
        }
        Returns: undefined
      }
      voucher_redeem: {
        Args: { p_user_id: string; p_code: string }
        Returns: Json
      }
      voucher_grant_period: {
        Args: { p_redemption_id: string; p_period_index: number }
        Returns: boolean
      }
      voucher_create_from_purchase: {
        Args: {
          p_session_id: string
          p_buyer: string
          p_code: string
          p_credits_per_period: number
          p_period_months: number
          p_total_periods: number
          p_valid_days: number
        }
        Returns: Json
      }
      voucher_create_admin: {
        Args: {
          p_created_by: string
          p_code: string | null
          p_credits_per_period: number
          p_period_months: number
          p_total_periods: number
          p_max_redemptions: number
          p_valid_until: string | null
          p_valid_days: number | null
        }
        Returns: Json
      }
      voucher_list_admin: {
        Args: never
        Returns: Json
      }
      referral_get_or_create_code: {
        Args: { p_user_id: string; p_code: string }
        Returns: string
      }
      referral_attribute: {
        Args: { p_invitee: string; p_code: string }
        Returns: Json
      }
      referral_claim_reward: {
        Args: { p_invitee: string; p_reward_credits: number }
        Returns: Json
      }
      dc_is_participant: { Args: { p_discussion_id: string }; Returns: boolean }
      dc_purge_abandoned: { Args: { p_ttl?: string }; Returns: number }
      is_kb_editor: { Args: never; Returns: boolean }
      kb_substance_is_public: {
        Args: { p_substance_id: string }
        Returns: boolean
      }
      ks_is_participant: { Args: { p_request_id: string }; Returns: boolean }
      ks_purge_abandoned: { Args: { p_ttl?: string }; Returns: number }
      org_is_member: { Args: { p_organisation_id: string }; Returns: boolean }
      org_provision_personal_org: {
        Args: { p_name?: string; p_user_id: string }
        Returns: string
      }
      patient_case_delete_with_snapshots: {
        Args: { p_case_id: string }
        Returns: undefined
      }
      purge_abandoned_shared_material: { Args: never; Returns: undefined }
    }
    Enums: {
      diagnosis_catalogue_system:
        | "ICD10GM"
        | "ICD10WHO"
        | "ICD11MMS"
        | "DSM5TR"
        | "LOCAL"
      diagnosis_criteria_support_status: "native" | "fallback" | "unavailable"
      diagnosis_criteria_system: "ICD10" | "ICD11" | "DSM"
      int_adapter_type: "fhir" | "hl7_v2" | "cda" | "pdf" | "csv" | "json"
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
      diagnosis_catalogue_system: [
        "ICD10GM",
        "ICD10WHO",
        "ICD11MMS",
        "DSM5TR",
        "LOCAL",
      ],
      diagnosis_criteria_support_status: ["native", "fallback", "unavailable"],
      diagnosis_criteria_system: ["ICD10", "ICD11", "DSM"],
      int_adapter_type: ["fhir", "hl7_v2", "cda", "pdf", "csv", "json"],
    },
  },
} as const
