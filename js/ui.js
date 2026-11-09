/* Interfaz: íconos, ventanas, avisos, navegación. */
'use strict';

const ICONOS = {
  inicio: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  clases: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  alumnos: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/><path d="M16 3.5a4 4 0 010 9M22 21c0-3-2-5.5-4.5-6.5"/>',
  caja: '<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="3"/><path d="M6 9.5v6M18 9.5v6"/>',
  progreso: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  mas: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', buscar: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', lapiz: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', wa: '<path d="M4 20l1.4-4A8 8 0 1112 20a8 8 0 01-4-1.1L4 20z"/><path d="M9 9.5c.5 2.5 2.5 4.5 5 5l1.2-1.2 2 1-.5 1.5c-3.5.5-8.5-4.5-8-8L10.2 7.3l1 2-1.2 1.2"/>',
  trofeo: '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4z"/><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/>',
  test: '<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 001.3 2h11.4A1.5 1.5 0 0019 19l-5-10V3"/>',
  rutina: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  alerta: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>', copia: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>',
  subir: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M4 7V4h16v3"/>', candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  camara: '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/>', reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  imprimir: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2"/><rect x="6" y="14" width="12" height="7"/>', compartir: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  torta: '<path d="M4 21h16v-8H4zM4 16h16M12 13V9M12 6a1.5 1.5 0 001.5-1.5C13.5 3.5 12 2 12 2s-1.5 1.5-1.5 2.5A1.5 1.5 0 0012 6z"/>',
  flecha: '<path d="M9 6l6 6-6 6"/>',
  camion: '<path d="M2 6h11v10H2zM13 10h4l3 3v3h-7z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  gota: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>', mapa: '<path d="M12 21s-6-5.5-6-11a6 6 0 0112 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>', stock: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  agenda: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 13h3v3H8z"/>',
  hoja: '<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19l7-7"/>', pack: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13M12 8c-2-4-6-4-6-1.5S10 8 12 8zm0 0c2-4 6-4 6-1.5S14 8 12 8z"/>',
  salud: '<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z"/><path d="M12 9v5M9.5 11.5h5"/>', foto: '<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
  nota: '<path d="M5 3h10l4 4v14H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>',
  informe: '<path d="M5 3h10l4 4v14H5z"/><path d="M9 13v4M12 10v7M15 15v2"/>', subir2: '<path d="M8 15l4-4 4 4"/>', bajar: '<path d="M8 9l4 4 4-4"/>', usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',
};
const ico = n => `<svg class="i" viewBox="0 0 24 24">${ICONOS[n] || ''}</svg>`;

/* ---------- avisos ---------- */
let _tt;
function toast(m, mal) { if (mal) $$('[data-ocupado]').forEach(x => delete x.dataset.ocupado); const t = $('#toast'); t.textContent = m; t.className = 'act' + (mal ? ' mal' : ''); clearTimeout(_tt); _tt = setTimeout(() => (t.className = ''), mal ? 4200 : 2400); }
const fallo = e => { console.error(e); toast(e && e.message ? e.message : String(e), true); };

/* ---------- ventanas ---------- */
function modal(titulo, cuerpo, pie = '', clase = '') {
  const capa = $('#capa');
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${clase}" role="dialog"><div class="mh"><h3>${titulo}</h3><button class="ib" data-cerrar aria-label="Cerrar">${ico('x')}</button></div>
    <div class="mb">${cuerpo}</div>${pie ? `<div class="mf">${pie}</div>` : ''}</div>`;
  capa.appendChild(bg); capa.classList.add('act');
  const m = bg.querySelector('.modal');
  m.cerrar = () => { bg.remove(); if (!capa.children.length) capa.classList.remove('act'); };
  bg.addEventListener('click', e => { if (e.target.closest('[data-cerrar]')) m.cerrar(); });
  setTimeout(() => { const f = m.querySelector('[autofocus]'); if (f) f.focus(); }, 60);
  return m;
}
function confirmar(texto, si = 'Sí', peligro) {
  return new Promise(ok => {
    const m = modal('Confirmar', `<p style="margin:0;font-size:16px">${texto}</p>`, `<button class="btn" data-no>Cancelar</button><button class="btn ${peligro ? 'rojo' : 'pri'}" data-si>${si}</button>`);
    m.querySelector('[data-si]').onclick = () => { m.cerrar(); ok(true); };
    m.querySelector('[data-no]').onclick = () => { m.cerrar(); ok(false); };
    m.querySelector('[data-cerrar]').addEventListener('click', () => ok(false));
  });
}
function pedirTexto(titulo, etiqueta, valor = '', tipo = 'text') {
  return new Promise(ok => {
    const m = modal(titulo, `<label>${etiqueta}</label><input id="ptV" type="${tipo}" value="${esc(valor)}" autofocus>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" id="ptOk">Aceptar</button>`);
    const fin = () => { const v = $('#ptV', m).value; m.cerrar(); ok(v); };
    $('#ptOk', m).onclick = fin; $('#ptV', m).onkeydown = e => { if (e.key === 'Enter') fin(); };
    m.querySelector('[data-cerrar]').addEventListener('click', () => ok(null));
  });
}

/* ---------- formularios ---------- */
const campoMonto = (attrs, v) => `<input ${attrs} class="monto" inputmode="decimal" autocomplete="off" value="${v === '' || v == null || (typeof v === 'string' && isNaN(aNum(v))) ? '' : esc(fmtIn(aNum(v)))}">`;
/* al tocar un importe se selecciona todo: lo que escribís reemplaza el valor (los puntos de miles se leen bien igual) */
document.addEventListener('focusin', e => { const i = e.target; if (i.classList?.contains('monto') && i.value.trim()) setTimeout(() => { try { if (document.activeElement === i && i.selectionStart === i.selectionEnd) i.select(); } catch (er) { /* */ } }, 0); });
document.addEventListener('focusout', e => { const i = e.target; if (i.classList?.contains('monto') && i.value.trim()) { const x = aNum(i.value); if (!isNaN(x)) i.value = fmtIn(x); } });
document.addEventListener('input', e => {
  const i = e.target; if (!i.classList?.contains('monto')) return;
  let eco = i.nextElementSibling?.classList.contains('monto-eco') ? i.nextElementSibling : null;
  if (!eco) { eco = document.createElement('div'); eco.className = 'monto-eco'; i.insertAdjacentElement('afterend', eco); }
  const x = aNum(i.value);
  eco.textContent = !i.value.trim() ? '' : isNaN(x) ? 'Revisá el número' : '= ' + money2(x);
  eco.style.color = isNaN(x) ? 'var(--mal)' : '';
});
const val = (id, el = document) => { const x = el.querySelector('#' + id); return x ? x.value.trim() : ''; };
const opciones = (lista, sel, vacio) => (vacio !== undefined ? `<option value="">${esc(vacio)}</option>` : '') +
  lista.map(o => { const v = typeof o === 'object' ? o.v : o, t = typeof o === 'object' ? o.t : o; return `<option value="${esc(v)}" ${String(v) === String(sel ?? '') ? 'selected' : ''}>${esc(t)}</option>`; }).join('');
const avatar = (a, g) => `<div class="av ${g ? 'g' : ''}">${a && a.foto ? `<img src="${a.foto}" alt="">` : esc(iniciales(a && a.nombre))}</div>`;
const vacio = (icono, texto) => `<div class="vacio">${ico(icono)}${texto}</div>`;

/* foto: la achica (480 px, o lo que se pida) y la guarda como JPEG dentro de la base */
function leerFoto(file, max = 480) {
  return new Promise((ok, mal) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .82));
    };
    img.onerror = () => mal(new Error('No se pudo leer la imagen'));
    img.src = url;
  });
}

/* ---------- WhatsApp y compartir ---------- */
function abrirWa(tel, texto) {
  const n = telWa(tel);
  window.open((n ? `https://wa.me/${n}` : 'https://wa.me/') + '?text=' + encodeURIComponent(texto), '_blank');
}
async function compartirTexto(titulo, texto) {
  if (navigator.share) { try { await navigator.share({ title: titulo, text: texto }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(texto); toast('Copiado: pegalo donde quieras'); } catch (e) { abrirWa('', texto); }
}

/* ---------- navegación ---------- */
const PANTALLAS = {};
const MENU = [
  { id: 'inicio', t: 'Inicio', i: 'inicio' }, { id: 'agenda', t: 'Agenda', i: 'agenda' }, { id: 'clientas', t: 'Clientas', i: 'alumnos' },
  { id: 'caja', t: 'Caja', i: 'caja' }, { id: 'informes', t: 'Informes', i: 'informe' }, { id: 'config', t: 'Configuración', i: 'config' },
];
const TABS = [{ id: 'inicio', t: 'Inicio', i: 'inicio' }, { id: 'agenda', t: 'Agenda', i: 'agenda' }, { id: 'clientas', t: 'Clientas', i: 'alumnos' }, { id: 'caja', t: 'Caja', i: 'caja' }, { id: 'mas', t: 'Más', i: 'mas' }];
const PROTEGIDAS = { caja: 'la caja', config: 'la configuración', informes: 'los informes' };     // con clave del dueño (si la pusieron)
let ACTUAL = 'inicio', ARGS = null, PILA = [], DESBLOQUEADO = false;

function pintarMenu() {
  $('#menu').innerHTML = MENU.map(m => `<button class="mi ${ACTUAL === m.id || (m.id === 'clientas' && ACTUAL === 'ficha') ? 'act' : ''}" data-ir="${m.id}">${ico(m.i)}<span>${m.t}</span>${DB.cfg.pin && PROTEGIDAS[m.id] && !DESBLOQUEADO ? `<span style="margin-left:auto;opacity:.6">${ico('candado')}</span>` : ''}</button>`).join('');
  $('#tabs').innerHTML = TABS.map(m => `<button class="mi ${ACTUAL === m.id || (m.id === 'clientas' && ACTUAL === 'ficha') || (m.id === 'mas' && ['mas', 'informes', 'config'].includes(ACTUAL)) ? 'act' : ''}" data-ir="${m.id}">${ico(m.i)}<span>${m.t}</span></button>`).join('');
  $('#navGym').textContent = (DB.cfg.nombre || '').toUpperCase();
  $('#navLogo').src = DB.cfg.logo || 'img/logo.png';
}
async function ir(id, args = null, apilar = false) {
  if (PROTEGIDAS[id] && DB.cfg.pin && !DESBLOQUEADO) { if (!await pedirPin(PROTEGIDAS[id])) return; }
  if (apilar && ACTUAL !== id) PILA.push([ACTUAL, ARGS]); else if (!apilar) PILA = [];
  ACTUAL = id; ARGS = args;
  $('#btnAtras').hidden = !PILA.length;
  pintarMenu();
  const main = $('#main'); main.onclick = null;
  try { await PANTALLAS[id](main, args); } catch (e) { fallo(e); main.innerHTML = vacio('alerta', 'No se pudo mostrar esta pantalla: ' + esc(e.message)); }
  window.scrollTo(0, 0);
}
const recargar = () => ir(ACTUAL, ARGS, false).then(() => {});
function titulo(t) { $('#titulo').textContent = t; document.title = t + ' · ' + (DB.cfg.nombre || 'Estética'); }

/* ---------- clave del dueño (opcional) ---------- */
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('rofac-cal:' + t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
function pedirPin(que) {
  return new Promise(ok => {
    const m = modal(`${ico('candado')} Clave del dueño`, `<p class="muted" style="margin-top:0">Para entrar a ${que} poné la clave.</p>
      <input id="pinV" type="password" inputmode="numeric" autocomplete="off" autofocus style="font-size:24px;text-align:center;letter-spacing:6px">
      <p style="margin:14px 0 0"><button class="btn chico" id="pinOlv">Me olvidé la clave</button></p>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" id="pinOk">Entrar</button>`);
    const probar = async () => {
      if (await sha256($('#pinV', m).value.trim()) === DB.cfg.pin) { DESBLOQUEADO = true; m.cerrar(); ok(true); setTimeout(() => (DESBLOQUEADO = false), 15 * 60000); }
      else { toast('Clave incorrecta', true); $('#pinV', m).value = ''; $('#pinV', m).focus(); }
    };
    $('#pinOk', m).onclick = probar; $('#pinV', m).onkeydown = e => { if (e.key === 'Enter') probar(); };
    m.querySelector('[data-cerrar]').addEventListener('click', () => ok(false));
    $('#pinOlv', m).onclick = () => { m.cerrar(); ok(false); olvidoPin(); };
  });
}
function olvidoPin() {
  const reto = LIC.retoNuevo();
  const m = modal('Me olvidé la clave', `<p style="margin-top:0">Mandale este código a quien te vendió la app (por WhatsApp):</p>
    <div style="font-size:26px;font-weight:900;letter-spacing:2px;text-align:center;padding:12px;background:var(--card2);border-radius:12px;user-select:all">${reto}</div>
    <p>Te va a devolver un código de desbloqueo. Pegalo acá:</p><textarea id="olvC" style="font-family:monospace"></textarea>`,
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" id="olvOk">Desbloquear</button>`);
  $('#olvOk', m).onclick = async () => {
    if (!await LIC.desbloqueoOk(reto, $('#olvC', m).value)) return toast('El código no es correcto', true);
    await DB.setCfg('pin', '', true); await DB.anotar('Clave del dueño borrada con código de desbloqueo');
    m.cerrar(); toast('Listo: se quitó la clave. Poné una nueva en Configuración.'); pintarMenu();
  };
}

/* evita cargar dos veces si tocan dos veces seguidas el botón de guardar / cobrar de una ventana */
document.addEventListener('click', e => {
  const b = e.target.closest('.modal .mf .btn.pri, .modal .mf .btn.acento'); if (!b) return;
  if (b.dataset.ocupado) { e.stopImmediatePropagation(); e.preventDefault(); return; }
  b.dataset.ocupado = '1'; setTimeout(() => { delete b.dataset.ocupado; }, 900);
}, true);

document.addEventListener('click', e => {
  const b = e.target.closest('[data-ir]');
  if (b && !b.closest('.modal')) ir(b.dataset.ir);
});
