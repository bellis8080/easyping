export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_team_members: {
        Row: {
          added_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "agent_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_article_feedback: {
        Row: {
          article_id: string
          created_at: string
          id: string
          is_helpful: boolean
          user_id: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          is_helpful: boolean
          user_id?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          is_helpful?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_article_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_article_views: {
        Row: {
          article_id: string
          id: string
          session_id: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          article_id: string
          id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          article_id?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_article_views_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_article_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          agent_content: string | null
          category_id: string | null
          content: string
          created_at: string
          created_by: string
          deflection_count: number
          deleted_at: string | null
          embedding: string | null
          embedding_generated_at: string | null
          enhances_article_id: string | null
          helpful_count: number
          id: string
          not_helpful_count: number
          published_at: string | null
          published_by: string | null
          search_vector: unknown
          slug: string
          source_ping_id: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          agent_content?: string | null
          category_id?: string | null
          content: string
          created_at?: string
          created_by: string
          deflection_count?: number
          deleted_at?: string | null
          embedding?: string | null
          embedding_generated_at?: string | null
          enhances_article_id?: string | null
          helpful_count?: number
          id?: string
          not_helpful_count?: number
          published_at?: string | null
          published_by?: string | null
          search_vector?: unknown
          slug: string
          source_ping_id?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          agent_content?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          deflection_count?: number
          deleted_at?: string | null
          embedding?: string | null
          embedding_generated_at?: string | null
          enhances_article_id?: string | null
          helpful_count?: number
          id?: string
          not_helpful_count?: number
          published_at?: string | null
          published_by?: string | null
          search_vector?: unknown
          slug?: string
          source_ping_id?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_enhances_article_id_fkey"
            columns: ["enhances_article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_source_ping_id_fkey"
            columns: ["source_ping_id"]
            isOneToOne: false
            referencedRelation: "pings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_deflections: {
        Row: {
          article_id: string
          created_at: string
          id: string
          query_text: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          query_text: string
          tenant_id: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          query_text?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_deflections_article_fk"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_deflections_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_deflections_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_glossary_terms: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          definition: string
          id: string
          tenant_id: string
          term: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          definition: string
          id?: string
          tenant_id: string
          term: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          definition?: string
          id?: string
          tenant_id?: string
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_glossary_terms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_glossary_terms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          ai_config: Json | null
          created_at: string
          domain: string | null
          id: string
          name: string
          settings: Json | null
          support_profile: Json | null
        }
        Insert: {
          ai_config?: Json | null
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          settings?: Json | null
          support_profile?: Json | null
        }
        Update: {
          ai_config?: Json | null
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          settings?: Json | null
          support_profile?: Json | null
        }
        Relationships: []
      }
      ping_messages: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          id: string
          message_type: string
          ping_id: string
          sender_id: string
          visibility: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string
          ping_id: string
          sender_id: string
          visibility?: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string
          ping_id?: string
          sender_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "ping_messages_ping_id_fkey"
            columns: ["ping_id"]
            isOneToOne: false
            referencedRelation: "pings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ping_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ping_reads: {
        Row: {
          created_at: string
          id: string
          last_read_at: string
          last_read_message_id: string | null
          ping_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          ping_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          ping_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ping_reads_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "ping_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ping_reads_ping_id_fkey"
            columns: ["ping_id"]
            isOneToOne: false
            referencedRelation: "pings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ping_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pings: {
        Row: {
          ai_summary: string | null
          assigned_at: string | null
          assigned_to: string | null
          category_confidence: number | null
          category_id: string | null
          clarification_count: number | null
          closed_at: string | null
          created_at: string
          created_by: string
          echo_introduced: boolean | null
          first_response_at: string | null
          id: string
          last_agent_reply_at: string | null
          last_user_reply_at: string | null
          ping_number: number
          priority: string
          problem_statement_confirmed: boolean | null
          resolved_at: string | null
          sla_first_response_due: string | null
          sla_paused_at: string | null
          sla_paused_duration_minutes: number
          sla_policy_id: string | null
          sla_resolution_due: string | null
          status: string
          status_changed_at: string | null
          summary_updated_at: string | null
          team_id: string | null
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          category_confidence?: number | null
          category_id?: string | null
          clarification_count?: number | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          echo_introduced?: boolean | null
          first_response_at?: string | null
          id?: string
          last_agent_reply_at?: string | null
          last_user_reply_at?: string | null
          ping_number: number
          priority?: string
          problem_statement_confirmed?: boolean | null
          resolved_at?: string | null
          sla_first_response_due?: string | null
          sla_paused_at?: string | null
          sla_paused_duration_minutes?: number
          sla_policy_id?: string | null
          sla_resolution_due?: string | null
          status?: string
          status_changed_at?: string | null
          summary_updated_at?: string | null
          team_id?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          category_confidence?: number | null
          category_id?: string | null
          clarification_count?: number | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          echo_introduced?: boolean | null
          first_response_at?: string | null
          id?: string
          last_agent_reply_at?: string | null
          last_user_reply_at?: string | null
          ping_number?: number
          priority?: string
          problem_statement_confirmed?: boolean | null
          resolved_at?: string | null
          sla_first_response_due?: string | null
          sla_paused_at?: string | null
          sla_paused_duration_minutes?: number
          sla_policy_id?: string | null
          sla_resolution_due?: string | null
          status?: string
          status_changed_at?: string | null
          summary_updated_at?: string | null
          team_id?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pings_sla_policy_id_fkey"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "agent_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_rules: {
        Row: {
          category_id: string
          created_at: string
          destination_agent_id: string | null
          destination_team_id: string | null
          id: string
          is_active: boolean
          priority: number
          rule_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          destination_agent_id?: string | null
          destination_team_id?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          rule_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          destination_agent_id?: string | null
          destination_team_id?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          rule_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_rules_destination_agent_id_fkey"
            columns: ["destination_agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_rules_destination_team_id_fkey"
            columns: ["destination_team_id"]
            isOneToOne: false
            referencedRelation: "agent_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_policies: {
        Row: {
          created_at: string
          first_response_minutes: number
          id: string
          is_active: boolean
          name: string
          priority: string
          resolution_minutes: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_response_minutes: number
          id?: string
          is_active?: boolean
          name: string
          priority: string
          resolution_minutes: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_response_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          priority?: string
          resolution_minutes?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          echo_enabled: boolean
          email: string
          full_name: string
          id: string
          last_seen_at: string | null
          role: string
          settings: Json | null
          tenant_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          echo_enabled?: boolean
          email: string
          full_name: string
          id: string
          last_seen_at?: string | null
          role?: string
          settings?: Json | null
          tenant_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          echo_enabled?: boolean
          email?: string
          full_name?: string
          id?: string
          last_seen_at?: string | null
          role?: string
          settings?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrypt_api_key: {
        Args: { encrypted_key: string; org_id: string }
        Returns: string
      }
      decrypt_data: {
        Args: { encrypted_data: string; key: string }
        Returns: string
      }
      encrypt_api_key: {
        Args: { api_key: string; org_id: string }
        Returns: string
      }
      encrypt_data: { Args: { data: string; key: string }; Returns: string }
      get_avg_resolution_time: {
        Args: { p_end_date: string; p_start_date: string; p_tenant_id: string }
        Returns: number
      }
      get_echo_user: { Args: { org_id: string }; Returns: string }
      get_sla_compliance_rate: {
        Args: { p_end_date: string; p_start_date: string; p_tenant_id: string }
        Returns: number
      }
      search_kb_articles: {
        Args: { p_limit?: number; p_query: string; p_tenant_id: string }
        Returns: {
          category_id: string
          content: string
          helpful_count: number
          id: string
          published_at: string
          rank: number
          slug: string
          status: string
          title: string
          view_count: number
        }[]
      }
      search_kb_articles_hybrid: {
        Args: {
          p_limit?: number
          p_tenant_id: string
          query_embedding: string
          search_text: string
        }
        Returns: {
          category_id: string
          category_name: string
          combined_score: number
          content_excerpt: string
          fulltext_score: number
          helpful_count: number
          id: string
          not_helpful_count: number
          semantic_score: number
          slug: string
          title: string
          view_count: number
        }[]
      }
      search_kb_semantic: {
        Args: {
          p_limit?: number
          p_similarity_threshold?: number
          p_tenant_id: string
          query_embedding: string
        }
        Returns: {
          category_id: string
          category_name: string
          content: string
          helpful_count: number
          id: string
          not_helpful_count: number
          similarity: number
          slug: string
          title: string
          view_count: number
        }[]
      }
      search_similar_kb_articles: {
        Args: {
          p_category_id?: string
          p_limit?: number
          p_search_terms: string
          p_tenant_id: string
        }
        Returns: {
          category_id: string
          category_name: string
          content: string
          helpful_count: number
          id: string
          similarity_score: number
          slug: string
          title: string
          view_count: number
        }[]
      }
      set_tenant_context: { Args: { tenant_uuid: string }; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

