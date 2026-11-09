/* Licencia RoFac (igual que los programas de PC): la clave está firmada (Ed25519) y sirve para un solo equipo.
   Acá sólo está la clave PÚBLICA: sirve para comprobar licencias, no para fabricarlas. */
'use strict';

const LIC = (() => {
  const CLAVE_PUBLICA = 'sHaxKKJiziuYbZxsQOkFnQA6U75PLAe6uNpgTsOl90E=';
  const PROGRAMA = 'EST';
  const DIAS_PRUEBA = 30, AVISO_VENCE = 7;

  /* ---------- Ed25519 (verificación) ---------- */
  const p = 2n ** 255n - 19n;
  const L = 2n ** 252n + 27742317777372353535851937790883648493n;
  const md = (a, m = p) => { const r = a % m; return r >= 0n ? r : r + m; };
  const pot = (b, e, m = p) => { let r = 1n; b = md(b, m); while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; } return r; };
  const inv = x => pot(x, p - 2n);
  const d = md(-121665n * inv(121666n));
  const I = pot(2n, (p - 1n) / 4n);
  const xrec = (y, signo) => {
    const x2 = md((y * y - 1n) * inv(d * y * y + 1n));
    let x = pot(x2, (p + 3n) / 8n);
    if (md(x * x - x2) !== 0n) x = md(x * I);
    if (md(x * x - x2) !== 0n) throw new Error('punto inválido');
    if ((x & 1n) !== BigInt(signo)) x = p - x;
    return x;
  };
  const By = md(4n * inv(5n));
  const B = [xrec(By, 0), By, 1n, md(xrec(By, 0) * By)];
  const suma = (P, Q) => {
    const A = md((P[1] - P[0]) * (Q[1] - Q[0])), Bb = md((P[1] + P[0]) * (Q[1] + Q[0]));
    const C = md(2n * P[3] * Q[3] * d), D = md(2n * P[2] * Q[2]);
    const E = Bb - A, F = D - C, G = D + C, H = Bb + A;
    return [md(E * F), md(G * H), md(F * G), md(E * H)];
  };
  const mult = (s, P) => { let Q = [0n, 1n, 1n, 0n]; while (s > 0n) { if (s & 1n) Q = suma(Q, P); P = suma(P, P); s >>= 1n; } return Q; };
  const igual = (P, Q) => md(P[0] * Q[2] - Q[0] * P[2]) === 0n && md(P[1] * Q[2] - Q[1] * P[2]) === 0n;
  const aEntero = b => { let n = 0n; for (let i = b.length - 1; i >= 0; i--) n = (n << 8n) + BigInt(b[i]); return n; };
  const decodificar = s => {
    if (s.length !== 32) throw new Error('largo');
    let y = aEntero(s); const signo = Number(y >> 255n); y &= (1n << 255n) - 1n;
    if (y >= p) throw new Error('punto');
    const x = xrec(y, signo); return [x, y, 1n, md(x * y)];
  };
  const sha512 = async b => new Uint8Array(await crypto.subtle.digest('SHA-512', b));
  async function verificarFirma(pub, msg, firma) {
    try {
      if (firma.length !== 64) return false;
      const A = decodificar(pub), R = decodificar(firma.slice(0, 32)), s = aEntero(firma.slice(32));
      if (s >= L) return false;
      const k = md(aEntero(await sha512(new Uint8Array([...firma.slice(0, 32), ...pub, ...msg]))), L);
      return igual(mult(s, B), suma(R, mult(k, A)));
    } catch (e) { return false; }
  }

  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b32 = s => {
    const AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0, val = 0; const out = [];
    for (const c of s.replace(/=+$/, '')) { const i = AL.indexOf(c); if (i < 0) throw new Error('b32'); val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
    return new Uint8Array(out);
  };
  const norm = n => String(n || '').toUpperCase().normalize('NFC').split('').filter(c => /[\p{L}\p{N}]/u.test(c)).join('');
  const enc = s => new TextEncoder().encode(s);

  async function verificar(clave, nombre, equipo) {
    const demo = { activa: false, demo: true, equipo };
    clave = String(clave || '').replace(/\s/g, '').toUpperCase();
    if (!clave) return Object.assign(demo, { mensaje: 'Versión de prueba' });
    const partes = clave.split('-'); const pr = partes[0], v = partes[1], f = partes.slice(2).join('');
    if (partes.length < 3 || pr !== PROGRAMA || !/^\d{8}$/.test(v || '')) return Object.assign(demo, { mensaje: 'La clave de licencia no es válida' });
    if (!crypto.subtle) return Object.assign(demo, { mensaje: 'Para comprobar la licencia, la app tiene que abrirse desde su dirección segura (https)' });
    let firma; try { firma = b32(f); } catch (e) { return Object.assign(demo, { mensaje: 'La clave de licencia no es válida' }); }
    const datos = `${PROGRAMA}|${norm(nombre)}|${v}|${String(equipo).replace(/-/g, '').toUpperCase()}`;
    if (!await verificarFirma(b64(CLAVE_PUBLICA), enc(datos), firma)) return Object.assign(demo, { mensaje: `La clave no corresponde a "${nombre}" en este equipo` });
    const vence = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6)}`;
    if (v !== '99991231' && vence < hoy()) return Object.assign(demo, { vence, mensaje: `Licencia vencida el ${dmy(vence)}` });
    return { activa: true, demo: false, equipo, vence: v === '99991231' ? '' : vence, mensaje: 'Licencia activa' + (v === '99991231' ? '' : ' hasta ' + dmy(vence)) };
  }

  async function estado() {
    const equipo = await DB.equipo();
    const lic = await verificar(DB.cfg.licencia, DB.cfg.nombre, equipo);
    if (lic.activa) {
      lic.bloqueado = false;
      if (lic.vence) {
        const dias = diasEntre(hoy(), lic.vence);
        if (dias <= AVISO_VENCE) Object.assign(lic, { por_vencer: true, dias_restantes: dias,
          mensaje: `Tu licencia vence ${dias === 0 ? 'HOY' : dias === 1 ? 'mañana' : 'en ' + dias + ' días'} (${dmy(lic.vence)}). Pedí la renovación para no quedar en sólo lectura.` });
      }
      return lic;
    }
    const pr = await DB.marcaPrueba();
    const restan = DIAS_PRUEBA - diasEntre(pr.inicio, pr.ultima);
    lic.dias_restantes = Math.max(restan, 0);
    if (lic.vence) { lic.bloqueado = true; lic.mensaje += '. La app quedó en modo sólo lectura.'; }
    else if (pr.atrasado) { lic.bloqueado = true; lic.mensaje = 'La fecha del equipo está atrasada. Corregila para seguir usando la app.'; }
    else if (restan <= 0) { lic.bloqueado = true; lic.mensaje = `Terminó el período de prueba de ${DIAS_PRUEBA} días. La app está en modo sólo lectura.`; }
    else { lic.bloqueado = false; lic.mensaje = 'Versión de prueba: ' + (restan === 1 ? 'último día' : `quedan ${restan} días`); }
    return lic;
  }

  /* ---------- olvido de la clave del dueño: código de desbloqueo firmado por RoFac ---------- */
  function retoNuevo() {
    const AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(8); crypto.getRandomValues(b);
    const r = [...b].map(x => AL[x % AL.length]).join('');
    return `${PROGRAMA}-${r.slice(0, 4)}-${r.slice(4)}`;
  }
  async function desbloqueoOk(reto, codigo) {
    try {
      const r = reto.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(3);
      return await verificarFirma(b64(CLAVE_PUBLICA), enc(`RECUP|${PROGRAMA}|${r}`), b32(String(codigo).replace(/[\s-]/g, '').toUpperCase()));
    } catch (e) { return false; }
  }
  return { estado, verificar, retoNuevo, desbloqueoOk, DIAS_PRUEBA };
})();
