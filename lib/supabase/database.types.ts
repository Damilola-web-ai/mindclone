export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          visitor_name: string | null;
          scope: Database["public"]["Enums"]["conversation_scope"];
          started_at: string;
        };
        Insert: {
          id?: string;
          visitor_name?: string | null;
          scope?: Database["public"]["Enums"]["conversation_scope"];
          started_at?: string;
        };
        Update: {
          id?: string;
          visitor_name?: string | null;
          scope?: Database["public"]["Enums"]["conversation_scope"];
          started_at?: string;
        };
        Relationships: [];
      };
      corrections: {
        Row: {
          corrected_response: string;
          created_at: string;
          id: string;
          original_response: string;
          topic: string | null;
        };
        Insert: {
          corrected_response: string;
          created_at?: string;
          id?: string;
          original_response: string;
          topic?: string | null;
        };
        Update: {
          corrected_response?: string;
          created_at?: string;
          id?: string;
          original_response?: string;
          topic?: string | null;
        };
        Relationships: [];
      };
      memory_chunks: {
        Row: {
          content: string;
          created_at: string;
          embedding: number[] | string;
          id: string;
          source_name: string;
          source_type: Database["public"]["Enums"]["memory_source_type"];
          uploaded_source_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string;
          embedding: number[] | string;
          id?: string;
          source_name: string;
          source_type: Database["public"]["Enums"]["memory_source_type"];
          uploaded_source_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          embedding?: number[] | string;
          id?: string;
          source_name?: string;
          source_type?: Database["public"]["Enums"]["memory_source_type"];
          uploaded_source_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "memory_chunks_uploaded_source_id_fkey";
            columns: ["uploaded_source_id"];
            isOneToOne: false;
            referencedRelation: "uploaded_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      message_memory_citations: {
        Row: {
          assistant_message_id: string;
          conversation_id: string;
          conversation_scope: Database["public"]["Enums"]["conversation_scope"];
          created_at: string;
          id: string;
          memory_chunk_id: string;
          similarity: number;
          source_name: string;
          source_type: Database["public"]["Enums"]["memory_source_type"];
          uploaded_source_id: string | null;
        };
        Insert: {
          assistant_message_id: string;
          conversation_id: string;
          conversation_scope: Database["public"]["Enums"]["conversation_scope"];
          created_at?: string;
          id?: string;
          memory_chunk_id: string;
          similarity?: number;
          source_name: string;
          source_type: Database["public"]["Enums"]["memory_source_type"];
          uploaded_source_id?: string | null;
        };
        Update: {
          assistant_message_id?: string;
          conversation_id?: string;
          conversation_scope?: Database["public"]["Enums"]["conversation_scope"];
          created_at?: string;
          id?: string;
          memory_chunk_id?: string;
          similarity?: number;
          source_name?: string;
          source_type?: Database["public"]["Enums"]["memory_source_type"];
          uploaded_source_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "message_memory_citations_assistant_message_id_fkey";
            columns: ["assistant_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_memory_citations_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_memory_citations_memory_chunk_id_fkey";
            columns: ["memory_chunk_id"];
            isOneToOne: false;
            referencedRelation: "memory_chunks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_memory_citations_uploaded_source_id_fkey";
            columns: ["uploaded_source_id"];
            isOneToOne: false;
            referencedRelation: "uploaded_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["message_role"];
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["message_role"];
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["message_role"];
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      owner_profile: {
        Row: {
          access_password_hash: string | null;
          auth_user_id: string;
          bio: string;
          created_at: string;
          greeting: string;
          id: string;
          is_public: boolean;
          name: string;
          photo_url: string | null;
          public_link_slug: string | null;
          require_visitor_name: boolean;
          system_prompt: string;
        };
        Insert: {
          access_password_hash?: string | null;
          auth_user_id: string;
          bio?: string;
          created_at?: string;
          greeting?: string;
          id?: string;
          is_public?: boolean;
          name?: string;
          photo_url?: string | null;
          public_link_slug?: string | null;
          require_visitor_name?: boolean;
          system_prompt?: string;
        };
        Update: {
          access_password_hash?: string | null;
          auth_user_id?: string;
          bio?: string;
          created_at?: string;
          greeting?: string;
          id?: string;
          is_public?: boolean;
          name?: string;
          photo_url?: string | null;
          public_link_slug?: string | null;
          require_visitor_name?: boolean;
          system_prompt?: string;
        };
        Relationships: [];
      };
      owner_notes: {
        Row: {
          content: string;
          created_at: string;
          due_label: string | null;
          id: string;
          is_complete: boolean;
          title: string;
          type: Database["public"]["Enums"]["owner_note_type"];
          updated_at: string;
        };
        Insert: {
          content?: string;
          created_at?: string;
          due_label?: string | null;
          id?: string;
          is_complete?: boolean;
          title?: string;
          type?: Database["public"]["Enums"]["owner_note_type"];
          updated_at?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          due_label?: string | null;
          id?: string;
          is_complete?: boolean;
          title?: string;
          type?: Database["public"]["Enums"]["owner_note_type"];
          updated_at?: string;
        };
        Relationships: [];
      };
      personality_quiz: {
        Row: {
          answer: string;
          created_at: string;
          id: string;
          question: string;
        };
        Insert: {
          answer?: string;
          created_at?: string;
          id?: string;
          question: string;
        };
        Update: {
          answer?: string;
          created_at?: string;
          id?: string;
          question?: string;
        };
        Relationships: [];
      };
      uploaded_sources: {
        Row: {
          chunk_count: number;
          created_at: string;
          file_name: string;
          id: string;
          source_type: Database["public"]["Enums"]["memory_source_type"];
          status: Database["public"]["Enums"]["upload_status"];
          storage_path: string | null;
        };
        Insert: {
          chunk_count?: number;
          created_at?: string;
          file_name: string;
          id?: string;
          source_type: Database["public"]["Enums"]["memory_source_type"];
          status?: Database["public"]["Enums"]["upload_status"];
          storage_path?: string | null;
        };
        Update: {
          chunk_count?: number;
          created_at?: string;
          file_name?: string;
          id?: string;
          source_type?: Database["public"]["Enums"]["memory_source_type"];
          status?: Database["public"]["Enums"]["upload_status"];
          storage_path?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_public_owner_profile: {
        Args: {
          profile_slug?: string | null;
        };
        Returns: {
          bio: string;
          created_at: string;
          greeting: string;
          id: string;
          is_public: boolean;
          name: string;
          photo_url: string | null;
          public_link_slug: string | null;
          require_visitor_name: boolean;
        }[];
      };
      is_owner: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      match_memory_chunks: {
        Args: {
          match_count?: number;
          query_embedding: number[] | string;
          source_types?: Database["public"]["Enums"]["memory_source_type"][] | null;
        };
        Returns: {
          content: string;
          created_at: string;
          id: string;
          similarity: number;
          source_name: string;
          source_type: Database["public"]["Enums"]["memory_source_type"];
          uploaded_source_id: string | null;
        }[];
      };
    };
    Enums: {
      conversation_scope: "owner_private" | "public";
      memory_source_type:
        | "journal"
        | "twitter_archive"
        | "voice_note"
        | "whatsapp"
        | "writing";
      message_role: "assistant" | "user";
      owner_note_type: "note" | "reminder" | "task";
      upload_status: "completed" | "failed" | "pending" | "processing";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<
  TableName extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][TableName]["Row"];

export type TableInsert<
  TableName extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][TableName]["Insert"];

export type TableUpdate<
  TableName extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][TableName]["Update"];

export type Enums<
  EnumName extends keyof PublicSchema["Enums"],
> = PublicSchema["Enums"][EnumName];
