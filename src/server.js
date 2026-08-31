import express from 'express';
import cookieSession from 'cookie-session';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createNews, deleteNews, listNews, updateNews} from './store.js';
import {generateFeed} from './feed.js';
import {callback, login, logout, requireAdmin} from './auth.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, '..', 'public');

function cleanText(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function validateNews(body = {}) {
  const title = cleanText(body.title, 180);
  const content = cleanText(body.content, 20000);
  const summary = cleanText(body.summary, 500);
  const author = cleanText(body.author || 'MeowHub Redaktion', 100);
  const status = body.status === 'draft' ? 'draft' : 'published';
  const publishedAt = body.publishedAt ? new Date(body.publishedAt) : new Date();
  if (!title) throw Object.assign(new Error('Ein Titel ist erforderlich.'), {status: 400});
  if (!content) throw Object.assign(new Error('Ein Inhalt ist erforderlich.'), {status: 400});
  if (Number.isNaN(publishedAt.getTime())) {
    throw Object.assign(new Error('Das Veröffentlichungsdatum ist ungültig.'), {status: 400});
  }
  let url = cleanText(body.url, 2000);
  if (url) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      url = parsed.toString();
    } catch {
      throw Object.assign(
        new Error('Die externe URL muss mit http:// oder https:// beginnen.'),
        {status: 400},
      );
    }
  }
  return {
    title,
    content,
    summary,
    author,
    status,
    url,
    featured: body.featured === true || body.featured === 'on',
    publishedAt: publishedAt.toISOString(),
  };
}

export function createApp({adminGuard = requireAdmin} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((_, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });
    next();
  });
  app.use(express.json({limit: '256kb'}));
  app.use(express.urlencoded({extended: false, limit: '256kb'}));
  app.use(cookieSession({
    name: 'meowhub_session',
    keys: [process.env.SESSION_SECRET || 'development-only-secret'],
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,
  }));

  app.get('/health', (_, res) => res.json({ok: true}));
  app.get('/api/news', async (_, res, next) => {
    try { res.json(await listNews()); } catch (error) { next(error); }
  });
  app.get('/feed.xml', async (_, res, next) => {
    try { res.type('application/rss+xml').send(await generateFeed()); } catch (error) { next(error); }
  });

  app.get('/auth/login', login);
  app.get('/auth/callback', callback);
  app.get('/auth/logout', logout);

  app.get('/api/admin/me', adminGuard, (req, res) => res.json(req.session.user));
  app.get('/api/admin/news', adminGuard, async (_, res, next) => {
    try { res.json(await listNews({includeDrafts: true})); } catch (error) { next(error); }
  });
  app.post('/api/admin/news', adminGuard, async (req, res, next) => {
    try {
      const news = await createNews(validateNews(req.body));
      await generateFeed();
      res.status(201).json(news);
    } catch (error) { next(error); }
  });
  app.put('/api/admin/news/:id', adminGuard, async (req, res, next) => {
    try {
      const news = await updateNews(req.params.id, validateNews(req.body));
      if (!news) return res.status(404).json({error: 'News-Eintrag nicht gefunden.'});
      await generateFeed();
      return res.json(news);
    } catch (error) { next(error); }
  });
  app.delete('/api/admin/news/:id', adminGuard, async (req, res, next) => {
    try {
      const deleted = await deleteNews(req.params.id);
      if (!deleted) return res.status(404).json({error: 'News-Eintrag nicht gefunden.'});
      await generateFeed();
      return res.status(204).end();
    } catch (error) { next(error); }
  });

  app.get('/admin', adminGuard, (_, res) => res.sendFile(path.join(publicDir, 'admin.html')));
  app.use(express.static(publicDir, {maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0}));
  app.use('/api', (_, res) => res.status(404).json({error: 'API-Endpunkt nicht gefunden.'}));
  app.use((error, _, res, __) => {
    if (!error.status || error.status >= 500) console.error(error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Interner Serverfehler.',
    });
  });
  return app;
}

export const app = createApp();

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log('MeowHub News listening on ' + port));
}
