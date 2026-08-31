import fs from 'node:fs/promises';
import path from 'node:path';
import {listNews} from './store.js';
const esc=(v='')=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
export async function generateFeed(){const base=process.env.APP_URL||'http://localhost:3000',items=await listNews();const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>MeowHub News</title><link>${esc(base)}</link><description>Benutzerdefinierter MeowHub-Newsfeed</description><language>de-DE</language>${items.map(n=>`<item><guid isPermaLink="false">${esc(n.id)}</guid><title>${esc(n.title)}</title><link>${esc(n.url||`${base}/#${n.id}`)}</link><description>${esc(n.summary||n.content)}</description><author>${esc(n.author)}</author><pubDate>${new Date(n.publishedAt).toUTCString()}</pubDate></item>`).join('')}</channel></rss>\n`;const out=process.env.FEED_FILE||path.join(process.env.DATA_DIR||'data','feed.xml');await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,xml);return xml}
if(process.argv[1]?.endsWith('feed.js'))generateFeed().then(()=>console.log('feed.xml generated'));
