/* Cobros: atención (servicios, packs, sesiones de pack, otros), pagos de deuda, señas y comprobantes por WhatsApp. */
'use strict';

/* filas de pago: puede pagar con varios medios; el último se completa con lo que falta */
function zonaPagos(cont, total) {
  const medios = [...DB.cfg.medios];
  let filas = [{ medio: medios[0], monto: total }];
  const pintar = () => {
    cont.innerHTML = filas.map((f, i) => `<div class="pagos-fila"><div><label>${i ? 'Otro medio' : 'Medio de pago'}</label><select data-pm="${i}">${opciones(medios, f.medio)}</select></div>
      <div><label>Monto</label>${campoMonto(`data-pv="${i}"`, f.monto)}</div>${i ? `<button class="ib" data-px="${i}" title="Quitar">${ico('x')}</button>` : '<span></span>'}</div>`).join('') +
      `<div class="fila"><button class="btn chico" type="button" data-pmas>${ico('plus')} Pagar con otro medio</button><span class="sp"></span><span id="zpRes" class="chico" style="font-weight:800"></span></div>`;
    res();
  };
  const res = () => {
    const s = r2(filas.reduce((a, f) => a + n0(f.monto), 0)), d = r2(total.v - s);
    const el = cont.querySelector('#zpRes');
    if (el) el.innerHTML = Math.abs(d) < 0.01 ? '<span class="ok">✓ Justo</span>' : d > 0 ? `<span class="mal">Falta ${money2(d)}</span>` : `<span class="warn">Sobra ${money2(-d)}</span>`;
  };
  total = { v: total };
  cont.oninput = e => {
    const i = e.target.dataset.pv; if (i === undefined) return;
    filas[+i].monto = e.target.value;
    if (+i < filas.length - 1) { const k = filas.length - 1, resto = r2(total.v - filas.slice(0, -1).reduce((a, f) => a + n0(f.monto), 0));
      filas[k].monto = Math.max(0, resto); const el = cont.querySelector(`[data-pv="${k}"]`); if (el && document.activeElement !== el) el.value = fmtIn(filas[k].monto); }
    res();
  };
  cont.onchange = e => { const i = e.target.dataset.pm; if (i !== undefined) filas[+i].medio = e.target.value; };
  cont.onclick = e => {
    if (e.target.closest('[data-pmas]')) { const s = filas.reduce((a, f) => a + n0(f.monto), 0); filas.push({ medio: medios.find(m => !filas.some(f => f.medio === m)) || medios[0], monto: Math.max(0, r2(total.v - s)) }); pintar(); }
    const x = e.target.closest('[data-px]'); if (x) { filas.splice(+x.dataset.px, 1); pintar(); }
  };
  pintar();
  return {
    fijar(t) { total.v = t; filas = [{ medio: filas[0].medio, monto: t }]; pintar(); },
    pagos: () => filas.map(f => ({ medio: f.medio, monto: n0(f.monto) })).filter(p => p.monto > 0),
  };
}

function elegirClienta(tituloV, luego) {
  const m = modal(tituloV, `<div class="buscar" style="margin-bottom:10px">${ico('buscar')}<input id="elB" placeholder="Nombre o teléfono" autofocus autocomplete="off"></div><div class="lista" id="elL"></div>`,
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn" id="elN">${ico('plus')} Clienta nueva</button>`);
  const p = q => {
    let l = clientasActivas(); if (q) l = l.filter(c => coincide(`${c.nombre} ${c.telefono || ''}`, q));
    $('#elL', m).innerHTML = l.slice(0, 60).map(c => `<div class="it" data-el="${c.id}"><div class="av">${esc(iniciales(c.nombre))}</div><div class="tx"><b>${esc(c.nombre)}</b><small>${esc(c.telefono || '')}</small></div>
      ${Math.abs(c.saldo || 0) > 0.009 ? `<span class="pill ${claseSaldo(c.saldo)}">${textoSaldo(c.saldo)}</span>` : ''}</div>`).join('') || vacio('alumnos', q ? 'No hay ninguna con ese nombre' : 'Todavía no cargaste clientas');
  };
  p('');
  $('#elB', m).oninput = e => p(e.target.value);
  $('#elL', m).onclick = e => { const b = e.target.closest('[data-el]'); if (b) { m.cerrar(); luego(DB.get('clientas', b.dataset.el)); } };
  $('#elN', m).onclick = () => { const q = val('elB', m); m.cerrar(); editarClienta({ nombre: q }, luego); };
}

/* ---------------------------------------------------------------- cobrar una atención */
function cobrarAtencion(cid, luego, turno) {
  if (!cid) return elegirClienta('¿A quién le cobrás?', c => cobrarAtencion(c.id, luego, turno));
  const c = DB.get('clientas', cid);
  const servs = serviciosActivos(), paquetes = DB.donde('paquetes', p => p.activo !== false);
  let lineas = [], refPack = 0;
  const lineaServicio = sid => { const pk = packParaServicio(c.id, sid); return pk ? { tipo: 'SESION_PACK', pack_id: pk.id, servicio_id: sid, cant: 1 } : { tipo: 'SERVICIO', servicio_id: sid, cant: 1, precio: DB.get('servicios', sid)?.precio || 0 }; };
  if (turno) lineas.push(lineaServicio(turno.servicio_id));
  const aFavor = Math.max(0, -(c.saldo || 0)), debe = Math.max(0, c.saldo || 0);
  const m = modal(`${ico('caja')} Cobrar`, `<div class="fila" style="margin-bottom:8px"><div class="av">${esc(iniciales(c.nombre))}</div><div class="sp"><b>${esc(c.nombre)}</b>
      <div class="chico muted">${turno ? `Turno ${dmy(turno.fecha)} ${turno.hora} · ${esc(turno.servicio)}` : 'Cobro sin turno'}</div></div><span class="pill ${claseSaldo(c.saldo)}">${textoSaldo(c.saldo)}</span></div>
    <div id="caL"></div>
    <div class="fila" style="margin:8px 0"><select id="caAdd" style="flex:1;min-width:200px"><option value="">+ Agregar…</option>
      <optgroup label="Servicio">${servs.map(s => `<option value="S${s.id}">${esc(s.nombre)}${s.precio ? ' · ' + money(s.precio) : ''}</option>`).join('')}</optgroup>
      ${paquetes.length ? `<optgroup label="Vender un pack">${paquetes.map(p => `<option value="P${p.id}">${esc(p.nombre)} · ${money(p.precio)}</option>`).join('')}</optgroup>` : ''}
      <option value="O">Otra cosa (producto, crema…)</option></select></div>
    <div class="form"><div class="campo"><label>Descuento ($)</label>${campoMonto('id="caD"', '')}</div><div class="campo"><label>Fecha</label><input type="date" id="caF" value="${turno ? turno.fecha : hoy()}"></div></div>
    <div id="caTot" style="font-size:22px;font-weight:900;margin:4px 0 6px"></div>
    ${aFavor ? `<p class="chico" style="margin:0 0 8px"><b class="info">Tiene ${money2(aFavor)} a favor</b> (seña o pago adelantado): se descuenta solo.</p>` : ''}
    <div class="seg" id="caModo" style="margin-bottom:10px"><button data-md="paga" class="act">Paga ahora</button><button data-md="debe">Queda debiendo</button>${debe ? '<button data-md="todo">Paga + lo que debía</button>' : ''}</div>
    <div id="caP"></div><div class="resumen-pago" id="caR"></div>
    <details style="margin-top:12px" ${turno ? 'open' : ''}><summary style="font-weight:800;cursor:pointer">${ico('nota')} Notas de la sesión (quedan en su ficha)</summary>
      <div class="form" style="margin-top:8px"><div class="campo"><label>Zona</label><input id="caZ" placeholder="Ej. piernas completas, axilas, espalda"></div>
      <div class="campo"><label>Parámetros / productos</label><input id="caPa" placeholder="Ej. 18 J, 3 pasadas · aceite de almendras"></div>
      <div class="campo full"><label>Observaciones</label><textarea id="caO" placeholder="Cómo respondió, qué hacer la próxima"></textarea></div></div></details>`,
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn acento" id="caOk">${ico('check')} Cobrar</button>`, 'ancho');
  let modo = 'paga';
  const total = () => r2(Math.max(0, lineas.reduce((s, l) => s + (l.tipo === 'SESION_PACK' ? 0 : (l.cant || 1) * n0(l.precio)), 0) - n0($('#caD', m).value)));
  const pintarL = () => {
    $('#caL', m).innerHTML = lineas.map((l, i) => {
      let nombre, extra = '';
      if (l.tipo === 'SESION_PACK') {
        if (l.pack_ref !== undefined) nombre = `${esc(DB.get('servicios', l.servicio_id)?.nombre || '')} <span class="pill info">sesión 1 del pack nuevo</span>`;
        else { const p = DB.get('packs', l.pack_id), e = estadoPack(p); nombre = `${esc(DB.get('servicios', p.servicio_id)?.nombre || p.nombre)} <span class="pill info">pack: sesión ${e.usadas + 1} de ${p.sesiones}</span>`; }
        extra = `<button class="btn chico" data-cobrar="${i}">Cobrarla aparte</button>`;
      } else if (l.tipo === 'SERVICIO') {
        nombre = esc(DB.get('servicios', l.servicio_id)?.nombre || '');
        const pk = packParaServicio(c.id, l.servicio_id); if (pk) extra = `<button class="btn chico" data-usar="${i}">Usar su pack</button>`;
      } else if (l.tipo === 'PACK') nombre = `${esc(DB.get('paquetes', l.paquete_id)?.nombre || '')} <span class="pill acento">pack nuevo</span>`;
      else nombre = `<input data-on="${i}" value="${esc(l.nombre || '')}" placeholder="¿Qué es?" style="min-height:36px;padding:6px 8px">`;
      return `<div class="prod-fila"><div class="tx"><b>${nombre}</b>${extra ? `<div style="margin-top:4px">${extra}</div>` : ''}</div>
        ${l.tipo === 'SESION_PACK' ? '<b class="num">$ 0</b>' : campoMonto(`data-lp="${i}" style="width:120px;text-align:right"`, l.precio)}<button class="ib" data-lx="${i}" title="Quitar">${ico('x')}</button></div>`;
    }).join('') || `<p class="muted">Agregá lo que se hizo con el menú de abajo.</p>`;
  };
  const zp = zonaPagos($('#caP', m), 0);
  const resumen = () => {
    const t = total(), pg = r2(zp.pagos().reduce((s, p) => s + p.monto, 0)), queda = r2((c.saldo || 0) + t - pg);
    $('#caTot', m).innerHTML = `Total: ${money2(t)}`;
    $('#caR', m).innerHTML = `Paga ${money2(pg)} · <span class="${claseSaldo(queda)}">${Math.abs(queda) < 0.01 ? 'Queda al día' : queda > 0 ? 'Queda debiendo ' + money2(queda) : 'Le queda a favor ' + money2(-queda)}</span>`;
  };
  const aplicarModo = () => {
    const t = total(), sal = c.saldo || 0;
    zp.fijar(modo === 'debe' ? 0 : modo === 'todo' ? r2(t + Math.max(0, sal)) : Math.max(0, r2(t + Math.min(0, sal))));
    $('#caP', m).hidden = modo === 'debe'; resumen();
  };
  const todo = () => { pintarL(); aplicarModo(); };
  $('#caModo', m).onclick = e => { const b = e.target.closest('[data-md]'); if (!b) return; modo = b.dataset.md; $$('#caModo button', m).forEach(x => x.classList.toggle('act', x === b)); aplicarModo(); };
  $('#caAdd', m).onchange = e => {
    const v = e.target.value; e.target.value = ''; if (!v) return;
    if (v[0] === 'S') lineas.push(lineaServicio(+v.slice(1)));
    else if (v[0] === 'P') {
      const pl = DB.get('paquetes', +v.slice(1)), ref = ++refPack;
      lineas.push({ tipo: 'PACK', paquete_id: pl.id, precio: pl.precio, cant: 1, ref });
      // si en este cobro hay una sesión de ese mismo servicio cobrada aparte, pasa a ser la primera sesión del pack nuevo
      const s = lineas.find(l => l.tipo === 'SERVICIO' && l.servicio_id === pl.servicio_id);
      if (s) Object.assign(s, { tipo: 'SESION_PACK', pack_ref: ref, precio: 0 });
    } else lineas.push({ tipo: 'OTRO', nombre: '', precio: '', cant: 1 });
    todo();
  };
  $('#caL', m).onclick = e => {
    const x = e.target.closest('[data-lx]'), u = e.target.closest('[data-usar]'), co = e.target.closest('[data-cobrar]');
    if (x) { const l = lineas[+x.dataset.lx]; lineas.splice(+x.dataset.lx, 1);
      if (l.tipo === 'PACK') for (const s of lineas.filter(s => s.pack_ref === l.ref)) { delete s.pack_ref; Object.assign(s, { tipo: 'SERVICIO', precio: DB.get('servicios', s.servicio_id)?.precio || 0 }); } }
    if (u) { const l = lineas[+u.dataset.usar]; Object.assign(l, { tipo: 'SESION_PACK', pack_id: packParaServicio(c.id, l.servicio_id).id, precio: 0 }); }
    if (co) { const l = lineas[+co.dataset.cobrar]; delete l.pack_ref; delete l.pack_id; Object.assign(l, { tipo: 'SERVICIO', precio: DB.get('servicios', l.servicio_id)?.precio || 0 }); }
    if (x || u || co) todo();
  };
  m.addEventListener('input', e => {
    if (e.target.dataset.lp !== undefined) { lineas[+e.target.dataset.lp].precio = e.target.value; aplicarModo(); }
    else if (e.target.dataset.on !== undefined) lineas[+e.target.dataset.on].nombre = e.target.value;
    else if (e.target.id === 'caD') aplicarModo();
    else resumen();
  });
  todo();
  $('#caOk', m).onclick = async () => {
    const btn = $('#caOk', m); if (btn.disabled) return; btn.disabled = true;     // un solo cobro aunque toquen dos veces
    try {
      const t = total(), pg = modo === 'debe' ? 0 : r2(zp.pagos().reduce((s, p) => s + p.monto, 0)), queda = r2((c.saldo || 0) + t - pg);
      const servHoy = new Set(lineas.filter(l => l.servicio_id && l.tipo !== 'PACK').map(l => l.servicio_id)), f = val('caF', m);
      const repetido = DB.donde('ventas', v => v.estado === 'ACTIVO' && v.clienta_id === c.id && v.fecha.slice(0, 10) === f && v.items.some(l => l.tipo !== 'PACK' && servHoy.has(l.servicio_id)))[0];
      if (repetido && !await confirmar(`A ${esc(c.nombre)} ya le cobraste <b>${esc(repetido.items.map(l => l.nombre).join(', '))}</b> ese día (a las ${repetido.fecha.slice(11, 16)}, ${money2(repetido.total)}).<br><br>¿Le cobrás otra vez?`, 'Sí, es otro', false)) { btn.disabled = false; return; }
      if (t > 0 && queda > Math.max(0, c.saldo || 0) + 0.009 && !await confirmar(`${pg ? `Paga ${money2(pg)} y queda` : 'No paga nada ahora: queda'} <b class="mal">debiendo ${money2(queda)}</b>.<br><br>¿Está bien? (si ya te pagó, tocá Cancelar y elegí "Paga ahora")`, 'Sí, queda debiendo', false)) { btn.disabled = false; return; }
      const items = lineas.map(l => l.tipo === 'PACK' ? { tipo: 'PACK', paquete_id: l.paquete_id, precio: l.precio, ref: l.ref }
        : l.tipo === 'SESION_PACK' ? { tipo: 'SESION_PACK', pack_id: l.pack_id, pack_ref: l.pack_ref, servicio_id: l.servicio_id, cant: 1 }
        : l.tipo === 'SERVICIO' ? { tipo: 'SERVICIO', servicio_id: l.servicio_id, precio: l.precio, cant: 1 } : { tipo: 'OTRO', nombre: l.nombre, precio: l.precio, cant: 1 });
      const v = await registrarVenta({ clienta_id: c.id, turno_id: turno ? turno.id : null, items, descuento: $('#caD', m).value, pagos: modo === 'debe' ? [] : zp.pagos(), fecha: val('caF', m),
        sesion: { zona: val('caZ', m), detalle: val('caPa', m), nota: $('#caO', m).value.trim() } });
      m.cerrar(); toast('Cobro guardado'); luego && luego(); verVenta(v.id, luego, true);
    } catch (er) { btn.disabled = false; fallo(er); }
  };
}

function textoVenta(v) {
  const c = DB.get('clientas', v.clienta_id), queda = r2(v.saldo_antes + v.total - v.pagado);
  const packs = v.items.filter(l => l.tipo === 'PACK' || l.tipo === 'SESION_PACK').map(l => DB.get('packs', l.pack_id)).filter(Boolean);
  return `*${DB.cfg.nombre}*\nComprobante N° ${v.id} · ${dmy(v.fecha)}\n${c ? c.nombre : ''}\n` +
    v.items.map(l => `• ${l.nombre}${l.subtotal ? ': ' + money2(l.subtotal) : ''}`).join('\n') +
    (v.descuento ? `\nDescuento: −${money2(v.descuento)}` : '') + `\n*Total: ${money2(v.total)}*\n` +
    (v.saldo_antes < -0.009 ? `Seña / a favor: ${money2(Math.min(-v.saldo_antes, v.total))}\n` : '') +
    (v.pagado ? `Pagó: ${v.pagos.map(p => `${p.medio} ${money2(p.monto)}`).join(' + ')}\n` : '') +
    [...new Set(packs)].map(p => { const e = estadoPack(p); return `Pack ${p.nombre}: ${e.quedan === 1 ? 'te queda 1 sesión' : `te quedan ${e.quedan} sesiones`}${p.vence ? ' (vence ' + dmy(p.vence) + ')' : ''}\n`; }).join('') +
    (Math.abs(queda) < 0.01 ? '' : queda > 0 ? `Saldo pendiente: ${money2(queda)}\n` : `Saldo a favor: ${money2(-queda)}\n`) + '¡Gracias! 🌿';
}
function verVenta(id, luego, recien) {
  const v = DB.get('ventas', id), c = DB.get('clientas', v.clienta_id), queda = r2(v.saldo_antes + v.total - v.pagado);
  const m = modal(`Comprobante N° ${v.id}`, `<div style="text-align:center;margin-bottom:10px"><img src="${DB.cfg.logo || 'img/logo-recibo.png'}" alt="" style="width:130px;max-width:45%"></div>
    ${v.estado !== 'ACTIVO' ? `<div class="pill mal" style="margin-bottom:10px">ANULADO el ${dmy(v.anulado)}: ${esc(v.motivo)}</div>` : ''}
    <table class="t"><tr><td>Fecha</td><td class="r">${dmy(v.fecha)} ${v.fecha.slice(11)}</td></tr><tr><td>Clienta</td><td class="r"><b>${esc(c ? c.nombre : 'Clienta borrada')}</b></td></tr>
      ${v.items.map(l => `<tr><td>${esc(l.nombre)}${l.tipo === 'PACK' ? ' <span class="muted chico">(pack)</span>' : ''}</td><td class="r">${money2(l.subtotal)}</td></tr>`).join('')}
      ${v.descuento ? `<tr><td>Descuento</td><td class="r">− ${money2(v.descuento)}</td></tr>` : ''}
      <tr class="tot"><td>Total</td><td class="r">${money2(v.total)}</td></tr>
      ${v.saldo_antes < -0.009 ? `<tr><td>Tenía a favor (seña o adelanto)</td><td class="r">${money2(Math.min(-v.saldo_antes, v.total))}</td></tr>` : ''}
      ${v.pagos.map(p => `<tr><td>Pagó · ${esc(p.medio)}</td><td class="r">${money2(p.monto)}</td></tr>`).join('') || (v.saldo_antes < -0.009 ? '' : '<tr><td>No pagó en el momento</td><td></td></tr>')}
      <tr><td>Su cuenta</td><td class="r"><b class="${claseSaldo(queda)}">${textoSaldo(queda)}</b></td></tr></table>${v.nota ? `<p class="muted chico">${esc(v.nota)}</p>` : ''}`,
    `${v.estado === 'ACTIVO' ? `<button class="btn rojo" id="vvAn">${ico('trash')} Anular</button>` : ''}<button class="btn" id="vvPr">${ico('imprimir')}</button>
     <button class="btn ${recien ? '' : 'acento'}" id="vvWa">${ico('wa')} WhatsApp</button>${recien ? '<button class="btn pri" data-cerrar>Listo</button>' : ''}`);
  $('#vvWa', m).onclick = () => abrirWa(c && c.telefono, textoVenta(v));
  $('#vvPr', m).onclick = () => window.print();
  if ($('#vvAn', m)) $('#vvAn', m).onclick = async () => {
    if (DB.cfg.pin && !DESBLOQUEADO && !await pedirPin('anular un cobro')) return;
    const mot = await pedirTexto('Anular cobro', 'Motivo (ej. se cargó mal)'); if (mot === null) return;
    try { await anularVenta(v.id, mot); m.cerrar(); toast('Cobro anulado: se corrigió su cuenta y sus packs'); luego ? luego() : recargar(); } catch (er) { fallo(er); }
  };
}

/* ---------------------------------------------------------------- pago de deuda / adelanto / seña */
function cobrarUI(cid, luego, turno) {
  if (!cid) return elegirClienta('¿Quién te paga?', c => cobrarUI(c.id, luego));
  const c = DB.get('clientas', cid), debe = Math.max(0, c.saldo || 0), sena = !!turno;
  const m = modal(`${ico('caja')} ${sena ? 'Seña' : 'Pago'}`, `<p style="margin-top:0"><b>${esc(c.nombre)}</b> · <span class="${claseSaldo(c.saldo)}">${textoSaldo(c.saldo)}</span>
      ${sena ? `<br><span class="chico muted">Turno ${dmy(turno.fecha)} ${turno.hora} · ${esc(turno.servicio)}. Le queda a favor y se descuenta sola al cobrar.</span>` : ''}</p>
    <div class="campo"><label>${sena ? 'Monto de la seña' : 'Cuánto paga'}</label>${campoMonto('id="coM" autofocus', sena ? '' : debe || '')}</div><div id="coP" style="margin-top:8px"></div>
    <div class="resumen-pago" id="coR"></div><div class="campo" style="margin-top:8px"><label>Nota (opcional)</label><input id="coN"></div>`,
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn acento" id="coOk">${ico('check')} Guardar</button>`);
  const zp = zonaPagos($('#coP', m), sena ? 0 : debe);
  const res = () => { const q = r2((c.saldo || 0) - zp.pagos().reduce((s, p) => s + p.monto, 0)); $('#coR', m).innerHTML = `Después: <span class="${claseSaldo(q)}">${textoSaldo(q)}</span>`; };
  $('#coM', m).addEventListener('input', () => { zp.fijar(n0($('#coM', m).value)); res(); });
  $('#coP', m).addEventListener('input', res); res();
  $('#coOk', m).onclick = async () => {
    const btn = $('#coOk', m); if (btn.disabled) return; btn.disabled = true;
    try { const x = await cobrarClienta({ clienta_id: c.id, pagos: zp.pagos(), nota: val('coN', m), tipo: sena ? 'SENA' : 'PAGO', turno_id: sena ? turno.id : null });
      m.cerrar(); toast(sena ? 'Seña guardada' : 'Pago guardado'); luego && luego(); verCobranza(x.id, luego, true); } catch (e) { btn.disabled = false; fallo(e); }
  };
}
function textoCobranza(x) {
  const c = DB.get('clientas', x.clienta_id), q = r2(x.saldo_antes - x.monto), t = x.turno_id ? DB.get('turnos', x.turno_id) : null;
  return `*${DB.cfg.nombre}*\n${x.tipo === 'SENA' ? 'Seña' : 'Recibo de pago'} N° ${x.id} · ${dmy(x.fecha)}\n${c ? c.nombre : ''}\nRecibimos ${money2(x.monto)} (${x.pagos.map(p => p.medio).join(' + ')})\n` +
    (t ? `Turno: ${fechaLarga(t.fecha)} a las ${t.hora} · ${t.servicio}\n` : '') +
    (Math.abs(q) < 0.01 ? 'Quedás al día.' : q > 0 ? `Saldo pendiente: ${money2(q)}` : `Saldo a favor: ${money2(-q)}`) + '\n¡Gracias! 🌿';
}
function verCobranza(id, luego, recien) {
  const x = DB.get('cobranzas', id), c = DB.get('clientas', x.clienta_id), q = r2(x.saldo_antes - x.monto);
  const m = modal(`${x.tipo === 'SENA' ? 'Seña' : 'Recibo de pago'} N° ${x.id}`, `<div style="text-align:center;margin-bottom:10px"><img src="${DB.cfg.logo || 'img/logo-recibo.png'}" alt="" style="width:130px;max-width:45%"></div>
    ${x.estado !== 'ACTIVO' ? `<div class="pill mal" style="margin-bottom:10px">ANULADO el ${dmy(x.anulado)}: ${esc(x.motivo)}</div>` : ''}
    <table class="t"><tr><td>Fecha</td><td class="r">${dmy(x.fecha)} ${x.fecha.slice(11)}</td></tr><tr><td>Clienta</td><td class="r"><b>${esc(c ? c.nombre : 'Clienta borrada')}</b></td></tr>
      <tr><td>Antes</td><td class="r">${textoSaldo(x.saldo_antes)}</td></tr>${x.pagos.map(p => `<tr><td>${esc(p.medio)}</td><td class="r">${money2(p.monto)}</td></tr>`).join('')}
      <tr class="tot"><td>Pagó</td><td class="r">${money2(x.monto)}</td></tr><tr><td>Queda</td><td class="r"><b class="${claseSaldo(q)}">${textoSaldo(q)}</b></td></tr></table>${x.nota ? `<p class="muted chico">${esc(x.nota)}</p>` : ''}`,
    `${x.estado === 'ACTIVO' ? `<button class="btn rojo" id="vxAn">${ico('trash')} Anular</button>` : ''}<button class="btn" id="vxPr">${ico('imprimir')}</button>
     <button class="btn ${recien ? '' : 'acento'}" id="vxWa">${ico('wa')} WhatsApp</button>${recien ? '<button class="btn pri" data-cerrar>Listo</button>' : ''}`);
  $('#vxWa', m).onclick = () => abrirWa(c && c.telefono, textoCobranza(x));
  $('#vxPr', m).onclick = () => window.print();
  if ($('#vxAn', m)) $('#vxAn', m).onclick = async () => {
    if (DB.cfg.pin && !DESBLOQUEADO && !await pedirPin('anular un pago')) return;
    const mot = await pedirTexto('Anular pago', 'Motivo (ej. se cargó mal, se devolvió la seña)'); if (mot === null) return;
    try { await anularCobranza(x.id, mot); m.cerrar(); toast('Pago anulado: se corrigió su cuenta'); luego ? luego() : recargar(); } catch (e) { fallo(e); }
  };
}
