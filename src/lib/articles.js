import { supabase, configured } from './supabase';

/* Article persistence:
   - always saved locally (works in demo mode too)
   - synced to Supabase `articles` when configured (public read, owner write) */

const KEY = 'dsa400-articles-v1';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function writeAll(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {} }

export function saveArticleLocal(p) {
  const m = readAll();
  m[p.slug] = p;
  writeAll(m);
}

export function loadArticleLocal(slug) {
  return readAll()[slug] || null;
}

export function listArticlesLocal() {
  return Object.values(readAll()).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

/* compile + persist the JSON payload (schema from the spec) */
export async function publishArticle(p, userId) {
  const payload = {
    slug: p.slug,
    title: p.title || 'Untitled',
    date: p.date,
    dayStreak: Number(p.dayStreak) || 0,
    tags: p.tags || [],
    videoUrl: p.videoUrl || null,
    contentMarkdown: p.contentMarkdown || '',
    isPublished: true,
  };
  saveArticleLocal(payload);
  if (configured && supabase) {
    try {
      await supabase.from('articles').upsert({
        slug: payload.slug,
        user_id: userId || null,
        title: payload.title,
        date: payload.date,
        day_streak: payload.dayStreak,
        tags: payload.tags,
        video_url: payload.videoUrl,
        content_markdown: payload.contentMarkdown,
        is_published: true,
      });
    } catch { /* local publish still succeeded */ }
  }
  return payload;
}

export async function loadArticle(slug) {
  const local = loadArticleLocal(slug);
  if (local) return local;
  if (configured && supabase) {
    const { data } = await supabase.from('articles').select('*').eq('slug', slug).maybeSingle();
    if (data) {
      return {
        slug: data.slug,
        title: data.title,
        date: data.date,
        dayStreak: data.day_streak,
        tags: data.tags || [],
        videoUrl: data.video_url,
        contentMarkdown: data.content_markdown,
        isPublished: data.is_published,
      };
    }
  }
  return null;
}
