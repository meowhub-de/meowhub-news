import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {listNews} from './store.js';

const escapeXml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export async function generateFeed() {
  const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const items = await listNews();
  const entries = items.map((news) => [
    '    <item>',
    `      <guid isPermaLink="false">${escapeXml(news.id)}</guid>`,
    `      <title>${escapeXml(news.title)}</title>`,
    `      <link>${escapeXml(news.url || `${base}/#${news.id}`)}</link>`,
    `      <description>${escapeXml(news.summary || news.content)}</description>`,
    `      <author>${escapeXml(news.author)}</author>`,
    `      <pubDate>${new Date(news.publishedAt).toUTCString()}</pubDate>`,
    '    </item>',
  ].join('\n')).join('\n');
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>', '<rss version="2.0">', '  <channel>',
    '    <title>MeowHub News</title>', `    <link>${escapeXml(base)}</link>`,
    '    <description>Releases, Projekte und Geschichten aus dem MeowHub.</description>',
    '    <language>de-DE</language>', `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    entries, '  </channel>', '</rss>', '',
  ].join('\n');
  const output = process.env.FEED_FILE || path.join(process.env.DATA_DIR || 'data', 'feed.xml');
  await fs.mkdir(path.dirname(output), {recursive: true});
  await fs.writeFile(output, xml, {mode: 0o600});
  return xml;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  generateFeed().then(() => console.log('feed.xml generated'));
}
