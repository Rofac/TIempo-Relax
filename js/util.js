/* Utilidades generales: fechas, números en formato argentino, HTML seguro. */
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- fechas (siempre locales, en texto AAAA-MM-DD) ---------- */
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoy = () => iso(new Date());
const ahora = () => { const d = new Date(); return `${iso(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const aFecha = s => { if (!s) return null; const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d, 12); };
const sumarDias = (s, n) => { const d = aFecha(s); d.setDate(d.getDate() + n); return iso(d); };
const sumarMeses = (s, n) => {
  const d = aFecha(s), dia = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  const ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ult));
  return iso(d);
};
const diasEntre = (a, b) => Math.round((aFecha(b) - aFecha(a)) / 86400000);
const dmy = s => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '';
const dm = s => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '';
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_C = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const diaSemana = s => aFecha(s).getDay();
const lunesDe = s => sumarDias(s, -((diaSemana(s) + 6) % 7));
const fechaLarga = s => { const d = aFecha(s); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const edad = s => { if (!s) return null; const h = aFecha(hoy()), n = aFecha(s); let e = h.getFullYear() - n.getFullYear(); if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--; return e; };

/* ---------- números ---------- */
const r2 = n => Math.round((+n || 0) * 100) / 100;
/* "5.346.894,50" "5346894" "1250.5" "$ 20.000" → número. Los puntos son siempre miles (salvo "1250.5"). */
function aNum(v) {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').replace(/\$/g, '').replace(/\s/g, '').trim();
  if (!s) return NaN;
  if (s.includes(',')) {
    if (s.indexOf('.') > s.indexOf(',')) s = s.replace(/,/g, '');          // 1,250.50
    else s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  else if (/^-?\d+\.\d{1,2}$/.test(s)) { /* decimal con punto */ }
  else s = s.replace(/\./g, '');
  const n = Number(s);
  return isFinite(n) ? n : NaN;
}
const n0 = v => (isNaN(aNum(v)) ? 0 : aNum(v));
const money = n => '$ ' + (+n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money2 = n => '$ ' + (+n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtIn = n => (+n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
const num = n => (+n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });

const normal = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const coincide = (texto, q) => { const t = normal(texto); return normal(q).split(/\s+/).filter(Boolean).every(w => t.includes(w)); };
const telWa = t => { let d = String(t || '').replace(/\D/g, ''); if (!d) return ''; if (d.startsWith('549')) return d; if (d.startsWith('54')) return '549' + d.slice(2); if (d.startsWith('0')) d = d.slice(1); d = d.replace(/^(\d{2,4})15/, '$1'); return '549' + d; };
const iniciales = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
const debounce = (f, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
const hhmm = s => (s || '').slice(0, 5);
const minutos = s => { const [h, m] = (s || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
