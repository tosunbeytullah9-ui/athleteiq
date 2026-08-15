export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      acwr_logs: {
        Row: {
          acute_load: number | null
          acwr_ratio: number | null
          athlete_id: string
          chronic_load: number | null
          created_at: string | null
          duration_min: number | null
          id: string
          log_date: string
          notes: string | null
          session_load: number | null
          session_rpe: number | null
        }
        Insert: {
          acute_load?: number | null
          acwr_ratio?: number | null
          athlete_id: string
          chronic_load?: number | null
          created_at?: string | null
          duration_min?: number | null
          id?: string
          log_date: string
          notes?: string | null
          session_load?: number | null
          session_rpe?: number | null
        }
        Update: {
          acute_load?: number | null
          acwr_ratio?: number | null
          athlete_id?: string
          chronic_load?: number | null
          created_at?: string | null
          duration_min?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          session_load?: number | null
          session_rpe?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acwr_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_1rm_records: {
        Row: {
          athlete_id: string
          created_at: string | null
          exercise_id: string | null
          exercise_name: string
          exercise_source: string | null
          id: string
          notes: string | null
          test_date: string
          weight_kg: number
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          exercise_id?: string | null
          exercise_name: string
          exercise_source?: string | null
          id?: string
          notes?: string | null
          test_date: string
          weight_kg: number
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          exercise_id?: string | null
          exercise_name?: string
          exercise_source?: string | null
          id?: string
          notes?: string | null
          test_date?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "athlete_1rm_records_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_push_tokens: {
        Row: {
          athlete_id: string
          created_at: string | null
          id: string
          platform: string | null
          token: string
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          id?: string
          platform?: string | null
          token: string
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          id?: string
          platform?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_push_tokens_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          full_name: string
          gender: string | null
          height_cm: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          org_id: string
          position: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          full_name: string
          gender?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          org_id: string
          position?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          full_name?: string
          gender?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          org_id?: string
          position?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_results: {
        Row: {
          athlete_id: string
          competition_id: string
          event: string | null
          id: string
          notes: string | null
          rank: number | null
          score: number | null
        }
        Insert: {
          athlete_id: string
          competition_id: string
          event?: string | null
          id?: string
          notes?: string | null
          rank?: number | null
          score?: number | null
        }
        Update: {
          athlete_id?: string
          competition_id?: string
          event?: string | null
          id?: string
          notes?: string | null
          rank?: number | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_results_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          competition_date: string | null
          id: string
          level: string | null
          location: string | null
          name: string
          notes: string | null
          org_id: string
          team_id: string | null
        }
        Insert: {
          competition_date?: string | null
          id?: string
          level?: string | null
          location?: string | null
          name: string
          notes?: string | null
          org_id: string
          team_id?: string | null
        }
        Update: {
          competition_date?: string | null
          id?: string
          level?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          org_id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_sets: {
        Row: {
          band_resistance: string | null
          created_at: string | null
          duration_sec: number | null
          exercise_id: string
          id: string
          is_bodyweight: boolean | null
          load_kg: number | null
          notes: string | null
          percent_1rm: number | null
          reps: number | null
          rpe: number | null
          set_number: number
        }
        Insert: {
          band_resistance?: string | null
          created_at?: string | null
          duration_sec?: number | null
          exercise_id: string
          id?: string
          is_bodyweight?: boolean | null
          load_kg?: number | null
          notes?: string | null
          percent_1rm?: number | null
          reps?: number | null
          rpe?: number | null
          set_number: number
        }
        Update: {
          band_resistance?: string | null
          created_at?: string | null
          duration_sec?: number | null
          exercise_id?: string
          id?: string
          is_bodyweight?: boolean | null
          load_kg?: number | null
          notes?: string | null
          percent_1rm?: number | null
          reps?: number | null
          rpe?: number | null
          set_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string | null
          completed_at: string | null
          duration_sec: number | null
          id: string
          load_kg: number | null
          load_percent: number | null
          load_percent_1rm: number | null
          load_type: string | null
          name: string
          notes: string | null
          order_index: number | null
          reps: number | null
          rest_sec: number | null
          rpe_target: number | null
          session_id: string
          sets: number | null
          superset_group: string | null
          superset_order: number | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          duration_sec?: number | null
          id?: string
          load_kg?: number | null
          load_percent?: number | null
          load_percent_1rm?: number | null
          load_type?: string | null
          name: string
          notes?: string | null
          order_index?: number | null
          reps?: number | null
          rest_sec?: number | null
          rpe_target?: number | null
          session_id: string
          sets?: number | null
          superset_group?: string | null
          superset_order?: number | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          duration_sec?: number | null
          id?: string
          load_kg?: number | null
          load_percent?: number | null
          load_percent_1rm?: number | null
          load_type?: string | null
          name?: string
          notes?: string | null
          order_index?: number | null
          reps?: number | null
          rest_sec?: number | null
          rpe_target?: number | null
          session_id?: string
          sets?: number | null
          superset_group?: string | null
          superset_order?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string | null
          org_id: string
          role: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          org_id: string
          role: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          org_id?: string
          role?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      org_exercise_categories: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          name_tr: string | null
          org_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          name_tr?: string | null
          org_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          name_tr?: string | null
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_exercise_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_exercises: {
        Row: {
          coach_notes: string | null
          created_at: string | null
          created_by: string | null
          custom_category_id: string | null
          demo_url: string | null
          difficulty: string | null
          equipment: string[] | null
          forked_from_platform: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          is_unilateral: boolean | null
          load_type: string | null
          movement_pattern: string | null
          name: string
          name_tr: string | null
          org_id: string
          primary_muscles: string[] | null
          secondary_muscles: string[] | null
          sport_tags: string[] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          coach_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_category_id?: string | null
          demo_url?: string | null
          difficulty?: string | null
          equipment?: string[] | null
          forked_from_platform?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_unilateral?: boolean | null
          load_type?: string | null
          movement_pattern?: string | null
          name: string
          name_tr?: string | null
          org_id: string
          primary_muscles?: string[] | null
          secondary_muscles?: string[] | null
          sport_tags?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          coach_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_category_id?: string | null
          demo_url?: string | null
          difficulty?: string | null
          equipment?: string[] | null
          forked_from_platform?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_unilateral?: boolean | null
          load_type?: string | null
          movement_pattern?: string | null
          name?: string
          name_tr?: string | null
          org_id?: string
          primary_muscles?: string[] | null
          secondary_muscles?: string[] | null
          sport_tags?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_exercises_custom_category_id_fkey"
            columns: ["custom_category_id"]
            isOneToOne: false
            referencedRelation: "org_exercise_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_exercises_forked_from_platform_fkey"
            columns: ["forked_from_platform"]
            isOneToOne: false
            referencedRelation: "platform_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_exercises_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          plan: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_exercises: {
        Row: {
          created_at: string | null
          demo_url: string | null
          difficulty: string | null
          equipment: string[] | null
          id: string
          instructions: string | null
          is_active: boolean | null
          is_unilateral: boolean | null
          load_type: string | null
          movement_pattern: string
          name: string
          name_tr: string | null
          primary_muscles: string[] | null
          secondary_muscles: string[] | null
          sport_tags: string[] | null
        }
        Insert: {
          created_at?: string | null
          demo_url?: string | null
          difficulty?: string | null
          equipment?: string[] | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_unilateral?: boolean | null
          load_type?: string | null
          movement_pattern: string
          name: string
          name_tr?: string | null
          primary_muscles?: string[] | null
          secondary_muscles?: string[] | null
          sport_tags?: string[] | null
        }
        Update: {
          created_at?: string | null
          demo_url?: string | null
          difficulty?: string | null
          equipment?: string[] | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_unilateral?: boolean | null
          load_type?: string | null
          movement_pattern?: string
          name?: string
          name_tr?: string | null
          primary_muscles?: string[] | null
          secondary_muscles?: string[] | null
          sport_tags?: string[] | null
        }
        Relationships: []
      }
      polar_sync_state: {
        Row: {
          athlete_id: string
          id: string
          last_synced_at: string | null
          last_tx_id: string | null
          resource_type: string | null
        }
        Insert: {
          athlete_id: string
          id?: string
          last_synced_at?: string | null
          last_tx_id?: string | null
          resource_type?: string | null
        }
        Update: {
          athlete_id?: string
          id?: string
          last_synced_at?: string | null
          last_tx_id?: string | null
          resource_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polar_sync_state_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          org_id: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          org_id: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          org_id?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      program_blocks: {
        Row: {
          athlete_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          org_id: string
          phase: string | null
          team_id: string | null
          title: string
          total_weeks: number
          updated_at: string | null
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          org_id: string
          phase?: string | null
          team_id?: string | null
          title: string
          total_weeks: number
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          phase?: string | null
          team_id?: string | null
          title?: string
          total_weeks?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_blocks_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_blocks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_blocks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      readiness_scores: {
        Row: {
          acwr_component: number | null
          algorithm_version: string
          athlete_id: string
          baseline_mean: number | null
          baseline_n: number | null
          baseline_sd: number | null
          computed_at: string | null
          id: string
          inputs: Json | null
          score: number | null
          score_date: string
          status: string | null
          wellness_component: number | null
          wellness_z: number | null
        }
        Insert: {
          acwr_component?: number | null
          algorithm_version: string
          athlete_id: string
          baseline_mean?: number | null
          baseline_n?: number | null
          baseline_sd?: number | null
          computed_at?: string | null
          id?: string
          inputs?: Json | null
          score?: number | null
          score_date: string
          status?: string | null
          wellness_component?: number | null
          wellness_z?: number | null
        }
        Update: {
          acwr_component?: number | null
          algorithm_version?: string
          athlete_id?: string
          baseline_mean?: number | null
          baseline_n?: number | null
          baseline_sd?: number | null
          computed_at?: string | null
          id?: string
          inputs?: Json | null
          score?: number | null
          score_date?: string
          status?: string | null
          wellness_component?: number | null
          wellness_z?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "readiness_scores_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          discipline: string | null
          id: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string | null
          discipline?: string | null
          id?: string
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string | null
          discipline?: string | null
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          athlete_id: string
          created_at: string | null
          id: string
          notes: string | null
          test_date: string
          test_type: string
          unit: string | null
          value: number | null
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          test_date: string
          test_type: string
          unit?: string | null
          value?: number | null
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          test_date?: string
          test_type?: string
          unit?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          athlete_id: string | null
          block_id: string | null
          created_at: string | null
          created_by: string | null
          discipline: string | null
          end_date: string | null
          id: string
          is_archived: boolean
          is_published: boolean | null
          notes: string | null
          org_id: string
          phase: string | null
          start_date: string | null
          team_id: string | null
          title: string
          updated_at: string | null
          week_index_in_block: number | null
          week_number: number | null
        }
        Insert: {
          athlete_id?: string | null
          block_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discipline?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean
          is_published?: boolean | null
          notes?: string | null
          org_id: string
          phase?: string | null
          start_date?: string | null
          team_id?: string | null
          title: string
          updated_at?: string | null
          week_index_in_block?: number | null
          week_number?: number | null
        }
        Update: {
          athlete_id?: string | null
          block_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discipline?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean
          is_published?: boolean | null
          notes?: string | null
          org_id?: string
          phase?: string | null
          start_date?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string | null
          week_index_in_block?: number | null
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_programs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_programs_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "program_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_programs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_programs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          athlete_session_notes: string | null
          day_of_week: number | null
          description: string | null
          duration_min: number | null
          id: string
          order_index: number | null
          program_id: string
          session_rpe: number | null
          session_type: string | null
          title: string | null
        }
        Insert: {
          athlete_session_notes?: string | null
          day_of_week?: number | null
          description?: string | null
          duration_min?: number | null
          id?: string
          order_index?: number | null
          program_id: string
          session_rpe?: number | null
          session_type?: string | null
          title?: string | null
        }
        Update: {
          athlete_session_notes?: string | null
          day_of_week?: number | null
          description?: string | null
          duration_min?: number | null
          id?: string
          order_index?: number | null
          program_id?: string
          session_rpe?: number | null
          session_type?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      wearable_connections: {
        Row: {
          access_token: string
          athlete_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          provider: string
          provider_user_id: string | null
          refresh_token: string | null
          scopes: string[] | null
          token_expires_at: string | null
        }
        Insert: {
          access_token: string
          athlete_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          provider: string
          provider_user_id?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
        }
        Update: {
          access_token?: string
          athlete_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          provider?: string
          provider_user_id?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wearable_connections_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      wearable_daily_metrics: {
        Row: {
          active_calories: number | null
          athlete_id: string
          created_at: string | null
          deep_sleep_min: number | null
          hrv_rmssd: number | null
          id: string
          metric_date: string
          muscle_load: number | null
          provider: string
          raw_data: Json | null
          recovery_score: number | null
          rem_sleep_min: number | null
          resting_hr: number | null
          sleep_efficiency: number | null
          sleep_score: number | null
          spo2: number | null
          strain_score: number | null
          total_sleep_min: number | null
        }
        Insert: {
          active_calories?: number | null
          athlete_id: string
          created_at?: string | null
          deep_sleep_min?: number | null
          hrv_rmssd?: number | null
          id?: string
          metric_date: string
          muscle_load?: number | null
          provider: string
          raw_data?: Json | null
          recovery_score?: number | null
          rem_sleep_min?: number | null
          resting_hr?: number | null
          sleep_efficiency?: number | null
          sleep_score?: number | null
          spo2?: number | null
          strain_score?: number | null
          total_sleep_min?: number | null
        }
        Update: {
          active_calories?: number | null
          athlete_id?: string
          created_at?: string | null
          deep_sleep_min?: number | null
          hrv_rmssd?: number | null
          id?: string
          metric_date?: string
          muscle_load?: number | null
          provider?: string
          raw_data?: Json | null
          recovery_score?: number | null
          rem_sleep_min?: number | null
          resting_hr?: number | null
          sleep_efficiency?: number | null
          sleep_score?: number | null
          spo2?: number | null
          strain_score?: number | null
          total_sleep_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wearable_daily_metrics_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_checkins: {
        Row: {
          athlete_id: string
          checkin_date: string
          created_at: string | null
          entered_by: string | null
          fatigue: number
          id: string
          mood: number
          notes: string | null
          sleep_hours: number | null
          sleep_quality: number
          soreness: number
          source: string
          stress: number
          submitted_at: string | null
          updated_at: string | null
          wellness_total: number | null
        }
        Insert: {
          athlete_id: string
          checkin_date?: string
          created_at?: string | null
          entered_by?: string | null
          fatigue: number
          id?: string
          mood: number
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality: number
          soreness: number
          source?: string
          stress: number
          submitted_at?: string | null
          updated_at?: string | null
          wellness_total?: number | null
        }
        Update: {
          athlete_id?: string
          checkin_date?: string
          created_at?: string | null
          entered_by?: string | null
          fatigue?: number
          id?: string
          mood?: number
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality?: number
          soreness?: number
          source?: string
          stress?: number
          submitted_at?: string | null
          updated_at?: string | null
          wellness_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wellness_checkins_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      whoop_cycles: {
        Row: {
          athlete_id: string
          avg_hr: number | null
          cycle_end: string | null
          cycle_start: string | null
          id: string
          kilojoules: number | null
          max_hr: number | null
          raw_data: Json | null
          strain_score: number | null
          synced_at: string | null
          whoop_cycle_id: string
        }
        Insert: {
          athlete_id: string
          avg_hr?: number | null
          cycle_end?: string | null
          cycle_start?: string | null
          id?: string
          kilojoules?: number | null
          max_hr?: number | null
          raw_data?: Json | null
          strain_score?: number | null
          synced_at?: string | null
          whoop_cycle_id: string
        }
        Update: {
          athlete_id?: string
          avg_hr?: number | null
          cycle_end?: string | null
          cycle_start?: string | null
          id?: string
          kilojoules?: number | null
          max_hr?: number | null
          raw_data?: Json | null
          strain_score?: number | null
          synced_at?: string | null
          whoop_cycle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whoop_cycles_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      copy_program_tree: {
        Args: { p_source_program_id: string; p_target_program_id: string }
        Returns: undefined
      }
      create_program_with_weeks: {
        Args: {
          p_athlete_id: string
          p_block_start_date: string
          p_discipline?: string
          p_notes: string
          p_org_id: string
          p_phase: string
          p_sessions: Json
          p_team_id: string
          p_title: string
          p_weeks_count: number
        }
        Returns: Json
      }
      get_athlete_programs: {
        Args: { p_athlete_id: string }
        Returns: {
          athlete_id: string | null
          block_id: string | null
          created_at: string | null
          created_by: string | null
          discipline: string | null
          end_date: string | null
          id: string
          is_archived: boolean
          is_published: boolean | null
          notes: string | null
          org_id: string
          phase: string | null
          start_date: string | null
          team_id: string | null
          title: string
          updated_at: string | null
          week_index_in_block: number | null
          week_number: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "training_programs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      insert_sessions_tree: {
        Args: { p_program_id: string; p_sessions: Json }
        Returns: undefined
      }
      is_super_admin: { Args: never; Returns: boolean }
      my_role: { Args: { org: string }; Returns: string }
      my_team_id: { Args: { org: string }; Returns: string }
      propagate_week_to_future: {
        Args: { p_source_program_id: string }
        Returns: Json
      }
      update_program_week: {
        Args: {
          p_discipline?: string
          p_end_date: string
          p_notes: string
          p_phase: string
          p_program_id: string
          p_sessions: Json
          p_start_date: string
          p_title: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
