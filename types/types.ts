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
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
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
      payout: {
        Row: {
          amount: number | null;
          created_at: string;
          creator_id: string | null;
          id: number;
          method: Database["public"]["Enums"]["payment_method"] | null;
          name: string | null;
          payout_month: Json | null;
          status: Database["public"]["Enums"]["payout_status"] | null;
        };
        Insert: {
          amount?: number | null;
          created_at?: string;
          creator_id?: string | null;
          id?: number;
          method?: Database["public"]["Enums"]["payment_method"] | null;
          name?: string | null;
          payout_month?: Json | null;
          status?: Database["public"]["Enums"]["payout_status"] | null;
        };
        Update: {
          amount?: number | null;
          created_at?: string;
          creator_id?: string | null;
          id?: number;
          method?: Database["public"]["Enums"]["payment_method"] | null;
          name?: string | null;
          payout_month?: Json | null;
          status?: Database["public"]["Enums"]["payout_status"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "payout_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      posters: {
        Row: {
          created_at: string | null;
          creator_id: string;
          description: string | null;
          drive_link: string | null;
          id: string;
          image_urls: Json | null;
          prices: Json;
          sales: number;
          selected_sizes: string[];
          shopify_product_id: string | null;
          shopify_url: string | null;
          status: Database["public"]["Enums"]["poster_status"];
          title: string;
          updated_at: string | null;
          upload_date: string;
        };
        Insert: {
          created_at?: string | null;
          creator_id: string;
          description?: string | null;
          drive_link?: string | null;
          id?: string;
          image_urls?: Json | null;
          prices?: Json;
          sales?: number;
          selected_sizes?: string[];
          shopify_product_id?: string | null;
          shopify_url?: string | null;
          status?: Database["public"]["Enums"]["poster_status"];
          title: string;
          updated_at?: string | null;
          upload_date?: string;
        };
        Update: {
          created_at?: string | null;
          creator_id?: string;
          description?: string | null;
          drive_link?: string | null;
          id?: string;
          image_urls?: Json | null;
          prices?: Json;
          sales?: number;
          selected_sizes?: string[];
          shopify_product_id?: string | null;
          shopify_url?: string | null;
          status?: Database["public"]["Enums"]["poster_status"];
          title?: string;
          updated_at?: string | null;
          upload_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posters_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          approved: boolean | null;
          avatar_url: string | null;
          bio: string | null;
          country: string | null;
          created_at: string;
          currency: string | null;
          email: string;
          iban: string | null;
          id: string;
          instagram: string | null;
          name: string;
          payment_method: Database["public"]["Enums"]["payment_method"] | null;
          paypal_email: string | null;
          portfolio: string | null;
          profile_image: string | null;
          role: Database["public"]["Enums"]["role"];
          updated_at: string | null;
          vendor: string | null;
        };
        Insert: {
          approved?: boolean | null;
          avatar_url?: string | null;
          bio?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string | null;
          email: string;
          iban?: string | null;
          id: string;
          instagram?: string | null;
          name: string;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          paypal_email?: string | null;
          portfolio?: string | null;
          profile_image?: string | null;
          role?: Database["public"]["Enums"]["role"];
          updated_at?: string | null;
          vendor?: string | null;
        };
        Update: {
          approved?: boolean | null;
          avatar_url?: string | null;
          bio?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string | null;
          email?: string;
          iban?: string | null;
          id?: string;
          instagram?: string | null;
          name?: string;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          paypal_email?: string | null;
          portfolio?: string | null;
          profile_image?: string | null;
          role?: Database["public"]["Enums"]["role"];
          updated_at?: string | null;
          vendor?: string | null;
        };
        Relationships: [];
      };
      support_messages: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          status: Database["public"]["Enums"]["support_status"] | null;
          subject: string;
          user_id: string | null;
          vendor: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          status?: Database["public"]["Enums"]["support_status"] | null;
          subject: string;
          user_id?: string | null;
          vendor?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          status?: Database["public"]["Enums"]["support_status"] | null;
          subject?: string;
          user_id?: string | null;
          vendor?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "support_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      payment_method: "iban" | "paypal";
      payout_status: "pending" | "completed";
      poster_status: "pending" | "approved" | "rejected" | "willBeDeleted";
      role: "creator" | "admin";
      support_status: "pending" | "solved" | "closed" | "new";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      payment_method: ["iban", "paypal"],
      payout_status: ["pending", "completed"],
      poster_status: ["pending", "approved", "rejected", "willBeDeleted"],
      role: ["creator", "admin"],
      support_status: ["pending", "solved", "closed", "new"],
    },
  },
} as const;
