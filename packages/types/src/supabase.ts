export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      agent_team_members: {
        Row: {
          added_at: string;
          team_id: string;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          team_id: string;
          user_id: string;
        };
        Update: {
          added_at?: string;
          team_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_team_members_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'agent_teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agent_team_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      agent_teams: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_teams_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          color: string;
          created_at: string;
          description: string | null;
          icon: string | null;
          id: string;
          is_active: boolean;
          is_default: boolean;
          name: string;
          sort_order: number;
          tenant_id: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          name: string;
          sort_order?: number;
          tenant_id: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          name?: string;
          sort_order?: number;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          ai_config: Json | null;
          created_at: string;
          domain: string | null;
          id: string;
          name: string;
          settings: Json | null;
          support_profile: Json | null;
        };
        Insert: {
          ai_config?: Json | null;
          created_at?: string;
          domain?: string | null;
          id?: string;
          name: string;
          settings?: Json | null;
          support_profile?: Json | null;
        };
        Update: {
          ai_config?: Json | null;
          created_at?: string;
          domain?: string | null;
          id?: string;
          name?: string;
          settings?: Json | null;
          support_profile?: Json | null;
        };
        Relationships: [];
      };
      ping_messages: {
        Row: {
          content: string;
          created_at: string;
          edited_at: string | null;
          id: string;
          message_type: string;
          ping_id: string;
          sender_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          edited_at?: string | null;
          id?: string;
          message_type?: string;
          ping_id: string;
          sender_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          edited_at?: string | null;
          id?: string;
          message_type?: string;
          ping_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ping_messages_ping_id_fkey';
            columns: ['ping_id'];
            isOneToOne: false;
            referencedRelation: 'pings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ping_messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      ping_reads: {
        Row: {
          created_at: string;
          id: string;
          last_read_at: string;
          last_read_message_id: string | null;
          ping_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_read_at?: string;
          last_read_message_id?: string | null;
          ping_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_read_at?: string;
          last_read_message_id?: string | null;
          ping_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ping_reads_last_read_message_id_fkey';
            columns: ['last_read_message_id'];
            isOneToOne: false;
            referencedRelation: 'ping_messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ping_reads_ping_id_fkey';
            columns: ['ping_id'];
            isOneToOne: false;
            referencedRelation: 'pings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ping_reads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      pings: {
        Row: {
          ai_summary: string | null;
          assigned_to: string | null;
          category_confidence: number | null;
          category_id: string | null;
          clarification_count: number | null;
          closed_at: string | null;
          created_at: string;
          created_by: string;
          echo_introduced: boolean | null;
          first_response_at: string | null;
          id: string;
          last_agent_reply_at: string | null;
          last_user_reply_at: string | null;
          ping_number: number;
          priority: string;
          problem_statement_confirmed: boolean | null;
          resolved_at: string | null;
          sla_due_at: string | null;
          status: string;
          status_changed_at: string | null;
          summary_updated_at: string | null;
          team_id: string | null;
          tenant_id: string;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          ai_summary?: string | null;
          assigned_to?: string | null;
          category_confidence?: number | null;
          category_id?: string | null;
          clarification_count?: number | null;
          closed_at?: string | null;
          created_at?: string;
          created_by: string;
          echo_introduced?: boolean | null;
          first_response_at?: string | null;
          id?: string;
          last_agent_reply_at?: string | null;
          last_user_reply_at?: string | null;
          ping_number: number;
          priority?: string;
          problem_statement_confirmed?: boolean | null;
          resolved_at?: string | null;
          sla_due_at?: string | null;
          status?: string;
          status_changed_at?: string | null;
          summary_updated_at?: string | null;
          team_id?: string | null;
          tenant_id: string;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          ai_summary?: string | null;
          assigned_to?: string | null;
          category_confidence?: number | null;
          category_id?: string | null;
          clarification_count?: number | null;
          closed_at?: string | null;
          created_at?: string;
          created_by?: string;
          echo_introduced?: boolean | null;
          first_response_at?: string | null;
          id?: string;
          last_agent_reply_at?: string | null;
          last_user_reply_at?: string | null;
          ping_number?: number;
          priority?: string;
          problem_statement_confirmed?: boolean | null;
          resolved_at?: string | null;
          sla_due_at?: string | null;
          status?: string;
          status_changed_at?: string | null;
          summary_updated_at?: string | null;
          team_id?: string | null;
          tenant_id?: string;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pings_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pings_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pings_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pings_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'agent_teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pings_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      routing_rules: {
        Row: {
          category_id: string;
          created_at: string;
          destination_agent_id: string | null;
          destination_team_id: string | null;
          id: string;
          is_active: boolean;
          priority: number;
          rule_type: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          destination_agent_id?: string | null;
          destination_team_id?: string | null;
          id?: string;
          is_active?: boolean;
          priority?: number;
          rule_type?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          destination_agent_id?: string | null;
          destination_team_id?: string | null;
          id?: string;
          is_active?: boolean;
          priority?: number;
          rule_type?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'routing_rules_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routing_rules_destination_agent_id_fkey';
            columns: ['destination_agent_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routing_rules_destination_team_id_fkey';
            columns: ['destination_team_id'];
            isOneToOne: false;
            referencedRelation: 'agent_teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routing_rules_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          last_seen_at: string | null;
          role: string;
          settings: Json | null;
          tenant_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          last_seen_at?: string | null;
          role?: string;
          settings?: Json | null;
          tenant_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          last_seen_at?: string | null;
          role?: string;
          settings?: Json | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      decrypt_api_key: {
        Args: { encrypted_key: string; org_id: string };
        Returns: string;
      };
      decrypt_data: {
        Args: { encrypted_data: string; key: string };
        Returns: string;
      };
      encrypt_api_key: {
        Args: { api_key: string; org_id: string };
        Returns: string;
      };
      encrypt_data: { Args: { data: string; key: string }; Returns: string };
      get_echo_user: { Args: { org_id: string }; Returns: string };
      set_tenant_context: { Args: { tenant_uuid: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
