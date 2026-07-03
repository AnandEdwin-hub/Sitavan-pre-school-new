export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      centers: {
        Row: {
          id: string;
          name: string;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          roll_no: string;
          full_name: string;
          doj: string | null;
          dob: string | null;
          age: number | null;
          gender: 'Male' | 'Female' | null;
          father_name: string | null;
          father_mobile: string | null;
          mother_name: string | null;
          mother_mobile: string | null;
          aadhar_number: string | null;
          caste_cert: boolean | null;
          regular_school: string | null;
          class: '0' | 'NUR' | 'LKG' | 'HKG' | '1' | '2' | null;
          group: 'BEG' | 'ADV' | null;
          annual_fees: number | null;
          height_cm: number | null;
          weight_kg: number | null;
          remarks: string | null;
          photo_url: string | null;
          center_id: string | null;
          status: 'Active' | 'Inactive' | 'On Leave' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          roll_no: string;
          full_name: string;
          doj?: string | null;
          dob?: string | null;
          age?: number | null;
          gender?: 'Male' | 'Female' | null;
          father_name?: string | null;
          father_mobile?: string | null;
          mother_name?: string | null;
          mother_mobile?: string | null;
          aadhar_number?: string | null;
          caste_cert?: boolean | null;
          regular_school?: string | null;
          class?: '0' | 'NUR' | 'LKG' | 'HKG' | '1' | '2' | null;
          group?: 'BEG' | 'ADV' | null;
          annual_fees?: number | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          remarks?: string | null;
          photo_url?: string | null;
          center_id?: string | null;
          status?: 'Active' | 'Inactive' | 'On Leave' | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          roll_no?: string;
          full_name?: string;
          doj?: string | null;
          dob?: string | null;
          age?: number | null;
          gender?: 'Male' | 'Female' | null;
          father_name?: string | null;
          father_mobile?: string | null;
          mother_name?: string | null;
          mother_mobile?: string | null;
          aadhar_number?: string | null;
          caste_cert?: boolean | null;
          regular_school?: string | null;
          class?: '0' | 'NUR' | 'LKG' | 'HKG' | '1' | '2' | null;
          group?: 'BEG' | 'ADV' | null;
          annual_fees?: number | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          remarks?: string | null;
          photo_url?: string | null;
          center_id?: string | null;
          status?: 'Active' | 'Inactive' | 'On Leave' | null;
          created_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          student_id: string;
          date: string;
          status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Holiday' | 'Weekly Holiday';
          scanned_at: string | null;
          marked_by: string | null;
          center_id: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          date: string;
          status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Holiday' | 'Weekly Holiday';
          scanned_at?: string | null;
          marked_by?: string | null;
          center_id?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          date?: string;
          status?: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Holiday' | 'Weekly Holiday';
          scanned_at?: string | null;
          marked_by?: string | null;
          center_id?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Center = Database['public']['Tables']['centers']['Row'];
export type Student = Database['public']['Tables']['students']['Row'];
export type Attendance = Database['public']['Tables']['attendance']['Row'];
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Holiday' | 'Weekly Holiday';
export type StudentStatus = 'Active' | 'Inactive' | 'On Leave';
export type StudentClass = '0' | 'NUR' | 'LKG' | 'HKG' | '1' | '2';
export type StudentGroup = 'BEG' | 'ADV';
