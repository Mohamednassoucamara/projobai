// Types de la base de données ProJob AI
// Généré automatiquement à partir du schéma Supabase

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_type: 'candidate' | 'company';
          full_name: string;
          email: string;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_type: 'candidate' | 'company';
          full_name: string;
          email: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_type?: 'candidate' | 'company';
          full_name?: string;
          email?: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      candidate_profiles: {
        Row: {
          id: string;
          job_title: string | null;
          location: string | null;
          profile_summary: string | null;
          avatar_url: string | null;
          profile_completion: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          job_title?: string | null;
          location?: string | null;
          profile_summary?: string | null;
          avatar_url?: string | null;
          profile_completion?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_title?: string | null;
          location?: string | null;
          profile_summary?: string | null;
          avatar_url?: string | null;
          profile_completion?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      experiences: {
        Row: {
          id: string;
          candidate_id: string;
          title: string;
          company: string;
          location: string | null;
          start_date: string;
          end_date: string | null;
          is_current: boolean;
          description: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          title: string;
          company: string;
          location?: string | null;
          start_date: string;
          end_date?: string | null;
          is_current?: boolean;
          description?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          title?: string;
          company?: string;
          location?: string | null;
          start_date?: string;
          end_date?: string | null;
          is_current?: boolean;
          description?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      education: {
        Row: {
          id: string;
          candidate_id: string;
          degree: string;
          institution: string;
          location: string | null;
          start_date: string;
          end_date: string | null;
          is_current: boolean;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          degree: string;
          institution: string;
          location?: string | null;
          start_date: string;
          end_date?: string | null;
          is_current?: boolean;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          degree?: string;
          institution?: string;
          location?: string | null;
          start_date?: string;
          end_date?: string | null;
          is_current?: boolean;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      skills: {
        Row: {
          id: string;
          candidate_id: string;
          skill_name: string;
          level: 'débutant' | 'intermédiaire' | 'avancé' | 'expert' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          skill_name: string;
          level?: 'débutant' | 'intermédiaire' | 'avancé' | 'expert' | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          skill_name?: string;
          level?: 'débutant' | 'intermédiaire' | 'avancé' | 'expert' | null;
          created_at?: string;
        };
      };
      languages: {
        Row: {
          id: string;
          candidate_id: string;
          language_name: string;
          level: string;
          proficiency_percentage: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          language_name: string;
          level: string;
          proficiency_percentage: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          language_name?: string;
          level?: string;
          proficiency_percentage?: number;
          created_at?: string;
        };
      };
      company_profiles: {
        Row: {
          id: string;
          company_name: string;
          sector: string | null;
          company_size: string | null;
          description: string | null;
          website: string | null;
          logo_url: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_name: string;
          sector?: string | null;
          company_size?: string | null;
          description?: string | null;
          website?: string | null;
          logo_url?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          sector?: string | null;
          company_size?: string | null;
          description?: string | null;
          website?: string | null;
          logo_url?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          description: string;
          location: string;
          job_type: 'CDI' | 'CDD' | 'Stage' | 'Freelance' | 'Temps partiel';
          experience_level: 'Débutant' | 'Intermédiaire' | 'Confirmé' | 'Expert' | null;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string;
          requirements: string[];
          responsibilities: string[];
          benefits: string[];
          is_active: boolean;
          views_count: number;
          applications_count: number;
          published_at: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          description: string;
          location: string;
          job_type: 'CDI' | 'CDD' | 'Stage' | 'Freelance' | 'Temps partiel';
          experience_level?: 'Débutant' | 'Intermédiaire' | 'Confirmé' | 'Expert' | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string;
          requirements?: string[];
          responsibilities?: string[];
          benefits?: string[];
          is_active?: boolean;
          views_count?: number;
          applications_count?: number;
          published_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          title?: string;
          description?: string;
          location?: string;
          job_type?: 'CDI' | 'CDD' | 'Stage' | 'Freelance' | 'Temps partiel';
          experience_level?: 'Débutant' | 'Intermédiaire' | 'Confirmé' | 'Expert' | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string;
          requirements?: string[];
          responsibilities?: string[];
          benefits?: string[];
          is_active?: boolean;
          views_count?: number;
          applications_count?: number;
          published_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_skills: {
        Row: {
          id: string;
          job_id: string;
          skill_name: string;
          is_required: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          skill_name: string;
          is_required?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          skill_name?: string;
          is_required?: boolean;
          created_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          job_id: string;
          candidate_id: string;
          status: 'pending' | 'reviewed' | 'shortlisted' | 'interview' | 'accepted' | 'rejected';
          cover_letter: string | null;
          cv_url: string | null;
          motivation_message: string | null;
          notes: string | null;
          applied_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          candidate_id: string;
          status?: 'pending' | 'reviewed' | 'shortlisted' | 'interview' | 'accepted' | 'rejected';
          cover_letter?: string | null;
          cv_url?: string | null;
          motivation_message?: string | null;
          notes?: string | null;
          applied_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          candidate_id?: string;
          status?: 'pending' | 'reviewed' | 'shortlisted' | 'interview' | 'accepted' | 'rejected';
          cover_letter?: string | null;
          cv_url?: string | null;
          motivation_message?: string | null;
          notes?: string | null;
          applied_at?: string;
          updated_at?: string;
        };
      };
      cvs: {
        Row: {
          id: string;
          candidate_id: string;
          title: string;
          template_type: string;
          content: Record<string, any>;
          pdf_url: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          title: string;
          template_type?: string;
          content: Record<string, any>;
          pdf_url?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          title?: string;
          template_type?: string;
          content?: Record<string, any>;
          pdf_url?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      cover_letters: {
        Row: {
          id: string;
          candidate_id: string;
          job_id: string | null;
          company_name: string;
          position: string;
          content: string;
          template_type: string;
          tone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          job_id?: string | null;
          company_name: string;
          position: string;
          content: string;
          template_type?: string;
          tone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          job_id?: string | null;
          company_name?: string;
          position?: string;
          content?: string;
          template_type?: string;
          tone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      interview_sessions: {
        Row: {
          id: string;
          candidate_id: string;
          category: string;
          total_questions: number;
          completed_questions: number;
          average_score: number | null;
          status: 'in_progress' | 'completed';
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          category: string;
          total_questions?: number;
          completed_questions?: number;
          average_score?: number | null;
          status?: 'in_progress' | 'completed';
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          category?: string;
          total_questions?: number;
          completed_questions?: number;
          average_score?: number | null;
          status?: 'in_progress' | 'completed';
          created_at?: string;
          completed_at?: string | null;
        };
      };
      interview_answers: {
        Row: {
          id: string;
          session_id: string;
          question_id: number;
          answer: string;
          score: number | null;
          feedback: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: number;
          answer: string;
          score?: number | null;
          feedback?: Record<string, any> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_id?: number;
          answer?: string;
          score?: number | null;
          feedback?: Record<string, any> | null;
          created_at?: string;
        };
      };
      favorite_jobs: {
        Row: {
          id: string;
          candidate_id: string;
          job_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          job_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          job_id?: string;
          created_at?: string;
        };
      };
      favorite_candidates: {
        Row: {
          id: string;
          company_id: string;
          candidate_id: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          candidate_id: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          candidate_id?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'application' | 'job_match' | 'interview' | 'message' | 'system';
          title: string;
          message: string;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'application' | 'job_match' | 'interview' | 'message' | 'system';
          title: string;
          message: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'application' | 'job_match' | 'interview' | 'message' | 'system';
          title?: string;
          message?: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
    Functions: {
      calculate_profile_completion: {
        Args: { candidate_uuid: string };
        Returns: number;
      };
    };
  };
}
