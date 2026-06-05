const SHEET_ID = '1ZgGXVKcxBfCVpSdtWJeVoGQlgDhl_EwwXGNvcpApBNc';
const API_KEY  = 'AIzaSyAmCpZLQz9dRv2G9gUQeq5UUobEPRJBTHM';
const SCRIPT_MOM_URL = 'https://script.google.com/macros/s/AKfycbyTq9QVn5ZZMQRYwCHGJInym1N_pJXxCPKDqVzATmijowbCZIt0b5PMRPiUrV7Yx4sz/exec'; // <-- Incolla qui l'URL
// ── Configurazione Google Sheets ──────────────────────
const SHEET_ID = '1ZgGXVKcxBfCVpSdtWJeVoGQlgDhl_EwwXGNvcpApBNc';
const API_KEY  = 'AIzaSyAmCpZLQz9dRv2G9gUQeq5UUobEPRJBTHM';

const FOGLI = [
  'CRT // General Companies',
  'CRT // SpaceTech Companies',
  'CRT // Cubesat Companies',
  'CRT // RoverTech Companies'
];

const NOMI_BREVI = {
  'CRT // General Companies':   'General',
  'CRT // SpaceTech Companies': 'SpaceTech',
  'CRT // Cubesat Companies':   'CubeSat',
  'CRT // RoverTech Companies': 'RoverTech'
};

// ── Mappatura badge ────────────────────────────────────
const STATO_BADGE = {
  "Not Possible":       "badge-gray",
  "To contact":         "badge-blue",
  "Contacted":          "badge-amber",
  "Meeting done":       "badge-purple",
  "Relation going on":  "badge-teal",
  "Partnership signed": "badge-green",
  "Project going on":   "badge-green",
  "To re-contact":      "badge-coral",
  "Collaboration done": "badge-gray",
};

const FOGLIO_BADGE = {
  "General":   "badge-gray",
  "SpaceTech": "badge-blue",
  "CubeSat":   "badge-purple",
  "RoverTech": "badge-amber",
};

// ── Stato globale ──────────────────────────────────────
let aziende = [];
let aziendaSelezionata = null;
let datiVis = [];
let mom = [];

// ── Utilità ───────────────────────────────────────────
function badge(testo, classe) {
  return `<span class="badge ${classe}">${testo}</span>`;
}

function aggiornaStat() {
  document.getElementById('stat-tot').textContent = aziende.length;
  document.getElementById('stat-recontact').textContent =
    aziende.filter(a => a.stato === 'To re-contact').length;
  document.getElementById('stat-partner').textContent =
    aziende.filter(a => a.stato === 'Partnership signed' || a.stato === 'Project going on').length;
  document.getElementById('stat-tratt').textContent =
    aziende.filter(a => a.stato === 'Relation going on' || a.stato === 'Meeting done').length;
  document.getElementById('contatore').textContent =
    `${datiVis.length} aziend${datiVis.length === 1 ? 'a' : 'e'}`;
}

// ── Navigazione tra pagine ────────────────────────────
function mostraPagina(pagina) {
  document.getElementById('pagina-aziende').style.display    = 'none';
  document.getElementById('pagina-mom').style.display        = 'none';
  document.getElementById('pagina-statistiche').style.display = 'none';

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  if (pagina === 'aziende') {
    document.getElementById('pagina-aziende').style.display = 'flex';
    document.getElementById('pagina-aziende').style.flexDirection = 'column';
    document.getElementById('nav-aziende').classList.add('active');
  } else if (pagina === 'mom') {
    document.getElementById('pagina-mom').style.display = 'flex';
    document.getElementById('nav-mom').classList.add('active');
    renderMom();
  } else if (pagina === 'statistiche') {
    document.getElementById('pagina-statistiche').style.display = 'flex';
    document.getElementById('nav-statistiche').classList.add('active');
    renderStatistiche();
  }
}

// ── Caricamento dati da Google Sheets ─────────────────
async function leggiAziende() {
  mostraCaricamento(true);
  aziende = [];

  for (const foglio of FOGLI) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(foglio)}?key=${API_KEY}`;
    try {
      const risposta = await fetch(url);
      const dati = await risposta.json();
      if (!dati.values) continue;

      const righe = dati.values.slice(8);
      for (const riga of righe) {
        const nome = riga[3] || '';
        if (!nome.trim()) continue;
        aziende.push({
          nome:      nome,
          stato:     riga[1]  || '',
          data:      riga[2]  || '',
          contatto:  riga[4]  || '',
          tesi:      riga[5]  || '',
          seminari:  riga[6]  || '',
          posizione: riga[7]  || '',
          settore:   riga[8]  || '',
          email:     riga[10] || '',
          sito:      riga[11] || '',
          drive:     riga[12] || '',
          note:      riga[13] || '',
          mom:       riga[18] || '',
          foglio:    NOMI_BREVI[foglio] || foglio,
        });
      }
    } catch (err) {
      console.error(`Errore foglio ${foglio}:`, err);
    }
  }

  datiVis = [...aziende];
  mostraCaricamento(false);
  renderTabella();
}

function mostraCaricamento(attivo) {
  const tbody = document.getElementById('tbody');
  if (attivo) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:3rem; color:#888;">
          <i class="ti ti-loader" style="font-size:24px; display:block; margin-bottom:8px;"></i>
          Caricamento da Google Sheets...
        </td>
      </tr>`;
  }
}

// ── Tabella aziende ───────────────────────────────────
function renderTabella() {
  const tbody = document.getElementById('tbody');
  if (datiVis.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#888; padding:2rem;">Nessuna azienda trovata</td></tr>`;
    aggiornaStat();
    return;
  }
  tbody.innerHTML = datiVis.map((a, i) => `
    <tr class="${aziendaSelezionata === a ? 'selezionata' : ''}" data-idx="${i}">
      <td>${badge(a.stato, STATO_BADGE[a.stato] || 'badge-gray')}</td>
      <td style="font-weight:500;">${a.nome}</td>
      <td style="color:#555;">${a.contatto}</td>
      <td style="color:#555;">${a.settore}</td>
      <td>${badge(a.foglio, FOGLIO_BADGE[a.foglio] || 'badge-gray')}</td>
      <td style="color:#aaa; font-size:11px;">${a.data || '—'}</td>
    </tr>
  `).join('');

  tbody.querySelectorAll('tr').forEach((riga, i) => {
    riga.addEventListener('click', () => apriDettaglio(datiVis[i]));
  });

  aggiornaStat();
}

// ── Dettaglio azienda ─────────────────────────────────
function apriDettaglio(a) {
  aziendaSelezionata = a;

  document.getElementById('det-placeholder').style.display = 'none';
  document.getElementById('det-content').style.display = 'block';

  document.getElementById('det-nome').textContent = a.nome;
  document.getElementById('det-settore').textContent = a.settore;
  document.getElementById('det-stato-wrap').innerHTML =
    badge(a.stato, STATO_BADGE[a.stato] || 'badge-gray');
  document.getElementById('det-contatto').textContent = a.contatto || '—';

  const emailEl = document.getElementById('det-email');
  emailEl.textContent = a.email || '—';
  emailEl.href = a.email ? `mailto:${a.email}` : '#';

  const sitoEl = document.getElementById('det-sito');
  sitoEl.textContent = a.sito || '—';
  sitoEl.href = a.sito || '#';

  document.getElementById('det-tesi').textContent = a.tesi || '—';
  document.getElementById('det-seminari').textContent = a.seminari || '—';
  document.getElementById('det-note').textContent = a.note || '—';

  const driveEl = document.getElementById('det-drive');
  driveEl.textContent = a.drive ? 'Apri cartella Drive' : '—';
  driveEl.href = a.drive || '#';

  // ── Ricerca automatica file MOM su Google Drive ──
  const contenitoreMom = document.getElementById('det-mom-links');
  contenitoreMom.innerHTML = '<span style="font-size: 13px; color: #888;">Cerco verbali...</span>';

  fetch(`${SCRIPT_MOM_URL}?azienda=${encodeURIComponent(a.nome)}`)
    .then(response => response.json())
    .then(files => {
      if (files.error) {
        contenitoreMom.innerHTML = `<span style="font-size: 13px; color: #ff2a2a;">Errore: ${files.error}</span>`;
        return;
      }

      if (files.length > 0) {
        contenitoreMom.innerHTML = files.map(f => `
          <a href="${f.url}" target="_blank" style="display: flex; align-items: center; gap: 8px; background: #E6F1FB; padding: 8px 12px; border-radius: 6px; text-decoration: none; color: #0C447C; font-size: 12px; font-weight: 500; border: 1px solid #B6D4F0; transition: background 0.2s;">
            <i class="ti ti-file-word" style="font-size: 16px;"></i> ${f.nome}
          </a>
        `).join('');
      } else {
        contenitoreMom.innerHTML = '<span style="font-size: 13px; color: #888;">Nessun verbale trovato.</span>';
      }
    })
    .catch(err => {
      console.error(err);
      contenitoreMom.innerHTML = '<span style="font-size: 13px; color: #ff2a2a;">Errore di rete.</span>';
    });

function chiudiDettaglio() {
  aziendaSelezionata = null;
  document.getElementById('det-placeholder').style.display = 'flex';
  document.getElementById('det-content').style.display = 'none';
  renderTabella();
}

// ── Filtri ────────────────────────────────────────────
function filtra() {
  const q      = document.getElementById('search').value.toLowerCase();
  const foglio = document.getElementById('filtro-foglio').value;
  const stato  = document.getElementById('filtro-stato').value;

  datiVis = aziende.filter(a => {
    const matchQ = !q ||
      a.nome.toLowerCase().includes(q) ||
      a.contatto.toLowerCase().includes(q) ||
      a.settore.toLowerCase().includes(q);
    const matchF = !foglio || a.foglio === foglio;
    const matchS = !stato  || a.stato  === stato;
    return matchQ && matchF && matchS;
  });

  renderTabella();
}

// ── Pagina MOM ────────────────────────────────────────
function renderMom() {
  const area = document.getElementById('mom-area');
  if (mom.length === 0) {
    area.innerHTML = `
      <div class="mom-empty">
        <i class="ti ti-file-off"></i>
        <p>Nessun MOM ancora.<br>Clicca "Nuovo MOM" per iniziare.</p>
      </div>`;
    return;
  }

  area.innerHTML = mom.slice().reverse().map((m, i) => `
    <div class="mom-card">
      <div class="mom-card-header">
        <div>
          <div class="mom-card-titolo">${m.titolo}</div>
          <div class="mom-card-meta">
            ${m.data ? `📅 ${m.data}` : ''}
            ${m.azienda ? ` · 🏢 ${m.azienda}` : ''}
            ${m.partecipanti ? ` · 👥 ${m.partecipanti}` : ''}
          </div>
        </div>
        <button class="btn-icon" onclick="eliminaMom(${mom.length - 1 - i})">
          <i class="ti ti-trash"></i>
        </button>
      </div>
      <div class="mom-card-body">
        ${m.punti ? `
          <div>
            <div class="mom-sezione-label">Punti discussi</div>
            <div class="mom-sezione-testo">${m.punti}</div>
          </div>` : ''}
        ${m.azioni ? `
          <div>
            <div class="mom-sezione-label">Azioni da fare</div>
            <div class="mom-sezione-testo">${m.azioni}</div>
          </div>` : ''}
        ${m.note ? `
          <div>
            <div class="mom-sezione-label">Note</div>
            <div class="mom-sezione-testo">${m.note}</div>
          </div>` : ''}
      </div>
    </div>
  `).join('');
}

function eliminaMom(idx) {
  if (confirm('Vuoi eliminare questo MOM?')) {
    mom.splice(idx, 1);
    renderMom();
  }
}

// ── Pagina Statistiche ────────────────────────────────
function renderStatistiche() {
  const area = document.getElementById('stats-area');

  // Conta per stato
  const perStato = {};
  aziende.forEach(a => {
    perStato[a.stato] = (perStato[a.stato] || 0) + 1;
  });

  // Conta per foglio
  const perFoglio = {};
  aziende.forEach(a => {
    perFoglio[a.foglio] = (perFoglio[a.foglio] || 0) + 1;
  });

  // Conta per settore (top 8)
  const perSettore = {};
  aziende.forEach(a => {
    if (a.settore) perSettore[a.settore] = (perSettore[a.settore] || 0) + 1;
  });
  const topSettori = Object.entries(perSettore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const maxStato   = Math.max(...Object.values(perStato), 1);
  const maxFoglio  = Math.max(...Object.values(perFoglio), 1);
  const maxSettore = Math.max(...topSettori.map(s => s[1]), 1);

  function barreHtml(dati, max, colori) {
    return Object.entries(dati).map(([label, count]) => `
      <div class="bar-row">
        <div class="bar-label">${label}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.round(count / max * 100)}%; background:${colori || '#0a0a0a'};"></div>
        </div>
        <div class="bar-count">${count}</div>
      </div>
    `).join('');
  }

  area.innerHTML = `
    <div class="stats-chart-card">
      <h3>Aziende per stato</h3>
      ${barreHtml(perStato, maxStato)}
    </div>
    <div class="stats-chart-card">
      <h3>Aziende per foglio</h3>
      ${barreHtml(perFoglio, maxFoglio, '#185FA5')}
    </div>
    <div class="stats-chart-card" style="grid-column: 1 / -1;">
      <h3>Top settori</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 2rem;">
        ${topSettori.map(([label, count]) => `
          <div class="bar-row">
            <div class="bar-label">${label}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.round(count / maxSettore * 100)}%; background:#854F0B;"></div>
            </div>
            <div class="bar-count">${count}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── Event listeners — navigazione ─────────────────────
document.getElementById('nav-aziende').addEventListener('click', e => {
  e.preventDefault();
  mostraPagina('aziende');
});

document.getElementById('nav-mom').addEventListener('click', e => {
  e.preventDefault();
  mostraPagina('mom');
});

document.getElementById('nav-statistiche').addEventListener('click', e => {
  e.preventDefault();
  mostraPagina('statistiche');
});

// ── Event listeners — aziende ─────────────────────────
document.getElementById('search').addEventListener('input', filtra);
document.getElementById('filtro-foglio').addEventListener('change', filtra);
document.getElementById('filtro-stato').addEventListener('change', filtra);
document.getElementById('btn-chiudi').addEventListener('click', chiudiDettaglio);

document.getElementById('btn-salva').addEventListener('click', () => {
  if (!aziendaSelezionata) return;
  const nuovoStato = document.getElementById('nuovo-stato').value;
  aziendaSelezionata.stato = nuovoStato;
  apriDettaglio(aziendaSelezionata);
  alert(`Stato aggiornato in "${nuovoStato}"\n\nProssimo step: salvataggio automatico su Google Sheets.`);
});

// ── Event listeners — modal nuova azienda ─────────────
document.getElementById('btn-nuova').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.add('aperto');
});

document.getElementById('btn-chiudi-modal').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.remove('aperto');
});

document.getElementById('btn-annulla').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.remove('aperto');
});

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) {
    document.getElementById('modal-overlay').classList.remove('aperto');
  }
});

document.getElementById('btn-salva-nuova').addEventListener('click', () => {
  const nome = document.getElementById('f-nome').value.trim();
  if (!nome) {
    alert('Il nome azienda è obbligatorio!');
    return;
  }

  const nuova = {
    nome:      nome,
    stato:     document.getElementById('f-stato').value,
    foglio:    document.getElementById('f-foglio').value,
    contatto:  document.getElementById('f-contatto').value,
    posizione: document.getElementById('f-posizione').value,
    email:     document.getElementById('f-email').value,
    settore:   document.getElementById('f-settore').value,
    sito:      document.getElementById('f-sito').value,
    note:      document.getElementById('f-note').value,
    tesi:      document.getElementById('f-tesi').value,
    seminari:  document.getElementById('f-seminari').value,
    data:      new Date().toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit', year:'2-digit'}),
    drive:     '',
    mom:       ''
  };

  aziende.unshift(nuova);
  datiVis = [...aziende];
  renderTabella();
  aggiornaStat();

  document.getElementById('modal-overlay').classList.remove('aperto');
  ['f-nome','f-contatto','f-posizione','f-email','f-settore','f-sito','f-note'].forEach(id => {
    document.getElementById(id).value = '';
  });

  alert(`Azienda "${nome}" aggiunta!`);
});

// ── Event listeners — modal nuovo MOM ─────────────────
document.getElementById('btn-nuovo-mom').addEventListener('click', () => {
  const oggi = new Date().toISOString().split('T')[0];
  document.getElementById('m-data').value = oggi;
  document.getElementById('modal-mom').classList.add('aperto');
});

document.getElementById('btn-chiudi-mom').addEventListener('click', () => {
  document.getElementById('modal-mom').classList.remove('aperto');
});

document.getElementById('btn-annulla-mom').addEventListener('click', () => {
  document.getElementById('modal-mom').classList.remove('aperto');
});

document.getElementById('modal-mom').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-mom')) {
    document.getElementById('modal-mom').classList.remove('aperto');
  }
});

document.getElementById('btn-salva-mom').addEventListener('click', () => {
  const titolo = document.getElementById('m-titolo').value.trim();
  if (!titolo) {
    alert('Il titolo è obbligatorio!');
    return;
  }

  const nuovoMom = {
    titolo:        titolo,
    data:          document.getElementById('m-data').value,
    partecipanti:  document.getElementById('m-partecipanti').value,
    azienda:       document.getElementById('m-azienda').value,
    punti:         document.getElementById('m-punti').value,
    azioni:        document.getElementById('m-azioni').value,
    note:          document.getElementById('m-note').value,
  };

  mom.push(nuovoMom);
  document.getElementById('modal-mom').classList.remove('aperto');

  ['m-titolo','m-partecipanti','m-azienda','m-punti','m-azioni','m-note'].forEach(id => {
    document.getElementById(id).value = '';
  });

  renderMom();
  alert(`MOM "${titolo}" salvato!`);
});

// ── Avvio e Sistema di Login ───────────────────────────
const PASSWORD_SEGRETA = "polispace2026"; // <-- Cambia questa password con quella che preferisci!

document.getElementById('btn-login').addEventListener('click', () => {
  const passInserita = document.getElementById('password-input').value;
  
  if (passInserita === PASSWORD_SEGRETA) {
    // Se la password è giusta, nascondi la schermata e carica i dati
    document.getElementById('login-overlay').style.display = 'none';
    leggiAziende(); 
  } else {
    // Se è sbagliata, mostra l'errore
    document.getElementById('login-error').style.display = 'block';
  }
});

// Permette di premere "Invio" sulla tastiera per fare il login
document.getElementById('password-input').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    document.getElementById('btn-login').click();
  }
});