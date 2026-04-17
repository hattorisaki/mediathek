'use client';

import { useState, useEffect } from 'react';

export default function Mediathek() {
  const [videos, setVideos] = useState([]);
  const [linkInput, setLinkInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('videos');
    if (saved) setVideos(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem('videos', JSON.stringify(videos));
  }, [videos, mounted]);

  function getYouTubeId(url) {
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([^&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async function addVideo() {
    if (!linkInput.trim()) return;
    setLoading(true);
    const ytId = getYouTubeId(linkInput);

    if (ytId) {
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${ytId}`);
        const data = await res.json();
        const newVideo = {
          id: Date.now(),
          url: linkInput,
          title: data.title || 'Unbekannter Titel',
          channel: data.author_name || 'Unbekannter Kanal',
          thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
          platform: 'youtube',
          ytId,
          tags: [],
          addedAt: new Date().toISOString(),
        };
        setVideos([newVideo, ...videos]);
      } catch {
        alert('Konnte Video-Infos nicht laden.');
      }
    } else {
      const newVideo = {
        id: Date.now(),
        url: linkInput,
        title: 'Neues Video (bitte Titel eintragen)',
        channel: 'Unbekannt',
        thumbnail: null,
        platform: 'other',
        ytId: null,
        tags: [],
        addedAt: new Date().toISOString(),
      };
      setVideos([newVideo, ...videos]);
    }

    setLinkInput('');
    setLoading(false);
    setShowAddModal(false);
  }

  function deleteVideo(id) {
    if (confirm('Video wirklich löschen?')) {
      setVideos(videos.filter(v => v.id !== id));
    }
  }

  function openVideo(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const filtered = videos.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.channel.toLowerCase().includes(search.toLowerCase())
  );

  const titleStyle = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

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
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Hinzufügen</span>
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
                <p className="text-xs text-neutral-500">{video.channel}</p>
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
                    onClick={() => deleteVideo(video.id)}
                    className="text-xs py-1.5 px-3 rounded-md bg-neutral-800 hover:bg-red-600 transition"
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
    </div>
  );
}