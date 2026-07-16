'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMovieRepository } from '@/lib/providers/repository-factory';
import { useState } from 'react';
import type { Movie } from '@/lib/domain/types';
import { Plus, Edit2, Trash2, Film, Star, Clock, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const EMPTY_FORM = {
  title: '', description: '', duration_minutes: 120, genre: '',
  language: 'Hindi', poster_url: '', rating: 8.0, release_date: '',
  is_active: true,
};

export default function AdminMoviesPage() {
  const queryClient = useQueryClient();
  const movieRepo   = getMovieRepository();

  const [showForm,  setShowForm]  = useState(false);
  const [editMovie, setEditMovie] = useState<Movie | null>(null);
  const [form,      setForm]      = useState(EMPTY_FORM as typeof EMPTY_FORM & Partial<Movie>);

  const { data: movies = [], isLoading } = useQuery({
    queryKey: ['admin-movies'],
    queryFn:  () => movieRepo.getMovies(),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editMovie) return movieRepo.updateMovie(editMovie.id, form as Partial<Movie>);
      return movieRepo.createMovie(form as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      toast.success(editMovie ? 'Movie updated!' : 'Movie added!');
      closeForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => movieRepo.deleteMovie(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      toast.success('Movie deleted.');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openNew = () => {
    setEditMovie(null);
    setForm(EMPTY_FORM as any);
    setShowForm(true);
  };

  const openEdit = (movie: Movie) => {
    setEditMovie(movie);
    setForm({ ...movie } as any);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditMovie(null); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f0f0f0', margin: 0 }}>Movies</h1>
            <p style={{ color: '#8b8b9a', margin: 0 }}>{movies.length} total</p>
          </div>
          <button id="btn-add-movie" onClick={openNew} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #e50914, #c40812)',
            border: 'none', color: 'white', padding: '10px 20px',
            borderRadius: 10, fontWeight: 700, cursor: 'pointer',
          }}>
            <Plus size={18} /> Add Movie
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {[1,2,3,4].map((i) => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 12 }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {movies.map((movie) => (
              <div key={movie.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '2/3', background: '#1a1a2e', position: 'relative' }}>
                  {movie.poster_url
                    ? <img src={movie.poster_url} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🎬</div>
                  }
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(movie)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteMutation.mutate(movie.id)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(229,9,20,0.8)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#f0f0f0', fontSize: 13, marginBottom: 4 }}>{movie.title}</div>
                  <div style={{ display: 'flex', gap: 8, color: '#8b8b9a', fontSize: 11 }}>
                    {movie.rating && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Star size={10} fill="#f5c518" color="#f5c518" />{movie.rating}</span>}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} />{movie.duration_minutes}m</span>
                  </div>
                  <span style={{ fontSize: 11, color: movie.is_active ? '#10b981' : '#6b7280', marginTop: 4, display: 'block' }}>
                    ● {movie.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Form */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={(e) => e.target === e.currentTarget && closeForm()}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ color: '#f0f0f0', fontWeight: 800, margin: 0 }}>{editMovie ? 'Edit Movie' : 'Add Movie'}</h2>
                <button onClick={closeForm} style={{ background: 'none', border: 'none', color: '#8b8b9a', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <FormField label="Title *" id="movie-title"><input id="movie-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} /></FormField>
                <FormField label="Description" id="movie-desc"><textarea id="movie-desc" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, height: 80, resize: 'vertical' }} /></FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Duration (min) *" id="movie-dur"><input id="movie-dur" type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })} style={inputStyle} /></FormField>
                  <FormField label="Rating (0-10)" id="movie-rating"><input id="movie-rating" type="number" step="0.1" value={form.rating ?? ''} onChange={(e) => setForm({ ...form, rating: +e.target.value })} style={inputStyle} /></FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Genre *" id="movie-genre"><input id="movie-genre" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} style={inputStyle} /></FormField>
                  <FormField label="Language *" id="movie-lang"><input id="movie-lang" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} style={inputStyle} /></FormField>
                </div>
                <FormField label="Release Date *" id="movie-date"><input id="movie-date" type="date" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} style={inputStyle} /></FormField>
                <FormField label="Poster URL" id="movie-poster"><input id="movie-poster" value={form.poster_url ?? ''} onChange={(e) => setForm({ ...form, poster_url: e.target.value })} style={inputStyle} placeholder="https://..." /></FormField>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  <span style={{ color: '#f0f0f0', fontSize: 14 }}>Active (visible to users)</span>
                </label>
              </div>

              <button id="btn-save-movie" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} style={{ ...primaryBtn, marginTop: 24 }}>
                {saveMutation.isPending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {saveMutation.isPending ? 'Saving...' : editMovie ? 'Update Movie' : 'Add Movie'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FormField({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', color: '#8b8b9a', fontSize: 13, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: '#f0f0f0', fontSize: 14, outline: 'none',
};

const primaryBtn: React.CSSProperties = {
  width: '100%', padding: 14,
  background: 'linear-gradient(135deg, #e50914, #c40812)',
  border: 'none', borderRadius: 10, color: 'white',
  fontWeight: 700, fontSize: 15, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};
