// ── Configurazione API e URL ──────────────────────────
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyeiw_mnO4TQbAWLh_KKsqJN5LcmS_wxA0ng9_CY0q7c929xc8pIJfyeN2ynLJvZ8U_dg/exec';
const SCRIPT_MOM_URL = 'https://script.google.com/macros/s/AKfycbyTq9QVn5ZZMQRYwCHGJInym1N_pJXxCPKDqVzATmijowbCZIt0b5PMRPiUrV7Yx4sz/exec';
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

// NUOVO: Carica i MOM dal foglio
async function leggiMomDalFoglio() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/MOM?key=${API_KEY}`;
  try {
    const risposta = await fetch(url);
    const dati = await risposta.json();
    mom = [];
    if (dati.values && dati.values.length > 1) {
      const righe = dati.values.slice(1); // Salta le intestazioni
      for (const riga of righe) {
        mom.push({
          data:         riga[0] || '',
          titolo:       riga[1] || '',
          partecipanti: riga[2] || '',
          azienda:      riga[3] || '',
          punti:        riga[4] || '',
          azioni:       riga[5] || '',
          note:         riga[6] || ''
        });
      }
    }
  } catch (err) {
    console.error('Errore caricamento MOM:', err);
  }
}

async function leggiAziende() {
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

  // NUOVO: Ricerca intelligente MOM nel testo
  const contenitoreMom = document.getElementById('det-mom-links');
  
  const nomeCompleto = a.nome.toLowerCase().trim();
  const primaParola = nomeCompleto.split(' ')[0]; 

  const momTrovati = mom.map((m, i) => { return {m: m, idx: i} }).filter(obj => {
    const campoAziendaMom = (obj.m.azienda || "").toLowerCase().trim();
    const testoCompleto = `${obj.m.titolo} ${obj.m.punti} ${obj.m.azioni} ${obj.m.note}`.toLowerCase();
    
    const matchCompleto = campoAziendaMom.includes(nomeCompleto) || testoCompleto.includes(nomeCompleto);
    const matchParziale = primaParola.length >= 3 && (campoAziendaMom.includes(primaParola) || testoCompleto.includes(primaParola));
    
    return matchCompleto || matchParziale;
  });

  if (momTrovati.length > 0) {
    contenitoreMom.innerHTML = momTrovati.map(obj => `
      <div style="background: #1e1e1e; padding: 10px; border-radius: 8px; border: 1px solid #333; cursor: pointer; transition: background 0.2s;" onclick="apriDettaglioMom(${obj.idx})" onmouseover="this.style.background='#2a2a2a'" onmouseout="this.style.background='#1e1e1e'">
        <div style="font-size: 12px; font-weight: 600; color: #fff;"><i class="ti ti-file-text" style="color: #185FA5; margin-right: 4px;"></i>${obj.m.titolo}</div>
        <div style="font-size: 11px; color: #888; margin-top: 4px; padding-left: 18px;">📅 ${obj.m.data || 'Senza data'}</div>
      </div>
    `).join('');
  } else {
    contenitoreMom.innerHTML = '<span style="font-size: 13px; color: #888;">Nessun verbale trovato.</span>';
  }
} // <-- Parentesi che chiude apriDettaglio!

// NUOVO: Funzione per leggere il singolo MOM in popup
function apriDettaglioMom(idx) {
  const m = mom[idx];
  const modalHtml = `
    <div id="modal-leggi-mom" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
      <div style="background: #111; color: white; width: 600px; max-width: 90%; max-height: 80vh; overflow-y: auto; padding: 30px; border-radius: 12px; border: 1px solid #333; position: relative;" onclick="event.stopPropagation()">
        <button onclick="document.getElementById('modal-leggi-mom').remove()" style="position: absolute; top: 15px; right: 20px; background: none; border: none; color: #888; cursor: pointer; font-size: 28px;">&times;</button>
        <h2 style="margin-top: 0; color: #fff; margin-bottom: 8px;">${m.titolo}</h2>
        <div style="font-size: 13px; color: #aaa; margin-bottom: 24px; border-bottom: 1px solid #333; padding-bottom: 12px;">
          📅 ${m.data} &nbsp;|&nbsp; 🏢 ${m.azienda} &nbsp;|&nbsp; 👥 ${m.partecipanti}
        </div>
        ${m.punti ? `<div style="color:#185FA5; font-size:12px; font-weight:bold; text-transform:uppercase; margin-bottom:4px;">Punti discussi</div><p style="font-size: 14px; color: #ccc; margin-top:0; margin-bottom: 20px; white-space: pre-wrap;">${m.punti}</p>` : ''}
        ${m.azioni ? `<div style="color:#185FA5; font-size:12px; font-weight:bold; text-transform:uppercase; margin-bottom:4px;">Azioni da fare</div><p style="font-size: 14px; color: #ccc; margin-top:0; margin-bottom: 20px; white-space: pre-wrap;">${m.azioni}</p>` : ''}
        ${m.note ? `<div style="color:#185FA5; font-size:12px; font-weight:bold; text-transform:uppercase; margin-bottom:4px;">Note</div><p style="font-size: 14px; color: #ccc; margin-top:0; margin-bottom: 20px; white-space: pre-wrap;">${m.note}</p>` : ''}
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

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
  if (confirm('Vuoi eliminare questo MOM? Attenzione: verrà eliminato solo dal sito, non da Google Sheets.')) {
    mom.splice(idx, 1);
    renderMom();
  }
}

// ── Pagina Statistiche ────────────────────────────────
function renderStatistiche() {
  const area = document.getElementById('stats-area');

  const perStato = {};
  aziende.forEach(a => {
    perStato[a.stato] = (perStato[a.stato] || 0) + 1;
  });

  const perFoglio = {};
  aziende.forEach(a => {
    perFoglio[a.foglio] = (perFoglio[a.foglio] || 0) + 1;
  });

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

// SALVATAGGIO DEI MOM SU GOOGLE SHEETS
document.getElementById('btn-salva-mom').addEventListener('click', async () => {
  const titolo = document.getElementById('m-titolo').value.trim();
  if (!titolo) {
    alert('Il titolo è obbligatorio!');
    return;
  }

  // Prepariamo il bottone mostrando che sta caricando
  const bottoneSalva = document.getElementById('btn-salva-mom');
  const testoOriginale = bottoneSalva.innerHTML;
  bottoneSalva.innerHTML = '<i class="ti ti-loader" style="display:inline-block; animation:spin 1s linear infinite;"></i> Salvataggio...';
  bottoneSalva.disabled = true;

  // Raccogliamo i dati dal form
  const nuovoMom = {
    titolo:        titolo,
    data:          document.getElementById('m-data').value,
    partecipanti:  document.getElementById('m-partecipanti').value,
    azienda:       document.getElementById('m-azienda').value,
    punti:         document.getElementById('m-punti').value,
    azioni:        document.getElementById('m-azioni').value,
    note:          document.getElementById('m-note').value,
  };

  try {
    // Inviamo i dati al nostro script Google tramite POST
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        azione: 'salvaMom',
        dati: nuovoMom
      })
    });

    const result = await response.json();

    if (result.success) {
      // Se è andato tutto bene, lo aggiungiamo alla lista in memoria
      mom.unshift(nuovoMom); 
      
      // Chiudiamo il form e lo svuotiamo
      document.getElementById('modal-mom').classList.remove('aperto');
      ['m-titolo','m-partecipanti','m-azienda','m-punti','m-azioni','m-note'].forEach(id => {
        document.getElementById(id).value = '';
      });

      renderMom();
      
      // Se l'azienda selezionata è aperta, aggiorna la sua scheda per mostrare subito il nuovo MOM
      if (aziendaSelezionata) apriDettaglio(aziendaSelezionata);
      
      alert(`MOM "${titolo}" salvato correttamente su Google Sheets!`);
    } else {
      alert(`Errore durante il salvataggio: ${result.error}`);
    }
  } catch (error) {
    alert("Errore di connessione. Riprova.");
    console.error(error);
  } finally {
    // Rimettiamo il bottone allo stato originale
    bottoneSalva.innerHTML = testoOriginale;
    bottoneSalva.disabled = false;
  }
});

// NUOVO: Login asincrono che carica sia le Aziende che i MOM
const PASSWORD_SEGRETA = "polispace2026"; 

document.getElementById('btn-login').addEventListener('click', async () => {
  const passInserita = document.getElementById('password-input').value;
  
  if (passInserita === PASSWORD_SEGRETA) {
    document.getElementById('login-overlay').style.display = 'none';
    
    mostraCaricamento(true);
    // Aspetta di caricare prima i verbali e poi le aziende
    await leggiMomDalFoglio();
    await leggiAziende(); 
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
});

document.getElementById('password-input').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    document.getElementById('btn-login').click();
  }
});