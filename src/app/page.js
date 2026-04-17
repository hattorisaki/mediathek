'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Mediathek() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [videos, setVideos] = useState([]);
  const [linkInput, setLinkInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [editingVideo, setEditingVideo] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', channel: '', thumbnail: '', url: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('signin');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setVideos([]);
      return;
    }
    loadVideos();
  }, [session]);

  async function loadVideos() {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Fehler beim Laden:', error);
      return;
    }
    setVideos(data || []);
  }

  async function handleSignUp() {
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  }

  async function handleSignIn() {
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function getYouTubeId(url) {
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([^&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

 async function addVideo() {
    if (!linkInput.trim() || !session) return;
    setLoading(true);
    const ytId = getYouTubeId(linkInput);

    let newVideo;

    if (ytId) {
      // YouTube: noembed (hat sich bewährt)
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${ytId}`);
        const data = await res.json();
        newVideo = {
          user_id: session.user.id,
          url: linkInput,
          title: data.title || 'Unbekannter Titel',
          channel: data.author_name || 'Unbekannter Kanal',
          thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
          platform: 'youtube',
          yt_id: ytId,
          tags: [],
        };
      } catch {
        alert('Konnte YouTube-Infos nicht laden.');
        setLoading(false);
        return;
      }
    } else {
      // Alles andere: eigenen Scraper nutzen
      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: linkInput }),
        });
        const data = await res.json();

        newVideo = {
          user_id: session.user.id,
          url: linkInput,
          title: data.title || 'Neues Video (bitte Titel eintragen)',
          channel: data.siteName || 'Unbekannt',
          thumbnail: data.image || null,
          platform: 'other',
          yt_id: null,
          notes: data.description || null,
          tags: [],
        };
      } catch {
        // Fallback falls Scraper versagt
        newVideo = {
          user_id: session.user.id,
          url: linkInput,
          title: 'Neues Video (bitte Titel eintragen)',
          channel: 'Unbekannt',
          thumbnail: null,
          platform: 'other',
          yt_id: null,
          tags: [],
        };
      }
    }

    const { data, error } = await supabase
      .from('videos')
      .insert(newVideo)
      .select()
      .single();

    if (error) {
      alert('Fehler beim Speichern: ' + error.message);
    } else {
      setVideos([data, ...videos]);
    }

    setLinkInput('');
    setLoading(false);
    setShowAddModal(false);
  }

  async function deleteVideo(id) {
    if (!confirm('Video wirklich löschen?')) return;
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (error) {
      alert('Fehler beim Löschen: ' + error.message);
      return;
    }
    setVideos(videos.filter(v => v.id !== id));
  }

  function startEdit(video) {
    setEditingVideo(video);
    setEditForm({
      title: video.title || '',
      channel: video.channel || '',
      thumbnail: video.thumbnail || '',
      url: video.url || '',
      notes: video.notes || '',
    });
  }

  function closeEdit() {
    setEditingVideo(null);
  }

  async function saveEdit() {
    if (!editingVideo) return;
    setEditSaving(true);

    const updates = {
      title: editForm.title.trim() || 'Unbenannt',
      channel: editForm.channel.trim() || null,
      thumbnail: editForm.thumbnail.trim() || null,
      url: editForm.url.trim(),
      notes: editForm.notes.trim() || null,
    };

    const { data, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', editingVideo.id)
      .select()
      .single();

    if (error) {
      alert('Fehler beim Speichern: ' + error.message);
      setEditSaving(false);
      return;
    }

    setVideos(videos.map(v => v.id === editingVideo.id ? data : v));
    setEditSaving(false);
    setEditingVideo(null);
  }

  function openVideo(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const filtered = videos.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    (v.channel || '').toLowerCase().includes(search.toLowerCase())
  );

  const titleStyle = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center">
        <p className="text-sm">Lade...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">M</div>
            <h1 className="text-xl font-semibold">Mediathek</h1>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-1">
              {authMode === 'signin' ? 'Willkommen zurück' : 'Account erstellen'}
            </h2>
            <p className="text-sm text-neutral-500 mb-5">
              {authMode === 'signin' ? 'Logge dich ein, um deine Mediathek zu sehen.' : 'Erstelle einen Account, um loszulegen.'}
            </p>

            <div className="space-y-3">
              <input
                type="email"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition"
              />
              <input
                type="password"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                placeholder="Passwort (mindestens 6 Zeichen)"
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition"
              />
              {authError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {authError}
                </div>
              )}
              <button
                type="button"
                onClick={authMode === 'signin' ? handleSignIn : handleSignUp}
                disabled={authLoading || !authEmail || !authPassword}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition"
              >
                {authLoading ? 'Bitte warten...' : authMode === 'signin' ? 'Einloggen' : 'Registrieren'}
              </button>
            </div>

            <div className="mt-5 pt-5 border-t border-neutral-800 text-center">
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); }}
                className="text-sm text-neutral-400 hover:text-neutral-200 transition"
              >
                {authMode === 'signin' ? 'Noch kein Account? Registrieren' : 'Schon einen Account? Einloggen'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-neutral-950/70 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">M</div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Mediathek</h1>
              <p className="text-xs text-neutral-500">{videos.length} {videos.length === 1 ? 'Video' : 'Videos'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Suchen..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Hinzufügen</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-sm transition"
              title="Abmelden"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {videos.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-900 mb-4">
              <svg className="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Deine Mediathek ist leer</h2>
            <p className="text-neutral-500 mb-6">Füg dein erstes Video hinzu, um loszulegen.</p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Erstes Video hinzufügen
            </button>
          </div>
        )}

        {videos.length > 0 && filtered.length === 0 && (
          <div className="text-center py-20 text-neutral-500">
            Keine Treffer für deine Suche.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(video => (
            <div
              key={video.id}
              className="group bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 hover:border-neutral-700 transition-all hover:-translate-y-1"
            >
              <button
                type="button"
                onClick={() => openVideo(video.url)}
                className="block w-full relative aspect-video bg-neutral-800 overflow-hidden cursor-pointer border-0 p-0"
              >
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                    <svg className="w-6 h-6 text-neutral-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                {video.platform === 'youtube' && (
                  <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-red-600 text-white uppercase tracking-wide">YouTube</span>
                )}
              </button>
              <div className="p-3">
                <p className="font-medium text-sm leading-snug mb-1" style={titleStyle}>{video.title}</p>
                <p className="text-xs text-neutral-500">{video.channel || '—'}</p>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => openVideo(video.url)}
                    className="flex-1 text-center text-xs py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 transition"
                  >
                    Öffnen
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(video)}
                    className="text-xs py-1.5 px-3 rounded-md bg-neutral-800 hover:bg-indigo-600 transition"
                    title="Bearbeiten"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteVideo(video.id)}
                    className="text-xs py-1.5 px-3 rounded-md bg-neutral-800 hover:bg-red-600 transition"
                    title="Löschen"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-1">Video hinzufügen</h2>
            <p className="text-sm text-neutral-500 mb-4">YouTube-Links werden automatisch erkannt.</p>
            <input
              type="text"
              value={linkInput}
              onChange={e => setLinkInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addVideo()}
              placeholder="https://youtube.com/watch?v=..."
              autoFocus
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition mb-4"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium transition"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={addVideo}
                disabled={loading || !linkInput.trim()}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition"
              >
                {loading ? 'Lade...' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={closeEdit}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl my-8"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-1">Video bearbeiten</h2>
            <p className="text-sm text-neutral-500 mb-5">Alle Änderungen werden sofort gespeichert.</p>

            {editForm.thumbnail && (
              <div className="mb-4 aspect-video bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800">
                <img src={editForm.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Titel</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Video-Titel"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Kanal / Quelle</label>
                <input
                  type="text"
                  value={editForm.channel}
                  onChange={e => setEditForm({ ...editForm, channel: e.target.value })}
                  placeholder="z.B. Max Mustermann"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Thumbnail-URL</label>
                <input
                  type="text"
                  value={editForm.thumbnail}
                  onChange={e => setEditForm({ ...editForm, thumbnail: e.target.value })}
                  placeholder="https://... (Bild-Link)"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Video-URL</label>
                <input
                  type="text"
                  value={editForm.url}
                  onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Notizen (optional)</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Eigene Notizen..."
                  rows={3}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={closeEdit}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium transition"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={editSaving}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium transition"
              >
                {editSaving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}