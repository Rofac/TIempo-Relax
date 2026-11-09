/* Términos de licencia y aviso de privacidad (los mismos para todos los programas RoFac). */
'use strict';

const LEGAL_VERSION = '2026-11-09';
const TERMINOS = [
  ['Licencia, no venta', 'El Cliente recibe una licencia de uso del programa, no exclusiva e intransferible, para el negocio indicado y para el equipo (computadora, tablet o celular) cuyo código figura en la licencia. El programa sigue siendo del Proveedor (RoFac).'],
  ['Prueba gratis', 'El programa se puede usar gratis 30 días para conocerlo. Terminada la prueba sin licencia, queda en modo sólo lectura: se pueden ver los datos y hacer copias, pero no cargar nada nuevo.'],
  ['Duración y renovación', 'La licencia dura el plazo acordado al comprarla, o es permanente si así se acordó. Al vencer sin renovarse, el programa pasa a sólo lectura. Los datos nunca se borran por falta de pago y siempre se pueden copiar.'],
  ['Precio', 'El precio es el acordado al comprar. No hay cargos ocultos ni cobros automáticos: el Proveedor no cobra nada desde el programa.'],
  ['Devoluciones', 'La prueba gratis sirve para evaluar el programa antes de pagar. Si después de activada la licencia aparece una falla grave que el Proveedor no resuelve en 15 días, el Cliente puede pedir la devolución proporcional del tiempo no usado. Esto no quita los derechos que la ley le dé al Cliente.'],
  ['Soporte y actualizaciones', 'Mientras la licencia esté vigente, el Proveedor da soporte por WhatsApp y entrega sin costo las actualizaciones que corrigen errores. Las funciones nuevas a pedido se presupuestan aparte.'],
  ['Los datos son del Cliente', 'Todo lo que se carga queda guardado en el equipo del Cliente. El Proveedor no accede a esos datos, no los recibe y no los usa.'],
  ['Copias de seguridad', 'Hacer y guardar las copias de seguridad es responsabilidad del Cliente. El programa ofrece herramientas para hacerlas y avisa cuando hace falta una. El Proveedor no responde por datos perdidos por rotura, robo, virus, borrado, reseteo del equipo o falta de copias.'],
  ['Responsabilidad', 'El programa se entrega tal como está y el Proveedor corrige los errores que se le informen. Los informes y cálculos son una ayuda para el negocio y no reemplazan al contador ni las obligaciones ante ARCA u otros organismos. La responsabilidad del Proveedor no supera lo pagado por la licencia en los últimos 12 meses. No responde por ganancias perdidas, multas ni errores de carga.'],
  ['Datos de otras personas', 'El Cliente es el responsable de los datos de sus clientes, alumnos o pacientes que cargue en el programa (Ley 25.326 de Protección de Datos Personales). Le corresponde informarles, pedir su consentimiento cuando haga falta (incluido el de padres o tutores en el caso de menores), cuidar quién usa el equipo y borrar los datos de una persona cuando lo pida. El programa tiene un botón para borrarla definitivamente.'],
  ['Datos de salud', 'La ficha de cada clienta puede tener datos de salud (antecedentes, alergias, medicación, embarazo, fotos de tratamientos), que la ley considera datos sensibles. El Cliente debe pedir el consentimiento de cada persona para guardarlos, usarlos sólo para atenderla, cuidar que nadie más los vea y borrarlos si se lo piden. El programa ayuda a llevar la ficha pero no reemplaza las indicaciones de un médico ni el consentimiento informado que corresponda a cada tratamiento.'],
  ['Contenido que carga el Cliente', 'El Cliente garantiza que tiene derecho a usar los logos, fotos e imágenes que carga en el programa (por ejemplo su logo o las fotos de sus clientas) y es el único responsable por ellos.'],
  ['Uso permitido', 'No se puede copiar, revender, prestar ni modificar el programa, ni intentar saltear la licencia o la prueba.'],
  ['Cambios', 'El Proveedor puede actualizar estos términos. La versión nueva se muestra en el programa y rige desde que el Cliente la acepta.'],
  ['Ley aplicable', 'Se aplica la ley argentina. Ante cualquier diferencia, las partes intentan primero resolverla de buena fe; si no, intervienen los tribunales ordinarios de la Provincia del Chaco.'],
];
const PRIVACIDAD = [
  'Los datos que se cargan en este programa quedan guardados en este equipo y son del negocio que lo usa. RoFac no los recibe, no los ve y no los vende.',
  'Qué se guarda: lo que el negocio carga (nombre, dirección, teléfono, entregas, pagos y envases de cada cliente). El programa no pide más datos de los necesarios.',
  'Dónde: sólo en este equipo. No hay cuentas en internet, publicidad, cookies de seguimiento ni servicios de terceros que miren lo que se hace.',
  'Cuándo sale información: sólo cuando el usuario lo elige, por ejemplo al mandar un recordatorio o un comprobante por WhatsApp o guardar una copia en Google Drive.',
  'Responsable de los datos: el negocio. Las personas cargadas pueden pedirle ver, corregir o borrar sus datos, y el negocio lo hace desde el programa (Modificar, o Borrar definitivamente).',
];
const htmlLegal = () => `<h4 style="margin:0 0 8px">Términos de licencia y uso</h4>
  <p class="chico muted" style="margin-top:0">Al instalar o usar el programa, el negocio que lo usa ("el Cliente") acepta estos términos con RoFac ("el Proveedor").</p>
  <ol class="chico" style="padding-left:20px;line-height:1.55">${TERMINOS.map(([t, x]) => `<li><b>${esc(t)}.</b> ${esc(x)}</li>`).join('')}</ol>
  <h4 style="margin:16px 0 8px">Aviso de privacidad</h4><ul class="chico" style="padding-left:20px;line-height:1.55">${PRIVACIDAD.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  <p class="muted chico">Versión del ${dmy(LEGAL_VERSION)}</p>`;

function verLegal() { modal('Términos y privacidad', htmlLegal(), '<button class="btn pri" data-cerrar>Cerrar</button>', 'ancho'); }

/* la primera vez (o cuando cambian los términos) hay que aceptarlos */
function pedirAceptarTerminos() {
  return new Promise(ok => {
    if (DB.cfg.terminos_ok && DB.cfg.terminos_ok.v === LEGAL_VERSION) return ok();
    const m = modal('Antes de empezar', `<p style="margin-top:0">Para usar el programa, leé y aceptá los términos de uso y el aviso de privacidad.</p>
      <div style="max-height:46vh;overflow:auto;border:1px solid var(--borde);border-radius:12px;padding:12px 14px;background:var(--card2)">${htmlLegal()}</div>
      <label class="chk" style="margin-top:12px"><input type="checkbox" id="tyChk"> Leí y acepto los términos de uso y el aviso de privacidad</label>`,
      `<button class="btn pri" id="tyOk" disabled>Aceptar y empezar</button>`, 'ancho');
    m.querySelector('[data-cerrar]').remove();
    $('#tyChk', m).onchange = e => { $('#tyOk', m).disabled = !e.target.checked; };
    $('#tyOk', m).onclick = async () => {
      await DB.setCfg('terminos_ok', { v: LEGAL_VERSION, fecha: ahora() }, true);
      await DB.anotar('Términos aceptados', 'versión ' + LEGAL_VERSION).catch(() => {});
      m.cerrar(); ok();
    };
  });
}
