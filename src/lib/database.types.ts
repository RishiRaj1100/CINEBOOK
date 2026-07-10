// ============================================================
// lib/database.types.ts
// Supabase generated types (simplified hand-written version)
// For full type safety, run: npx supabase gen types typescript
// ============================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: 'customer' | 'admin';
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      movies: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          duration_minutes: number;
          genre: string;
          language: string;
          poster_url: string | null;
          rating: number | null;
          release_date: string;
          is_active: boolean;
          trailer_url: string | null;
          tmdb_id: number | null;
          imdb_id: string | null;
          backdrop_url: string | null;
          vote_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['movies']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['movies']['Insert']>;
      };
      theaters: {
        Row: {
          id: string;
          name: string;
          city: string;
          address: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['theaters']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['theaters']['Insert']>;
      };
      screens: {
        Row: {
          id: string;
          theater_id: string;
          name: string;
          total_rows: number;
          total_columns: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['screens']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['screens']['Insert']>;
      };
      seats: {
        Row: {
          id: string;
          screen_id: string;
          row_label: string;
          seat_number: number;
          seat_type: 'regular' | 'premium' | 'recliner';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['seats']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['seats']['Insert']>;
      };
      shows: {
        Row: {
          id: string;
          movie_id: string;
          screen_id: string;
          start_time: string;
          end_time: string;
          base_price: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shows']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['shows']['Insert']>;
      };
      show_seats: {
        Row: {
          id: string;
          show_id: string;
          seat_id: string;
          price: number;
          status: 'available' | 'locked' | 'booked';
          locked_by: string | null;
          locked_at: string | null;
          lock_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['show_seats']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['show_seats']['Insert']>;
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          show_id: string;
          status: 'created' | 'confirmed' | 'cancelled' | 'expired';
          total_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
      };
      booking_seats: {
        Row: {
          id: string;
          booking_id: string;
          show_seat_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['booking_seats']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['booking_seats']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          amount: number;
          method: string | null;
          status: 'pending' | 'success' | 'failed';
          provider_reference: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
    };
    Functions: {
      hold_seats: {
        Args: { p_show_id: string; p_seat_ids: string[]; p_user_id: string; p_hold_seconds?: number };
        Returns: { success: boolean; locked_ids: string[]; expires_at: string };
      };
      confirm_booking: {
        Args: { p_booking_id: string; p_user_id: string };
        Returns: { success: boolean; idempotent: boolean; status: string };
      };
      cancel_booking: {
        Args: { p_booking_id: string; p_user_id: string; p_reason?: string };
        Returns: { success: boolean; new_status: string };
      };
      create_booking: {
        Args: { p_user_id: string; p_show_id: string; p_show_seat_ids: string[]; p_total_amount: number };
        Returns: { success: boolean; booking_id: string };
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      release_expired_locks: { Args: Record<string, never>; Returns: { released_seats: number; ran_at: string } };
    };
    Enums: Record<string, never>;
  };
};
