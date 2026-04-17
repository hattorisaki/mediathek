export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'URL fehlt' }, { status: 400 });
    }

    // Website abrufen
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MediathekBot/1.0; +https://example.com)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return Response.json({ error: 'Website konnte nicht geladen werden' }, { status: 400 });
    }

    const html = await res.text();

    // Hilfsfunktion: Meta-Tag finden
    function meta(property) {
      const patterns = [
        new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'),
        new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, 'i'),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return decode(match[1]);
      }
      return null;
    }

    // HTML-Entities dekodieren (z.B. &amp; → &)
    function decode(str) {
      return str
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
    }

    // Titel finden
    let title = meta('og:title') || meta('twitter:title');
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) title = decode(titleMatch[1].trim());
    }

    // Beschreibung
    const description = meta('og:description') || meta('twitter:description') || meta('description');

    // Bild (Thumbnail)
    let image = meta('og:image') || meta('twitter:image') || meta('twitter:image:src');

    // Relative Bild-URLs zu absoluten machen
    if (image && !image.startsWith('http')) {
      try {
        const base = new URL(url);
        image = new URL(image, base.origin).href;
      } catch {}
    }

    // Site-Name (= "Kanal")
    let siteName = meta('og:site_name');
    if (!siteName) {
      try {
        siteName = new URL(url).hostname.replace(/^www\./, '');
      } catch {}
    }

    return Response.json({
      title: title || null,
      description: description || null,
      image: image || null,
      siteName: siteName || null,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}