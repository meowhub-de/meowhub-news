import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const dir = process.env.DATA_DIR || path.resolve('data');
const file = path.join(dir, 'news.json');
let mutationQueue = Promise.resolve();

function normalizeNews(item) {
  const now = new Date().toISOString();
  return {
    id: item.id || crypto.randomUUID(),
    title: String(item.title || '').trim(),
    summary: String(item.summary || '').trim(),
    content: String(item.content || '').trim(),
    url: String(item.url || '').trim(),
    author: String(item.author || 'MeowHub Redaktion').trim(),
    status: item.status === 'draft' ? 'draft' : 'published',
    featured: Boolean(item.featured),
    publishedAt: item.publishedAt || now,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now,
  };
}

async function read() {
  await fs.mkdir(dir, {recursive: true});
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    return {news: Array.isArray(parsed.news) ? parsed.news.map(normalizeNews) : []};
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const initial = {news: []};
    await fs.writeFile(file, JSON.stringify(initial, null, 2) + '\n', {mode: 0o600});
    return initial;
  }
}

async function write(database) {
  const temporary = file + '.' + process.pid + '.' + crypto.randomUUID() + '.tmp';
  await fs.writeFile(temporary, JSON.stringify(database, null, 2) + '\n', {mode: 0o600});
  await fs.rename(temporary, file);
}

function mutate(operation) {
  const result = mutationQueue.then(async () => {
    const database = await read();
    const value = await operation(database);
    await write(database);
    return value;
  });
  mutationQueue = result.catch(() => undefined);
  return result;
}

export async function listNews({includeDrafts = false} = {}) {
  const items = (await read()).news;
  return items
    .filter((item) => includeDrafts || item.status === 'published')
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export async function createNews(input) {
  return mutate(async (database) => {
    const now = new Date().toISOString();
    const news = normalizeNews({...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now});
    database.news.push(news);
    return news;
  });
}

export async function updateNews(id, input) {
  return mutate(async (database) => {
    const index = database.news.findIndex((item) => item.id === id);
    if (index === -1) return null;
    database.news[index] = normalizeNews({
      ...database.news[index],
      ...input,
      id,
      createdAt: database.news[index].createdAt,
      updatedAt: new Date().toISOString(),
    });
    return database.news[index];
  });
}

export async function deleteNews(id) {
  return mutate(async (database) => {
    const before = database.news.length;
    database.news = database.news.filter((item) => item.id !== id);
    return database.news.length !== before;
  });
}
