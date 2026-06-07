import { createClient } from '@supabase/supabase-js';
import { createClient as createBrowserClient } from './supabase/client';

// Define the types for our database
export type Database = {
  public: {
    tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: 'admin' | 'student';
          first_name: string | null;
          last_name: string | null;
          student_id: string | null;
          college_department: string | null;
          course: string | null;
          year_section: string | null;
          guardian_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role?: 'admin' | 'student';
          first_name?: string | null;
          last_name?: string | null;
          student_id?: string | null;
          college_department?: string | null;
          course?: string | null;
          year_section?: string | null;
          guardian_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'admin' | 'student';
          first_name?: string | null;
          last_name?: string | null;
          student_id?: string | null;
          college_department?: string | null;
          course?: string | null;
          year_section?: string | null;
          guardian_email?: string | null;
          updated_at?: string;
        };
      };
      forms: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          pdf_template?: string | null;
          template_url?: string | null;
          template_filename?: string | null;
          created_by: string;
          available_from: string | null;
          available_until: string | null;
          assigned_college_department: string | null;
          assigned_courses: string[] | null;
          created_at: string;
          updated_at: string;
          status?: 'draft' | 'published' | 'active' | 'inactive' | 'archived' | 'completed';
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          pdf_template?: string | null;
          template_url?: string | null;
          template_filename?: string | null;
          created_by?: string;
          available_from?: string | null;
          available_until?: string | null;
          assigned_college_department?: string | null;
          assigned_courses?: string[] | null;
          created_at?: string;
          updated_at?: string;
          status?: 'draft' | 'published' | 'active' | 'inactive' | 'archived' | 'completed';
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          pdf_template?: string | null;
          template_url?: string | null;
          template_filename?: string | null;
          created_by?: string;
          available_from?: string | null;
          available_until?: string | null;
          assigned_college_department?: string | null;
          assigned_courses?: string[] | null;
          updated_at?: string;
          status?: 'draft' | 'published' | 'active' | 'inactive' | 'archived' | 'completed';
        };
      };
      form_fields: {
        Row: {
          id: string;
          form_id: string;
          field_type: 'name' | 'date' | 'text' | 'signature' | 'checkbox';
          x_position: number;
          y_position: number;
          width: number;
          height: number;
          required: boolean;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          field_type: 'name' | 'date' | 'text' | 'signature' | 'checkbox';
          x_position: number;
          y_position: number;
          width: number;
          height: number;
          required?: boolean;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          form_id?: string;
          field_type?: 'name' | 'date' | 'text' | 'signature' | 'checkbox';
          x_position?: number;
          y_position?: number;
          width?: number;
          height?: number;
          required?: boolean;
          label?: string | null;
        };
      };
      submissions: {
        Row: {
          id: string;
          form_id: string;
          student_id: string;
          status: 'in_progress' | 'completed';
          qr_code: string | null;
          created_at: string;
          updated_at: string;
          submitted_at: string | null;
        };
        Insert: {
          id?: string;
          form_id: string;
          student_id: string;
          status: 'in_progress' | 'completed';
          qr_code?: string | null;
          created_at?: string;
          updated_at?: string;
          submitted_at?: string | null;
        };
        Update: {
          id?: string;
          form_id?: string;
          student_id?: string;
          status?: 'in_progress' | 'completed';
          qr_code?: string | null;
          updated_at?: string;
          submitted_at?: string | null;
        };
      };
      field_values: {
        Row: {
          id: string;
          submission_id: string;
          field_id: string;
          value: string | null;
          signature_url: string | null;
          verified: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          field_id: string;
          value?: string | null;
          signature_url?: string | null;
          verified?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          field_id?: string;
          value?: string | null;
          signature_url?: string | null;
          verified?: boolean | null;
          updated_at?: string;
        };
      };
      user_signatures: {
        Row: {
          id: string;
          user_id: string;
          student_signatures: string[];
          parent_signatures: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          student_signatures?: string[];
          parent_signatures?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          student_signatures?: string[];
          parent_signatures?: string[];
          updated_at?: string;
        };
      };
      form_access_links: {
        Row: {
          id: string;
          form_id: string;
          access_token: string;
          created_by: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          access_token: string;
          created_by: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          form_id?: string;
          access_token?: string;
          created_by?: string;
          expires_at?: string | null;
        };
      };
    };
    functions: {
      create_form_with_fields: {
        Args: {
          p_title: string;
          p_description: string | null;
          p_pdf_template: string;
          p_available_from: string | null;
          p_available_until: string | null;
          p_fields: any;
        };
        Returns: string;
      };
      generate_form_access_link: {
        Args: {
          p_form_id: string;
        };
        Returns: string;
      };
      access_form_via_token: {
        Args: {
          p_access_token: string;
        };
        Returns: any;
      };
      submit_form: {
        Args: {
          p_submission_id: string;
          p_field_values: any;
          p_qr_code: string;
        };
        Returns: any;
      };
      verify_document_qr: {
        Args: {
          p_document_id: string;
        };
        Returns: any;
      };
    };
  };
};

// Create a single supabase client for interacting with your database (legacy)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Legacy client for backward compatibility
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// New SSR-compatible client
export const createSupabaseClient = () => createBrowserClient();

// Create a helper function for server-side operations that require elevated privileges
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
};

// Helper function to check if a user is an admin
export const isAdmin = async (supabaseClient: any, userId: string) => {
  // First check in public.users table
  const { data: publicUserData, error: publicUserError } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  
  // If found in public.users and is admin, return true
  if (!publicUserError && publicUserData && publicUserData.role === 'admin') {
    return true;
  }
  
  // If not found or not admin in public.users, check auth.users using RPC
  const { data: authUserData, error: authUserError } = await supabaseClient
    .rpc('check_if_user_is_admin', { user_id: userId });
  
  // Return true if the user is admin in auth.users
  if (!authUserError && authUserData === true) {
    return true;
  }
  
  // If neither check passed, user is not an admin
  return false;
};

// Helper function to check if a user has access to a form
export const hasFormAccess = async (supabaseClient: any, userId: string, formId: string) => {
  // Check if user is admin
  const adminCheck = await isAdmin(supabaseClient, userId);
  if (adminCheck) {
    return true;
  }
  
  // Check if user has a submission for this form
  const { data, error } = await supabaseClient
    .from('submissions')
    .select('id')
    .eq('form_id', formId)
    .eq('student_id', userId)
    .limit(1);
  
  if (error || !data || data.length === 0) {
    return false;
  }
  
  return true;
}; 