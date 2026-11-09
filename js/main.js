/* Arranque de la app. */
'use strict';

const TAMANIOS = { chica: .88, normal: 1 };
function aplicarTema() {
  document.documentElement.style.zoom = TAMANIOS[DB.cfg.letra || 'normal'] || 1;
  const t = DB.cfg.tema || 'light';
  if (t !== 'auto') document.documentElement.dataset.theme = t;
  else document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
async function arrancarLicencia() {
  const lic = await LIC.estado();
  DB.soloLectura = !!lic.bloqueado; DB.mensajeBloqueo = lic.mensaje;
  const b = $('#banda');
  if (lic.bloqueado || lic.demo || lic.por_vencer) {
    b.hidden = false; b.className = lic.bloqueado ? 'mal' : lic.por_vencer ? 'warn' : 'info';
    b.innerHTML = `${ico(lic.bloqueado ? 'candado' : 'alerta')}<span>${esc(lic.mensaje)}</span>${lic.bloqueado || lic.por_vencer || lic.dias_restantes <= 7 ? '<button class="btn chico" id="bandaLic">Cargar licencia</button>' : ''}`;
    const x = $('#bandaLic'); if (x) x.onclick = () => ir('config');
  } else b.hidden = true;
  return lic;
}

/* botón "Instalar app": Chrome avisa cuando se puede instalar y todavía no está instalada */
let PEDIDO_INSTALAR = null;
const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); PEDIDO_INSTALAR = e; if (!instalada()) $('#btnInstalar').hidden = false; });
window.addEventListener('appinstalled', () => { PEDIDO_INSTALAR = null; $('#btnInstalar').hidden = true; toast('¡Listo! Ya tenés el ícono en la pantalla'); });
function instalarApp() {
  if (PEDIDO_INSTALAR) { PEDIDO_INSTALAR.prompt(); PEDIDO_INSTALAR.userChoice.finally(() => { PEDIDO_INSTALAR = null; $('#btnInstalar').hidden = true; }); return; }
  ayudaInstalar();
}

(async () => {
  try {
    await DB.abrir();
    aplicarTema();
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', aplicarTema);
    await datosIniciales();
    await arrancarLicencia();
    DB.copiaDiaria();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    $('#btnCobrar').onclick = () => editarTurno({ fecha: ACTUAL === 'agenda' && FECHA_AG ? FECHA_AG : hoy() }, recargar);
    $('#btnInstalar').onclick = instalarApp;
    $('#btnAtras').onclick = () => { const [id, args] = PILA.pop() || ['inicio', null]; ACTUAL = null; ir(id, args, false).then(() => { $('#btnAtras').hidden = !PILA.length; }); };
    await ir('inicio');
    pedirAceptarTerminos();
  } catch (e) {
    console.error(e);
    $('#main').innerHTML = `<div class="card">${vacio('alerta', 'No se pudo abrir la app: ' + esc(e.message || e) + '<br>Probá cerrarla y abrirla de nuevo.')}</div>`;
  } finally { $('#arranque').remove(); }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(e => console.warn('sw', e));
})();
