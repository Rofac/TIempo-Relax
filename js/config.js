/* Configuración, copias de seguridad, licencia y "Más" (en el celular). */
'use strict';

PANTALLAS.mas = async (main) => {
  titulo('Más');
  main.innerHTML = `<div class="card" style="padding:6px 14px"><div class="lista">
    <div class="it" data-ir2="informes"><div class="av">${ico('informe')}</div><div class="tx"><b>Informes</b><small>Servicios más pedidos, packs, ausencias, mejores clientas, gastos</small></div>${ico('flecha')}</div>
    <div class="it" data-ir2="config"><div class="av">${ico('config')}</div><div class="tx"><b>Configuración</b><small>Servicios y precios, packs, horario, mensajes, clave, licencia</small></div>${ico('flecha')}</div>
    <div class="it" id="maCopia"><div class="av">${ico('copia')}</div><div class="tx"><b>Copia de seguridad</b><small>${DB.cfg.ultima_copia ? 'Última: ' + dmy(DB.cfg.ultima_copia) : 'Nunca se hizo'}</small></div>${ico('flecha')}</div></div></div>`;
  main.onclick = e => { const b = e.target.closest('[data-ir2]'); if (b) ir(b.dataset.ir2, null, true); if (e.target.closest('#maCopia')) hacerCopia(); };
};

async function hacerCopia() {
  const antes = DB.cfg.ultima_copia; await DB.setCfg('ultima_copia', ahora(), true);
  const j = DB.exportar(), txt = JSON.stringify(j);
  const nombre = `Copia ${(DB.cfg.nombre || 'Estetica').replace(/[^\w áéíóúñÁÉÍÓÚÑ-]/g, '')} ${hoy()} ${ahora().slice(11).replace(':', 'h')}.json`;
  const file = new File([txt], nombre, { type: 'application/json' });
  let ok = false;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Copia de seguridad', text: `Copia de seguridad de ${DB.cfg.nombre} (${dmy(hoy())})` }); ok = true; }
    catch (e) { if (e.name === 'AbortError') { await DB.setCfg('ultima_copia', antes || '', true); return; } }
  }
  if (!ok) { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
  toast(ok ? 'Copia enviada' : 'Copia descargada en la carpeta Descargas');
  if (ACTUAL === 'inicio' || ACTUAL === 'config' || ACTUAL === 'mas') recargar();
}
function restaurarCopia(j) {
  return (async () => {
    const n = (j.data && j.data.clientas || []).length;
    if (!await confirmar(`Se van a REEMPLAZAR todos los datos de este celular por la copia de <b>${esc(j.negocio || '')}</b> del <b>${esc(dmy(j.fecha))} ${esc((j.fecha || '').slice(11))}</b> (${n} clientas). ¿Seguro?`, 'Sí, restaurar', true)) return;
    try { await DB.copiaDiaria(); await DB.importar(j); toast('Copia restaurada'); setTimeout(() => location.reload(), 900); } catch (e) { fallo(e); }
  })();
}

let LIC_ESTADO = null;
PANTALLAS.config = async (main) => {
  titulo('Configuración');
  const c = DB.cfg, lic = LIC_ESTADO = await LIC.estado(), copias = await DB.copiasInternas();
  const servs = DB.todos('servicios').slice().sort((a, b) => (a.activo === false) - (b.activo === false) || (a.orden || 0) - (b.orden || 0));
  const paqs = DB.todos('paquetes').slice().sort((a, b) => (a.activo === false) - (b.activo === false) || a.nombre.localeCompare(b.nombre, 'es'));
  const hz = horario(), cats = [...new Set(servs.map(x => x.categoria || 'Otros'))];
  main.innerHTML = `
    <div class="card"><h2>${ico('hoja')} Servicios y precios<span class="sp"></span><button class="btn chico acento" id="cfSN">${ico('plus')} Servicio</button></h2>
      ${cats.map(k => `<div class="serv-cat">${esc(k)}</div><div class="lista">${servs.filter(x => (x.categoria || 'Otros') === k).map(x => `<div class="it" data-sv="${x.id}" style="${x.activo === false ? 'opacity:.5' : ''}"><div class="tx"><b>${esc(x.nombre)}</b>
        <small>${x.duracion} min${x.activo === false ? ' · no se usa' : ''}</small></div><b class="num ${x.precio || x.activo === false ? '' : 'mal'}">${x.precio ? money(x.precio) : 'Poné el precio'}</b>${ico('lapiz')}</div>`).join('')}</div>`).join('')}
      <p class="muted chico" style="margin-bottom:0">Al cambiar un precio, los cobros viejos no cambian. Al cobrar, el precio se puede tocar para ese caso.</p></div>

    <div class="card"><h2>${ico('pack')} Packs<span class="sp"></span><button class="btn chico acento" id="cfPN">${ico('plus')} Pack</button></h2>
      <div class="lista">${paqs.map(x => `<div class="it" data-pq="${x.id}" style="${x.activo === false ? 'opacity:.5' : ''}"><div class="tx"><b>${esc(x.nombre)}</b>
        <small>${x.sesiones} sesiones de ${esc(DB.get('servicios', x.servicio_id)?.nombre || '?')}${x.vigencia_dias ? ' · vence a los ' + x.vigencia_dias + ' días' : ' · no vence'}${x.activo === false ? ' · no se vende' : ''}</small></div>
        <b class="num">${money(x.precio)}</b>${ico('lapiz')}</div>`).join('') || '<p class="muted" style="margin:0">Todavía no armaste packs. Ej.: "Depilación piernas · 6 sesiones".</p>'}</div></div>

    <div class="card"><h2>${ico('agenda')} Horario de atención</h2>
      <label>Días que atendés</label><div class="pasos" id="cfDias" style="margin-bottom:12px">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button type="button" class="paso ${hz.dias.includes(d) ? 'logrado' : ''}" data-d="${d}">${DIAS_C[d]}</button>`).join('')}</div>
      <div class="form"><div class="campo"><label>Desde</label><input type="time" id="cf_hd" value="${esc(hz.desde)}"></div><div class="campo"><label>Hasta</label><input type="time" id="cf_hh" value="${esc(hz.hasta)}"></div>
        <div class="campo"><label>Turnos cada (minutos)</label><select id="cf_hi">${opciones([15, 20, 30, 45, 60].map(v => ({ v, t: v + ' min' })), hz.intervalo)}</select></div></div>
      <button class="btn pri" id="cfGH">${ico('check')} Guardar</button></div>

    <div class="card"><h2>${ico('inicio')} Datos del negocio</h2><div class="form">
      <div class="campo full"><label>Nombre (aparece en comprobantes y mensajes; la licencia va a este nombre)</label><input id="cf_n" value="${esc(c.nombre)}"></div>
      <div class="campo"><label>Teléfono</label><input id="cf_t" value="${esc(c.telefono)}"></div><div class="campo"><label>Instagram</label><input id="cf_ig" value="${esc(c.instagram || '')}"></div>
      <div class="campo full"><label>Dirección</label><input id="cf_di" value="${esc(c.direccion || '')}"></div></div>
      <div class="fila" style="margin-bottom:12px"><img src="${c.logo || 'img/logo.png'}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:contain;background:#fff;border:1px solid var(--borde)">
        <label class="btn chico" style="margin:0">${ico('foto')} Cambiar logo<input type="file" accept="image/*" id="cfLogo" hidden></label>${c.logo ? '<button class="btn chico" id="cfLogoQ">Volver al de fábrica</button>' : ''}</div>
      <button class="btn pri" id="cfG1">${ico('check')} Guardar</button></div>

    <div class="card"><h2>${ico('wa')} Mensajes de WhatsApp</h2><div class="form">
      <div class="campo full"><label>Recordatorio del turno ({nombre}, {servicio}, {dia}, {hora}, {negocio})</label><textarea id="cf_mr">${esc(c.msg_recordatorio)}</textarea></div>
      <div class="campo full"><label>Saludo de cumpleaños ({nombre}, {negocio})</label><textarea id="cf_mc">${esc(c.msg_cumple)}</textarea></div>
      <div class="campo full"><label>Para las que hace mucho que no vienen ({nombre}, {negocio})</label><textarea id="cf_mv">${esc(c.msg_volver)}</textarea></div>
      <div class="campo"><label>Avisar de clientas que no vienen hace … días</label><input id="cf_ds" inputmode="numeric" value="${esc(c.dias_sin_venir)}"></div></div>
      <button class="btn pri" id="cfG2">${ico('check')} Guardar</button></div>

    <div class="card"><h2>${ico('rutina')} Listas</h2><div class="form">
      <div class="campo"><label>Medios de pago (uno por renglón)</label><textarea id="cf_me">${esc(c.medios.join('\n'))}</textarea></div>
      <div class="campo"><label>Tipos de gasto (uno por renglón)</label><textarea id="cf_ga">${esc(c.categorias_gasto.join('\n'))}</textarea></div>
      <div class="campo full"><label>Antecedentes de salud que se preguntan (uno por renglón)</label><textarea id="cf_an" style="min-height:150px">${esc((c.antecedentes || CONFIG_INICIAL.antecedentes).join('\n'))}</textarea></div></div>
      <button class="btn pri" id="cfG3">${ico('check')} Guardar</button></div>

    <div class="card"><h2>${ico('copia')} Copia de seguridad</h2>
      <p style="margin-top:0">Todo está guardado <b>en este celular</b>. Si se rompe, se pierde o la resetean, sólo se recupera con una copia.
        Tocá "Hacer copia" y mandala a <b>Google Drive</b> o a tu <b>WhatsApp</b> (por ejemplo a vos misma). Conviene una vez por semana.</p>
      <p class="${!c.ultima_copia ? 'mal' : ''}"><b>Última copia:</b> ${c.ultima_copia ? dmy(c.ultima_copia) + ' ' + c.ultima_copia.slice(11) : 'nunca'}</p>
      <div class="fila"><button class="btn acento" id="cfCp">${ico('copia')} Hacer copia</button><label class="btn" style="margin:0">${ico('subir')} Restaurar una copia<input type="file" accept=".json,application/json" id="cfRs" hidden></label>
        <label class="chk" style="margin-left:6px">Avisar cada <input id="cf_ac" inputmode="numeric" value="${esc(c.aviso_copia_dias)}" style="width:64px;min-height:38px;padding:6px"> días</label></div>
      ${copias.length ? `<p class="muted chico" style="margin-bottom:6px">Además la app guarda sola una copia por día adentro del celular (las últimas 5), por si se borra algo sin querer:</p>
        <div class="fila">${copias.map(x => `<button class="btn chico" data-ci="${x.k}">${dmy(x.fecha)}</button>`).join('')}</div>` : ''}</div>

    <div class="card"><h2>${ico('candado')} Clave del dueño</h2>
      <p style="margin-top:0" class="muted">Si la ponés, la pide para entrar a la Caja, los Informes y la Configuración, para anular cobros y para borrar clientas. Sirve si otra persona usa el celular para dar turnos.</p>
      <div class="fila"><input id="cf_pin" type="password" inputmode="numeric" placeholder="${c.pin ? 'Nueva clave (4 a 8 números)' : '4 a 8 números'}" style="max-width:240px" autocomplete="new-password">
        <button class="btn pri" id="cfPin">${c.pin ? 'Cambiar clave' : 'Poner clave'}</button>${c.pin ? `<button class="btn rojo" id="cfPinQ">Quitar clave</button>` : ''}</div></div>

    <div class="card"><h2>${ico('check')} Licencia</h2>
      <div class="estado-cuota ${lic.activa ? (lic.por_vencer ? 'warn' : 'ok') : lic.bloqueado ? 'mal' : 'warn'}" style="margin-bottom:12px"><div class="tx"><b>${esc(lic.mensaje)}</b></div></div>
      <label>Código de este celular (mandáselo a quien te vendió la app para pedir la licencia)</label>
      <div class="fila" style="margin-bottom:12px"><b style="font-size:22px;letter-spacing:2px;user-select:all" id="cfEq">${esc(lic.equipo)}</b><button class="btn chico" id="cfEqC">Copiar</button>
        <button class="btn chico" id="cfEqW">${ico('wa')} Mandar</button></div>
      <label>Clave de licencia</label><textarea id="cf_lic" style="font-family:monospace;min-height:70px">${esc(c.licencia || '')}</textarea>
      <button class="btn pri" id="cfLic" style="margin-top:10px">Activar</button></div>

    <div class="card"><h2>${ico('config')} Apariencia y ayuda</h2><div class="fila">
      <div><label>Colores</label><div class="seg" id="cfTema">${[['light', 'Claro'], ['dark', 'Oscuro'], ['auto', 'Como el celular']].map(([k, t]) => `<button data-tm="${k}" class="${(c.tema || 'light') === k ? 'act' : ''}">${t}</button>`).join('')}</div></div>
      <div><label>Tamaño de letra</label><div class="seg" id="cfLetra">${[['chica', 'Chica'], ['normal', 'Normal']].map(([k, t]) => `<button data-lt="${k}" class="${(c.letra || 'normal') === k ? 'act' : ''}">${t}</button>`).join('')}</div></div>
      <button class="btn" id="cfAct">${ico('reloj')} Registro de actividad</button><button class="btn" id="cfInst">Cómo instalar la app</button></div></div>
    <div class="card"><h2>Acerca de</h2><div class="fila"><div class="sp"><b style="font-size:18px">RoFac</b><div class="muted chico">Versión 1.0</div></div>
      <button class="btn" id="cfLegal">Términos y privacidad</button></div></div>`;
  const re = () => PANTALLAS.config(main);
  const lineas = id => $('#' + id).value.split('\n').map(x => x.trim()).filter(Boolean);
  $('#cfG1').onclick = async () => { try { const n = val('cf_n'); if (!n) throw new Error('Poné el nombre'); await DB.setCfg('nombre', n); await DB.setCfg('telefono', val('cf_t')); await DB.setCfg('instagram', val('cf_ig')); await DB.setCfg('direccion', val('cf_di')); pintarMenu(); toast('Guardado'); arrancarLicencia(); re(); } catch (e) { fallo(e); } };
  $('#cfLogo').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { await DB.setCfg('logo', await leerFoto(f, 360)); pintarMenu(); toast('Logo cambiado'); re(); } catch (x) { fallo(x); } };
  if ($('#cfLogoQ')) $('#cfLogoQ').onclick = async () => { try { await DB.setCfg('logo', ''); pintarMenu(); re(); } catch (x) { fallo(x); } };
  $('#cfG2').onclick = async () => { try { await DB.setCfg('msg_recordatorio', $('#cf_mr').value.trim() || CONFIG_INICIAL.msg_recordatorio); await DB.setCfg('msg_cumple', $('#cf_mc').value.trim() || CONFIG_INICIAL.msg_cumple);
    await DB.setCfg('msg_volver', $('#cf_mv').value.trim() || CONFIG_INICIAL.msg_volver); await DB.setCfg('dias_sin_venir', Math.max(7, parseInt(val('cf_ds')) || 60)); toast('Guardado'); } catch (e) { fallo(e); } };
  $('#cfG3').onclick = async () => { try { const me = lineas('cf_me'), ga = lineas('cf_ga'), an = lineas('cf_an'); if (!me.length) throw new Error('Tiene que haber al menos un medio de pago');
    await DB.setCfg('medios', me); await DB.setCfg('categorias_gasto', ga.length ? ga : ['Otros']); await DB.setCfg('antecedentes', an); toast('Guardado'); } catch (e) { fallo(e); } };
  $('#cfDias').onclick = e => { const b = e.target.closest('[data-d]'); if (b) b.classList.toggle('logrado'); };
  $('#cfGH').onclick = async () => { try { const d = $$('#cfDias .logrado').map(b => +b.dataset.d), de = val('cf_hd'), ha = val('cf_hh');
    if (!d.length) throw new Error('Marcá al menos un día'); if (!de || !ha || de >= ha) throw new Error('Revisá el horario: "desde" tiene que ser antes que "hasta"');
    await DB.setCfg('horario', { dias: d, desde: de, hasta: ha, intervalo: +val('cf_hi') || 30 }); toast('Horario guardado'); } catch (e) { fallo(e); } };
  $('#cfSN').onclick = () => editarServicio({}, re);
  $('#cfPN').onclick = () => editarPaquete({}, re);
  main.onclick = async e => {
    const sv = e.target.closest('[data-sv]'); if (sv) return editarServicio(DB.get('servicios', sv.dataset.sv), re);
    const pq = e.target.closest('[data-pq]'); if (pq) return editarPaquete(DB.get('paquetes', pq.dataset.pq), re);
    const ci = e.target.closest('[data-ci]'); if (ci) { const j = await DB.copiaInterna(ci.dataset.ci); if (j) restaurarCopia(j); }
  };
  $('#cfCp').onclick = () => hacerCopia();
  $('#cf_ac').onchange = e => DB.setCfg('aviso_copia_dias', Math.max(1, parseInt(e.target.value) || 7), true);
  $('#cfRs').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { restaurarCopia(JSON.parse(await f.text())); } catch (x) { fallo(new Error('No se pudo leer el archivo de copia')); } };
  $('#cfPin').onclick = async () => { const p = val('cf_pin'); if (!/^\d{4,8}$/.test(p)) return toast('La clave tiene que ser de 4 a 8 números', true); await DB.setCfg('pin', await sha256(p), true); DESBLOQUEADO = true; await DB.anotar('Clave del dueño cambiada'); toast('Clave guardada'); re(); };
  if ($('#cfPinQ')) $('#cfPinQ').onclick = async () => { if (!await confirmar('¿Quitar la clave del dueño?', 'Quitar', true)) return; await DB.setCfg('pin', '', true); toast('Clave quitada'); re(); };
  $('#cfEqC').onclick = async () => { try { await navigator.clipboard.writeText(lic.equipo); toast('Código copiado'); } catch (e) { toast('Mantené apretado el código para copiarlo'); } };
  $('#cfEqW').onclick = () => abrirWa('', `Hola! Te paso el código del celular para la licencia de ${DB.cfg.nombre}: ${lic.equipo}`);
  $('#cfLic').onclick = async () => { const k = $('#cf_lic').value.replace(/\s/g, ''); const r = await LIC.verificar(k, DB.cfg.nombre, lic.equipo);
    if (k && !r.activa) return toast(r.mensaje, true); await DB.setCfg('licencia', k, true); await DB.anotar('Licencia cargada'); toast(r.activa ? '¡Licencia activada!' : 'Licencia borrada'); await arrancarLicencia(); re(); };
  $('#cfLetra').onclick = async e => { const b = e.target.closest('[data-lt]'); if (!b) return; await DB.setCfg('letra', b.dataset.lt, true); aplicarTema(); re(); };
  $('#cfTema').onclick = async e => { const b = e.target.closest('[data-tm]'); if (!b) return; await DB.setCfg('tema', b.dataset.tm, true); aplicarTema(); re(); };
  $('#cfAct').onclick = () => modal('Registro de actividad', `<table class="t">${DB.todos('actividad').slice(-300).reverse().map(a => `<tr><td class="chico muted" style="white-space:nowrap">${dmy(a.fecha)} ${a.fecha.slice(11)}</td><td><b>${esc(a.accion)}</b><div class="chico muted">${esc(a.detalle)}</div></td></tr>`).join('') || '<tr><td class="muted">Sin actividad</td></tr>'}</table>`, '', 'ancho');
  $('#cfInst').onclick = ayudaInstalar;
  $('#cfLegal').onclick = verLegal;
};

function editarServicio(x, luego) {
  const cats = [...new Set(DB.todos('servicios').map(s => s.categoria).filter(Boolean))];
  const m = modal(x.id ? 'Modificar servicio' : 'Servicio nuevo', `<div class="form"><div class="campo full"><label>Nombre</label><input id="sv_n" value="${esc(x.nombre || '')}" placeholder="Ej. Masaje descontracturante, Depilación láser axilas"></div>
    <div class="campo"><label>Rubro</label><input id="sv_c" list="svCats" value="${esc(x.categoria || '')}" placeholder="Ej. Masajes"><datalist id="svCats">${cats.map(k => `<option value="${esc(k)}">`).join('')}</datalist></div>
    <div class="campo"><label>Precio</label>${campoMonto('id="sv_p"', x.precio ?? '')}</div>
    <div class="campo"><label>Duración (minutos)</label><input id="sv_d" inputmode="numeric" value="${esc(x.duracion ?? 60)}"></div>
    <div class="campo"><label>Orden en la lista</label><input id="sv_o" inputmode="numeric" value="${esc(x.orden ?? (DB.todos('servicios').length + 1))}"></div>
    ${x.id ? `<div class="campo full"><label class="chk"><input type="checkbox" id="sv_a" ${x.activo !== false ? 'checked' : ''}> Lo ofrezco (si lo destildás, deja de aparecer para dar turnos)</label></div>` : ''}</div>`,
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" id="svOk">${ico('check')} Guardar</button>`);
  $('#svOk', m).onclick = async () => { try {
    const nombre = val('sv_n', m).replace(/\s+/g, ' '), precio = r2(n0($('#sv_p', m).value)), duracion = parseInt(val('sv_d', m)) || 0;
    if (!nombre) throw new Error('Poné el nombre'); if (precio < 0 || isNaN(aNum($('#sv_p', m).value || '0'))) throw new Error('Precio inválido'); if (duracion < 5 || duracion > 600) throw new Error('Revisá la duración');
    if (DB.todos('servicios').some(s => s.id !== x.id && normal(s.nombre) === normal(nombre))) throw new Error('Ya hay un servicio con ese nombre');
    const activo = x.id ? $('#sv_a', m).checked : true;
    if (!activo && DB.todos('servicios').filter(s => s.activo !== false && s.id !== x.id).length < 1) throw new Error('Tiene que quedar al menos un servicio');
    const viejo = x.precio;
    await DB.guardar('servicios', Object.assign(x, { nombre, categoria: val('sv_c', m) || 'Otros', precio, duracion, orden: parseInt(val('sv_o', m)) || 0, activo }));
    await DB.anotar('Servicio guardado', `${nombre} ${money(precio)}${viejo !== undefined && viejo !== precio ? ' (antes ' + money(viejo) + ')' : ''}`); m.cerrar(); toast('Guardado'); luego && luego(); } catch (e) { fallo(e); } };
}
function editarPaquete(x, luego) {
  const servs = serviciosActivos();
  if (!servs.length) return toast('Primero cargá los servicios', true);
  const m = modal(x.id ? 'Modificar pack' : 'Pack nuevo', `<div class="form"><div class="campo full"><label>Servicio</label><select id="pq_s">${opciones(servs.map(s => ({ v: s.id, t: s.nombre })), x.servicio_id)}</select></div>
    <div class="campo"><label>Cantidad de sesiones</label><input id="pq_c" inputmode="numeric" value="${esc(x.sesiones ?? 6)}"></div>
    <div class="campo"><label>Precio del pack</label>${campoMonto('id="pq_p"', x.precio ?? '')}</div>
    <div class="campo"><label>Vence a los … días (vacío = no vence)</label><input id="pq_v" inputmode="numeric" value="${esc(x.vigencia_dias || '')}" placeholder="Ej. 180"></div>
    <div class="campo"><label>Nombre (opcional)</label><input id="pq_n" value="${esc(x.nombre || '')}" placeholder="Se arma solo"></div>
    ${x.id ? `<div class="campo full"><label class="chk"><input type="checkbox" id="pq_a" ${x.activo !== false ? 'checked' : ''}> Lo vendo (los que ya se vendieron siguen igual)</label></div>` : ''}</div>
    <p class="chico" id="pqRes" style="font-weight:800"></p>`,
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" id="pqOk">${ico('check')} Guardar</button>`);
  const res = () => { const s = DB.get('servicios', val('pq_s', m)), n = parseInt(val('pq_c', m)) || 0, p = n0($('#pq_p', m).value);
    $('#pqRes', m).innerHTML = s && n > 0 && p > 0 ? `Cada sesión sale ${money(p / n)}${s.precio ? ` (suelta: ${money(s.precio)}; ahorra ${money(Math.max(0, s.precio * n - p))})` : ''}` : ''; };
  m.addEventListener('input', res); m.addEventListener('change', res); res();
  $('#pqOk', m).onclick = async () => { try {
    const s = DB.get('servicios', val('pq_s', m)), n = parseInt(val('pq_c', m)) || 0, precio = r2(n0($('#pq_p', m).value)), vig = parseInt(val('pq_v', m)) || 0;
    if (!s) throw new Error('Elegí el servicio'); if (n < 2 || n > 100) throw new Error('El pack tiene que tener entre 2 y 100 sesiones'); if (precio <= 0) throw new Error('Poné el precio del pack');
    if (vig < 0 || vig > 3650) throw new Error('Revisá los días de vencimiento');
    const nombre = val('pq_n', m) || `${s.nombre} · ${n} sesiones`;
    await DB.guardar('paquetes', Object.assign(x, { servicio_id: s.id, sesiones: n, precio, vigencia_dias: vig, nombre, activo: x.id ? $('#pq_a', m).checked : true }));
    await DB.anotar('Pack guardado', `${nombre} ${money(precio)}`); m.cerrar(); toast('Guardado'); luego && luego(); } catch (e) { fallo(e); } };
}

function ayudaInstalar() {
  modal('Cómo instalar la app', `<ol style="padding-left:20px;line-height:1.7;margin-top:0">
    <li>En el celular, abrí <b>Chrome</b> y entrá a la dirección de la app.</li>
    <li>Tocá el menú <b>⋮</b> (arriba a la derecha) y elegí <b>"Instalar aplicación"</b> o <b>"Agregar a la pantalla principal"</b>.</li>
    <li>Queda el ícono de ${esc(DB.cfg.nombre)} en la pantalla. De ahí en más se abre como cualquier app, <b>sin internet</b>.</li></ol>
    <p><b>En iPhone:</b> abrí la dirección en <b>Safari</b>, tocá <b>Compartir</b> (el cuadrado con la flecha) y elegí <b>"Agregar a pantalla de inicio"</b>.</p>
    <p><b>Importante:</b> los datos quedan en el celular. No borres los datos de Chrome ni "desinstales" la app sin antes hacer una copia de seguridad.</p>`, '<button class="btn pri" data-cerrar>Entendido</button>');
}
