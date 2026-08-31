import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, {after, before} from 'node:test';

const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'meowhub-news-'));
process.env.DATA_DIR = dataDir;
process.env.APP_URL = 'https://news.example.test';
process.env.SESSION_SECRET = 'integration-test-secret';
process.env.NODE_ENV = 'test';
const {createApp} = await import('../src/server.js');

let server;
let baseUrl;
const adminGuard = (req, _res, next) => {
  req.session.user = {sub: 'test-user', name: 'Test Redaktion', email: 'admin@example.test'};
  next();
};

before(async () => {
  server = createApp({adminGuard}).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await fs.rm(dataDir, {recursive: true, force: true});
});

async function jsonRequest(url, options = {}) {
  const response = await fetch(baseUrl + url, options);
  const body = response.status === 204 ? null : await response.json();
  return {response, body};
}

test('health endpoint reports readiness', async () => {
  const {response, body} = await jsonRequest('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(body, {ok: true});
});

test('draft-to-published CRUD flow and RSS stay consistent', async () => {
  const payload = {
    title: 'Neues aus dem Testlabor',
    summary: 'Eine kurze Zusammenfassung.',
    content: 'Der vollständige und getestete Inhalt.',
    author: 'Test Redaktion',
    status: 'draft',
    featured: true,
    url: 'https://example.test/source',
    publishedAt: '2026-08-31T12:00:00.000Z',
  };
  const created = await jsonRequest('/api/admin/news', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.status, 'draft');
  assert.equal((await jsonRequest('/api/news')).body.length, 0);
  assert.equal((await jsonRequest('/api/admin/news')).body.length, 1);

  const published = await jsonRequest(`/api/admin/news/${created.body.id}`, {
    method: 'PUT', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({...payload, status: 'published', title: 'Veröffentlichter Systemtest'}),
  });
  assert.equal(published.response.status, 200);
  assert.equal(published.body.status, 'published');
  const publicNews = await jsonRequest('/api/news');
  assert.equal(publicNews.body[0].title, 'Veröffentlichter Systemtest');

  const feed = await fetch(baseUrl + '/feed.xml');
  const xml = await feed.text();
  assert.equal(feed.status, 200);
  assert.match(feed.headers.get('content-type'), /application\/rss\+xml/);
  assert.match(xml, /Veröffentlichter Systemtest/);

  const deleted = await fetch(baseUrl + `/api/admin/news/${created.body.id}`, {method: 'DELETE'});
  assert.equal(deleted.status, 204);
  assert.equal((await jsonRequest('/api/news')).body.length, 0);
});

test('invalid source URLs are rejected', async () => {
  const {response, body} = await jsonRequest('/api/admin/news', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({title: 'Ungültig', content: 'Test', url: 'javascript:alert(1)'}),
  });
  assert.equal(response.status, 400);
  assert.match(body.error, /http:\/\//);
});

test('admin page redirects unauthenticated visitors to login', async () => {
  const protectedServer = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => protectedServer.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${protectedServer.address().port}/admin`, {redirect: 'manual'});
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/auth/login');
  await new Promise(resolve => protectedServer.close(resolve));
});
