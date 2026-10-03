// For page.html ONLY (do not load scripte.js on this page)
const SUPABASE_URL = 'https://poolqfoughnrptasoidz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ENiMDd9yp4PjAlfU9xte_A__Tjd4Ui_';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const EMOJI_RE = /\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u20E3/u;

// returns the first emoji found in what the user typed (or null)
function firstEmoji(text) {
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const hit = [...seg.segment(text)].find(s => EMOJI_RE.test(s.segment));
  return hit ? hit.segment : null;
}

// ---------- cards ----------
function cardFor(m) {
  const a = document.createElement('a');
  a.className = 'card';
  a.href = 'matiere.html?id=' + encodeURIComponent(m.id);
  const icon = document.createElement('div'); icon.className = 'icon'; icon.textContent = m.emoji;
  const h3 = document.createElement('h3');   h3.textContent = m.titre;
  const p = document.createElement('p');     p.textContent = m.description || '';
  a.append(icon, h3, p);
  return a;
}

function addCard(sem) {
  const a = document.createElement('a');
  a.className = 'card add-card';
  a.setAttribute('role', 'button');
  a.tabIndex = 0;
  a.innerHTML = '<div class="icon">➕</div><h3>Ajouter</h3><p>Ajouter une matière à ce semestre.</p>';
  const open = e => { e.preventDefault(); openModal(sem); };
  a.addEventListener('click', open);
  a.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(e); });
  return a;
}

// ---------- popup ----------
function openModal(sem) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>Ajouter une matière (Semestre ${sem})</h2>
      <p class="modal-hint">Écris le titre, une description, tape un emoji avec ton clavier (il sera le logo de la matière)
        et dis si la matière a un TP.</p>
      <div class="add-row">
        <input class="f-title f-wide" maxlength="40" placeholder="Titre de la matière (ex: Base de données)">
        <input class="f-desc f-wide" maxlength="120" placeholder="Description (ex: Cours et exercices de base de données)">
        <input class="f-emoji f-wide" placeholder="Emoji logo (ex: 📘)  — Windows : touche Win + ;">
        <div class="tp-choice">
          Cette matière a un TP ?
          <label><input type="radio" name="has-tp" value="1"> Oui</label>
          <label><input type="radio" name="has-tp" value="0"> Non</label>
        </div>
      </div>
      <p class="modal-msg"></p>
      <div class="modal-actions">
        <button type="button" class="btn-cancel">Annuler</button>
        <button type="button" class="btn-save">Ajouter</button>
      </div>
    </div>`;

  const msg = overlay.querySelector('.modal-msg');
  overlay.querySelector('.btn-cancel').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('.btn-save').onclick = async ev => {
    const btn = ev.target;
    msg.textContent = '';
    const titre = overlay.querySelector('.f-title').value.trim();
    const description = overlay.querySelector('.f-desc').value.trim();
    const emoji = firstEmoji(overlay.querySelector('.f-emoji').value);
    const tp = overlay.querySelector('input[name="has-tp"]:checked');

    if (!titre) { msg.textContent = 'Écris le titre de la matière.'; return; }
    if (!description) { msg.textContent = 'Écris une courte description.'; return; }
    if (!emoji) { msg.textContent = 'Écris un emoji avec ton clavier (ex: 📘).'; return; }
    if (!tp)    { msg.textContent = 'Coche Oui ou Non pour le TP.'; return; }

    btn.disabled = true;
    const { error } = await sb.from('matieres')
      .insert({ titre, description, emoji, semestre: sem, has_tp: tp.value === '1' });
    btn.disabled = false;
    if (error) { msg.textContent = '❌ ' + error.message; return; }

    overlay.remove();
    alert('✅ Matière envoyée ! Elle sera visible après validation par l\'administrateur.');
  };

  document.body.appendChild(overlay);
  overlay.querySelector('.f-title').focus();
}

// ---------- init ----------
document.addEventListener('DOMContentLoaded', async () => {
  const { data, error } = await sb.from('matieres').select('*').order('created_at');
  if (error) console.error(error);
  [1, 2].forEach(sem => {
    const grid = document.querySelector('.grid.s' + sem);
    if (!grid) return;
    (data || []).filter(m => m.semestre === sem).forEach(m => grid.appendChild(cardFor(m)));
    grid.appendChild(addCard(sem));
  });
});