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
          status: 'Present' | 'Absent' | 'Late' | 'Very Late' | 'Sick' | 'Half Day' | 'Holiday' | 'Weekly Holiday' | 'Forced Closure';
          scanned_at: string | null;
          marked_by: string | null;
          center_id: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          date: string;
          status: 'Present' | 'Absent' | 'Late' | 'Very Late' | 'Sick' | 'Half Day' | 'Holiday' | 'Weekly Holiday' | 'Forced Closure';
          scanned_at?: string | null;
          marked_by?: string | null;
          center_id?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          date?: string;
          status?: 'Present' | 'Absent' | 'Late' | 'Very Late' | 'Sick' | 'Half Day' | 'Holiday' | 'Weekly Holiday' | 'Forced Closure';
          scanned_at?: string | null;
          marked_by?: string | null;
          center_id?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      holidays: {
        Row: {
          id: string;
          date: string;
          type: 'Holiday' | 'Forced Closure';
          reason: string | null;
          center_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          type?: 'Holiday' | 'Forced Closure';
          reason?: string | null;
          center_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          type?: 'Holiday' | 'Forced Closure';
          reason?: string | null;
          center_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          id: string;
          center_id: string | null;
          school_start_time: string;
          late_threshold_minutes: number;
          very_late_threshold_minutes: number;
          location: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          center_id?: string | null;
          school_start_time?: string;
          late_threshold_minutes?: number;
          very_late_threshold_minutes?: number;
          location?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          center_id?: string | null;
          school_start_time?: string;
          late_threshold_minutes?: number;
          very_late_threshold_minutes?: number;
          location?: string;
          updated_by?: string | null;
          updated_at?: string;
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
export type Holiday = Database['public']['Tables']['holidays']['Row'];
export type AppSettings = Database['public']['Tables']['settings']['Row'];
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Very Late' | 'Sick' | 'Half Day' | 'Holiday' | 'Weekly Holiday' | 'Forced Closure';
export type HolidayType = 'Holiday' | 'Forced Closure';
export type StudentStatus = 'Active' | 'Inactive' | 'On Leave';
export type StudentClass = '0' | 'NUR' | 'LKG' | 'HKG' | '1' | '2';
export type StudentGroup = 'BEG' | 'ADV';

// Attendance status -> letter code mapping, used across calendar/manual/scan views
export const STATUS_CODE: Record<AttendanceStatus, string> = {
  'Present': 'P',
  'Late': 'L',
  'Very Late': 'LL',
  'Absent': 'A',
  'Sick': 'S',
  'Half Day': 'HD',
  'Holiday': 'H',
  'Weekly Holiday': 'W',
  'Forced Closure': 'FC',
};

// Attendance status -> Tailwind colour class, used across calendar/manual/scan views
export const STATUS_COLOR: Record<AttendanceStatus, string> = {
  'Present': 'bg-green-500 text-transparent',
  'Late': 'bg-amber-500 text-transparent',
  'Very Late': 'bg-orange-500 text-transparent',
  'Absent': 'bg-red-500 text-transparent',
  'Sick': 'bg-purple-500 text-transparent',
  'Half Day': 'bg-blue-500 text-transparent',
  'Holiday': 'bg-gray-400 text-transparent',
  'Weekly Holiday': 'bg-gray-300 text-transparent',
  'Forced Closure': 'bg-gray-800 text-transparent',
};
