// Service Supabase pour ProJob AI
// Ce fichier contient toutes les fonctions d'interaction avec la base de données

import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

// Types raccourcis
type Profile = Database['public']['Tables']['profiles']['Row'];
type CandidateProfile = Database['public']['Tables']['candidate_profiles']['Row'];
type CompanyProfile = Database['public']['Tables']['company_profiles']['Row'];
type Job = Database['public']['Tables']['jobs']['Row'];
type Application = Database['public']['Tables']['applications']['Row'];
type Experience = Database['public']['Tables']['experiences']['Row'];
type Education = Database['public']['Tables']['education']['Row'];
type Skill = Database['public']['Tables']['skills']['Row'];
type Language = Database['public']['Tables']['languages']['Row'];

// =====================================================
// SERVICES D'AUTHENTIFICATION
// =====================================================

export const authService = {
  /**
   * Créer un nouveau compte utilisateur
   */
  async signUp(email: string, password: string, fullName: string, userType: 'candidate' | 'company') {
    try {
      // Créer le compte auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: userType,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned');

      // Créer le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          user_type: userType,
          full_name: fullName,
          email,
        });

      if (profileError) throw profileError;

      // Créer le profil spécifique
      if (userType === 'candidate') {
        await supabase
          .from('candidate_profiles')
          .insert({ id: authData.user.id });
      } else {
        await supabase
          .from('company_profiles')
          .insert({
            id: authData.user.id,
            company_name: fullName,
          });
      }

      return { success: true, user: authData.user };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error };
    }
  },

  /**
   * Se connecter
   */
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { success: true, user: data.user, session: data.session };
    } catch (error) {
      console.error('SignIn error:', error);
      return { success: false, error };
    }
  },

  /**
   * Se déconnecter
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { success: !error, error };
  },

  /**
   * Récupérer l'utilisateur connecté
   */
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Récupérer le profil complet de l'utilisateur
   */
  async getCurrentProfile() {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  }
};

// =====================================================
// SERVICES CANDIDATS
// =====================================================

export const candidateService = {
  /**
   * Récupérer le profil complet d'un candidat
   */
  async getProfile(candidateId: string) {
    const { data, error } = await supabase
      .from('candidate_profiles')
      .select(`
        *,
        profiles!inner(*),
        experiences(*),
        education(*),
        skills(*),
        languages(*)
      `)
      .eq('id', candidateId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mettre à jour le profil candidat
   */
  async updateProfile(candidateId: string, updates: Partial<CandidateProfile>) {
    const { data, error } = await supabase
      .from('candidate_profiles')
      .update(updates)
      .eq('id', candidateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Ajouter une expérience
   */
  async addExperience(experience: Omit<Experience, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('experiences')
      .insert(experience)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Ajouter une formation
   */
  async addEducation(education: Omit<Education, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('education')
      .insert(education)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Ajouter des compétences
   */
  async addSkills(candidateId: string, skillNames: string[]) {
    const skills = skillNames.map(name => ({
      candidate_id: candidateId,
      skill_name: name,
    }));

    const { data, error } = await supabase
      .from('skills')
      .insert(skills)
      .select();

    if (error) throw error;
    return data;
  },

  /**
   * Calculer la complétion du profil
   */
  async calculateProfileCompletion(candidateId: string) {
    const { data, error } = await supabase
      .rpc('calculate_profile_completion', { candidate_uuid: candidateId });

    if (error) throw error;
    return data;
  },

  /**
   * Récupérer les candidatures d'un candidat
   */
  async getApplications(candidateId: string) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs!inner(
          *,
          company_profiles!inner(
            company_name,
            logo_url
          )
        )
      `)
      .eq('candidate_id', candidateId)
      .order('applied_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};

// =====================================================
// SERVICES EMPLOIS
// =====================================================

export const jobService = {
  /**
   * Récupérer toutes les offres actives
   */
  async getActiveJobs(filters?: {
    location?: string;
    jobType?: string;
    experienceLevel?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        company_profiles!inner(
          company_name,
          logo_url,
          sector
        ),
        job_skills(*)
      `)
      .eq('is_active', true);

    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }
    if (filters?.jobType) {
      query = query.eq('job_type', filters.jobType);
    }
    if (filters?.experienceLevel) {
      query = query.eq('experience_level', filters.experienceLevel);
    }

    query = query
      .order('published_at', { ascending: false })
      .limit(filters?.limit || 20)
      .range(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 20) - 1);

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  /**
   * Récupérer une offre par ID
   */
  async getJobById(jobId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        company_profiles!inner(
          company_name,
          logo_url,
          sector,
          description,
          website
        ),
        job_skills(*)
      `)
      .eq('id', jobId)
      .single();

    if (error) throw error;

    // Incrémenter les vues
    await supabase
      .from('jobs')
      .update({ views_count: data.views_count + 1 })
      .eq('id', jobId);

    return data;
  },

  /**
   * Rechercher des offres
   */
  async searchJobs(searchTerm: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        company_profiles!inner(company_name, logo_url)
      `)
      .eq('is_active', true)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('published_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  }
};

// =====================================================
// SERVICES ENTREPRISES
// =====================================================

export const companyService = {
  /**
   * Récupérer le profil d'une entreprise
   */
  async getProfile(companyId: string) {
    const { data, error } = await supabase
      .from('company_profiles')
      .select(`
        *,
        profiles!inner(*)
      `)
      .eq('id', companyId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mettre à jour le profil entreprise
   */
  async updateProfile(companyId: string, updates: Partial<CompanyProfile>) {
    const { data, error } = await supabase
      .from('company_profiles')
      .update(updates)
      .eq('id', companyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Créer une offre d'emploi
   */
  async createJob(job: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'views_count' | 'applications_count'>) {
    const { data, error } = await supabase
      .from('jobs')
      .insert(job)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Récupérer les offres d'une entreprise
   */
  async getJobs(companyId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, job_skills(*)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Récupérer les candidatures reçues
   */
  async getApplications(companyId: string) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs!inner(
          title,
          company_id
        ),
        candidate_profiles!inner(
          *,
          profiles!inner(
            full_name,
            email,
            phone
          )
        )
      `)
      .eq('jobs.company_id', companyId)
      .order('applied_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Mettre à jour le statut d'une candidature
   */
  async updateApplicationStatus(
    applicationId: string,
    status: Application['status'],
    notes?: string
  ) {
    const { data, error } = await supabase
      .from('applications')
      .update({ status, notes })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// =====================================================
// SERVICES CANDIDATURES
// =====================================================

export const applicationService = {
  /**
   * Postuler à une offre
   */
  async apply(application: Omit<Application, 'id' | 'applied_at' | 'updated_at' | 'status'>) {
    const { data, error } = await supabase
      .from('applications')
      .insert({
        ...application,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Vérifier si un candidat a déjà postulé
   */
  async hasApplied(candidateId: string, jobId: string) {
    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('candidate_id', candidateId)
      .eq('job_id', jobId)
      .maybeSingle();

    return !!data;
  }
};

// =====================================================
// SERVICES NOTIFICATIONS
// =====================================================

export const notificationService = {
  /**
   * Récupérer les notifications d'un utilisateur
   */
  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  },

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Créer une notification
   */
  async create(notification: Omit<Database['public']['Tables']['notifications']['Insert'], 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// =====================================================
// SERVICES STORAGE
// =====================================================

export const storageService = {
  /**
   * Upload un avatar
   */
  async uploadAvatar(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  /**
   * Upload un CV
   */
  async uploadCV(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('cvs')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('cvs')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  /**
   * Upload un logo d'entreprise
   */
  async uploadCompanyLogo(companyId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('company-logos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('company-logos')
      .getPublicUrl(fileName);

    return publicUrl;
  }
};
