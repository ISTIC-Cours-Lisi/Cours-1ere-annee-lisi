// ================= CONFIG =================
const SUPABASE_URL = 'https://poolqfoughnrptasoidz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ENiMDd9yp4PjAlfU9xte_A__Tjd4Ui_';
const MAX_MB = 40;

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const SECTIONS = {
  cours: { gridId: 'grid-cours', fallback: 's1', kinds: ['pdf', 'zip', 'link'], title: 'Ajouter cours / TD / Examen' },
  tp:    { gridId: 'grid-tp',    fallback: 's3', kinds: ['pdf', 'zip', 'link'], title: 'Ajouter un TP' },
  video: { gridId: 'grid-video', fallback: 's2', kinds: ['youtube', 'link'],    title: 'Ajouter une vidéo YouTube' }
};
const KIND_LABEL = { pdf: 'PDF', zip: 'Dossier .zip', link: 'Lien en ligne', youtube: 'Lien YouTube' };

function getPage() {
  return document.body.dataset.page || 'home';
}

function getGrid(cfg) {
  return document.getElementById(cfg.gridId) || document.querySelector('.grid.' + cfg.fallback);
}

// ================= TOOLTIP (old + new cards) =================
document.addEventListener('DOMContentLoaded', () => {
  const tooltip = document.createElement('div');
  tooltip.className = 'js-tooltip';
  document.body.appendChild(tooltip);

  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-tooltip]');
    if (!el) return;
    tooltip.textContent = el.getAttribute('data-tooltip');
    tooltip.classList.add('visible');
  });
  document.addEventListener('mousemove', e => {
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top = (e.clientY + 14) + 'px';
  });
  document.addEventListener('mouseout', e => {
    const el = e.target.closest('[data-tooltip]');
    if (el && !el.contains(e.relatedTarget)) tooltip.classList.remove('visible');
  });

  initAddBlocks();
  loadItems();
});

// ================= CARDS =================
function isSafeUrl(u) {
  try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; }
  catch { return false; }
}

function buildIcon(item) {
  const icon = document.createElement('div');
  icon.className = 'icon';
  if (item.kind === 'youtube') {
    const img = document.createElement('img');
    img.src = 'logo you.jpg'; img.alt = 'youtube';
    icon.appendChild(img);
  } else if (item.kind === 'pdf' && item.section !== 'tp') {
    const img = document.createElement('img');
    img.src = 'logo pdf.jpg'; img.alt = 'pdf';
    icon.appendChild(img);
  } else {
    icon.textContent = item.kind === 'zip' ? '📦' : item.kind === 'link' ? '🔗' : '🖥️';
  }
  return icon;
}

function buildCard(item) {
  const a = document.createElement('a');
  a.className = 'card user-card';
  a.href = item.url;
  a.target = '_blank';
  a.rel = 'noopener';
  const defaultTip = {
    pdf: 'fichier pdf ', zip: 'dossier zip ', link: 'lien en ligne ', youtube: 'video youtube explique '
  }[item.kind] + item.title;
  a.setAttribute('data-tooltip', item.tooltip || defaultTip);

  const h3 = document.createElement('h3');
  h3.textContent = item.title;
  const p = document.createElement('p');

  a.append(buildIcon(item), h3, p);
  return a;
}

async function loadItems() {
  const { data, error } = await db.from('items').select('*').eq('page', getPage()).order('created_at', { ascending: true });
  if (error) { console.error(error); return; }

  document.querySelectorAll('.user-card').forEach(c => c.remove());
  data.forEach(item => {
    const cfg = SECTIONS[item.section];
    if (!cfg || !isSafeUrl(item.url)) return;
    const grid = getGrid(cfg);
    if (!grid) return;
    grid.insertBefore(buildCard(item), grid.querySelector('.add-card'));
  });
}

// ================= "➕ AJOUTER" BLOCKS =================
function initAddBlocks() {
  Object.values(SECTIONS).forEach(cfg => {
    const grid = getGrid(cfg);
    if (!grid) return;
    if (grid.querySelector('.add-card')) return;
    const add = document.createElement('a');
    add.className = 'card add-card';
    add.setAttribute('role', 'button');
    add.tabIndex = 0;
    add.style.cursor = 'pointer';
    add.setAttribute('data-tooltip', 'Ajouter un nouveau contenu visible par tous');
    add.innerHTML = '<div class="icon">➕</div><h3>Ajouter</h3><p></p>';
    grid.appendChild(add);
  });
}

// One click handler for every ➕ block
document.addEventListener('click', e => {
  const add = e.target.closest('.add-card');
  if (!add) return;
  e.preventDefault();
  const grid = add.closest('.grid');
  let section = 'cours';
  if (grid.id === 'grid-tp' || grid.classList.contains('s3')) section = 'tp';
  if (grid.id === 'grid-video' || grid.classList.contains('s2')) section = 'video';
  openModal(section);
});

function makeRow(section) {
  const row = document.createElement('div');
  row.className = 'add-row';
  const kinds = SECTIONS[section].kinds;
  row.innerHTML = `
    <input class="f-title" maxlength="80" placeholder="Nom (ex: TD3 correction)">
    <input class="f-tip" maxlength="150" placeholder="Description (info-bulle)">
    <select class="f-kind">
      ${kinds.map(k => `<option value="${k}">${KIND_LABEL[k]}</option>`).join('')}
    </select>
    <input class="f-file" type="file">
    <input class="f-url" type="url" placeholder="https://...">
    <button type="button" class="f-del" title="Retirer">✕</button>`;

  const kind = row.querySelector('.f-kind');
  const file = row.querySelector('.f-file');
  const url = row.querySelector('.f-url');
  const sync = () => {
    const isFile = kind.value === 'pdf' || kind.value === 'zip';
    file.hidden = !isFile;
    url.hidden = isFile;
    file.accept = kind.value === 'pdf' ? '.pdf,application/pdf' : '.zip';
  };
  kind.addEventListener('change', sync);
  sync();
  row.querySelector('.f-del').addEventListener('click', () => {
    if (row.parentElement.children.length > 1) row.remove();
  });
  return row;
}

function openModal(section) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2></h2>
      <p class="modal-hint">Tu peux ajouter plusieurs éléments d'un coup
        (ex : TD + correction + dossier .zip). Tout le monde les verra.</p>
      <div class="rows"></div>
      <button type="button" class="btn-more">➕ Ajouter un autre élément</button>
      <p class="modal-msg"></p>
      <div class="modal-actions">
        <button type="button" class="btn-cancel">Annuler</button>
        <button type="button" class="btn-save">Publier</button>
      </div>
    </div>`;
  overlay.querySelector('h2').textContent = SECTIONS[section].title;
  const rows = overlay.querySelector('.rows');
  const msg = overlay.querySelector('.modal-msg');
  rows.appendChild(makeRow(section));

  overlay.querySelector('.btn-more').onclick = () => rows.appendChild(makeRow(section));
  overlay.querySelector('.btn-cancel').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('.btn-save').onclick = async (ev) => {
    const btn = ev.target;
    msg.textContent = '';
    try {
      const entries = [...rows.children].map(r => ({
        title: r.querySelector('.f-title').value.trim(),
        tooltip: r.querySelector('.f-tip').value.trim(),
        kind: r.querySelector('.f-kind').value,
        file: r.querySelector('.f-file').files[0],
        url: r.querySelector('.f-url').value.trim()
      }));
      for (const en of entries) {
        if (!en.title) throw new Error('Donne un nom à chaque élément.');
        if (en.kind === 'pdf' || en.kind === 'zip') {
          if (!en.file) throw new Error(`Choisis un fichier pour « ${en.title} ».`);
          if (!en.file.name.toLowerCase().endsWith('.' + en.kind))
            throw new Error(`« ${en.title} » doit être un fichier .${en.kind}.`);
          if (en.file.size > MAX_MB * 1024 * 1024)
            throw new Error(`« ${en.title} » dépasse ${MAX_MB} Mo.`);
        } else if (!isSafeUrl(en.url)) {
          throw new Error(`Lien invalide pour « ${en.title} » (doit commencer par https://).`);
        }
      }

      btn.disabled = true;
      msg.textContent = 'Envoi en cours…';

      const records = [];
      for (const en of entries) {
        let finalUrl = en.url;
        if (en.file) {
          const path = `${section}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${en.kind}`;
          const { error } = await db.storage.from('files').upload(path, en.file);
          if (error) throw error;
          finalUrl = db.storage.from('files').getPublicUrl(path).data.publicUrl;
        }
        records.push({ section, page: getPage(), title: en.title, tooltip: en.tooltip || null, kind: en.kind, url: finalUrl });
      }

      const { error } = await db.from('items').insert(records);
      if (error) throw error;

      overlay.remove();
      loadItems();
    } catch (err) {
      msg.textContent = '❌ ' + (err.message || err);
      btn.disabled = false;
    }
  };

  document.body.appendChild(overlay);
}