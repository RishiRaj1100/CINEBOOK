// ============================================================
// lib/data/repositories/movie-repository.ts
// Supabase implementation of MovieRepository interface
// ============================================================

import { getSupabaseBrowserClient, getSupabaseServiceClient } from '../supabase-client';
import type { MovieRepository } from '@/lib/domain/repositories';
import type { Movie, MovieFilters } from '@/lib/domain/types';

export class SupabaseMovieRepository implements MovieRepository {
  private get client() { return getSupabaseBrowserClient(); }

  async getMovies(filters?: MovieFilters): Promise<Movie[]> {
    let query = this.client
      .from('movies')
      .select('*')
      .eq('is_active', true)
      .order('release_date', { ascending: false });

    if (filters?.genre) query = query.eq('genre', filters.genre);
    if (filters?.language) query = query.eq('language', filters.language);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as Movie[];
  }

  async getMovieById(id: string): Promise<Movie | null> {
    const { data, error } = await this.client
      .from('movies')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as Movie;
  }

  async getCities(): Promise<string[]> {
    const { data, error } = await this.client
      .from('theaters')
      .select('city')
      .order('city');
    if (error) throw new Error(error.message);
    const cities = [...new Set((data ?? []).map((t: any) => t.city))];
    return cities;
  }

  async createMovie(movieData: Omit<Movie, 'id' | 'created_at' | 'updated_at'>): Promise<Movie> {
    const client = getSupabaseServiceClient();
    const { data, error } = await (client.from('movies') as any)
      .insert(movieData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Movie;
  }

  async updateMovie(id: string, movieData: Partial<Movie>): Promise<Movie> {
    const client = getSupabaseServiceClient();
    const { data, error } = await (client.from('movies') as any)
      .update(movieData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Movie;
  }

  async deleteMovie(id: string): Promise<void> {
    const client = getSupabaseServiceClient();
    const { error } = await (client.from('movies') as any).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
