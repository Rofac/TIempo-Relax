/* Datos guardados en el celular (IndexedDB). Todo se carga en memoria al abrir y cada cambio se escribe al instante.
   No hace falta internet. La copia de seguridad es un archivo .json con todo (fotos incluidas). */
'use strict';

const TABLAS = ['clientas', 'servicios', 'paquetes', 'packs', 'turnos', 'ventas', 'cobranzas', 'ajustes', 'sesiones', 'fotos', 'movimientos', 'actividad'];

const CONFIG_INICIAL = {
  nombre: 'Tiempo Relax', direccion: '', telefono: '', instagram: '', logo: '',
  horario: { dias: [1, 2, 3, 4, 5, 6], desde: '09:00', hasta: '20:00', intervalo: 30 },
  medios: ['Efectivo', 'Transferencia', 'Mercado Pago', 'Débito', 'Crédito'],
  categorias_gasto: ['Insumos y cremas', 'Alquiler', 'Luz / internet', 'Equipos y mantenimiento', 'Publicidad', 'Otros'],
  antecedentes: ['Embarazo o lactancia', 'Marcapasos o implantes metálicos', 'Diabetes', 'Hipertensión', 'Problemas de circulación / várices', 'Epilepsia',
    'Cáncer (actual o en tratamiento)', 'Enfermedades de la piel', 'Herpes', 'Toma anticoagulantes', 'Medicación que da sensibilidad al sol', 'Tatuajes en la zona',
    'Sol o bronceado reciente', 'Hongos o uñas encarnadas'],
  dias_sin_venir: 60,                 // avisar de clientas que hace tanto que no vienen
  aviso_copia_dias: 7, ultima_copia: '', tema: 'light', letra: 'normal', pin: '', licencia: '',
  msg_recordatorio: 'Hola {nombre}! 🌿 Te recuerdo tu turno de {servicio} el {dia} a las {hora} en {negocio}. ¿Me confirmás? Gracias!',
  msg_cumple: '¡Feliz cumple {nombre}! 🎉 Te deseamos un hermoso día. Te esperamos en {negocio} 🌿',
  msg_volver: 'Hola {nombre}! Hace mucho que no te vemos por {negocio} 🌿 ¿Te reservo un turno esta semana?',
};

const DB = {
  db: null, t: {}, cfg: {}, soloLectura: false, mensajeBloqueo: '',
  abrir() {
    return new Promise((ok, mal) => {
      const r = indexedDB.open('rofac_estetica', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        for (const t of TABLAS) if (!d.objectStoreNames.contains(t)) d.createObjectStore(t, { keyPath: 'id' });
        for (const t of ['config', 'equipo', 'copias']) if (!d.objectStoreNames.contains(t)) d.createObjectStore(t, { keyPath: 'k' });
      };
      r.onerror = () => mal(r.error || new Error('No se pudo abrir la base de datos'));
      r.onsuccess = async () => {
        this.db = r.result;
        try {
          for (const t of TABLAS) this.t[t] = await this._todo(t);
          const c = await this._todo('config');
          this.cfg = Object.assign({}, CONFIG_INICIAL);
          for (const x of c) this.cfg[x.k] = x.v;
          ok();
        } catch (e) { mal(e); }
      };
    });
  },
  _tx(t, modo = 'readonly') { return this.db.transaction(t, modo).objectStore(t); },
  _todo(t) { return new Promise((ok, mal) => { const q = this._tx(t).getAll(); q.onsuccess = () => ok(q.result || []); q.onerror = () => mal(q.error); }); },
  _put(t, v) { return new Promise((ok, mal) => { const q = this._tx(t, 'readwrite').put(v); q.onsuccess = () => ok(); q.onerror = () => mal(q.error); }); },
  _del(t, k) { return new Promise((ok, mal) => { const q = this._tx(t, 'readwrite').delete(k); q.onsuccess = () => ok(); q.onerror = () => mal(q.error); }); },
  _get(t, k) { return new Promise((ok, mal) => { const q = this._tx(t).get(k); q.onsuccess = () => ok(q.result); q.onerror = () => mal(q.error); }); },

  todos(t) { return this.t[t] || []; },
  get(t, id) { id = +id; return this.todos(t).find(x => x.id === id) || null; },
  donde(t, f) { return this.todos(t).filter(f); },
  verificarEscritura() { if (this.soloLectura) throw new Error(this.mensajeBloqueo || 'El sistema está en modo sólo lectura'); },
  async guardar(t, obj) {
    this.verificarEscritura();
    const lista = this.t[t];
    if (!obj.id) { obj.id = lista.reduce((m, x) => Math.max(m, x.id), 0) + 1; obj.creado = obj.creado || ahora(); }
    obj.modificado = ahora();
    await this._put(t, obj);
    const i = lista.findIndex(x => x.id === obj.id);
    if (i >= 0) lista[i] = obj; else lista.push(obj);
    return obj;
  },
  async borrar(t, id) {
    this.verificarEscritura();
    id = +id;
    await this._del(t, id);
    this.t[t] = this.t[t].filter(x => x.id !== id);
  },
  async setCfg(k, v, sinBloqueo) {
    if (!sinBloqueo) this.verificarEscritura();
    this.cfg[k] = v;
    await this._put('config', { k, v });
  },
  async anotar(accion, detalle = '') {
    if (this.soloLectura) return;
    try { await this.guardar('actividad', { fecha: ahora(), accion, detalle }); } catch (e) { /* no importa */ }
    // se guardan sólo los últimos 2000 movimientos de actividad
    const a = this.t.actividad;
    if (a.length > 2100) for (const x of a.slice(0, a.length - 2000)) await this._del('actividad', x.id).catch(() => {});
    if (a.length > 2100) this.t.actividad = a.slice(a.length - 2000);
  },

  /* ---------- equipo (no viaja en las copias: cada celular tiene el suyo) ---------- */
  async equipo() {
    let e = null;
    try { e = (await this._get('equipo', 'codigo'))?.v; } catch (x) { /* */ }
    try { e = e || localStorage.getItem('rofac_est_equipo'); } catch (x) { /* */ }
    if (!e) {
      const b = new Uint8Array(6); crypto.getRandomValues(b);
      const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
      e = `${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}`;
    }
    await this._put('equipo', { k: 'codigo', v: e }).catch(() => {});
    try { localStorage.setItem('rofac_est_equipo', e); } catch (x) { /* */ }
    return e;
  },
  async marcaPrueba() {
    /* inicio de la prueba y último día visto: en la base y en el navegador (borrar una sola no reinicia la prueba) */
    const h = hoy();
    let ini = [], ult = [];
    try { const x = await this._get('equipo', 'prueba'); if (x) { ini.push(x.v.inicio); ult.push(x.v.ultima); } } catch (e) { /* */ }
    try { const x = JSON.parse(localStorage.getItem('rofac_est_prueba') || 'null'); if (x) { ini.push(x.inicio); ult.push(x.ultima); } } catch (e) { /* */ }
    const inicio = [h, ...ini].filter(Boolean).sort()[0];
    const ultima = [...ult].filter(Boolean).sort().pop() || h;
    const atrasado = h < ultima;
    const v = { inicio, ultima: ultima > h ? ultima : h };
    await this._put('equipo', { k: 'prueba', v }).catch(() => {});
    try { localStorage.setItem('rofac_est_prueba', JSON.stringify(v)); } catch (e) { /* */ }
    return { inicio, ultima: v.ultima, atrasado };
  },

  /* ---------- copias de seguridad ---------- */
  exportar() {
    const data = {};
    for (const t of TABLAS) data[t] = this.t[t];
    const cfg = Object.assign({}, this.cfg); delete cfg.pin;
    return { app: 'rofac-estetica', version: 1, fecha: ahora(), negocio: this.cfg.nombre, config: cfg, pin: this.cfg.pin || '', data };
  },
  async importar(j) {
    if (!j || j.app !== 'rofac-estetica' || !j.data) throw new Error('Ese archivo no es una copia de esta app');
    const tx = this.db.transaction([...TABLAS, 'config'], 'readwrite');
    await new Promise((ok, mal) => {
      for (const t of TABLAS) { const s = tx.objectStore(t); s.clear(); for (const x of j.data[t] || []) s.put(x); }
      const c = tx.objectStore('config'); c.clear();
      for (const [k, v] of Object.entries(Object.assign({}, j.config, { pin: j.pin || '' }))) c.put({ k, v });
      tx.oncomplete = ok; tx.onerror = () => mal(tx.error); tx.onabort = () => mal(tx.error || new Error('No se pudo restaurar'));
    });
    for (const t of TABLAS) this.t[t] = j.data[t] || [];
    this.cfg = Object.assign({}, CONFIG_INICIAL, j.config, { pin: j.pin || '' });
  },
  /* una copia automática por día adentro del celular (las últimas 5), por si se borra algo sin querer */
  async copiaDiaria() {
    try {
      const k = 'dia-' + hoy();
      if (await this._get('copias', k)) return;
      await this._put('copias', { k, v: JSON.stringify(this.exportar()) });
      const todas = (await this._todo('copias')).map(x => x.k).sort();
      for (const x of todas.slice(0, Math.max(0, todas.length - 5))) await this._del('copias', x);
    } catch (e) { console.warn('copia diaria', e); }
  },
  async copiasInternas() { return (await this._todo('copias')).map(x => ({ k: x.k, fecha: x.k.slice(4), tam: x.v.length })).sort((a, b) => b.k.localeCompare(a.k)); },
  async copiaInterna(k) { const x = await this._get('copias', k); return x ? JSON.parse(x.v) : null; },
};
