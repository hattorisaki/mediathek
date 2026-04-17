'use client';

import { useState, useEffect } from 'react';

export default function Mediathek() {
  const [videos, setVideos] = useState([]);
  const [linkInput, setLinkInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Videos beim Start aus dem Browser-Speicher laden
  useEffect(() => {
    const saved = localStorage.getItem('videos');
    if (saved) setVideos(JSON.parse(saved));
  }, []);

  // Videos speichern, wenn sie sich ändern
  useEffect(() => {
    localStorage.setItem('videos', JSON.stringify(videos));
  }, [videos]);

  // YouTube-Video-ID aus Link extrahieren
  function getYouTubeId(url) {
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([^&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Video hinzufügen
  async function addVideo() {
    if (!linkInput.trim()) return;
    setLoading(true);

    const ytId = getYouTubeId(linkInput);

    if (ytId) {
      // YouTube: Thumbnail & Titel automatisch holen
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${ytId}`);
        const data = await res.json();
        const newVideo = {
          id: Date.now(),
          url: linkInput,
          title: data.title || 'Unbekannter Titel',
          channel: data.author_name || 'Unbekannter Kanal',
          thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
          ytId: ytId,
          tags: [],
          addedAt: new Date().toISOString(),
        };
        setVideos([newVideo, ...videos]);
      } catch {
        alert('Konnte Video-Infos nicht laden.');
      }
    } else {
      // Nicht-YouTube: Platzhalter-Eintrag
      const newVideo = {
        id: Date.now(),
        url: linkInput,
        title: 'Neues Video (bitte Titel eintragen)',
        channel: 'Unbekannt',
        thumbnail: null,
        ytId: null,
        tags: [],
        addedAt: new Date().toISOString(),
      };
      setVideos([newVideo, ...videos]);
    }

    setLinkInput('');
    setLoading(false);
  }

  // Video löschen
  function deleteVideo(id) {
    if (confirm('Video wirklich löschen?')) {
      setVideos(videos.filter(v => v.id !== id));
    }
  }

  // Videos filtern nach Suche
  const filtered = videos.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.channel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif', color: '#e5e5e5', minHeight: '100vh' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 600 }}>Meine Mediathek</h1>
        <p style={{ margin: '6px 0 0', color: '#888', fontSize: '14px' }}>
          {videos.length} {videos.length === 1 ? 'Video' : 'Videos'}
        </p>
      </header>

      <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '10px' }}>
          Video-Link einfügen (YouTube wird automatisch erkannt)
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addVideo()}
            placeholder="https://youtube.com/watch?v=..."
            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #333', background: '#0a0a0a', color: '#e5e5e5', fontSize: '14px' }}
          />
          <button
            onClick={addVideo}
            disabled={loading}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
          >
            {loading ? '...' : 'Hinzufügen'}
          </button>
        </div>
      </div>

      {videos.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Suchen..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #333', background: '#1a1a1a', color: '#e5e5e5', fontSize: '14px', marginBottom: '1.5rem' }}
        />
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#666' }}>
          {videos.length === 0 ? 'Noch keine Videos. Füg oben einen Link ein!' : 'Keine Treffer für deine Suche.'}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {filtered.map(video => (
          <div
            key={video.id}
            style={{ background: '#1a1a1a', borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = ''}
          >
            <div style={{ position: 'relative', aspectRatio: '16/9', background: '#2a2a2a' }}>
              {video.thumbnail ? (
                <img src={video.thumbnail} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '13px' }}>
                  Kein Thumbnail
                </div>
              )}
            </div>
            <div style={{ padding: '12px 14px' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {video.title}
              </p>
              <p style={{ margin: '6px 0', fontSize: '12px', color: '#888' }}>{video.channel}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <a href={video.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', padding: '6px', borderRadius: '6px', background: '#262626', color: '#e5e5e5', fontSize: '12px', textDecoration: 'none' }}>
                  Öffnen
                </a>
                <button
                  onClick={() => deleteVideo(video.id)}
                  style={{ padding: '6px 12px', borderRadius: '6px', background: '#262626', color: '#e5e5e5', fontSize: '12px', border: 'none', cursor: 'pointer' }}
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}