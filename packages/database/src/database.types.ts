export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      group_habit_shares: {
        Row: {
          created_at: string;
          group_id: string;
          habit_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          habit_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          habit_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_habit_shares_habit_owner_fkey";
            columns: ["habit_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "habits";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "group_habit_shares_member_fkey";
            columns: ["group_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "group_members";
            referencedColumns: ["group_id", "user_id"];
          },
        ];
      };
      group_invitations: {
        Row: {
          created_at: string;
          expires_at: string;
          group_id: string;
          id: string;
          invitee_code: string;
          invitee_id: string;
          inviter_id: string;
          muted: boolean;
          responded_at: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          group_id: string;
          id?: string;
          invitee_code: string;
          invitee_id: string;
          inviter_id: string;
          muted?: boolean;
          responded_at?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          group_id?: string;
          id?: string;
          invitee_code?: string;
          invitee_id?: string;
          inviter_id?: string;
          muted?: boolean;
          responded_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_members: {
        Row: {
          group_id: string;
          id: string;
          joined_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          id?: string;
          joined_at?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          id?: string;
          joined_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_messages: {
        Row: {
          body: string;
          created_at: string;
          group_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          group_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          group_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      habit_archive_periods: {
        Row: {
          archived_at: string;
          created_at: string;
          habit_id: string;
          id: string;
          restored_at: string;
          user_id: string;
        };
        Insert: {
          archived_at: string;
          created_at?: string;
          habit_id: string;
          id?: string;
          restored_at: string;
          user_id: string;
        };
        Update: {
          archived_at?: string;
          created_at?: string;
          habit_id?: string;
          id?: string;
          restored_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "habit_archive_periods_habit_owner_fkey";
            columns: ["habit_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "habits";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      habit_checkins: {
        Row: {
          checkin_date: string;
          completed_at: string;
          habit_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          checkin_date: string;
          completed_at?: string;
          habit_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          checkin_date?: string;
          completed_at?: string;
          habit_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "habit_checkins_habit_owner_fkey";
            columns: ["habit_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "habits";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      habits: {
        Row: {
          archived_at: string | null;
          color: string;
          created_at: string;
          description: string | null;
          frequency: string;
          icon: string;
          id: string;
          name: string;
          position: number;
          start_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          color: string;
          created_at?: string;
          description?: string | null;
          frequency?: string;
          icon?: string;
          id?: string;
          name: string;
          position: number;
          start_date: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          color?: string;
          created_at?: string;
          description?: string | null;
          frequency?: string;
          icon?: string;
          id?: string;
          name?: string;
          position?: number;
          start_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          locale: string;
          timezone: string;
          updated_at: string;
          user_code: string;
          week_starts_on: number;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
          user_code?: string;
          week_starts_on?: number;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
          user_code?: string;
          week_starts_on?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cancel_invitation: { Args: { invitation_id: string }; Returns: undefined };
      create_group: {
        Args: {
          group_name: string;
          habit_ids?: string[];
          new_display_name?: string;
        };
        Returns: string;
      };
      delete_group: { Args: { group_id: string }; Returns: undefined };
      delete_group_message: { Args: { message_id: string }; Returns: undefined };
      get_group_messages: {
        Args: {
          before_created_at?: string;
          before_id?: string;
          group_id: string;
          page_size?: number;
        };
        Returns: {
          author_name: string;
          body: string;
          created_at: string;
          id: string;
          is_mine: boolean;
          member_id: string;
        }[];
      };
      get_group_progress: { Args: { group_id: string }; Returns: Json };
      get_my_groups: {
        Args: never;
        Returns: {
          id: string;
          joined_at: string;
          member_count: number;
          name: string;
          role: string;
        }[];
      };
      get_my_invitations: {
        Args: never;
        Returns: {
          expires_at: string;
          group_id: string;
          group_name: string;
          id: string;
          inviter_name: string;
          member_count: number;
        }[];
      };
      import_local_data: {
        Args: { checkins: Json; habits: Json };
        Returns: undefined;
      };
      invite_to_group: {
        Args: { group_id: string; user_code: string };
        Returns: string;
      };
      leave_group: { Args: { group_id: string }; Returns: undefined };
      regenerate_user_code: { Args: never; Returns: string };
      remove_member: {
        Args: { group_id: string; member_id: string };
        Returns: undefined;
      };
      rename_group: {
        Args: { group_id: string; group_name: string };
        Returns: undefined;
      };
      reorder_habits: { Args: { ordered_ids: string[] }; Returns: undefined };
      respond_invitation: {
        Args: {
          accept: boolean;
          habit_ids?: string[];
          invitation_id: string;
          new_display_name?: string;
        };
        Returns: undefined;
      };
      send_group_message: {
        Args: { body: string; group_id: string; message_id?: string };
        Returns: string;
      };
      set_shared_habits: {
        Args: { group_id: string; habit_ids: string[] };
        Returns: undefined;
      };
      sync_offline_checkins: { Args: { ops: Json }; Returns: Json };
      transfer_ownership: {
        Args: { group_id: string; member_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
