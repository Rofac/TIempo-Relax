/* Caja (lo que entró y salió por día, semana, mes) e Informes (servicios, packs, clientas, ausencias, gastos). */
'use strict';

function cargarMovimiento(tipo, luego) {
  const nom = { INGRESO: 'Otro ingreso', GASTO: 'Gasto', RETIRO: 'Retiro de plata' }[tipo];
  const m = modal(nom, `<div class="form">
    ${tipo === 'GASTO' ? `<div class="campo"><label>Tipo de gasto</label><select id="mvC">${opciones(DB.cfg.categorias_gasto)}</select></div>` : ''}
    <div class="campo ${tipo === 'GASTO' ? '' : 'full'}"><label>${tipo === 'INGRESO' ? 'Qué es' : tipo === 'RETIRO' ? 'Para qué' : 'Detalle'}</label><input id="mvD" autofocus></div>
    <div class="campo"><label>Importe</label>${campoMonto('id="mvM"', '')}</div>
    <div class="campo"><label>${tipo === 'INGRESO' ? 'Cómo entró' : 'De dónde sale'}</label><select id="mvMe">${opciones(DB.cfg.medios)}</select></div>
    <div class="campo"><label>Fecha</label><input type="date" id="mvF" value="${hoy()}"></div></div>`,
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" id="mvOk">${ico('check')} Guardar</button>`);
  $('#mvOk', m).onclick = async () => { try { await movimiento({ tipo, concepto: val('mvD', m), categoria: val('mvC', m), medio: val('mvMe', m), monto: $('#mvM', m).value, fecha: val('mvF', m) }); m.cerrar(); toast('Guardado'); luego && luego(); } catch (e) { fallo(e); } };
}

let PER_CAJA = 'hoy', CAJA_D = '', CAJA_H = '';
function rangoCaja() {
  const h = hoy();
  if (PER_CAJA === 'hoy') return [h, h, 'Hoy'];
  if (PER_CAJA === 'ayer') { const a = sumarDias(h, -1); return [a, a, 'Ayer']; }
  if (PER_CAJA === 'semana') return [lunesDe(h), h, 'Esta semana'];
  if (PER_CAJA === 'mes') return [h.slice(0, 8) + '01', h, 'Este mes'];
  if (PER_CAJA === 'mesant') { const d = sumarMeses(h.slice(0, 8) + '01', -1); return [d, sumarDias(h.slice(0, 8) + '01', -1), 'Mes anterior']; }
  if (PER_CAJA === 'anio') return [h.slice(0, 4) + '-01-01', h, 'Este año'];
  return [CAJA_D || h, CAJA_H || h, 'Período'];
}
PANTALLAS.caja = async (main) => {
  titulo('Caja');
  const [d, h, nom] = rangoCaja(), r = caja(d, h);
  main.innerHTML = `<div class="fila" style="margin-bottom:12px"><div class="seg" id="cjP">${[['hoy', 'Hoy'], ['ayer', 'Ayer'], ['semana', 'Semana'], ['mes', 'Mes'], ['mesant', 'Mes anterior'], ['anio', 'Año'], ['otro', 'Elegir']]
      .map(([k, t]) => `<button data-p="${k}" class="${PER_CAJA === k ? 'act' : ''}">${t}</button>`).join('')}</div>
      ${PER_CAJA === 'otro' ? `<input type="date" id="cjD" value="${d}" style="width:auto"><input type="date" id="cjH" value="${h}" style="width:auto">` : ''}</div>
    <div class="fila" style="margin-bottom:14px"><button class="btn acento" id="cjCob">${ico('check')} Cobrar</button><button class="btn" id="cjPag">${ico('caja')} Pago de deuda</button><button class="btn" id="cjGas">Gasto</button>
      <button class="btn" id="cjIng">${ico('plus')} Otro ingreso</button><button class="btn" id="cjRet">Retiro</button><span class="sp"></span><button class="btn" id="cjPr">${ico('imprimir')} Imprimir</button></div>
    <div class="kpis"><div class="kpi oscuro"><small>Entró · ${esc(nom)}</small><b>${money(r.entra)}</b><div class="sub">atenciones ${money(r.ventasPagadas)} · pagos y señas ${money(r.cobranzas)}</div></div>
      <div class="kpi"><small>Gastos y retiros</small><b>${money(r.gastos + r.retiros)}</b><div class="sub">gastos ${money(r.gastos)} · retiros ${money(r.retiros)}</div></div>
      <div class="kpi"><small>Queda</small><b class="${r.neto < 0 ? 'mal' : 'ok'}">${money(r.neto)}</b><div class="sub">${dmy(d)}${d !== h ? ' al ' + dmy(h) : ''}</div></div>
      <div class="kpi"><small>Facturado</small><b>${money(r.vendido)}</b><div class="sub">${r.nVentas} ${r.nVentas === 1 ? 'atención' : 'atenciones'}${r.debe ? ' · quedó debiendo ' + money(r.debe) : ''}</div></div></div>
    <div class="grid g2">
      <div class="card"><h2>${ico('caja')} Por medio de pago</h2><div class="tabla-x"><table class="t"><thead><tr><th>Medio</th><th class="r">Atenc.</th><th class="r">Pagos</th><th class="r">Salió</th><th class="r">Neto</th></tr></thead><tbody>
        ${r.medios.map(x => `<tr><td><b>${esc(x.medio)}</b></td><td class="r">${money(x.ventas + x.ingresos)}</td><td class="r">${money(x.cobranzas)}</td><td class="r">${x.gastos + x.retiros ? '− ' + money(x.gastos + x.retiros) : ''}</td><td class="r"><b>${money(x.neto)}</b></td></tr>`).join('')
          || '<tr><td colspan="5" class="muted">Sin movimientos</td></tr>'}
        ${r.medios.length > 1 ? `<tr class="tot"><td>Total</td><td class="r">${money(r.ventasPagadas + r.ingresos)}</td><td class="r">${money(r.cobranzas)}</td><td class="r">${r.gastos + r.retiros ? '− ' + money(r.gastos + r.retiros) : ''}</td><td class="r">${money(r.neto)}</td></tr>` : ''}</tbody></table></div>
        ${r.senas ? `<p class="chico muted" style="margin:10px 0 0">En "Pagos" hay ${money(r.senas)} de señas.</p>` : ''}</div>
      <div class="card"><h2>${ico('reloj')} Día por día</h2><div class="tabla-x"><table class="t"><thead><tr><th>Día</th><th class="r">Atenc.</th><th class="r">Entró</th><th class="r">Salió</th><th class="r">Neto</th></tr></thead><tbody>
        ${r.dias.map(x => `<tr><td>${DIAS_C[diaSemana(x.dia)]} ${dm(x.dia)}</td><td class="r">${x.atenciones || ''}</td><td class="r">${money(x.entra)}</td><td class="r">${x.sale ? '− ' + money(x.sale) : ''}</td><td class="r"><b>${money(x.entra - x.sale)}</b></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Sin movimientos</td></tr>'}</tbody></table></div></div></div>
    <div class="card" style="padding:6px 14px"><h2 style="margin:10px 0 4px">Movimientos</h2><div class="lista">
      ${[...r.ventas.map(v => ({ f: v.fecha, html: `<div class="it" data-ve="${v.id}"><div class="av">${ico('check')}</div><div class="tx"><b>${esc(nomClienta(v.clienta_id))}</b><small>${dm(v.fecha)} ${v.fecha.slice(11)} · ${v.items.map(l => esc(l.nombre)).join(', ')} · ${v.pagado ? v.pagos.map(p => esc(p.medio)).join(' + ') : v.total ? 'sin pagar en el momento' : 'sesión de pack'}</small></div><b class="num">${money2(v.pagado)}</b></div>` })),
         ...r.cobros.map(x => ({ f: x.fecha, html: `<div class="it" data-vx="${x.id}"><div class="av">$</div><div class="tx"><b>${esc(nomClienta(x.clienta_id))}</b><small>${dm(x.fecha)} ${x.fecha.slice(11)} · ${x.tipo === 'SENA' ? 'seña' : 'pago'} · ${x.pagos.map(p => esc(p.medio)).join(' + ')}</small></div><b class="num ok">${money2(x.monto)}</b></div>` })),
         ...r.movs.map(x => ({ f: x.fecha, html: `<div class="it" data-mv="${x.id}"><div class="av">${x.tipo === 'INGRESO' ? '+' : '−'}</div><div class="tx"><b>${x.tipo === 'INGRESO' ? 'Ingreso' : x.tipo === 'GASTO' ? 'Gasto' + (x.categoria ? ': ' + esc(x.categoria) : '') : 'Retiro'}</b><small>${dm(x.fecha)} · ${esc(x.concepto)} · ${esc(x.medio)}</small></div><b class="num ${x.tipo === 'INGRESO' ? '' : 'mal'}">${x.tipo === 'INGRESO' ? '' : '− '}${money2(x.monto)}</b></div>` }))]
        .sort((a, b) => b.f.localeCompare(a.f)).map(x => x.html).join('') || vacio('caja', 'No hay movimientos en este período')}</div></div>`;
  const re = () => PANTALLAS.caja(main);
  $('#cjP').onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; PER_CAJA = b.dataset.p; re(); };
  if ($('#cjD')) { $('#cjD').onchange = e => { CAJA_D = e.target.value; re(); }; $('#cjH').onchange = e => { CAJA_H = e.target.value; re(); }; }
  $('#cjCob').onclick = () => cobrarAtencion(null, re);
  $('#cjPag').onclick = () => cobrarUI(null, re);
  $('#cjIng').onclick = () => cargarMovimiento('INGRESO', re); $('#cjGas').onclick = () => cargarMovimiento('GASTO', re); $('#cjRet').onclick = () => cargarMovimiento('RETIRO', re);
  $('#cjPr').onclick = () => imprimirCaja(r, nom);
  main.onclick = async e => {
    const b = e.target.closest('[data-ve],[data-vx],[data-mv]'); if (!b) return;
    if (b.dataset.ve) return verVenta(+b.dataset.ve, re);
    if (b.dataset.vx) return verCobranza(+b.dataset.vx, re);
    const x = DB.get('movimientos', b.dataset.mv);
    if (await confirmar(`¿Borrar este movimiento de ${money2(x.monto)}?`, 'Borrar', true)) { try { DB.verificarEscritura(); x.estado = 'ANULADO'; await DB.guardar('movimientos', x); await DB.anotar('Movimiento borrado', `${x.concepto} ${money2(x.monto)}`); re(); } catch (er) { fallo(er); } }
  };
};
function imprimirCaja(r, nom) {
  const m = modal(`Caja · ${esc(nom)}`, `<h3 style="margin-top:0">${esc(DB.cfg.nombre)} · Caja del ${dmy(r.desde)}${r.desde !== r.hasta ? ' al ' + dmy(r.hasta) : ''}</h3>
    <table class="t"><thead><tr><th>Medio</th><th class="r">Entró</th><th class="r">Salió</th><th class="r">Neto</th></tr></thead><tbody>
    ${r.medios.map(x => `<tr><td>${esc(x.medio)}</td><td class="r">${money2(x.ventas + x.cobranzas + x.ingresos)}</td><td class="r">${money2(x.gastos + x.retiros)}</td><td class="r">${money2(x.neto)}</td></tr>`).join('')}
    <tr class="tot"><td>Total</td><td class="r">${money2(r.entra)}</td><td class="r">${money2(r.gastos + r.retiros)}</td><td class="r">${money2(r.neto)}</td></tr></tbody></table>
    <p class="chico">Atenciones: ${r.nVentas} · Facturado ${money2(r.vendido)} · Quedó debiendo ${money2(r.debe)} · Señas ${money2(r.senas)}</p>`,
    `<button class="btn" data-cerrar>Cerrar</button><button class="btn pri" id="icP">${ico('imprimir')} Imprimir</button>`);
  $('#icP', m).onclick = () => window.print();
}

/* ---------------------------------------------------------------- informes */
let PER_INF = 'mes';
function informe(desde, hasta) {
  const r = caja(desde, hasta), en = f => f.slice(0, 10) >= desde && f.slice(0, 10) <= hasta;
  const serv = {}, cats = {}, cli = {};
  let sesionesPack = 0, packsVendidos = 0, packsPlata = 0;
  for (const v of r.ventas) {
    const k = v.clienta_id || 0; const x = cli[k] = cli[k] || { id: v.clienta_id, total: 0, n: 0 }; x.total += v.total; x.n++;
    const factor = v.bruto ? v.total / v.bruto : 0;     // el descuento se reparte entre los renglones
    for (const l of v.items) {
      if (l.tipo === 'PACK') { packsVendidos++; packsPlata += l.subtotal * factor; }
      if (l.tipo === 'SESION_PACK') sesionesPack += l.cant;
      const s = l.servicio_id ? DB.get('servicios', l.servicio_id) : null;
      const nombre = l.tipo === 'PACK' ? 'Pack: ' + l.nombre : s ? s.nombre : l.nombre.replace(/ \(sesi.*$/, '');
      const a = serv[nombre] = serv[nombre] || { nombre, n: 0, plata: 0 }; a.n += l.tipo === 'PACK' ? 1 : l.cant; a.plata += l.subtotal * factor;
      const cat = l.tipo === 'OTRO' ? 'Otros' : (s && s.categoria) || 'Otros'; cats[cat] = (cats[cat] || 0) + l.subtotal * factor;
    }
  }
  const turnos = DB.donde('turnos', t => en(t.fecha) && t.fecha <= hoy());
  const gastos = {};
  for (const m of r.movs.filter(m => m.tipo === 'GASTO')) gastos[m.categoria || 'Otros'] = (gastos[m.categoria || 'Otros'] || 0) + m.monto;
  return { r, servicios: Object.values(serv).sort((a, b) => b.plata - a.plata || b.n - a.n), categorias: Object.entries(cats).sort((a, b) => b[1] - a[1]),
    clientas: Object.values(cli).sort((a, b) => b.total - a.total), sesionesPack, packsVendidos, packsPlata: r2(packsPlata),
    atendidos: turnos.filter(t => t.estado === 'ATENDIDO').length, noVino: turnos.filter(t => t.estado === 'NO_VINO').length, cancelados: turnos.filter(t => t.estado === 'CANCELADO').length,
    gastos: Object.entries(gastos).sort((a, b) => b[1] - a[1]), nuevas: DB.donde('clientas', c => c.alta && en(c.alta)).length };
}
PANTALLAS.informes = async (main) => {
  titulo('Informes');
  const h = hoy(), m1 = h.slice(0, 8) + '01';
  const [d, hasta, nom] = PER_INF === 'mes' ? [m1, h, 'Este mes'] : PER_INF === 'mesant' ? [sumarMeses(m1, -1), sumarDias(m1, -1), 'Mes anterior'] : PER_INF === 'anio' ? [h.slice(0, 4) + '-01-01', h, 'Este año'] : [sumarDias(h, -89), h, 'Últimos 90 días'];
  const x = informe(d, hasta), r = x.r, maxS = Math.max(1, ...x.servicios.map(s => s.plata));
  const meses = [...Array(12)].map((_, i) => sumarMeses(m1, i - 11)).map(mm => { const fin = sumarDias(sumarMeses(mm, 1), -1), c = caja(mm, fin); return { mm, facturado: c.vendido, entra: c.entra, gastos: c.gastos }; });
  const maxM = Math.max(1, ...meses.map(z => z.facturado));
  const ausentes = x.atendidos + x.noVino ? Math.round(x.noVino * 100 / (x.atendidos + x.noVino)) : 0;
  main.innerHTML = `<div class="seg" id="inP" style="margin-bottom:12px">${[['mes', 'Este mes'], ['mesant', 'Mes anterior'], ['90', '90 días'], ['anio', 'Este año']].map(([k, t]) => `<button data-p="${k}" class="${PER_INF === k ? 'act' : ''}">${t}</button>`).join('')}</div>
    <div class="kpis"><div class="kpi oscuro"><small>Facturado · ${esc(nom)}</small><b>${money(r.vendido)}</b><div class="sub">cobrado ${money(r.entra)}</div></div>
      <div class="kpi"><small>Atenciones</small><b>${x.atendidos}</b><div class="sub">${x.sesionesPack} de packs</div></div>
      <div class="kpi"><small>No vinieron</small><b class="${ausentes > 15 ? 'warn' : ''}">${x.noVino}</b><div class="sub">${ausentes}% · cancelaron ${x.cancelados}</div></div>
      <div class="kpi"><small>Ganancia</small><b class="${r.vendido - r.gastos < 0 ? 'mal' : 'ok'}">${money(r.vendido - r.gastos)}</b><div class="sub">facturado − gastos</div></div></div>
    <div class="grid g2"><div>
      <div class="card"><h2>${ico('hoja')} Por servicio</h2>${x.servicios.map(s => `<div style="margin-bottom:8px"><div class="fila"><span class="sp chico"><b>${esc(s.nombre)}</b> · ${s.n}</span><b class="chico num">${money(s.plata)}</b></div>
        <div class="barra"><i style="width:${Math.round(s.plata * 100 / maxS)}%"></i></div></div>`).join('') || '<p class="muted">Sin atenciones en este período</p>'}
        ${x.categorias.length > 1 ? `<p class="chico" style="margin:12px 0 0"><b>Por rubro:</b> ${x.categorias.map(([k, v]) => `${esc(k)} ${money(v)}`).join(' · ')}</p>` : ''}</div>
      <div class="card"><h2>${ico('pack')} Packs</h2><p style="margin:0">Vendidos: <b>${x.packsVendidos}</b> (${money(x.packsPlata)}) · Sesiones usadas de packs: <b>${x.sesionesPack}</b></p></div>
      <div class="card"><h2>${ico('caja')} Gastos</h2>${x.gastos.map(([k, v]) => `<div class="fila" style="margin-bottom:4px"><span class="sp">${esc(k)}</span><b class="num">${money(v)}</b></div>`).join('') || '<p class="muted" style="margin:0">Sin gastos cargados</p>'}</div>
    </div><div>
      <div class="card"><h2>${ico('progreso')} Últimos 12 meses</h2><div class="tabla-x"><table class="t"><thead><tr><th>Mes</th><th></th><th class="r">Facturado</th><th class="r">Gastos</th></tr></thead><tbody>
        ${meses.slice().reverse().map(z => `<tr><td>${MESES[+z.mm.slice(5, 7) - 1].slice(0, 3)} ${z.mm.slice(2, 4)}</td><td style="width:35%"><div class="barra"><i style="width:${Math.round(z.facturado * 100 / maxM)}%"></i></div></td>
          <td class="r">${money(z.facturado)}</td><td class="r">${z.gastos ? money(z.gastos) : ''}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="card" style="padding:6px 14px"><h2 style="margin:10px 0 4px">${ico('trofeo')} Mejores clientas</h2><div class="lista">${x.clientas.slice(0, 10).map((c, i) => `<div class="it" ${c.id ? `data-cli="${c.id}"` : ''}><div class="av">${i + 1}</div>
        <div class="tx"><b>${esc(nomClienta(c.id))}</b><small>${c.n} ${c.n === 1 ? 'atención' : 'atenciones'}</small></div><b class="num">${money(c.total)}</b></div>`).join('') || vacio('alumnos', 'Sin atenciones en este período')}</div>
        <p class="muted chico">Clientas nuevas en el período: ${x.nuevas}</p></div>
    </div></div>`;
  $('#inP').onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; PER_INF = b.dataset.p; PANTALLAS.informes(main); };
  main.onclick = e => { const b = e.target.closest('[data-cli]'); if (b) ir('ficha', { id: +b.dataset.cli }, true); };
};
