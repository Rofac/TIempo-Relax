/* Inicio: el día de un vistazo. */
'use strict';

const msgClienta = (plantilla, c) => (plantilla || '').replace(/\{nombre\}/g, c.nombre.split(' ')[0]).replace(/\{negocio\}/g, DB.cfg.nombre);
/* cumpleaños de los próximos 7 días (incluye hoy) */
function cumpleProximos() {
  const h = hoy(), dias = [...Array(7)].map((_, i) => sumarDias(h, i).slice(5));
  return clientasActivas().filter(c => c.nacimiento && dias.includes(c.nacimiento.slice(5))).sort((a, b) => dias.indexOf(a.nacimiento.slice(5)) - dias.indexOf(b.nacimiento.slice(5)));
}

PANTALLAS.inicio = async (main) => {
  titulo('Inicio');
  const h = hoy(), man = sumarDias(h, 1);
  const deHoy = turnosDel(h).filter(turnoVivo), deMan = turnosDel(man).filter(t => turnoVivo(t) && t.estado !== 'ATENDIDO');
  const pend = deHoy.filter(t => t.estado !== 'ATENDIDO');
  const cj = caja(h, h), clientas = clientasActivas();
  const deben = clientas.filter(c => (c.saldo || 0) > 0.009).sort((a, b) => b.saldo - a.saldo), totalDeuda = r2(deben.reduce((s, c) => s + c.saldo, 0));
  const semana = DB.donde('turnos', t => t.fecha >= lunesDe(h) && t.fecha <= sumarDias(lunesDe(h), 6) && turnoVivo(t)).length;
  const packsAviso = DB.donde('packs', p => p.estado === 'ACTIVO' && DB.get('clientas', p.clienta_id)).map(p => ({ p, e: estadoPack(p), c: DB.get('clientas', p.clienta_id) }))
    .filter(x => x.e.quedan > 0 && (x.e.quedan === 1 || (x.p.vence && diasEntre(h, x.p.vence) <= 15))).sort((a, b) => (a.p.vence || '9999').localeCompare(b.p.vence || '9999'));
  const cumples = cumpleProximos();
  const dormidas = clientas.filter(c => c.ultima_visita && diasEntre(c.ultima_visita, h) >= (+DB.cfg.dias_sin_venir || 60)
    && !DB.donde('turnos', t => t.clienta_id === c.id && t.fecha >= h && turnoVivo(t)).length).sort((a, b) => a.ultima_visita.localeCompare(b.ultima_visita));
  const ocultarPlata = DB.cfg.pin && !DESBLOQUEADO;
  const diasCopia = DB.cfg.ultima_copia ? diasEntre(DB.cfg.ultima_copia.slice(0, 10), h) : null;
  const avisarCopia = clientas.length && (diasCopia === null || diasCopia >= (+DB.cfg.aviso_copia_dias || 7));
  const sinPrecio = serviciosActivos().some(s => !s.precio);
  const filaT = t => { const c = DB.get('clientas', t.clienta_id);
    return `<div class="it" data-t="${t.id}"><div class="av" style="font-size:12.5px">${t.hora}</div><div class="tx"><b>${esc(c ? c.nombre : '')}</b><small>${esc(t.servicio)}${t.nota ? ' · 📝 ' + esc(t.nota) : ''}</small></div><span class="estado-t ${t.estado}">${ESTADOS_T[t.estado]}</span></div>`; };
  main.innerHTML = `
    ${sinPrecio || !clientas.length ? `<div class="card" style="border:2px solid var(--acento)"><h2>${ico('hoja')} Para empezar</h2><ol style="margin:0 0 12px;padding-left:20px;line-height:1.8">
      <li>En <b>Configuración</b> revisá los <b>servicios</b>: poné el precio y la duración de cada uno (borrá o agregá los que hagan falta).</li>
      <li>Armá los <b>packs</b> que vendés (ej. 6 sesiones de depilación) y tu <b>horario</b>.</li>
      <li>Cargá tus <b>clientas</b> y empezá a dar turnos con <b>+ Turno</b>.</li></ol><button class="btn acento" data-ir="config">Ir a Configuración</button></div>` : ''}
    ${avisarCopia ? `<div class="card fila" style="background:var(--warn-bg);border-color:var(--warn-bg)">${ico('alerta')}<div class="sp"><b>${diasCopia === null ? 'Todavía no hiciste ninguna copia de seguridad' : `Hace ${diasCopia} días que no hacés una copia`}</b>
      <div class="chico">Si el celular se rompe o se pierde, sin copia se pierde todo. Mandala a tu Google Drive o WhatsApp.</div></div><button class="btn pri" id="inCopia">${ico('copia')} Hacer copia</button></div>` : ''}
    <div class="kpis">
      <div class="kpi oscuro" data-ir="agenda"><small>Turnos de hoy</small><b>${deHoy.length - pend.length}/${deHoy.length}</b><div class="sub">${deHoy.length ? (pend.length ? `Faltan ${pend.length}` : 'Terminaste') : 'Sin turnos hoy'}</div></div>
      <div class="kpi" data-ir="agenda"><small>Esta semana</small><b>${semana}</b><div class="sub">turnos</div></div>
      <div class="kpi" data-ir="caja"><small>Cobrado hoy</small><b>${ocultarPlata ? ico('candado') : money(cj.entra)}</b><div class="sub">${cj.nVentas} ${cj.nVentas === 1 ? 'atención' : 'atenciones'}</div></div>
      <div class="kpi" id="kDeben"><small>Te deben</small><b class="${totalDeuda ? 'mal' : ''}">${ocultarPlata ? ico('candado') : money(totalDeuda)}</b><div class="sub">${deben.length} clienta${deben.length === 1 ? '' : 's'}</div></div>
    </div>
    <div class="grid g2"><div>
      <div class="card" style="padding:6px 14px"><h2 style="margin:10px 0 4px">${ico('agenda')} Hoy<span class="sp"></span><button class="btn chico" data-ir="agenda">Agenda</button></h2>
        <div class="lista">${pend.map(filaT).join('') || vacio('check', deHoy.length ? '¡Atendiste a todas las de hoy!' : 'Hoy no tenés turnos.')}</div></div>
      <div class="card" style="padding:6px 14px"><h2 style="margin:10px 0 4px">${ico('wa')} Mañana: recordar<span class="sp"></span>${deMan.filter(t => !t.recordado && DB.get('clientas', t.clienta_id)?.telefono).length > 1 ? '<span class="muted chico">tocá el ícono de cada una</span>' : ''}</h2>
        <div class="lista">${deMan.map(t => { const c = DB.get('clientas', t.clienta_id);
          return `<div class="it" data-t="${t.id}"><div class="av" style="font-size:12.5px">${t.hora}</div><div class="tx"><b>${esc(c ? c.nombre : '')}</b><small>${esc(t.servicio)}${t.recordado ? ' · ✓ recordado' : ''}</small></div>
            ${c && c.telefono ? `<button class="ib" data-rec="${t.id}" title="Mandar recordatorio" style="${t.recordado ? 'opacity:.45' : 'color:var(--ok)'}">${ico('wa')}</button>` : ''}</div>`; }).join('') || vacio('agenda', 'Mañana no tenés turnos.')}</div></div>
    </div><div>
      ${packsAviso.length ? `<div class="card" style="padding:6px 14px"><h2 style="margin:10px 0 4px">${ico('pack')} Packs por terminar</h2><div class="lista">${packsAviso.slice(0, 10).map(x => `<div class="it" data-cli="${x.c.id}"><div class="av">${esc(iniciales(x.c.nombre))}</div>
        <div class="tx"><b>${esc(x.c.nombre)}</b><small>${esc(x.p.nombre)} · ${x.e.quedan === 1 ? 'queda 1 sesión' : `quedan ${x.e.quedan}`}${x.p.vence ? ' · vence ' + dmy(x.p.vence) : ''}</small></div></div>`).join('')}</div></div>` : ''}
      ${cumples.length ? `<div class="card" style="padding:6px 14px"><h2 style="margin:10px 0 4px">🎂 Cumpleaños</h2><div class="lista">${cumples.map(c => `<div class="it" data-cli="${c.id}"><div class="av">${esc(iniciales(c.nombre))}</div>
        <div class="tx"><b>${esc(c.nombre)}</b><small>${c.nacimiento.slice(5) === h.slice(5) ? '¡Hoy!' : DIAS[diaSemana(h.slice(0, 4) + c.nacimiento.slice(4))] + ' ' + dm(c.nacimiento)}</small></div>
        ${c.telefono ? `<button class="ib" data-cum="${c.id}" title="Saludar">${ico('wa')}</button>` : ''}</div>`).join('')}</div></div>` : ''}
      <div class="card" style="padding:6px 14px"><h2 style="margin:10px 0 4px">${ico('caja')} Te deben</h2><div class="lista">${deben.slice(0, 8).map(c => `<div class="it" data-cli="${c.id}"><div class="av">${esc(iniciales(c.nombre))}</div><div class="tx"><b>${esc(c.nombre)}</b><small class="mal">Debe ${money2(c.saldo)}</small></div></div>`).join('') || vacio('check', 'Nadie te debe')}</div></div>
      ${dormidas.length ? `<div class="card" style="padding:6px 14px"><h2 style="margin:10px 0 4px">${ico('reloj')} Hace mucho que no vienen</h2><div class="lista">${dormidas.slice(0, 8).map(c => `<div class="it" data-cli="${c.id}"><div class="av">${esc(iniciales(c.nombre))}</div>
        <div class="tx"><b>${esc(c.nombre)}</b><small>Última vez: ${dmy(c.ultima_visita)} (hace ${diasEntre(c.ultima_visita, h)} días)</small></div>${c.telefono ? `<button class="ib" data-vol="${c.id}">${ico('wa')}</button>` : ''}</div>`).join('')}</div></div>` : ''}
    </div></div>`;
  if ($('#inCopia')) $('#inCopia').onclick = () => hacerCopia();
  $('#kDeben').onclick = () => { FILTRO_CLI = 'deben'; ir('clientas'); };
  main.onclick = async e => {
    const b = e.target.closest('[data-cli],[data-t],[data-rec],[data-cum],[data-vol]'); if (!b) return;
    if (b.dataset.rec) { e.stopPropagation(); await recordar(DB.get('turnos', b.dataset.rec)); return recargar(); }
    if (b.dataset.cum) { const c = DB.get('clientas', b.dataset.cum); return abrirWa(c.telefono, msgClienta(DB.cfg.msg_cumple, c)); }
    if (b.dataset.vol) { const c = DB.get('clientas', b.dataset.vol); return abrirWa(c.telefono, msgClienta(DB.cfg.msg_volver, c)); }
    if (b.dataset.t) return verTurno(+b.dataset.t, recargar);
    if (b.dataset.cli) return ir('ficha', { id: +b.dataset.cli }, true);
  };
};
