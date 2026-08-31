const container = document.querySelector('#news');
const counter = document.querySelector('#news-count');

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function createCard(news, index) {
  const card = element('article', 'news-card' + (news.featured ? ' featured' : ''));
  card.id = news.id;
  card.style.setProperty('--delay', Math.min(index * 80, 400) + 'ms');
  const top = element('div', 'card-top');
  const tag = element('span', 'news-tag', news.featured ? 'Featured' : 'Update');
  const date = element('time', '', formatDate(news.publishedAt));
  date.dateTime = news.publishedAt;
  top.append(tag, date);
  const title = element('h3', '', news.title);
  const summary = element('p', 'news-summary', news.summary || news.content);
  const bottom = element('div', 'card-bottom');
  const author = element('span', 'author');
  author.append(element('span', 'author-avatar', (news.author || 'M').slice(0, 1).toUpperCase()));
  author.append(document.createTextNode(news.author || 'MeowHub Redaktion'));
  bottom.append(author);
  const href = safeUrl(news.url);
  if (href) {
    const link = element('a', 'card-link', 'Öffnen ↗');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', news.title + ' öffnen');
    bottom.append(link);
  } else {
    bottom.append(element('span', 'card-index', String(index + 1).padStart(2, '0')));
  }
  card.append(top, title, summary, bottom);
  return card;
}

async function loadNews() {
  try {
    const response = await fetch('/api/news', {headers: {Accept: 'application/json'}});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const news = await response.json();
    counter.textContent = String(news.length).padStart(2, '0');
    container.replaceChildren();
    if (!news.length) {
      const empty = element('div', 'empty-state');
      empty.append(element('span', 'empty-icon', '⌁'));
      empty.append(element('h3', '', 'Noch kein Signal'));
      empty.append(element('p', '', 'Die Redaktion bereitet gerade das erste Update vor.'));
      container.append(empty);
    } else {
      news.forEach((item, index) => container.append(createCard(item, index)));
    }
  } catch {
    container.replaceChildren();
    const failed = element('div', 'empty-state error-state');
    failed.append(element('span', 'empty-icon', '!'));
    failed.append(element('h3', '', 'Signal unterbrochen'));
    failed.append(element('p', '', 'Die News konnten gerade nicht geladen werden. Bitte versuche es gleich erneut.'));
    const retry = element('button', 'button button-ghost', 'Erneut versuchen');
    retry.addEventListener('click', loadNews);
    failed.append(retry);
    container.append(failed);
  } finally {
    container.setAttribute('aria-busy', 'false');
  }
}

loadNews();
