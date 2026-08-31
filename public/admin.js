const form = document.querySelector('#news-form');
const list = document.querySelector('#admin-news');
const statusText = document.querySelector('#status');
const toast = document.querySelector('#toast');
const dialog = document.querySelector('#preview-dialog');
const search = document.querySelector('#search');
const filterStatus = document.querySelector('#filter-status');

let items = [];
let editingId = null;
let toastTimer;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const formatDate = value => new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(value));

const toLocalDateTime = value => {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

async function api(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 401) {
    location.assign('/auth/login');
    throw new Error('Anmeldung erforderlich');
  }

  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || 'Die Anfrage ist fehlgeschlagen.');
  return body;
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('is-error', isError);
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function payloadFromForm() {
  const data = Object.fromEntries(new FormData(form));
  data.featured = form.elements.featured.checked;
  data.publishedAt = data.publishedAt ? new Date(data.publishedAt).toISOString() : new Date().toISOString();
  return data;
}

function openPreview(item) {
  document.querySelector('#preview-title').textContent = item.title || 'Unbenannte Meldung';
  document.querySelector('#preview-meta').textContent = `${item.author || 'MeowHub Redaktion'} · ${formatDate(item.publishedAt || new Date())}`;
  document.querySelector('#preview-summary').textContent = item.summary || '';
  document.querySelector('#preview-content').textContent = item.content || '';
  const link = document.querySelector('#preview-link');
  link.hidden = !item.url;
  if (item.url) link.href = item.url;
  dialog.showModal();
}

function resetEditor() {
  editingId = null;
  form.reset();
  form.elements.author.value = 'MeowHub Redaktion';
  form.elements.status.value = 'published';
  form.elements.publishedAt.value = toLocalDateTime();
  document.querySelector('#editor-title').textContent = 'Neue Meldung';
  document.querySelector('#submit-label').textContent = 'Meldung veröffentlichen';
  document.querySelector('#cancel-edit').hidden = true;
  statusText.textContent = '';
  updateCounter();
}

function editItem(item) {
  editingId = item.id;
  for (const name of ['title', 'author', 'status', 'url', 'summary', 'content']) {
    form.elements[name].value = item[name] || '';
  }
  form.elements.publishedAt.value = toLocalDateTime(item.publishedAt);
  form.elements.featured.checked = Boolean(item.featured);
  document.querySelector('#editor-title').textContent = 'Meldung bearbeiten';
  document.querySelector('#submit-label').textContent = 'Änderungen speichern';
  document.querySelector('#cancel-edit').hidden = false;
  updateCounter();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  form.elements.title.focus();
}

function renderStats() {
  document.querySelector('#stat-total').textContent = items.length;
  document.querySelector('#stat-published').textContent = items.filter(item => item.status === 'published').length;
  document.querySelector('#stat-drafts').textContent = items.filter(item => item.status === 'draft').length;
}

function actionButton(label, action, id, className = 'button button-small button-ghost') {
  const button = el('button', className, label);
  button.type = 'button';
  button.dataset.action = action;
  button.dataset.id = id;
  return button;
}

function renderList() {
  list.replaceChildren();
  const query = search.value.trim().toLocaleLowerCase('de');
  const status = filterStatus.value;
  const visible = items.filter(item => {
    const matchesText = !query || [item.title, item.summary, item.author].join(' ').toLocaleLowerCase('de').includes(query);
    return matchesText && (status === 'all' || item.status === status);
  });

  if (!visible.length) {
    const empty = el('div', 'empty-state');
    empty.append(el('strong', '', 'Keine Meldungen gefunden.'), el('p', '', 'Passe Suche oder Filter an – oder erstelle eine neue Meldung.'));
    list.append(empty);
    return;
  }

  for (const item of visible) {
    const row = el('article', 'admin-news-item');
    const copy = el('div', 'admin-news-copy');
    const badges = el('div', 'news-badges');
    badges.append(el('span', `status-badge status-${item.status}`, item.status === 'draft' ? 'Entwurf' : 'Live'));
    if (item.featured) badges.append(el('span', 'status-badge featured-badge', 'Top-Meldung'));

    copy.append(
      badges,
      el('h3', '', item.title),
      el('p', '', item.summary || item.content.slice(0, 180)),
      el('small', '', `${item.author} · ${formatDate(item.publishedAt)}`)
    );

    const actions = el('div', 'item-actions');
    actions.append(
      actionButton('Vorschau', 'preview', item.id),
      actionButton('Bearbeiten', 'edit', item.id, 'button button-small button-primary'),
      actionButton('Löschen', 'delete', item.id, 'button button-small button-danger')
    );
    row.append(copy, actions);
    list.append(row);
  }
}

async function refresh() {
  list.replaceChildren(el('div', 'loading-state', 'Newsroom wird geladen …'));
  try {
    const [user, news] = await Promise.all([api('/api/admin/me'), api('/api/admin/news')]);
    document.querySelector('#user-name').textContent = user.name || user.email || 'Redaktion';
    items = news;
    renderStats();
    renderList();
  } catch (error) {
    list.replaceChildren(el('div', 'error-state', error.message));
  }
}

function updateCounter() {
  document.querySelector('#summary-count').textContent = `${form.elements.summary.value.length} / 500`;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = document.querySelector('#submit-label');
  submit.disabled = true;
  statusText.textContent = 'Speichert …';

  try {
    const payload = payloadFromForm();
    const url = editingId ? `/api/admin/news/${editingId}` : '/api/admin/news';
    const method = editingId ? 'PUT' : 'POST';
    await api(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    showToast(editingId ? 'Änderungen gespeichert.' : payload.status === 'draft' ? 'Entwurf gespeichert.' : 'Meldung veröffentlicht.');
    resetEditor();
    await refresh();
  } catch (error) {
    statusText.textContent = error.message;
    showToast(error.message, true);
  } finally {
    submit.disabled = false;
  }
});

list.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const item = items.find(candidate => candidate.id === button.dataset.id);
  if (!item) return;

  if (button.dataset.action === 'preview') openPreview(item);
  if (button.dataset.action === 'edit') editItem(item);
  if (button.dataset.action === 'delete') {
    if (!confirm(`„${item.title}“ wirklich löschen?`)) return;
    button.disabled = true;
    try {
      await api(`/api/admin/news/${item.id}`, { method: 'DELETE' });
      showToast('Meldung gelöscht.');
      if (editingId === item.id) resetEditor();
      await refresh();
    } catch (error) {
      button.disabled = false;
      showToast(error.message, true);
    }
  }
});

document.querySelector('#preview-form').addEventListener('click', () => {
  if (!form.reportValidity()) return;
  openPreview(payloadFromForm());
});
document.querySelector('#cancel-edit').addEventListener('click', resetEditor);
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});
form.elements.summary.addEventListener('input', updateCounter);
search.addEventListener('input', renderList);
filterStatus.addEventListener('change', renderList);

resetEditor();
refresh();
