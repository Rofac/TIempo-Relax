/* Reglas del estudio: turnos, servicios, packs de sesiones, señas, cobros, cuenta de cada clienta y caja.
   La cuenta de cada clienta (saldo) = saldo inicial + lo que quedó debiendo de cada cobro − pagos y señas + ajustes.
   Positivo = debe; negativo = tiene a favor (por ejemplo una seña). */
'use strict';

const ESTADOS_T = { RESERVADO: 'Reservado', CONFIRMADO: 'Confirmado', ATENDIDO: 'Atendida', NO_VINO: 'No vino', CANCELADO: 'Canceló' };
const serviciosActivos = () => DB.donde('servicios', s => s.activo !== false).sort((a, b) => (a.orden || 0) - (b.orden || 0) || a.nombre.localeCompare(b.nombre, 'es'));
const clientasActivas = () => DB.donde('clientas', c => c.activo !== false).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
const textoSaldo = s => Math.abs(s || 0) < 0.01 ? 'Al día' : s > 0 ? `Debe ${money(s)}` : `A favor ${money(-s)}`;
const claseSaldo = s => Math.abs(s || 0) < 0.01 ? 'ok' : s > 0 ? 'mal' : 'info';
const nomClienta = id => DB.get('clientas', id)?.nombre || 'Clienta borrada';
const finTurno = t => { const m = minutos(t.hora) + (+t.duracion || 0); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const turnoVivo = t => t.estado !== 'CANCELADO' && t.estado !== 'NO_VINO';

function limpiarPagos(pagos) {
  const l = (pagos || []).map(p => ({ medio: p.medio, monto: r2(n0(p.monto)) })).filter(p => p.monto !== 0);
  for (const p of l) { if (!p.medio) throw new Error('Elegí el medio de pago'); if (p.monto < 0) throw new Error('Monto inválido'); }
  return l;
}
async function moverSaldo(c, delta) { if (!c) return; c.saldo = r2((c.saldo || 0) + delta); await DB.guardar('clientas', c); }

/* ---------------------------------------------------------------- packs */
function usosPack(p) {
  const l = [];
  for (const v of DB.todos('ventas')) if (v.estado === 'ACTIVO') for (const it of v.items) if (it.tipo === 'SESION_PACK' && it.pack_id === p.id) l.push({ venta: v, cant: it.cant || 1 });
  return l;
}
function estadoPack(p) {
  const usadas = usosPack(p).reduce((s, u) => s + u.cant, 0) + (+p.usadas_antes || 0), quedan = p.sesiones - usadas;
  const vencido = !!p.vence && p.vence < hoy();
  return { usadas, quedan, vencido, vivo: p.estado === 'ACTIVO' && quedan > 0 && !vencido };
}
/* el pack que se usa para un servicio: el que vence primero y todavía tiene sesiones */
const packsDe = cid => DB.donde('packs', p => p.clienta_id === cid && p.estado === 'ACTIVO');
const packParaServicio = (cid, sid) => packsDe(cid).filter(p => p.servicio_id === sid && estadoPack(p).vivo).sort((a, b) => (a.vence || '9999').localeCompare(b.vence || '9999') || a.id - b.id)[0] || null;

/* ---------------------------------------------------------------- clientas */
async function guardarClienta(c, datos) {
  DB.verificarEscritura();
  const nombre = String(datos.nombre || '').replace(/\s+/g, ' ').trim();
  if (nombre.length < 2) throw new Error('Escribí el nombre');
  if (datos.nacimiento && (datos.nacimiento > hoy() || datos.nacimiento < '1900-01-01')) throw new Error('Revisá la fecha de nacimiento');
  const nueva = !c.id;
  if (nueva) {
    const si = r2(n0(datos.saldo_inicial));
    Object.assign(c, { saldo_inicial: si, saldo: si, alta: hoy(), activo: true });
  }
  Object.assign(c, { nombre, telefono: (datos.telefono || '').trim(), nacimiento: datos.nacimiento || '', instagram: (datos.instagram || '').trim(), notas: (datos.notas || '').trim() });
  if (!nueva && datos.activo !== undefined) c.activo = !!datos.activo;
  const g = await DB.guardar('clientas', c);
  await DB.anotar(nueva ? 'Clienta nueva' : 'Clienta modificada', nombre);
  return g;
}
async function guardarSalud(c, salud, consentimiento) {
  DB.verificarEscritura();
  c.salud = { marcados: (salud.marcados || []).filter(Boolean), alergias: (salud.alergias || '').trim(), medicacion: (salud.medicacion || '').trim(),
    fototipo: salud.fototipo || '', otras: (salud.otras || '').trim(), actualizado: hoy() };
  if (consentimiento !== undefined) c.consentimiento = consentimiento || '';
  await DB.guardar('clientas', c);
  await DB.anotar('Ficha de salud actualizada', c.nombre);
}
async function borrarClienta(id) {
  DB.verificarEscritura();
  const c = DB.get('clientas', id); if (!c) throw new Error('Esa clienta no existe');
  if (Math.abs(c.saldo || 0) > 0.009) throw new Error(`${c.nombre} tiene la cuenta en ${textoSaldo(c.saldo).toLowerCase()}: primero dejala al día`);
  for (const t of ['fotos', 'sesiones']) for (const x of DB.donde(t, x => x.clienta_id === c.id)) await DB.borrar(t, x.id);
  for (const t of DB.donde('turnos', t => t.clienta_id === c.id)) {
    if (t.estado === 'ATENDIDO') { t.clienta_id = null; t.borrada = true; t.nota = ''; await DB.guardar('turnos', t); } else await DB.borrar('turnos', t.id);
  }
  for (const t of ['ventas', 'cobranzas', 'ajustes', 'packs']) for (const x of DB.donde(t, x => x.clienta_id === c.id)) { x.clienta_id = null; x.borrada = true; x.nota = ''; await DB.guardar(t, x); }
  await DB.borrar('clientas', c.id);
  await DB.anotar('Clienta borrada definitivamente', `N° ${c.id}`);
}

/* ---------------------------------------------------------------- turnos */
function choques(t) {
  if (!turnoVivo(t)) return [];
  const a = minutos(t.hora), b = a + (+t.duracion || 0);
  return DB.donde('turnos', x => x.id !== t.id && x.fecha === t.fecha && turnoVivo(x) && minutos(x.hora) < b && minutos(x.hora) + (+x.duracion || 0) > a);
}
async function guardarTurno(t, d) {
  DB.verificarEscritura();
  const c = DB.get('clientas', d.clienta_id); if (!c) throw new Error('Elegí la clienta');
  const s = DB.get('servicios', d.servicio_id); if (!s) throw new Error('Elegí el servicio');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '')) throw new Error('Elegí el día');
  if (!/^\d{2}:\d{2}$/.test(d.hora || '')) throw new Error('Elegí la hora');
  const dur = parseInt(d.duracion) || 0; if (dur < 5 || dur > 600) throw new Error('Revisá la duración');
  if (t.estado === 'ATENDIDO' && (t.clienta_id !== c.id)) throw new Error('Esa atención ya está cobrada: no se puede cambiar la clienta');
  const nuevo = !t.id;
  Object.assign(t, { fecha: d.fecha, hora: d.hora, duracion: dur, clienta_id: c.id, servicio_id: s.id, servicio: s.nombre, nota: (d.nota || '').trim() });
  if (nuevo) t.estado = 'RESERVADO';
  const g = await DB.guardar('turnos', t);
  await DB.anotar(nuevo ? 'Turno nuevo' : 'Turno modificado', `${c.nombre} · ${s.nombre} · ${dmy(t.fecha)} ${t.hora}`);
  return g;
}
async function estadoTurno(id, estado, destinoSena) {
  DB.verificarEscritura();
  const t = DB.get('turnos', id); if (!t) throw new Error('Ese turno no existe');
  if (!ESTADOS_T[estado] || estado === 'ATENDIDO') throw new Error('Estado inválido');
  if (t.estado === 'ATENDIDO') throw new Error('Ya está atendida y cobrada: para cambiarla, anulá el cobro');
  const senas = senasDe(t.id);
  if ((estado === 'CANCELADO' || estado === 'NO_VINO') && senas.length) {
    if (destinoSena === 'DEVOLVER') for (const x of senas) await anularCobranza(x.id, 'Seña devuelta: ' + ESTADOS_T[estado].toLowerCase());
    else if (destinoSena === 'PIERDE') {
      const monto = r2(senas.reduce((s, x) => s + x.monto, 0));
      await DB.guardar('ajustes', { fecha: ahora(), clienta_id: t.clienta_id, turno_id: t.id, monto, motivo: 'Seña que no se devuelve (' + ESTADOS_T[estado].toLowerCase() + ')', estado: 'ACTIVO' });
      await moverSaldo(DB.get('clientas', t.clienta_id), monto);
    } else if (destinoSena !== 'FAVOR') throw new Error('Elegí qué pasa con la seña');
  }
  const antes = t.estado; t.estado = estado; await DB.guardar('turnos', t);
  await DB.anotar('Turno: ' + ESTADOS_T[estado], `${nomClienta(t.clienta_id)} · ${t.servicio} · ${dmy(t.fecha)} ${t.hora}${antes !== 'RESERVADO' ? ' (antes ' + ESTADOS_T[antes] + ')' : ''}`);
}
async function borrarTurno(id) {
  DB.verificarEscritura();
  const t = DB.get('turnos', id); if (!t) return;
  if (t.estado === 'ATENDIDO') throw new Error('Ya está cobrada: primero anulá el cobro');
  if (senasDe(t.id).length) throw new Error('Tiene una seña: marcalo como "Canceló" y elegí qué pasa con la seña');
  await DB.borrar('turnos', t.id);
  await DB.anotar('Turno borrado', `${nomClienta(t.clienta_id)} · ${t.servicio} · ${dmy(t.fecha)} ${t.hora}`);
}
const senasDe = tid => DB.donde('cobranzas', x => x.estado === 'ACTIVO' && x.tipo === 'SENA' && x.turno_id === tid);

/* ---------------------------------------------------------------- cobro de una atención (servicios, packs, sesiones de pack, otros) */
async function registrarVenta({ clienta_id, turno_id, items, descuento, pagos, fecha, nota, sesion }) {
  DB.verificarEscritura();
  const c = DB.get('clientas', clienta_id); if (!c) throw new Error('Elegí la clienta');
  const t = turno_id ? DB.get('turnos', turno_id) : null;
  if (turno_id && !t) throw new Error('Ese turno no existe');
  if (t && t.estado === 'ATENDIDO') throw new Error('Ese turno ya está cobrado');
  const lineas = [], packsNuevos = [];
  for (const it of items || []) {
    const cant = parseInt(it.cant ?? 1) || 0; if (cant <= 0) throw new Error('Cantidad inválida');
    if (it.tipo === 'SERVICIO') {
      const s = DB.get('servicios', it.servicio_id); if (!s) throw new Error('Elegí el servicio');
      const precio = it.precio === undefined || it.precio === '' ? +s.precio || 0 : r2(n0(it.precio)); if (precio < 0) throw new Error('Precio inválido');
      lineas.push({ tipo: 'SERVICIO', servicio_id: s.id, nombre: s.nombre, cant, precio, subtotal: r2(cant * precio) });
    } else if (it.tipo === 'PACK') {
      const pl = DB.get('paquetes', it.paquete_id); if (!pl) throw new Error('Elegí el pack');
      const precio = it.precio === undefined || it.precio === '' ? +pl.precio || 0 : r2(n0(it.precio)); if (precio < 0) throw new Error('Precio inválido');
      if (cant !== 1) throw new Error('Los packs se venden de a uno');
      const l = { tipo: 'PACK', paquete_id: pl.id, servicio_id: pl.servicio_id, nombre: pl.nombre, cant: 1, precio, subtotal: precio, pack_id: null };
      lineas.push(l); packsNuevos.push({ l, pl, ref: it.ref });
    } else if (it.tipo === 'SESION_PACK') {
      lineas.push({ tipo: 'SESION_PACK', pack_id: it.pack_id, pack_ref: it.pack_ref, servicio_id: it.servicio_id, nombre: '', cant, precio: 0, subtotal: 0 });
    } else if (it.tipo === 'OTRO') {
      const nombre = String(it.nombre || '').trim(); if (!nombre) throw new Error('Escribí qué es lo que cobrás aparte');
      const precio = r2(n0(it.precio)); if (precio < 0) throw new Error('Precio inválido');
      lineas.push({ tipo: 'OTRO', nombre, cant, precio, subtotal: r2(cant * precio) });
    } else throw new Error('Renglón inválido');
  }
  if (!lineas.length) throw new Error('No hay nada para cobrar');
  // sesiones de pack: de un pack que ya tenía, o del que compra ahora mismo
  for (const l of lineas.filter(l => l.tipo === 'SESION_PACK')) {
    if (l.pack_ref !== undefined && l.pack_ref !== null) {
      const pn = packsNuevos.find(x => x.ref === l.pack_ref); if (!pn) throw new Error('La sesión es de un pack que no está en este cobro');
      if (l.cant > pn.pl.sesiones) throw new Error('El pack no tiene tantas sesiones');
      l.servicio_id = pn.pl.servicio_id; l.nombre = `${DB.get('servicios', pn.pl.servicio_id)?.nombre || ''} (sesión del pack)`;
    } else {
      const p = DB.get('packs', l.pack_id); if (!p || p.clienta_id !== c.id || p.estado !== 'ACTIVO') throw new Error('Ese pack no es de esta clienta');
      const e = estadoPack(p);
      const pedidas = lineas.filter(x => x.tipo === 'SESION_PACK' && x.pack_id === p.id).reduce((s, x) => s + x.cant, 0);
      if (e.vencido) throw new Error(`El pack "${p.nombre}" venció el ${dmy(p.vence)}`);
      if (pedidas > e.quedan) throw new Error(`Al pack "${p.nombre}" le ${e.quedan === 1 ? 'queda 1 sesión' : `quedan ${e.quedan} sesiones`}`);
      l.servicio_id = p.servicio_id; l.nombre = `${DB.get('servicios', p.servicio_id)?.nombre || p.nombre} (sesión ${e.usadas + 1} de ${p.sesiones})`;
    }
  }
  const bruto = r2(lineas.reduce((s, l) => s + l.subtotal, 0));
  const desc = r2(n0(descuento)); if (desc < 0 || desc > bruto + 0.001) throw new Error('El descuento no puede ser mayor que el total');
  const total = r2(bruto - desc);
  const lp = limpiarPagos(pagos), pagado = r2(lp.reduce((s, p) => s + p.monto, 0));
  const f = (fecha || (t ? t.fecha : hoy())) + ahora().slice(10);
  const v = await DB.guardar('ventas', { fecha: f, clienta_id: c.id, turno_id: t ? t.id : null, items: lineas, bruto, descuento: desc, total, pagos: lp, pagado,
    saldo_antes: r2(c.saldo || 0), nota: (nota || '').trim(), estado: 'ACTIVO' });
  for (const pn of packsNuevos) {
    const p = await DB.guardar('packs', { clienta_id: c.id, paquete_id: pn.pl.id, servicio_id: pn.pl.servicio_id, nombre: pn.pl.nombre, sesiones: pn.pl.sesiones, precio: pn.l.precio,
      fecha: f.slice(0, 10), vence: pn.pl.vigencia_dias ? sumarDias(f.slice(0, 10), pn.pl.vigencia_dias) : '', venta_id: v.id, estado: 'ACTIVO' });
    pn.l.pack_id = p.id;
    for (const l of lineas) if (l.tipo === 'SESION_PACK' && l.pack_ref === pn.ref) { l.pack_id = p.id; l.nombre = `${DB.get('servicios', p.servicio_id)?.nombre || p.nombre} (sesión 1 de ${p.sesiones})`; }
  }
  for (const l of lineas) delete l.pack_ref;
  await DB.guardar('ventas', v);
  await moverSaldo(c, total - pagado);
  c.ultima_visita = f.slice(0, 10); await DB.guardar('clientas', c);
  if (t) { t.estado_antes = t.estado; t.estado = 'ATENDIDO'; t.venta_id = v.id; await DB.guardar('turnos', t); }
  if (sesion && (sesion.zona || sesion.detalle || sesion.nota)) await guardarSesion({ clienta_id: c.id, fecha: f.slice(0, 10), turno_id: t ? t.id : null, venta_id: v.id,
    servicio: lineas.filter(l => l.tipo !== 'PACK' && l.tipo !== 'OTRO').map(l => l.nombre).join(', '), ...sesion });
  await DB.anotar('Cobro', `${c.nombre} · ${lineas.map(l => l.nombre).join(', ')} · ${money2(total)}${total - pagado > 0.009 ? ' · queda debiendo ' + money2(total - pagado) : ''}`);
  return v;
}
async function anularVenta(id, motivo) {
  DB.verificarEscritura();
  const v = DB.get('ventas', id); if (!v || v.estado !== 'ACTIVO') throw new Error('Ese cobro no existe o ya estaba anulado');
  if (!motivo || motivo.trim().length < 3) throw new Error('Escribí el motivo');
  for (const l of v.items.filter(l => l.tipo === 'PACK')) {
    const p = DB.get('packs', l.pack_id); if (!p) continue;
    const otros = usosPack(p).filter(u => u.venta.id !== v.id);
    if (otros.length) throw new Error(`El pack "${p.nombre}" ya se usó en otras sesiones (${otros.map(u => dmy(u.venta.fecha)).join(', ')}): anulá primero esas sesiones`);
  }
  for (const l of v.items.filter(l => l.tipo === 'PACK')) { const p = DB.get('packs', l.pack_id); if (p) { p.estado = 'ANULADO'; await DB.guardar('packs', p); } }
  await moverSaldo(DB.get('clientas', v.clienta_id), -(v.total - v.pagado));
  v.estado = 'ANULADO'; v.anulado = ahora(); v.motivo = motivo.trim(); await DB.guardar('ventas', v);
  const t = v.turno_id ? DB.get('turnos', v.turno_id) : null;
  if (t && t.venta_id === v.id) { t.estado = t.estado_antes && t.estado_antes !== 'ATENDIDO' ? t.estado_antes : 'CONFIRMADO'; t.venta_id = null; await DB.guardar('turnos', t); }
  await DB.anotar('Cobro ANULADO', `${nomClienta(v.clienta_id)} · ${money2(v.total)} · ${motivo}`);
}

/* ---------------------------------------------------------------- pagos de deuda, adelantos y señas */
async function cobrarClienta({ clienta_id, pagos, fecha, nota, tipo, turno_id }) {
  DB.verificarEscritura();
  const c = DB.get('clientas', clienta_id); if (!c) throw new Error('Elegí la clienta');
  tipo = tipo || 'PAGO';
  if (tipo === 'SENA') { const t = DB.get('turnos', turno_id); if (!t || t.clienta_id !== c.id) throw new Error('La seña tiene que ser de un turno de la clienta'); if (t.estado === 'ATENDIDO') throw new Error('Ese turno ya está cobrado'); }
  const lp = limpiarPagos(pagos), monto = r2(lp.reduce((s, p) => s + p.monto, 0));
  if (monto <= 0) throw new Error('Poné cuánto paga');
  const x = await DB.guardar('cobranzas', { fecha: (fecha || hoy()) + ahora().slice(10), clienta_id: c.id, tipo, turno_id: tipo === 'SENA' ? turno_id : null, monto, pagos: lp,
    saldo_antes: r2(c.saldo || 0), nota: (nota || '').trim(), estado: 'ACTIVO' });
  await moverSaldo(c, -monto);
  await DB.anotar(tipo === 'SENA' ? 'Seña' : 'Pago', `${c.nombre} · ${money2(monto)}`);
  return x;
}
async function anularCobranza(id, motivo) {
  DB.verificarEscritura();
  const x = DB.get('cobranzas', id); if (!x || x.estado !== 'ACTIVO') throw new Error('Ese pago no existe o ya estaba anulado');
  if (!motivo || motivo.trim().length < 3) throw new Error('Escribí el motivo');
  await moverSaldo(DB.get('clientas', x.clienta_id), x.monto);
  x.estado = 'ANULADO'; x.anulado = ahora(); x.motivo = motivo.trim(); await DB.guardar('cobranzas', x);
  await DB.anotar(x.tipo === 'SENA' ? 'Seña ANULADA' : 'Pago ANULADO', `${nomClienta(x.clienta_id)} · ${money2(x.monto)} · ${motivo}`);
}

/* ---------------------------------------------------------------- sesiones (lo que se hizo) y fotos */
async function guardarSesion(d) {
  DB.verificarEscritura();
  if (!DB.get('clientas', d.clienta_id)) throw new Error('Elegí la clienta');
  const s = d.id ? DB.get('sesiones', d.id) : {};
  Object.assign(s, { clienta_id: d.clienta_id, fecha: d.fecha || hoy(), turno_id: d.turno_id ?? s.turno_id ?? null, venta_id: d.venta_id ?? s.venta_id ?? null,
    servicio: (d.servicio || '').trim(), zona: (d.zona || '').trim(), detalle: (d.detalle || '').trim(), nota: (d.nota || '').trim() });
  if (!s.servicio && !s.zona && !s.detalle && !s.nota) throw new Error('Escribí algo de la sesión');
  return DB.guardar('sesiones', s);
}
async function guardarFoto(clienta_id, img, tipo, nota) {
  DB.verificarEscritura();
  if (!DB.get('clientas', clienta_id)) throw new Error('Elegí la clienta');
  return DB.guardar('fotos', { clienta_id, fecha: hoy(), img, tipo: tipo || 'Antes', nota: (nota || '').trim() });
}

/* ---------------------------------------------------------------- caja */
async function movimiento({ tipo, concepto, categoria, medio, monto, fecha }) {
  DB.verificarEscritura();
  monto = r2(n0(monto));
  if (!['INGRESO', 'GASTO', 'RETIRO'].includes(tipo)) throw new Error('Tipo inválido');
  if (monto <= 0) throw new Error('Poné el importe');
  if (!medio) throw new Error('Elegí el medio');
  const m = await DB.guardar('movimientos', { fecha: (fecha || hoy()) + ahora().slice(10), tipo, concepto: (concepto || '').trim(), categoria: categoria || '', medio, monto, estado: 'ACTIVO' });
  await DB.anotar(tipo === 'INGRESO' ? 'Otro ingreso' : tipo === 'GASTO' ? 'Gasto' : 'Retiro', `${concepto || categoria} · ${money2(monto)}`);
  return m;
}
function caja(desde, hasta) {
  const en = f => f.slice(0, 10) >= desde && f.slice(0, 10) <= hasta;
  const ven = DB.donde('ventas', v => v.estado === 'ACTIVO' && en(v.fecha));
  const cob = DB.donde('cobranzas', x => x.estado === 'ACTIVO' && en(x.fecha));
  const movs = DB.donde('movimientos', m => m.estado === 'ACTIVO' && en(m.fecha));
  const medios = {}, fila = m => (medios[m] = medios[m] || { medio: m, ventas: 0, cobranzas: 0, ingresos: 0, gastos: 0, retiros: 0 });
  let ventasPagadas = 0, vendido = 0, cobranzas = 0, senas = 0, ingresos = 0, gastos = 0, retiros = 0;
  for (const v of ven) { vendido += v.total; for (const p of v.pagos) { fila(p.medio).ventas += p.monto; ventasPagadas += p.monto; } }
  for (const x of cob) { for (const p of x.pagos) fila(p.medio).cobranzas += p.monto; cobranzas += x.monto; if (x.tipo === 'SENA') senas += x.monto; }
  for (const m of movs) {
    if (m.tipo === 'INGRESO') { fila(m.medio).ingresos += m.monto; ingresos += m.monto; }
    else if (m.tipo === 'GASTO') { fila(m.medio).gastos += m.monto; gastos += m.monto; }
    else { fila(m.medio).retiros += m.monto; retiros += m.monto; }
  }
  const lista = Object.values(medios).map(x => Object.assign(x, { neto: r2(x.ventas + x.cobranzas + x.ingresos - x.gastos - x.retiros) }));
  const dias = {};
  const d = (f, k, v) => { const x = dias[f.slice(0, 10)] = dias[f.slice(0, 10)] || { dia: f.slice(0, 10), entra: 0, sale: 0, atenciones: 0 }; x[k] += v; };
  for (const v of ven) { d(v.fecha, 'entra', v.pagado); d(v.fecha, 'atenciones', 1); }
  for (const x of cob) d(x.fecha, 'entra', x.monto);
  for (const m of movs) d(m.fecha, m.tipo === 'INGRESO' ? 'entra' : 'sale', m.monto);
  const debe = r2(ven.reduce((s, v) => s + Math.max(0, v.total - v.pagado), 0));
  return { desde, hasta, ventas: ven, cobros: cob, movs, medios: lista, vendido: r2(vendido), ventasPagadas: r2(ventasPagadas), cobranzas: r2(cobranzas), senas: r2(senas),
    ingresos: r2(ingresos), gastos: r2(gastos), retiros: r2(retiros), debe, entra: r2(ventasPagadas + cobranzas + ingresos), neto: r2(ventasPagadas + cobranzas + ingresos - gastos - retiros),
    dias: Object.values(dias).sort((a, b) => b.dia.localeCompare(a.dia)), nVentas: ven.length };
}

/* ---------------------------------------------------------------- arranque: servicios de ejemplo (sin precio, se completan en Configuración) */
async function datosIniciales() {
  if (DB.cfg.iniciado) return;
  const soloL = DB.soloLectura; DB.soloLectura = false;
  try {
    const base = [['Masajes', 'Masaje descontracturante', 60], ['Masajes', 'Masaje relajante', 60], ['Masajes', 'Drenaje linfático', 60], ['Masajes', 'Masaje con piedras calientes', 60],
      ['Depilación definitiva', 'Depilación láser · zona chica', 20], ['Depilación definitiva', 'Depilación láser · zona mediana', 30], ['Depilación definitiva', 'Depilación láser · zona grande', 45],
      ['Depilación definitiva', 'Depilación láser · cuerpo completo', 90], ['Podología', 'Podología estética', 45],
      ['Corporales', 'Tratamiento reductor', 50], ['Corporales', 'Maderoterapia', 50], ['Corporales', 'Sesión express (zona específica)', 40]];
    let o = 1;
    for (const [categoria, nombre, duracion] of base) await DB.guardar('servicios', { nombre, categoria, duracion, precio: 0, activo: true, orden: o++ });
    await DB.setCfg('iniciado', ahora());
  } finally { DB.soloLectura = soloL; }
}
