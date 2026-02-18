// AUTO-GENERATED from Supabase
// Run: npx supabase gen types typescript --project-id YOUR_ID > packages/shared/src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      booking_items: {
        Row: {
          id: string
          booking_id: string
          pet_id: string
          service_id: string
          price: number
          duration_minutes: number
        }
        Insert: {
          id?: string
          booking_id: string
          pet_id: string
          service_id: string
          price: number
          duration_minutes: number
        }
        Update: {
          id?: string
          booking_id?: string
          pet_id?: string
          service_id?: string
          price?: number
          duration_minutes?: number
        }
      }
      booking_photos: {
        Row: {
          id: string
          booking_id: string
          photo_url: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          photo_url: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          photo_url?: string
          uploaded_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          tutor_id: string
          petshop_id: string
          booking_date: string
          start_time: string
          end_time: string
          status: 'pending_payment' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          total_amount: number
          commission_amount: number | null
          payment_id: string | null
          payment_status: string | null
          cancelled_by: 'tutor' | 'petshop' | 'system' | null
          cancelled_at: string | null
          no_show_at: string | null
          refund_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tutor_id: string
          petshop_id: string
          booking_date: string
          start_time: string
          end_time: string
          status?: 'pending_payment' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          total_amount: number
          commission_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
          cancelled_by?: 'tutor' | 'petshop' | 'system' | null
          cancelled_at?: string | null
          no_show_at?: string | null
          refund_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tutor_id?: string
          petshop_id?: string
          booking_date?: string
          start_time?: string
          end_time?: string
          status?: 'pending_payment' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          total_amount?: number
          commission_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
          cancelled_by?: 'tutor' | 'petshop' | 'system' | null
          cancelled_at?: string | null
          no_show_at?: string | null
          refund_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          data_json: Json | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          data_json?: Json | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          data_json?: Json | null
          is_read?: boolean
          created_at?: string
        }
      }
      pets: {
        Row: {
          id: string
          user_id: string
          name: string
          species: 'dog' | 'cat' | 'other'
          breed: string | null
          size: 'P' | 'M' | 'G' | 'GG'
          age_months: number | null
          photo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          species: 'dog' | 'cat' | 'other'
          breed?: string | null
          size: 'P' | 'M' | 'G' | 'GG'
          age_months?: number | null
          photo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          species?: 'dog' | 'cat' | 'other'
          breed?: string | null
          size?: 'P' | 'M' | 'G' | 'GG'
          age_months?: number | null
          photo_url?: string | null
          created_at?: string
        }
      }
      petshop_multi_pet_discount: {
        Row: {
          id: string
          petshop_id: string
          min_pets: number
          discount_percent: number
        }
        Insert: {
          id?: string
          petshop_id: string
          min_pets?: number
          discount_percent: number
        }
        Update: {
          id?: string
          petshop_id?: string
          min_pets?: number
          discount_percent?: number
        }
      }
      petshop_photos: {
        Row: {
          id: string
          petshop_id: string
          photo_url: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          petshop_id: string
          photo_url: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          petshop_id?: string
          photo_url?: string
          display_order?: number
          created_at?: string
        }
      }
      petshops: {
        Row: {
          id: string
          owner_id: string
          name: string
          cnpj: string | null
          description: string | null
          address: string
          city: string
          state: string
          lat: number | null
          lng: number | null
          phone: string | null
          cover_photo: string | null
          status: 'pending' | 'active' | 'suspended' | 'rejected'
          plan: 'basic' | 'pro' | 'premium'
          avg_rating: number
          total_bookings: number
          no_show_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          cnpj?: string | null
          description?: string | null
          address: string
          city: string
          state?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          cover_photo?: string | null
          status?: 'pending' | 'active' | 'suspended' | 'rejected'
          plan?: 'basic' | 'pro' | 'premium'
          avg_rating?: number
          total_bookings?: number
          no_show_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          cnpj?: string | null
          description?: string | null
          address?: string
          city?: string
          state?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          cover_photo?: string | null
          status?: 'pending' | 'active' | 'suspended' | 'rejected'
          plan?: 'basic' | 'pro' | 'premium'
          avg_rating?: number
          total_bookings?: number
          no_show_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          phone: string | null
          avatar_url: string | null
          role: 'tutor' | 'petshop_owner' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'tutor' | 'petshop_owner' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'tutor' | 'petshop_owner' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          booking_id: string
          tutor_id: string
          petshop_id: string
          rating: number
          comment: string | null
          petshop_response: string | null
          response_date: string | null
          is_reported: boolean
          is_hidden: boolean
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          tutor_id: string
          petshop_id: string
          rating: number
          comment?: string | null
          petshop_response?: string | null
          response_date?: string | null
          is_reported?: boolean
          is_hidden?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          tutor_id?: string
          petshop_id?: string
          rating?: number
          comment?: string | null
          petshop_response?: string | null
          response_date?: string | null
          is_reported?: boolean
          is_hidden?: boolean
          created_at?: string
        }
      }
      schedule_blocks: {
        Row: {
          id: string
          petshop_id: string
          block_date: string
          start_time: string | null
          end_time: string | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          petshop_id: string
          block_date: string
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          petshop_id?: string
          block_date?: string
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
          created_at?: string
        }
      }
      schedules: {
        Row: {
          id: string
          petshop_id: string
          day_of_week: number
          start_time: string
          end_time: string
          slot_duration_minutes: number
          max_concurrent: number
          is_active: boolean
        }
        Insert: {
          id?: string
          petshop_id: string
          day_of_week: number
          start_time: string
          end_time: string
          slot_duration_minutes?: number
          max_concurrent?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          petshop_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          slot_duration_minutes?: number
          max_concurrent?: number
          is_active?: boolean
        }
      }
      service_prices: {
        Row: {
          id: string
          service_id: string
          size: 'P' | 'M' | 'G' | 'GG'
          price: number
        }
        Insert: {
          id?: string
          service_id: string
          size: 'P' | 'M' | 'G' | 'GG'
          price: number
        }
        Update: {
          id?: string
          service_id?: string
          size?: 'P' | 'M' | 'G' | 'GG'
          price?: number
        }
      }
      services: {
        Row: {
          id: string
          petshop_id: string
          name: string
          description: string | null
          category: 'banho' | 'tosa' | 'combo' | 'addon'
          duration_minutes: number
          is_addon: boolean
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          petshop_id: string
          name: string
          description?: string | null
          category: 'banho' | 'tosa' | 'combo' | 'addon'
          duration_minutes?: number
          is_addon?: boolean
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          petshop_id?: string
          name?: string
          description?: string | null
          category?: 'banho' | 'tosa' | 'combo' | 'addon'
          duration_minutes?: number
          is_addon?: boolean
          is_active?: boolean
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
