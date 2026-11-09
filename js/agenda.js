/* Agenda: turnos por día, turno nuevo, ver turno (confirmar, recordar, cobrar, no vino, canceló, seña). */
'use strict';

let FECHA_AG = null, VISTA_AG = 'dia';

/* ---------- feriados nacionales (mismo cálculo que los programas de PC; los días turísticos los decide el gobierno cada año) ---------- */
const PUENTES = { 2025: ['2025-05-02', '2025-08-15', '2025-11-21'], 2026: ['2026-03-23', '2026-07-10', '2026-12-07'] };
const _FER = {};
function feriadosDel(anio) {
  if (_FER[anio]) return _FER[anio];
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const pascua = iso(new Date(anio, Math.floor((h + l - 7 * m + 114) / 31) - 1, (h + l - 7 * m + 114) % 31 + 1, 12));
  const out = {}, p2 = n => String(n).padStart(2, '0');
  for (const [mm, dd, n] of [[1, 1, 'Año Nuevo'], [3, 24, 'Día de la Memoria'], [4, 2, 'Malvinas'], [5, 1, 'Día del Trabajador'], [5, 25, 'Revolución de Mayo'], [6, 20, 'Día de la Bandera'],
    [7, 9, 'Día de la Independencia'], [12, 8, 'Inmaculada Concepción'], [12, 25, 'Navidad']]) out[`${anio}-${p2(mm)}-${p2(dd)}`] = n;
  out[sumarDias(pascua, -48)] = 'Carnaval'; out[sumarDias(pascua, -47)] = 'Carnaval'; out[sumarDias(pascua, -2)] = 'Viernes Santo';
  for (const [mm, dd, n] of [[6, 17, 'Paso a la Inmortalidad de Güemes'], [8, 17, 'Paso a la Inmortalidad de San Martín'], [10, 12, 'Día de la Diversidad Cultural'], [11, 20, 'Día de la Soberanía Nacional']]) {
    const o = `${anio}-${p2(mm)}-${p2(dd)}`, wd = diaSemana(o);       // Ley 27.399: martes/miércoles → lunes anterior; jueves/viernes → lunes siguiente
    out[wd === 2 || wd === 3 ? sumarDias(o, -(wd - 1)) : wd === 4 || wd === 5 ? sumarDias(o, 8 - wd) : o] = n;
  }
  for (const x of PUENTES[anio] || []) out[x] = 'Día no laborable (turístico)';
  return (_FER[anio] = out);
}
const feriado = f => feriadosDel(+f.slice(0, 4))[f] || '';
const horario = () => Object.assign({ dias: [1, 2, 3, 4, 5, 6], desde: '09:00', hasta: '20:00', intervalo: 30 }, DB.cfg.horario || {});
const hhmmDe = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const turnosDel = f => DB.donde('turnos', t => t.fecha === f).sort((a, b) => a.hora.localeCompare(b.hora) || a.id - b.id);

function mensajeTurno(t, plantilla) {
  const c = DB.get('clientas', t.clienta_id);
  return (plantilla || DB.cfg.msg_recordatorio || CONFIG_INICIAL.msg_recordatorio).replace(/\{nombre\}/g, c ? c.nombre.split(' ')[0] : '')
    .replace(/\{servicio\}/g, t.servicio).replace(/\{dia\}/g, t.fecha === hoy() ? 'hoy' : t.fecha === sumarDias(hoy(), 1) ? 'mañana ' + fechaLarga(t.fecha).toLowerCase() : fechaLarga(t.fecha).toLowerCase())
    .replace(/\{hora\}/g, t.hora).replace(/\{negocio\}/g, DB.cfg.nombre);
}
async function recordar(t) {
  const c = DB.get('clientas', t.clienta_id); if (!c) return;
  if (!c.telefono) return toast('Esa clienta no tiene teléfono cargado', true);
  abrirWa(c.telefono, mensajeTurno(t));
  if (!DB.soloLectura) { t.recordado = ahora(); await DB.guardar('turnos', t); }
}

const segVistas = () => `<div class="seg" id="agVista" style="margin-bottom:10px">${[['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']].map(([k, t]) => `<button data-v="${k}" class="${VISTA_AG === k ? 'act' : ''}">${t}</button>`).join('')}</div>`;
function enlazarVistas(main) {
  $('#agVista').onclick = e => { const b = e.target.closest('[data-v]'); if (b) { VISTA_AG = b.dataset.v; PANTALLAS.agenda(main); } };
}
PANTALLAS.agenda = async (main) => {
  titulo('Agenda');
  if (VISTA_AG === 'semana') return agendaSemana(main);
  if (VISTA_AG === 'mes') return agendaMes(main);
  const f = FECHA_AG || hoy(), hz = horario(), abierto = hz.dias.includes(diaSemana(f));
  const lun = lunesDe(f), semana = [...Array(14)].map((_, i) => sumarDias(lun, i - 0));
  const lista = turnosDel(f), vivos = lista.filter(turnoVivo);
  const paso = Math.max(10, +hz.intervalo || 30);
  const ini = Math.floor(Math.min(minutos(hz.desde), ...lista.map(t => minutos(t.hora))) / paso) * paso, fin = Math.max(minutos(hz.hasta), ...lista.map(t => minutos(t.hora) + 1));
  // franjas: cada franja muestra los turnos que empiezan en ella; si un turno largo la ocupa, no se ofrece como libre
  const ocupado = m => vivos.some(t => minutos(t.hora) <= m && minutos(t.hora) + (+t.duracion || 0) > m);
  const filas = [];
  for (let m = ini; m < fin; m += paso) {
    const aca = lista.filter(t => minutos(t.hora) >= m && minutos(t.hora) < m + paso);
    if (aca.length) filas.push(`<div class="franja"><div class="h">${hhmmDe(m)}</div><div style="flex:1;min-width:0">${aca.map(t => {
      const ch = choques(t).length, c = DB.get('clientas', t.clienta_id), pk = c ? packParaServicio(c.id, t.servicio_id) : null, sen = senasDe(t.id);
      return `<div class="turno ${t.estado} ${ch ? 'choca' : ''}" data-t="${t.id}"><b><span class="hh">${t.hora}</span> ${esc(c ? c.nombre : 'Clienta borrada')}<span class="estado-t ${t.estado}">${ESTADOS_T[t.estado]}</span></b>
        <small>${esc(t.servicio)} · hasta ${finTurno(t)}${pk && t.estado !== 'ATENDIDO' ? ' · pack: quedan ' + estadoPack(pk).quedan : ''}${sen.length ? ' · seña ' + money(sen.reduce((s, x) => s + x.monto, 0)) : ''}${c && (c.saldo || 0) > 0.009 ? ' · debe ' + money(c.saldo) : ''}</small>
        ${ch ? '<small class="warn" style="font-weight:800">Se superpone con otro turno</small>' : ''}${t.nota ? `<small>📝 ${esc(t.nota)}</small>` : ''}</div>`; }).join('')}</div></div>`);
    else if (!ocupado(m) && abierto && m >= minutos(hz.desde) && m < minutos(hz.hasta)) filas.push(`<div class="franja"><div class="h">${hhmmDe(m)}</div><div class="libre" data-libre="${hhmmDe(m)}">${ico('plus')}&nbsp;Libre</div></div>`);
  }
  const cobrado = caja(f, f);
  const fer = feriado(f);
  main.innerHTML = `${segVistas()}<div class="fila" style="margin-bottom:8px"><button class="ib" id="agAnt" title="Semana anterior" style="transform:scaleX(-1)">${ico('flecha')}</button>
      <div class="sp" style="text-align:center"><b style="font-size:17px">${f === hoy() ? 'Hoy, ' : ''}${fechaLarga(f)}</b></div>
      <button class="ib" id="agSig" title="Semana siguiente">${ico('flecha')}</button></div>
    <div class="dias-strip" id="agDias">${semana.map(d => { const n = DB.donde('turnos', t => t.fecha === d && turnoVivo(t)).length;
      return `<button data-d="${d}" class="${d === f ? 'act' : ''} ${d === hoy() ? 'hoy' : ''} ${hz.dias.includes(diaSemana(d)) && !feriado(d) ? '' : 'cerrado'}" ${feriado(d) ? `title="${esc(feriado(d))}"` : ''}><small>${DIAS_C[diaSemana(d)]}</small><b>${+d.slice(8)}</b><i>${'•'.repeat(Math.min(n, 5))}</i></button>`; }).join('')}</div>
    <div class="fila" style="margin-bottom:12px"><span class="sp chico muted">${vivos.length ? `${vivos.length} turno${vivos.length === 1 ? '' : 's'} · ${vivos.filter(t => t.estado === 'ATENDIDO').length} atendida${vivos.filter(t => t.estado === 'ATENDIDO').length === 1 ? '' : 's'}` : abierto ? 'Sin turnos' : 'Día cerrado'}
      ${cobrado.entra && !(DB.cfg.pin && !DESBLOQUEADO) ? ' · cobrado ' + money(cobrado.entra) : ''}</span>
      ${f !== hoy() ? '<button class="btn chico" id="agHoy">Hoy</button>' : ''}<input type="date" id="agF" value="${f}" style="width:auto;min-height:36px;padding:5px 8px">
      <button class="btn chico acento" id="agN">${ico('plus')} Turno</button></div>
    ${fer ? `<div class="estado-cuota warn" style="margin-bottom:10px;padding:10px"><div class="tx"><b style="font-size:15px">🇦🇷 Feriado: ${esc(fer)}</b></div></div>` : ''}
    <div class="card agenda">${filas.join('') || vacio('agenda', abierto ? 'Sin turnos' : 'Este día no atendés (se cambia en Configuración > Horario). Igual podés dar un turno con "+ Turno".')}</div>`;
  const re = () => PANTALLAS.agenda(main);
  enlazarVistas(main);
  $('#agAnt').onclick = () => { FECHA_AG = sumarDias(f, -7); re(); };
  $('#agSig').onclick = () => { FECHA_AG = sumarDias(f, 7); re(); };
  if ($('#agHoy')) $('#agHoy').onclick = () => { FECHA_AG = hoy(); re(); };
  $('#agF').onchange = e => { if (e.target.value) { FECHA_AG = e.target.value; re(); } };
  $('#agDias').onclick = e => { const b = e.target.closest('[data-d]'); if (b) { FECHA_AG = b.dataset.d; re(); } };
  $('#agN').onclick = () => editarTurno({ fecha: f }, re);
  main.onclick = e => {
    const t = e.target.closest('[data-t]'); if (t) return verTurno(+t.dataset.t, re);
    const l = e.target.closest('[data-libre]'); if (l) return editarTurno({ fecha: f, hora: l.dataset.libre }, re);
  };
};

/* turno nuevo o modificar */
function editarTurno(t, luego) {
  if (!t.clienta_id) return elegirClienta('¿Para quién es el turno?', c => editarTurno(Object.assign({}, t, { clienta_id: c.id }), luego));
  const c = DB.get('clientas', t.clienta_id), servs = serviciosActivos();
  if (!servs.length) return toast('Primero cargá los servicios en Configuración', true);
  const s0 = DB.get('servicios', t.servicio_id) || servs[0];
  const cats = [...new Set(servs.map(s => s.categoria || 'Otros'))];
  const m = modal(t.id ? 'Modificar turno' : `${ico('agenda')} Turno nuevo`, `<div class="fila" style="margin-bottom:10px"><div class="av">${esc(iniciales(c.nombre))}</div><div class="sp"><b>${esc(c.nombre)}</b>
      <div class="chico muted">${esc(c.telefono || 'Sin teléfono')}</div></div>${!t.id ? '<button class="btn chico" id="etOtra">Cambiar</button>' : ''}</div>
    <div class="campo"><label>Servicio</label><select id="et_s">${cats.map(k => `<optgroup label="${esc(k)}">${servs.filter(s => (s.categoria || 'Otros') === k).map(s => `<option value="${s.id}" ${s.id === s0.id ? 'selected' : ''}>${esc(s.nombre)} · ${s.duracion} min</option>`).join('')}</optgroup>`).join('')}</select></div>
    <div id="etPack"></div>
    <div class="form"><div class="campo"><label>Día</label><input type="date" id="et_f" value="${t.fecha || hoy()}"></div>
      <div class="campo"><label>Hora</label><input type="time" id="et_h" value="${t.hora || ''}" step="300"></div>
      <div class="campo"><label>Duración (minutos)</label><input id="et_d" inputmode="numeric" value="${t.duracion || s0.duracion || 60}"></div>
      <div class="campo"><label>Nota (opcional)</label><input id="et_n" value="${esc(t.nota || '')}" placeholder="Ej. viene con la hermana"></div></div>
    <div id="etChoque" class="warn chico" style="font-weight:800"></div>
    ${!t.id ? `<label class="chk" style="margin-top:6px"><input type="checkbox" id="et_sena"> Deja seña ahora</label>
      <label class="chk" style="margin-top:6px"><input type="checkbox" id="et_wa" ${c.telefono ? 'checked' : ''}> Mandarle el turno por WhatsApp al guardar</label>` : ''}`,
    `${t.id && t.estado !== 'ATENDIDO' ? `<button class="btn rojo" id="etB">${ico('trash')}</button>` : ''}<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" id="etOk">${ico('check')} Guardar</button>`);
  const libreDesde = () => { // primera hora libre del día elegido, si no eligió hora
    const f = val('et_f', m), hz = horario(), dur = parseInt(val('et_d', m)) || 30;
    for (let x = Math.max(minutos(hz.desde), f === hoy() ? Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 30) * 30 : 0); x + dur <= minutos(hz.hasta); x += +hz.intervalo || 30)
      if (!choques({ id: t.id, fecha: f, hora: hhmmDe(x), duracion: dur, estado: 'RESERVADO' }).length) return hhmmDe(x);
    return '';
  };
  if (!t.hora) $('#et_h', m).value = libreDesde();
  const revisar = () => {
    const d = { id: t.id, fecha: val('et_f', m), hora: val('et_h', m), duracion: parseInt(val('et_d', m)) || 0, estado: t.estado || 'RESERVADO' };
    const ch = d.hora ? choques(d) : [];
    $('#etChoque', m).innerHTML = ch.length ? `${ico('alerta')} Se superpone con ${ch.map(x => `${esc(nomClienta(x.clienta_id))} (${x.hora}–${finTurno(x)})`).join(', ')}` :
      d.fecha && feriado(d.fecha) ? `${ico('alerta')} Ese día es feriado (${esc(feriado(d.fecha))})` :
      d.fecha && !horario().dias.includes(diaSemana(d.fecha)) ? `${ico('alerta')} Ese día no atendés normalmente` : '';
    const pk = packParaServicio(c.id, +val('et_s', m));
    $('#etPack', m).innerHTML = pk ? `<p class="chico" style="margin:-4px 0 10px"><span class="pill info">${ico('pack')} Tiene pack: quedan ${estadoPack(pk).quedan} de ${pk.sesiones}</span></p>` : '';
  };
  $('#et_s', m).onchange = () => { $('#et_d', m).value = DB.get('servicios', val('et_s', m))?.duracion || 60; revisar(); };
  m.addEventListener('input', revisar); m.addEventListener('change', revisar); revisar();
  if ($('#etOtra', m)) $('#etOtra', m).onclick = () => { m.cerrar(); editarTurno(Object.assign({}, t, { clienta_id: null, fecha: val('et_f', m), hora: val('et_h', m) }), luego); };
  if ($('#etB', m)) $('#etB', m).onclick = async () => { if (!await confirmar('¿Borrar este turno? (si la clienta avisó que no viene, mejor marcalo como "Canceló")', 'Borrar', true)) return;
    try { await borrarTurno(t.id); m.cerrar(); toast('Turno borrado'); luego && luego(); } catch (e) { fallo(e); } };
  $('#etOk', m).onclick = async () => {
    const btn = $('#etOk', m); if (btn.disabled) return; btn.disabled = true;
    try {
      const d = { clienta_id: c.id, servicio_id: +val('et_s', m), fecha: val('et_f', m), hora: val('et_h', m), duracion: val('et_d', m), nota: val('et_n', m) };
      const ch = d.hora ? choques({ id: t.id, fecha: d.fecha, hora: d.hora, duracion: parseInt(d.duracion) || 0, estado: t.estado || 'RESERVADO' }) : [];
      if (ch.length && !await confirmar(`Ese horario se superpone con ${ch.map(x => esc(nomClienta(x.clienta_id))).join(', ')}. ¿Guardar igual?`, 'Guardar igual')) { btn.disabled = false; return; }
      const nuevo = !t.id, sena = nuevo && $('#et_sena', m).checked, wa = nuevo && $('#et_wa', m).checked;
      const g = await guardarTurno(t.id ? DB.get('turnos', t.id) : {}, d);
      m.cerrar(); toast('Turno guardado'); FECHA_AG = g.fecha; luego && luego();
      if (wa) abrirWa(c.telefono, mensajeTurno(g, `Hola {nombre}! 🌿 Te reservé el turno de {servicio} para el {dia} a las {hora} en ${DB.cfg.nombre}. ¡Te esperamos!`));
      if (sena) cobrarUI(c.id, luego, g);
    } catch (e) { btn.disabled = false; fallo(e); }
  };
}

/* ver un turno: todo lo que se puede hacer con él */
function verTurno(id, luego) {
  const t = DB.get('turnos', id); if (!t) return;
  const c = DB.get('clientas', t.clienta_id), sen = senasDe(t.id), totSen = r2(sen.reduce((s, x) => s + x.monto, 0));
  const pk = c ? packParaServicio(c.id, t.servicio_id) : null, v = t.venta_id ? DB.get('ventas', t.venta_id) : null;
  const alertas = c && c.salud ? [...(c.salud.marcados || []), c.salud.alergias ? 'Alergias: ' + c.salud.alergias : ''].filter(Boolean) : [];
  const m = modal(`${t.hora} · ${esc(t.servicio)}`, `<div class="fila" style="margin-bottom:10px"><div class="av">${esc(iniciales(c ? c.nombre : '?'))}</div><div class="sp"><b>${esc(c ? c.nombre : 'Clienta borrada')}</b>
      <div class="chico muted">${fechaLarga(t.fecha)} · ${t.hora} a ${finTurno(t)}</div></div><span class="estado-t ${t.estado}">${ESTADOS_T[t.estado]}</span></div>
    ${alertas.length ? `<div class="estado-cuota warn" style="margin-bottom:10px;padding:10px"><div class="tx chico"><b style="font-size:14px">${ico('salud')} Ojo:</b> ${alertas.map(esc).join(' · ')}</div></div>` : ''}
    ${c && !c.consentimiento && /depil|láser|laser/i.test(t.servicio) ? `<p class="chico warn" style="font-weight:800;margin-top:0">${ico('alerta')} Todavía no tiene cargado el consentimiento firmado (ficha de salud)</p>` : ''}
    <div class="antec" style="margin-bottom:10px">${pk ? `<span class="pill info">${ico('pack')} Pack: quedan ${estadoPack(pk).quedan} de ${pk.sesiones}</span>` : ''}
      ${totSen ? `<span class="pill ok">Seña ${money2(totSen)}</span>` : ''}${c && Math.abs(c.saldo || 0) > 0.009 ? `<span class="pill ${claseSaldo(c.saldo)}">${textoSaldo(c.saldo)}</span>` : ''}
      ${t.recordado ? `<span class="pill">Recordado ${dm(t.recordado)} ${t.recordado.slice(11)}</span>` : ''}</div>
    ${t.nota ? `<p class="muted" style="margin-top:0">📝 ${esc(t.nota)}</p>` : ''}
    ${v ? `<div class="it" id="vtV"><div class="av">$</div><div class="tx"><b>Cobrado: ${money2(v.total)}</b><small>${v.items.map(l => esc(l.nombre)).join(', ')}</small></div>${ico('flecha')}</div>` : ''}
    ${t.estado !== 'ATENDIDO' && c ? `<div class="grid g2" style="gap:8px;margin-top:6px">
      <button class="btn acento ancho" id="vtCob">${ico('check')} Atendida · cobrar</button>
      ${t.estado === 'RESERVADO' ? `<button class="btn ancho" id="vtConf">${ico('check')} Confirmó</button>` : t.estado === 'CONFIRMADO' ? '' : `<button class="btn ancho" id="vtRes">Volver a reservado</button>`}
      ${c.telefono ? `<button class="btn ancho" id="vtWa">${ico('wa')} Recordar por WhatsApp</button>` : ''}
      <button class="btn ancho" id="vtSena">${ico('caja')} ${totSen ? 'Otra seña' : 'Cobrar seña'}</button>
      ${t.estado !== 'NO_VINO' ? `<button class="btn ancho" id="vtNo">No vino</button>` : ''}${t.estado !== 'CANCELADO' ? `<button class="btn ancho" id="vtCan">Canceló</button>` : ''}</div>` : ''}`,
    `${c ? `<button class="btn" id="vtFi">${ico('usuario')} Ficha</button>` : ''}${t.estado !== 'ATENDIDO' && c ? `<button class="btn" id="vtEd">${ico('lapiz')} Cambiar día/hora</button>` : ''}<button class="btn pri" data-cerrar>Cerrar</button>`);
  const re = () => { m.cerrar(); luego ? luego() : recargar(); };
  const on = (id, f) => { const b = $('#' + id, m); if (b) b.onclick = f; };
  on('vtV', () => verVenta(v.id, re));
  on('vtCob', () => { m.cerrar(); cobrarAtencion(c.id, luego, t); });
  on('vtConf', async () => { try { await estadoTurno(t.id, 'CONFIRMADO'); re(); } catch (e) { fallo(e); } });
  on('vtRes', async () => { try { await estadoTurno(t.id, 'RESERVADO'); re(); } catch (e) { fallo(e); } });
  on('vtWa', async () => { await recordar(t); });
  on('vtSena', () => { m.cerrar(); cobrarUI(c.id, luego, t); });
  on('vtFi', () => { m.cerrar(); ir('ficha', { id: c.id }, true); });
  on('vtEd', () => { m.cerrar(); editarTurno(Object.assign({}, t), luego); });
  const baja = async estado => {
    let destino;
    if (totSen) {
      destino = await new Promise(ok => {
        const q = modal(`${ESTADOS_T[estado]}: ¿y la seña de ${money2(totSen)}?`, `<div class="lista">
          <div class="it" data-ds="FAVOR"><div class="tx"><b>Le queda a favor</b><small>Se le descuenta en el próximo turno</small></div></div>
          <div class="it" data-ds="DEVOLVER"><div class="tx"><b>Se la devolví</b><small>Sale de la caja</small></div></div>
          <div class="it" data-ds="PIERDE"><div class="tx"><b>La pierde</b><small>Queda para el local (no avisó a tiempo)</small></div></div></div>`, '<button class="btn" data-cerrar>Cancelar</button>');
        $('.lista', q).onclick = e => { const b = e.target.closest('[data-ds]'); if (b) { q.cerrar(); ok(b.dataset.ds); } };
        q.querySelector('[data-cerrar]').addEventListener('click', () => ok(null));
      });
      if (!destino) return;
    }
    try { await estadoTurno(t.id, estado, destino); toast(ESTADOS_T[estado]); re(); } catch (e) { fallo(e); }
  };
  on('vtNo', () => baja('NO_VINO'));
  on('vtCan', () => baja('CANCELADO'));
}

/* ---------------------------------------------------------------- vista semana: los 7 días con sus turnos */
function agendaSemana(main) {
  const f = FECHA_AG || hoy(), lun = lunesDe(f), dias = [...Array(7)].map((_, i) => sumarDias(lun, i)), hz = horario();
  const tot = dias.reduce((s, d) => s + turnosDel(d).filter(turnoVivo).length, 0);
  main.innerHTML = `${segVistas()}<div class="fila" style="margin-bottom:10px"><button class="ib" id="agAnt" style="transform:scaleX(-1)">${ico('flecha')}</button>
      <div class="sp" style="text-align:center"><b style="font-size:17px">Semana del ${+lun.slice(8)} de ${MESES[+lun.slice(5, 7) - 1]}</b><div class="chico muted">${tot} turno${tot === 1 ? '' : 's'}</div></div>
      <button class="ib" id="agSig">${ico('flecha')}</button></div>
    ${!dias.includes(hoy()) ? '<div style="text-align:center;margin-bottom:10px"><button class="btn chico" id="agHoy">Ir a esta semana</button></div>' : ''}
    ${dias.map(d => { const l = turnosDel(d), fer = feriado(d), cerrado = !hz.dias.includes(diaSemana(d));
      return `<div class="card" style="padding:6px 14px;${d === hoy() ? 'border:2px solid var(--acento)' : ''}${(cerrado || fer) && !l.length ? ';opacity:.6' : ''}">
        <h2 style="margin:10px 0 4px" data-dia="${d}">${DIAS[diaSemana(d)]} ${dm(d)}${d === hoy() ? ' <span class="pill acento">hoy</span>' : ''}${fer ? ` <span class="pill warn">🇦🇷 ${esc(fer)}</span>` : ''}<span class="sp"></span>
          <span class="chico muted" style="font-weight:700">${l.filter(turnoVivo).length ? l.filter(turnoVivo).length + ' turno' + (l.filter(turnoVivo).length === 1 ? '' : 's') : cerrado ? 'cerrado' : 'libre'}</span><button class="btn chico" data-nuevo="${d}">${ico('plus')}</button></h2>
        <div class="lista">${l.map(t => { const c = DB.get('clientas', t.clienta_id);
          return `<div class="it" data-t="${t.id}" style="min-height:48px;${turnoVivo(t) ? '' : 'opacity:.5'}"><div class="av" style="font-size:12px;width:46px">${t.hora}</div>
            <div class="tx"><b>${esc(c ? c.nombre : 'Clienta borrada')}</b><small>${esc(t.servicio)} · hasta ${finTurno(t)}</small></div><span class="estado-t ${t.estado}">${ESTADOS_T[t.estado]}</span></div>`; }).join('')}</div></div>`; }).join('')}`;
  const re = () => PANTALLAS.agenda(main);
  enlazarVistas(main);
  $('#agAnt').onclick = () => { FECHA_AG = sumarDias(lun, -7); re(); };
  $('#agSig').onclick = () => { FECHA_AG = sumarDias(lun, 7); re(); };
  if ($('#agHoy')) $('#agHoy').onclick = () => { FECHA_AG = hoy(); re(); };
  main.onclick = e => {
    const t = e.target.closest('[data-t]'); if (t) return verTurno(+t.dataset.t, re);
    const n = e.target.closest('[data-nuevo]'); if (n) return editarTurno({ fecha: n.dataset.nuevo }, re);
    const d = e.target.closest('[data-dia]'); if (d) { FECHA_AG = d.dataset.dia; VISTA_AG = 'dia'; re(); }
  };
}

/* ---------------------------------------------------------------- vista mes: calendario con los turnos de cada día */
function agendaMes(main) {
  const f = FECHA_AG || hoy(), m1 = f.slice(0, 8) + '01', ult = sumarDias(sumarMeses(m1, 1), -1), ini = lunesDe(m1), hz = horario();
  const celdas = []; for (let d = ini; d <= ult || diaSemana(d) !== 1; d = sumarDias(d, 1)) celdas.push(d);
  const delMes = DB.donde('turnos', t => t.fecha >= m1 && t.fecha <= ult && turnoVivo(t));
  const atendidas = delMes.filter(t => t.estado === 'ATENDIDO').length;
  main.innerHTML = `${segVistas()}<div class="fila" style="margin-bottom:10px"><button class="ib" id="agAnt" style="transform:scaleX(-1)">${ico('flecha')}</button>
      <div class="sp" style="text-align:center"><b style="font-size:17px;text-transform:capitalize">${MESES[+m1.slice(5, 7) - 1]} ${m1.slice(0, 4)}</b>
        <div class="chico muted">${delMes.length} turno${delMes.length === 1 ? '' : 's'}${atendidas ? ` · ${atendidas} atendida${atendidas === 1 ? '' : 's'}` : ''}</div></div>
      <button class="ib" id="agSig">${ico('flecha')}</button></div>
    ${m1 !== hoy().slice(0, 8) + '01' ? '<div style="text-align:center;margin-bottom:10px"><button class="btn chico" id="agHoy">Ir a este mes</button></div>' : ''}
    <div class="card" style="padding:8px"><div class="mes">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(x => `<div class="mes-cab">${x}</div>`).join('')}
      ${celdas.map(d => { const l = turnosDel(d).filter(turnoVivo), fer = feriado(d), fuera = d.slice(0, 8) !== m1.slice(0, 8);
        return `<div class="mes-dia ${fuera ? 'fuera' : ''} ${d === hoy() ? 'hoy' : ''} ${fer ? 'fer' : ''} ${!hz.dias.includes(diaSemana(d)) ? 'cerrado' : ''}" data-dia="${d}" ${fer ? `title="${esc(fer)}"` : ''}>
          <div class="n">${+d.slice(8)}${fer ? ' <span class="fer-m">feriado</span>' : ''}</div>
          ${l.slice(0, 3).map(t => `<div class="mes-t ${t.estado}">${t.hora.replace(':00', '')} ${esc((DB.get('clientas', t.clienta_id)?.nombre || '').split(' ')[0])}</div>`).join('')}
          ${l.length > 3 ? `<div class="mes-mas">+${l.length - 3} más</div>` : ''}</div>`; }).join('')}</div></div>
    <p class="muted chico" style="text-align:center">Tocá un día para ver los turnos y los horarios libres.</p>`;
  const re = () => PANTALLAS.agenda(main);
  enlazarVistas(main);
  $('#agAnt').onclick = () => { FECHA_AG = sumarMeses(m1, -1); re(); };
  $('#agSig').onclick = () => { FECHA_AG = sumarMeses(m1, 1); re(); };
  if ($('#agHoy')) $('#agHoy').onclick = () => { FECHA_AG = hoy(); re(); };
  main.onclick = e => { const d = e.target.closest('[data-dia]'); if (d) { FECHA_AG = d.dataset.dia; VISTA_AG = 'dia'; re(); } };
}
