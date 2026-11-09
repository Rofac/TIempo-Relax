/* Clientas: lista, alta/modificación, ficha (resumen, salud, sesiones, fotos, cuenta), packs y borrado definitivo. */
'use strict';

let FILTRO_CLI = 'todas', BUSCA_CLI = '';
const cumpleEsteMes = c => c.nacimiento && c.nacimiento.slice(5, 7) === hoy().slice(5, 7);

PANTALLAS.clientas = async (main) => {
  titulo('Clientas');
  const todas = DB.todos('clientas');
  main.innerHTML = `<div class="fila" style="margin-bottom:12px">
      <div class="buscar">${ico('buscar')}<input id="cBus" placeholder="Buscar por nombre o teléfono" value="${esc(BUSCA_CLI)}" autocomplete="off"></div>
      <button class="btn acento" id="cNuevo">${ico('plus')} Clienta</button></div>
    <div class="seg" id="cFil" style="margin-bottom:12px">${[['todas', 'Todas'], ['pack', 'Con pack'], ['deben', 'Deben'], ['favor', 'A favor'], ['cumple', 'Cumplen este mes'], ['inactivas', 'Dadas de baja']]
      .map(([k, t]) => `<button data-f="${k}" class="${FILTRO_CLI === k ? 'act' : ''}">${t}</button>`).join('')}</div>
    <div class="card" style="padding:6px 14px"><div class="lista" id="cLista"></div></div>`;
  const pintar = () => {
    let l = FILTRO_CLI === 'inactivas' ? todas.filter(c => c.activo === false) : todas.filter(c => c.activo !== false);
    if (FILTRO_CLI === 'deben') l = l.filter(c => (c.saldo || 0) > 0.009);
    if (FILTRO_CLI === 'favor') l = l.filter(c => (c.saldo || 0) < -0.009);
    if (FILTRO_CLI === 'pack') l = l.filter(c => packsDe(c.id).some(p => estadoPack(p).vivo));
    if (FILTRO_CLI === 'cumple') l = l.filter(cumpleEsteMes).sort((a, b) => a.nacimiento.slice(8).localeCompare(b.nacimiento.slice(8)));
    if (BUSCA_CLI) l = l.filter(c => coincide(`${c.nombre} ${c.telefono || ''} ${c.instagram || ''}`, BUSCA_CLI));
    if (FILTRO_CLI !== 'cumple') l.sort((a, b) => FILTRO_CLI === 'deben' ? b.saldo - a.saldo : a.nombre.localeCompare(b.nombre, 'es'));
    $('#cLista').innerHTML = l.map(c => {
      const pk = packsDe(c.id).filter(p => estadoPack(p).vivo);
      return `<div class="it" data-cli="${c.id}"><div class="av">${esc(iniciales(c.nombre))}</div><div class="tx"><b>${esc(c.nombre)}</b>
        <small>${FILTRO_CLI === 'cumple' ? '🎂 ' + dm(c.nacimiento) + ' · ' : ''}${c.ultima_visita ? 'Última vez: ' + dmy(c.ultima_visita) : 'Todavía no vino'}${c.telefono ? ' · ' + esc(c.telefono) : ''}</small></div>
        ${pk.length ? `<span class="pill info">${ico('pack')} ${pk.map(p => estadoPack(p).quedan).join('+')}</span>` : ''}${Math.abs(c.saldo || 0) > 0.009 ? `<span class="pill ${claseSaldo(c.saldo)}">${textoSaldo(c.saldo)}</span>` : ''}</div>`; }).join('')
      || vacio('alumnos', todas.length ? 'No hay clientas con ese filtro' : 'Todavía no cargaste clientas. Tocá "+ Clienta".');
    if (FILTRO_CLI === 'deben' && l.length) $('#cLista').insertAdjacentHTML('afterbegin', `<div class="fila" style="padding:10px 4px;border-bottom:1px solid var(--borde)"><b class="sp">Total que te deben</b><b class="mal">${money2(l.reduce((s, c) => s + c.saldo, 0))}</b></div>`);
  };
  pintar();
  $('#cBus').oninput = debounce(e => { BUSCA_CLI = e.target.value; pintar(); }, 150);
  $('#cFil').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; FILTRO_CLI = b.dataset.f; $$('#cFil button').forEach(x => x.classList.toggle('act', x === b)); pintar(); };
  $('#cNuevo').onclick = () => editarClienta({}, c => ir('ficha', { id: c.id }, true));
  $('#cLista').onclick = e => { const b = e.target.closest('[data-cli]'); if (b) ir('ficha', { id: +b.dataset.cli }, true); };
};

function editarClienta(c, luego) {
  const m = modal(c.id ? 'Modificar clienta' : 'Clienta nueva', `<div class="form">
      <div class="campo full"><label>Nombre y apellido</label><input id="ec_n" value="${esc(c.nombre || '')}" autofocus></div>
      <div class="campo"><label>Teléfono / WhatsApp</label><input id="ec_t" type="tel" inputmode="tel" value="${esc(c.telefono || '')}"></div>
      <div class="campo"><label>Fecha de nacimiento (para el saludo de cumple)</label><input id="ec_na" type="date" value="${esc(c.nacimiento || '')}"></div>
      <div class="campo"><label>Instagram (opcional)</label><input id="ec_ig" value="${esc(c.instagram || '')}" placeholder="@usuario"></div>
      ${!c.id ? `<div class="campo"><label>Si ya te debía algo (opcional)</label>${campoMonto('id="ec_sal"', '')}</div>` : ''}
      <div class="campo full"><label>Notas</label><textarea id="ec_no" placeholder="Ej. prefiere los sábados, viene por recomendación de…">${esc(c.notas || '')}</textarea></div>
      ${c.id ? `<div class="campo full"><label class="chk"><input type="checkbox" id="ec_ac" ${c.activo !== false ? 'checked' : ''}> Sigue viniendo (si lo destildás, pasa a "Dadas de baja")</label></div>` : ''}
    </div><p class="muted chico" style="margin:0">Los antecedentes de salud se cargan después, en su ficha.</p>`,
    `${c.id ? `<button class="btn rojo" id="ecBorrar">${ico('trash')} Borrar definitivamente</button>` : ''}<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" id="ecOk">${ico('check')} Guardar</button>`, 'ancho');
  if ($('#ecBorrar', m)) $('#ecBorrar', m).onclick = () => { m.cerrar(); borrarClientaUI(c); };
  $('#ecOk', m).onclick = async () => {
    try {
      const nombre = val('ec_n', m);
      if (!c.id && DB.todos('clientas').some(x => normal(x.nombre) === normal(nombre)) && !await confirmar(`Ya hay una clienta llamada <b>${esc(nombre)}</b>. ¿Cargar otra igual?`, 'Sí, es otra')) return;
      const g = await guardarClienta(c.id ? DB.get('clientas', c.id) : {}, { nombre, telefono: val('ec_t', m), nacimiento: val('ec_na', m), instagram: val('ec_ig', m), notas: $('#ec_no', m).value,
        saldo_inicial: c.id ? undefined : $('#ec_sal', m).value, activo: c.id ? $('#ec_ac', m).checked : undefined });
      m.cerrar(); toast('Guardado'); luego && luego(g);
    } catch (e) { fallo(e); }
  };
}
async function borrarClientaUI(c) {
  if (DB.cfg.pin && !DESBLOQUEADO && !await pedirPin('borrar una clienta')) return;
  if (Math.abs(c.saldo || 0) > 0.009) return toast(`No se puede borrar: ${textoSaldo(c.saldo).toLowerCase()}. Primero dejá su cuenta al día.`, true);
  const pk = packsDe(c.id).filter(p => estadoPack(p).vivo);
  if (!await confirmar(`Se borran <b>para siempre</b> los datos de <b>${esc(c.nombre)}</b>: su ficha de salud, fotos, notas de sesiones y turnos pendientes. Sus cobros quedan en la caja pero sin el nombre.
      ${pk.length ? `<br><br><b class="mal">Ojo: tiene ${pk.length === 1 ? 'un pack con sesiones' : 'packs con sesiones'} sin usar.</b>` : ''}
      <br><br><span class="muted chico">Si sólo dejó de venir, mejor destildá "Sigue viniendo". Las copias de seguridad hechas antes pueden seguir teniendo sus datos.</span>`, 'Borrar para siempre', true)) return;
  const conf = await pedirTexto('Confirmar borrado', 'Escribí BORRAR para confirmar'); if (conf === null) return;
  if (conf.trim().toUpperCase() !== 'BORRAR') return toast('No se borró: no escribiste BORRAR', true);
  try { await borrarClienta(c.id); toast('Clienta borrada'); ir('clientas'); } catch (e) { fallo(e); }
}

/* ---------------------------------------------------------------- ficha */
let TAB_FICHA = 'resumen';
PANTALLAS.ficha = async (main, { id }) => {
  const c = DB.get('clientas', id); if (!c) { main.innerHTML = vacio('alumnos', 'Esa clienta no existe'); return; }
  titulo(c.nombre);
  const turnos = DB.donde('turnos', t => t.clienta_id === c.id).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  const proximos = turnos.filter(t => t.fecha >= hoy() && turnoVivo(t) && t.estado !== 'ATENDIDO').reverse();
  const packs = packsDe(c.id).sort((a, b) => estadoPack(b).vivo - estadoPack(a).vivo || b.id - a.id);
  const sesiones = DB.donde('sesiones', s => s.clienta_id === c.id).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  const fotos = DB.donde('fotos', f => f.clienta_id === c.id).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  const salud = c.salud || {}, marcas = [...(salud.marcados || []), salud.alergias ? 'Alergias: ' + salud.alergias : '', salud.medicacion ? 'Medicación: ' + salud.medicacion : ''].filter(Boolean);
  const ed = edad(c.nacimiento);
  const tabs = [['resumen', 'Resumen'], ['salud', 'Salud'], ['sesiones', `Sesiones (${sesiones.length})`], ['fotos', `Fotos (${fotos.length})`], ['cuenta', 'Pagos']];
  main.innerHTML = `<div class="card"><div class="ficha-cab"><div class="av g">${esc(iniciales(c.nombre))}</div><div class="tx"><h2>${esc(c.nombre)}</h2>
      <div class="muted chico">${c.telefono ? esc(c.telefono) : 'Sin teléfono'}${ed !== null ? ` · ${ed} años${cumpleEsteMes(c) ? ' · 🎂 ' + dm(c.nacimiento) : ''}` : ''}${c.instagram ? ' · ' + esc(c.instagram) : ''}</div>
      <div class="muted chico">${c.ultima_visita ? 'Última vez: ' + dmy(c.ultima_visita) : 'Todavía no vino'}${c.activo === false ? ' · <b class="mal">Dada de baja</b>' : ''}</div></div>
      <div class="fila">${c.telefono ? `<a class="btn" href="tel:${esc(c.telefono)}">${ico('tel')}</a><button class="btn" id="fWa">${ico('wa')}</button>` : ''}<button class="btn" id="fEd">${ico('lapiz')} Modificar</button></div></div>
      ${c.notas ? `<p class="muted" style="margin:10px 0 0;white-space:pre-wrap">${esc(c.notas)}</p>` : ''}
      ${marcas.length ? `<div class="antec" style="margin-top:10px">${marcas.map(x => `<span class="pill warn">${ico('salud')} ${esc(x)}</span>`).join('')}</div>` : ''}</div>
    <div class="estado-cuota ${claseSaldo(c.saldo) === 'info' ? 'ok' : claseSaldo(c.saldo)}" style="margin-bottom:14px"><div class="tx"><b>${textoSaldo(c.saldo)}</b>
      <div class="chico">${packs.filter(p => estadoPack(p).vivo).map(p => `${esc(p.nombre)}: quedan ${estadoPack(p).quedan}`).join(' · ') || 'Sin packs activos'}</div></div>
      <button class="btn" id="fTur">${ico('agenda')} Turno</button><button class="btn" id="fPag">${ico('caja')} Pago</button><button class="btn acento" id="fCob">${ico('check')} Cobrar</button></div>
    <div class="tabsf" id="fTabs">${tabs.map(([k, t]) => `<button data-tab="${k}" class="${TAB_FICHA === k ? 'act' : ''}">${t}</button>`).join('')}</div>
    <div id="fCont"></div>`;
  const re = () => ir('ficha', { id }, false).then(() => { $('#btnAtras').hidden = !PILA.length; });
  const cont = $('#fCont');
  const pintarTab = () => {
    if (TAB_FICHA === 'resumen') cont.innerHTML = `<div class="grid g2"><div>
        <div class="card" style="padding:6px 14px"><h2 style="margin:10px 0 4px">${ico('agenda')} Próximos turnos</h2><div class="lista">${proximos.map(t => `<div class="it" data-t="${t.id}"><div class="av">${+t.fecha.slice(8)}</div>
          <div class="tx"><b>${DIAS_C[diaSemana(t.fecha)]} ${dm(t.fecha)} · ${t.hora}</b><small>${esc(t.servicio)}</small></div><span class="estado-t ${t.estado}">${ESTADOS_T[t.estado]}</span></div>`).join('') || vacio('agenda', 'Sin turnos próximos')}</div></div>
        <div class="card"><h2>${ico('pack')} Packs<span class="sp"></span><button class="btn chico acento" id="fPack">${ico('plus')} Vender pack</button></h2>${packs.map(p => { const e = estadoPack(p);
          return `<div style="padding:8px 0;border-bottom:1px solid var(--borde);${p.estado !== 'ACTIVO' ? 'opacity:.5' : ''}"><div class="fila"><b class="sp">${esc(p.nombre)}</b><span class="pill ${e.vivo ? 'info' : e.vencido && e.quedan > 0 ? 'mal' : ''}">${p.estado !== 'ACTIVO' ? 'Anulado' : e.quedan <= 0 ? 'Terminado' : e.vencido ? 'Vencido' : `Quedan ${e.quedan}`}</span></div>
            <div class="pack-barra">${[...Array(p.sesiones)].map((_, i) => `<i class="${i < e.usadas ? 'u' : ''}"></i>`).join('')}</div>
            <small class="muted">${e.usadas} de ${p.sesiones} usadas · comprado ${dmy(p.fecha)}${p.vence ? ' · vence ' + dmy(p.vence) : ''}</small></div>`; }).join('') || '<p class="muted" style="margin:0">No compró packs</p>'}</div></div>
      <div><div class="card" style="padding:6px 14px"><h2 style="margin:10px 0 4px">${ico('reloj')} Historial de turnos</h2><div class="lista">${turnos.filter(t => !proximos.includes(t)).slice(0, 30).map(t => `<div class="it" data-t="${t.id}"><div class="tx"><b>${dmy(t.fecha)} · ${esc(t.servicio)}</b><small>${t.hora}</small></div><span class="estado-t ${t.estado}">${ESTADOS_T[t.estado]}</span></div>`).join('') || vacio('reloj', 'Sin turnos anteriores')}</div></div></div></div>`;
    else if (TAB_FICHA === 'salud') {
      const ants = [...new Set([...(DB.cfg.antecedentes || CONFIG_INICIAL.antecedentes), ...(salud.marcados || [])])];
      cont.innerHTML = `<div class="card"><h2>${ico('salud')} Antecedentes y cuidados</h2>
        <p class="muted chico" style="margin-top:0">Marcá lo que tenga. Sirve para saber qué tratamientos le podés hacer. ${salud.actualizado ? 'Actualizado el ' + dmy(salud.actualizado) + '.' : ''}</p>
        <div class="chips" id="saM">${ants.map(a => `<button type="button" data-a="${esc(a)}" class="${(salud.marcados || []).includes(a) ? 'act' : ''}">${esc(a)}</button>`).join('')}</div>
        <div class="form" style="margin-top:14px"><div class="campo"><label>Alergias</label><input id="sa_al" value="${esc(salud.alergias || '')}" placeholder="Ej. a la cera, al látex"></div>
          <div class="campo"><label>Medicación que toma</label><input id="sa_me" value="${esc(salud.medicacion || '')}"></div>
          <div class="campo"><label>Fototipo de piel (depilación láser)</label><select id="sa_fo">${opciones([{ v: '', t: 'Sin cargar' }, ...['I · muy clara, siempre se quema', 'II · clara, casi siempre se quema', 'III · intermedia', 'IV · morena clara', 'V · morena', 'VI · muy oscura'].map((t, i) => ({ v: ['I', 'II', 'III', 'IV', 'V', 'VI'][i], t }))], salud.fototipo || '')}</select></div>
          <div class="campo"><label>Firmó el consentimiento informado el</label><input type="date" id="sa_co" value="${esc(c.consentimiento || '')}"></div>
          <div class="campo full"><label>Otras observaciones</label><textarea id="sa_ot">${esc(salud.otras || '')}</textarea></div></div>
        <button class="btn pri" id="saOk">${ico('check')} Guardar</button>
        <p class="muted chico">Son datos de salud: guardalos sólo con el permiso de la clienta y no los compartas.</p></div>`;
      $('#saM').onclick = e => { const b = e.target.closest('[data-a]'); if (b) b.classList.toggle('act'); };
      $('#saOk').onclick = async () => { try { await guardarSalud(c, { marcados: $$('#saM button.act').map(b => b.dataset.a), alergias: val('sa_al'), medicacion: val('sa_me'), fototipo: val('sa_fo'), otras: $('#sa_ot').value }, val('sa_co')); toast('Ficha guardada'); re(); } catch (e) { fallo(e); } };
    } else if (TAB_FICHA === 'sesiones') {
      cont.innerHTML = `<div class="card" style="padding:6px 14px"><h2 style="margin:10px 0 4px">${ico('nota')} Qué se le hizo<span class="sp"></span><button class="btn chico acento" id="seN">${ico('plus')} Anotar</button></h2>
        <div class="lista">${sesiones.map(s => `<div class="it" data-se="${s.id}" style="align-items:flex-start"><div class="av">${ico('hoja')}</div><div class="tx"><b>${dmy(s.fecha)} · ${esc(s.servicio || 'Sesión')}</b>
          ${s.zona ? `<small>Zona: ${esc(s.zona)}</small>` : ''}${s.detalle ? `<small>${esc(s.detalle)}</small>` : ''}${s.nota ? `<small style="white-space:normal">${esc(s.nota)}</small>` : ''}</div></div>`).join('') || vacio('nota', 'Todavía no hay notas. Se cargan al cobrar cada atención, o con "Anotar".')}</div></div>`;
      $('#seN').onclick = () => editarSesion({ clienta_id: c.id }, re);
      cont.onclick = e => { const b = e.target.closest('[data-se]'); if (b) editarSesion(DB.get('sesiones', b.dataset.se), re); };
    } else if (TAB_FICHA === 'fotos') {
      cont.innerHTML = `<div class="card"><h2>${ico('foto')} Fotos<span class="sp"></span><label class="btn chico acento" style="margin:0">${ico('camara')} Agregar foto<input type="file" accept="image/*" id="foIn" hidden></label></h2>
        <div class="fotos">${fotos.map(f => `<div data-fo="${f.id}"><img src="${f.img}" alt=""><small>${esc(f.tipo)} · ${dm(f.fecha)}</small></div>`).join('')}</div>
        ${fotos.length ? '' : vacio('foto', 'Sacale una foto antes y otra después del tratamiento para ver los resultados.')}
        <p class="muted chico" style="margin-bottom:0">Las fotos quedan sólo en este celular (y en las copias de seguridad). Pedile permiso antes de sacarlas.</p></div>`;
      $('#foIn').onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        try { const img = await leerFoto(f, 1000);
          const q = modal('Foto nueva', `<img src="${img}" alt="" style="width:100%;border-radius:12px;margin-bottom:10px"><div class="form"><div class="campo"><label>Es</label><select id="foT">${opciones(['Antes', 'Después', 'Durante', 'Otra'])}</select></div>
            <div class="campo"><label>Nota (zona, sesión…)</label><input id="foN"></div></div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" id="foOk">${ico('check')} Guardar</button>`);
          $('#foOk', q).onclick = async () => { try { await guardarFoto(c.id, img, val('foT', q), val('foN', q)); q.cerrar(); toast('Foto guardada'); re(); } catch (er) { fallo(er); } };
        } catch (er) { fallo(er); }
      };
      cont.onclick = e => { const b = e.target.closest('[data-fo]'); if (!b) return; const f = DB.get('fotos', b.dataset.fo);
        const q = modal(`${esc(f.tipo)} · ${dmy(f.fecha)}`, `<img src="${f.img}" alt="" style="width:100%;border-radius:12px">${f.nota ? `<p>${esc(f.nota)}</p>` : ''}`, `<button class="btn rojo" id="foB">${ico('trash')} Borrar</button><button class="btn pri" data-cerrar>Cerrar</button>`, 'ancho');
        $('#foB', q).onclick = async () => { if (!await confirmar('¿Borrar esta foto?', 'Borrar', true)) return; try { await DB.borrar('fotos', f.id); await DB.anotar('Foto borrada', c.nombre); q.cerrar(); re(); } catch (er) { fallo(er); } }; };
    } else {
      const movs = [...DB.donde('ventas', v => v.clienta_id === c.id).map(v => ({ f: v.fecha, h: `<div class="it" data-ve="${v.id}" style="${v.estado !== 'ACTIVO' ? 'opacity:.5' : ''}"><div class="av">${ico('check')}</div><div class="tx"><b>${v.items.map(l => esc(l.nombre)).join(', ')}</b>
          <small>${dmy(v.fecha)} · ${v.total - v.pagado > 0.009 ? 'quedó debiendo ' + money(v.total - v.pagado) : v.pagado ? v.pagos.map(p => esc(p.medio)).join(' + ') : 'con saldo a favor'}${v.estado !== 'ACTIVO' ? ' · ANULADO' : ''}</small></div><b class="num">${money2(v.total)}</b></div>` })),
        ...DB.donde('cobranzas', x => x.clienta_id === c.id).map(x => ({ f: x.fecha, h: `<div class="it" data-cb="${x.id}" style="${x.estado !== 'ACTIVO' ? 'opacity:.5' : ''}"><div class="av">$</div><div class="tx"><b>${x.tipo === 'SENA' ? 'Seña' : 'Pagó'}</b><small>${dmy(x.fecha)} · ${x.pagos.map(p => esc(p.medio)).join(' + ')}${x.estado !== 'ACTIVO' ? ' · ANULADO' : ''}</small></div><b class="num ok">${money2(x.monto)}</b></div>` })),
        ...DB.donde('ajustes', a => a.clienta_id === c.id).map(a => ({ f: a.fecha, h: `<div class="it" style="cursor:default"><div class="av">±</div><div class="tx"><b>${esc(a.motivo)}</b><small>${dmy(a.fecha)}</small></div><b class="num">${money2(a.monto)}</b></div>` }))]
        .sort((a, b) => b.f.localeCompare(a.f));
      cont.innerHTML = `<div class="card" style="padding:6px 14px"><h2 style="margin:10px 0 4px">${ico('caja')} Cobros y pagos</h2><div class="lista">${movs.map(x => x.h).join('') || vacio('caja', 'Todavía no tiene movimientos')}</div>
        ${c.saldo_inicial ? `<p class="muted chico">Deuda anterior cargada al darla de alta: ${money2(c.saldo_inicial)}</p>` : ''}</div>`;
      cont.onclick = e => { const a = e.target.closest('[data-ve]'), b = e.target.closest('[data-cb]'); if (a) verVenta(+a.dataset.ve, re); if (b) verCobranza(+b.dataset.cb, re); };
    }
  };
  pintarTab();
  $('#fTabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (!b) return; TAB_FICHA = b.dataset.tab; $$('#fTabs button').forEach(x => x.classList.toggle('act', x === b)); cont.onclick = null; pintarTab(); };
  main.onclick = e => {
    const t = e.target.closest('[data-t]'); if (t) verTurno(+t.dataset.t, re);
    if (e.target.closest('#fPack')) venderPack(c.id, re);
  };
  $('#fEd').onclick = () => editarClienta(c, re);
  if ($('#fWa')) $('#fWa').onclick = () => abrirWa(c.telefono, `Hola ${c.nombre.split(' ')[0]}! `);
  $('#fTur').onclick = () => editarTurno({ clienta_id: c.id, fecha: hoy() }, re);
  $('#fPag').onclick = () => cobrarUI(c.id, re);
  $('#fCob').onclick = () => {
    const t = DB.donde('turnos', t => t.clienta_id === c.id && t.fecha === hoy() && turnoVivo(t) && t.estado !== 'ATENDIDO').sort((a, b) => a.hora.localeCompare(b.hora))[0];
    cobrarAtencion(c.id, re, t || null);
  };
};

function venderPack(cid, luego) {
  const pl = DB.donde('paquetes', p => p.activo !== false);
  if (!pl.length) return toast('Primero armá los packs en Configuración > Packs', true);
  const m = modal(`${ico('pack')} Vender pack`, `<div class="lista">${pl.map(p => `<div class="it" data-pl="${p.id}"><div class="tx"><b>${esc(p.nombre)}</b>
      <small>${p.sesiones} sesiones de ${esc(DB.get('servicios', p.servicio_id)?.nombre || '')}${p.vigencia_dias ? ' · vence a los ' + p.vigencia_dias + ' días' : ''}</small></div><b class="num">${money(p.precio)}</b></div>`).join('')}</div>`, '<button class="btn" data-cerrar>Cancelar</button>');
  $('.lista', m).onclick = e => {
    const b = e.target.closest('[data-pl]'); if (!b) return; m.cerrar();
    // se abre el cobro con el pack ya cargado
    cobrarAtencion(cid, luego, null);
    const sel = $('#caAdd'); if (sel) { sel.value = 'P' + b.dataset.pl; sel.dispatchEvent(new Event('change')); }
  };
}

function editarSesion(s, luego) {
  const m = modal(s.id ? 'Sesión' : 'Anotar sesión', `<div class="form"><div class="campo"><label>Fecha</label><input type="date" id="es_f" value="${s.fecha || hoy()}"></div>
      <div class="campo"><label>Tratamiento</label><input id="es_s" value="${esc(s.servicio || '')}" list="esServ"><datalist id="esServ">${serviciosActivos().map(x => `<option value="${esc(x.nombre)}">`).join('')}</datalist></div>
      <div class="campo"><label>Zona</label><input id="es_z" value="${esc(s.zona || '')}"></div><div class="campo"><label>Parámetros / productos</label><input id="es_d" value="${esc(s.detalle || '')}"></div>
      <div class="campo full"><label>Observaciones</label><textarea id="es_n">${esc(s.nota || '')}</textarea></div></div>`,
    `${s.id ? `<button class="btn rojo" id="esB">${ico('trash')}</button>` : ''}<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" id="esOk">${ico('check')} Guardar</button>`);
  if ($('#esB', m)) $('#esB', m).onclick = async () => { if (!await confirmar('¿Borrar esta nota de sesión?', 'Borrar', true)) return; try { await DB.borrar('sesiones', s.id); m.cerrar(); luego && luego(); } catch (e) { fallo(e); } };
  $('#esOk', m).onclick = async () => { try { await guardarSesion({ id: s.id, clienta_id: s.clienta_id, fecha: val('es_f', m), servicio: val('es_s', m), zona: val('es_z', m), detalle: val('es_d', m), nota: $('#es_n', m).value });
    m.cerrar(); toast('Guardado'); luego && luego(); } catch (e) { fallo(e); } };
}
