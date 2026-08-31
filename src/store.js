import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const dir=process.env.DATA_DIR||path.resolve('data'),file=path.join(dir,'news.json');
async function read(){await fs.mkdir(dir,{recursive:true});try{return JSON.parse(await fs.readFile(file,'utf8'))}catch{const x={news:[]};await fs.writeFile(file,JSON.stringify(x,null,2));return x}}
async function write(x){const t=`${file}.${process.pid}.tmp`;await fs.writeFile(t,JSON.stringify(x,null,2));await fs.rename(t,file)}
export async function listNews(){return (await read()).news.sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt))}
export async function createNews(x){const db=await read();const n={id:crypto.randomUUID(),title:x.title.trim(),summary:(x.summary||'').trim(),content:x.content.trim(),url:(x.url||'').trim(),author:(x.author||'MeowHub Redaktion').trim(),publishedAt:x.publishedAt||new Date().toISOString(),createdAt:new Date().toISOString()};db.news.push(n);await write(db);return n}
export async function deleteNews(id){const db=await read(),before=db.news.length;db.news=db.news.filter(n=>n.id!==id);await write(db);return db.news.length!==before}
