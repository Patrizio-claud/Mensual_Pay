 // ─── DB LOCAL ───────────────────────────────────────────────
  const DB_KEY = 'mensualpay_registros';

  function getDB() {
    try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; }
    catch { return []; }
  }

  function saveDB(data) {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  }

  // ─── RELOJ ───────────────────────────────────────────────────
  function actualizarReloj() {
    const now = new Date();
    const opts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    document.getElementById('reloj').textContent = now.toLocaleTimeString('es-PE', opts);
  }
  setInterval(actualizarReloj, 1000);
  actualizarReloj();

  // Fecha por defecto = hoy
  document.getElementById('fecha').value = new Date().toISOString().split('T')[0];

  // ─── FERIADOS PERÚ ───────────────────────────────────────────
  const FERIADOS = ["01-01","04-02","04-03","05-01","06-07","06-29","07-23","07-28","07-29","08-06","08-30","10-08","11-01","12-08","12-09","12-25"];



  const AFP_REFERENCIA = {
    integra: { comision: 1.55, seguro: 1.70 },
    prima: { comision: 1.60, seguro: 1.70 },
    profuturo: { comision: 1.69, seguro: 1.70 },
    habitat: { comision: 1.47, seguro: 1.70 }
  };

  function actualizarCamposPension() {
    const regimen = document.getElementById('regimenPension').value;
    const esAFP = regimen === 'afp';

    document.querySelectorAll('.pension-afp').forEach(el => el.style.display = esAFP ? '' : 'none');
    document.querySelectorAll('.pension-afp-result').forEach(el => el.style.display = esAFP ? 'flex' : 'none');

    if (regimen === 'onp') {
      document.getElementById('aportePension').value = 13;
    } else if (regimen === 'ninguno') {
      document.getElementById('aportePension').value = 0;
    } else {
      document.getElementById('aportePension').value = 10;
      aplicarAFPReferencia();
    }
  }

  function aplicarAFPReferencia() {
    const afp = document.getElementById('afpNombre').value;
    const ref = AFP_REFERENCIA[afp];
    if (!ref) return;
    document.getElementById('comisionAFP').value = ref.comision;
    document.getElementById('seguroAFP').value = ref.seguro;
  }

  function calcularDeducciones(bruto) {
    const regimen = document.getElementById('regimenPension').value;
    const aportePct = leerNumero('aportePension');
    const comisionPct = regimen === 'afp' ? leerNumero('comisionAFP') : 0;
    const seguroPct = regimen === 'afp' ? leerNumero('seguroAFP') : 0;
    const adelanto = leerNumero('descuentoAdelanto');
    const otros = leerNumero('descuentoOtros');
    const pagoRecibidoRaw = document.getElementById('pagoRecibido').value;
    const pagoRecibido = pagoRecibidoRaw === '' ? null : parseFloat(pagoRecibidoRaw);

    const pension = bruto * aportePct / 100;
    const comision = bruto * comisionPct / 100;
    const seguroAFP = bruto * seguroPct / 100;
    const descuentosExtra = adelanto + otros;
    const totalDescuentos = pension + comision + seguroAFP + descuentosExtra;
    const neto = Math.max(bruto - totalDescuentos, 0);
    const essalud = bruto * 0.09;
    const diferencia = Number.isFinite(pagoRecibido) ? pagoRecibido - neto : null;

    return { regimen, afp: document.getElementById('afpNombre').value, aportePct, comisionPct, seguroPct, adelanto, otros, pension, comision, seguroAFP, descuentosExtra, totalDescuentos, neto, essalud, pagoRecibido: Number.isFinite(pagoRecibido) ? pagoRecibido : null, diferencia };
  }

  function renderComparacionPago(deducciones) {
    const box = document.getElementById('payCheck');
    box.className = 'pay-check';

    if (deducciones.diferencia === null) {
      box.textContent = 'Ingresa cuanto te pagaron para comparar.';
      return;
    }

    const diff = deducciones.diferencia;
    if (Math.abs(diff) <= 1) {
      box.classList.add('ok');
      box.textContent = 'Pago verificado: la diferencia es minima (' + dinero(diff) + ').';
    } else if (diff < 0) {
      box.classList.add('bad');
      box.textContent = 'Posible pago incompleto: faltarian ' + dinero(Math.abs(diff)) + '.';
    } else {
      box.classList.add('warn');
      box.textContent = 'Te pagaron ' + dinero(diff) + ' por encima del estimado. Revisa si hubo bono u otro concepto.';
    }
  }

  function copiarResumen() {
    if (!ultimoCalculo) return;
    const d = ultimoCalculo.deducciones;
    const trabajador = ultimoCalculo.trabajador || 'mi turno';
    let comparacion = 'Aun no registre el monto pagado.';
    if (d.diferencia !== null && Math.abs(d.diferencia) <= 1) comparacion = 'El pago recibido cuadra con el estimado.';
    if (d.diferencia !== null && d.diferencia < -1) comparacion = 'Habria una diferencia pendiente de ' + dinero(Math.abs(d.diferencia)) + '.';
    if (d.diferencia !== null && d.diferencia > 1) comparacion = 'El pago recibido supera el estimado por ' + dinero(d.diferencia) + '.';

    const texto = 'Resumen de ' + trabajador + ': ' + formatearFecha(ultimoCalculo.fecha) + ', ' + ultimoCalculo.ingreso + ' a ' + ultimoCalculo.salida + '. Trabaje ' + ultimoCalculo.horasTrabajadas.toFixed(2) + ' h (' + ultimoCalculo.horasNoct.toFixed(2) + ' nocturnas). Bruto estimado: ' + dinero(ultimoCalculo.total) + '. Descuentos estimados: ' + dinero(d.totalDescuentos) + '. Neto estimado: ' + dinero(d.neto) + '. ' + comparacion;

    navigator.clipboard.writeText(texto).then(() => {
      const btn = document.querySelector('.btn-copy');
      btn.textContent = 'Resumen copiado';
      setTimeout(() => btn.textContent = 'Copiar resumen para WhatsApp', 1600);
    });
  }

  function leerNumero(id) {
    const value = parseFloat(document.getElementById(id).value);
    return Number.isFinite(value) ? value : 0;
  }

  function dinero(value) {
    const amount = Number.isFinite(value) ? value : 0;
    return 'S/. ' + amount.toFixed(2);
  }


  // ─── CALCULAR ────────────────────────────────────────────────
  let ultimoCalculo = null;

  function calcular() {
    const fecha = document.getElementById('fecha').value;
    const ingreso = document.getElementById('horaIngreso').value;
    const salida = document.getElementById('horaSalida').value;
    const tarifaBase = parseFloat(document.getElementById('tarifaBase').value) || 5.43;
    const recargoNoct = parseFloat(document.getElementById('recargoNocturno').value) || 1.90;
    const multiFeriado = parseFloat(document.getElementById('multiplicadorFeriado').value) || 2;

    if (!fecha || !ingreso || !salida) {
      shake(document.querySelector('.btn-calc'));
      return;
    }

    const partesFecha = fecha.split('-');
    const mesDia = partesFecha[1] + '-' + partesFecha[2];
    const esFeriado = FERIADOS.includes(mesDia);

    const pI = ingreso.split(':');
    const pS = salida.split(':');
    let minI = parseInt(pI[0]) * 60 + parseInt(pI[1]);
    let minS = parseInt(pS[0]) * 60 + parseInt(pS[1]);
    if (minS <= minI) minS += 24 * 60;

    const minTrabajados = minS - minI;
    const horasTrabajadas = minTrabajados / 60;

    let minNoct = 0;
    for (let m = 0; m < minTrabajados; m++) {
      const ha = ((minI + m) % (24 * 60)) / 60;
      if (ha >= 22 || ha < 6) minNoct++;
    }

    const horasNoct = minNoct / 60;
    const horasDiur = horasTrabajadas - horasNoct;
    const horaBaseFinal = esFeriado ? tarifaBase * multiFeriado : tarifaBase;

    const pagoDiur = horaBaseFinal * horasDiur;
    const pagoNoct = (horaBaseFinal + recargoNoct) * horasNoct;
    const total = pagoDiur + pagoNoct;
    const deducciones = calcularDeducciones(total);

    document.getElementById('r-fecha').textContent = formatearFecha(fecha) + ' · ' + ingreso + ' → ' + salida.padStart(5, '0');
    document.getElementById('r-feriado').classList.toggle('show', esFeriado);
    document.getElementById('r-horas').textContent = horasTrabajadas.toFixed(2) + ' h';
    document.getElementById('r-noct').textContent = horasNoct.toFixed(2) + ' h';
    document.getElementById('r-diur').textContent = horasDiur.toFixed(2) + ' h';
    document.getElementById('r-pdiur').textContent = dinero(pagoDiur);
    document.getElementById('r-pnoct').textContent = dinero(pagoNoct);
    document.getElementById('r-total').textContent = dinero(total);
    document.getElementById('r-neto').textContent = dinero(deducciones.neto);
    document.getElementById('r-pension').textContent = '-' + dinero(deducciones.pension);
    document.getElementById('r-comision').textContent = '-' + dinero(deducciones.comision);
    document.getElementById('r-seguro').textContent = '-' + dinero(deducciones.seguroAFP);
    document.getElementById('r-desc-extra').textContent = '-' + dinero(deducciones.descuentosExtra);
    document.getElementById('r-essalud').textContent = dinero(deducciones.essalud) + ' (no se descuenta)';
    renderComparacionPago(deducciones);

    document.getElementById('resultCard').classList.add('show');

    ultimoCalculo = { fecha, ingreso, salida, horasTrabajadas, horasNoct, horasDiur, pagoDiur, pagoNoct, total, neto: deducciones.neto, deducciones, esFeriado, trabajador: document.getElementById('trabajador').value.trim(), id: Date.now() };
  }

  function shake(el) {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.4s';
    setTimeout(() => el.style.animation = '', 500);
  }

  // ─── GUARDAR ────────────────────────────────────────────────
  function guardarRegistro() {
    if (!ultimoCalculo) return;
    const db = getDB();
    // Evitar duplicados por mismo id
    if (db.find(r => r.id === ultimoCalculo.id)) return;
    db.unshift(ultimoCalculo);
    saveDB(db);
    renderHistorial();
    renderStats();

    const btn = document.querySelector('.btn-guardar');
    btn.textContent = '✓ Guardado';
    btn.style.color = 'var(--accent)';
    btn.style.borderColor = 'var(--accent)';
    setTimeout(() => {
      btn.textContent = 'Guardar en historial';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 1800);
  }

  // ─── ELIMINAR ────────────────────────────────────────────────
  function eliminarRegistro(id) {
    const db = getDB().filter(r => r.id !== id);
    saveDB(db);
    renderHistorial();
    renderStats();
  }

  function limpiarTodo() {
    if (!confirm('¿Borrar todo el historial?')) return;
    saveDB([]);
    renderHistorial();
    renderStats();
  }

  // ─── FILTRAR ─────────────────────────────────────────────────
  let filtroActivo = 'todos';

  function filtrar(tipo, btn) {
    filtroActivo = tipo;
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderHistorial();
  }

  function aplicarFiltro(registros) {
    const hoy = new Date().toISOString().split('T')[0];
    const ahora = new Date();
    const lunesActual = new Date(ahora);
    lunesActual.setDate(ahora.getDate() - ahora.getDay() + 1);
    const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];

    switch (filtroActivo) {
      case 'hoy':     return registros.filter(r => r.fecha === hoy);
      case 'semana':  return registros.filter(r => r.fecha >= lunesActual.toISOString().split('T')[0]);
      case 'mes':     return registros.filter(r => r.fecha >= primerDiaMes);
      case 'feriados':return registros.filter(r => r.esFeriado);
      default:        return registros;
    }
  }



  // ─── EXPORTAR HISTORIAL ──────────────────────────────────────
  function obtenerRegistrosExportables() {
    return aplicarFiltro(getDB());
  }

  function resumenRegistros(registros) {
    return registros.reduce((acc, r) => {
      const deducciones = r.deducciones || {};
      acc.turnos += 1;
      acc.horas += r.horasTrabajadas || 0;
      acc.nocturnas += r.horasNoct || 0;
      acc.bruto += r.total || 0;
      acc.neto += r.neto ?? r.total ?? 0;
      acc.descuentos += deducciones.totalDescuentos || 0;
      acc.feriados += r.esFeriado ? 1 : 0;
      return acc;
    }, { turnos: 0, horas: 0, nocturnas: 0, bruto: 0, neto: 0, descuentos: 0, feriados: 0 });
  }

  function exportarCSV() {
    const registros = obtenerRegistrosExportables();
    if (!registros.length) {
      alert('No hay registros para exportar.');
      return;
    }

    const headers = [
      'Fecha', 'Ingreso', 'Salida', 'Trabajador', 'Feriado', 'Horas totales',
      'Horas diurnas', 'Horas nocturnas', 'Pago diurno', 'Pago nocturno',
      'Bruto', 'Sistema pension', 'AFP', 'Aporte fondo', 'Comision AFP',
      'Seguro AFP', 'Adelantos', 'Otros descuentos', 'Descuentos total',
      'EsSalud ref.', 'Neto estimado', 'Pago recibido', 'Diferencia'
    ];

    const rows = registros.map(r => {
      const d = r.deducciones || {};
      return [
        r.fecha,
        r.ingreso,
        r.salida,
        r.trabajador || '',
        r.esFeriado ? 'Si' : 'No',
        numero(r.horasTrabajadas),
        numero(r.horasDiur),
        numero(r.horasNoct),
        numero(r.pagoDiur),
        numero(r.pagoNoct),
        numero(r.total),
        d.regimen || '',
        d.afp || '',
        numero(d.pension),
        numero(d.comision),
        numero(d.seguroAFP),
        numero(d.adelanto),
        numero(d.otros),
        numero(d.totalDescuentos),
        numero(d.essalud),
        numero(r.neto ?? r.total),
        d.pagoRecibido ?? '',
        d.diferencia ?? ''
      ];
    });

    const csv = [headers, ...rows]
      .map(row => row.map(valorCSV).join(';'))
      .join('\r\n');

    descargarArchivo('mensualpay-historial.csv', '\uFEFF' + csv, 'text/csv;charset=utf-8');
  }

  function exportarPDF() {
    const registros = obtenerRegistrosExportables();
    if (!registros.length) {
      alert('No hay registros para exportar.');
      return;
    }

    const resumen = resumenRegistros(registros);
    const generado = new Date().toLocaleString('es-PE');
    const filas = registros.map(r => {
      const d = r.deducciones || {};
      return '<tr>' +
        '<td>' + escapeHTML(formatearFecha(r.fecha)) + '</td>' +
        '<td>' + escapeHTML(r.ingreso + ' - ' + r.salida) + '</td>' +
        '<td>' + escapeHTML(r.trabajador || '-') + '</td>' +
        '<td>' + numero(r.horasTrabajadas) + ' h</td>' +
        '<td>' + numero(r.horasNoct) + ' h</td>' +
        '<td>' + escapeHTML(dinero(r.total)) + '</td>' +
        '<td>' + escapeHTML(dinero(d.totalDescuentos || 0)) + '</td>' +
        '<td>' + escapeHTML(dinero(r.neto ?? r.total)) + '</td>' +
        '<td>' + (r.esFeriado ? 'Si' : 'No') + '</td>' +
      '</tr>';
    }).join('');

    const ventana = window.open('', '_blank');
    if (!ventana) {
      alert('Permite ventanas emergentes para generar el PDF.');
      return;
    }

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Reporte MensualPay</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 28px; }
          header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
          h1 { margin: 0; font-size: 24px; }
          .meta { color: #6b7280; font-size: 12px; text-align: right; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
          .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
          .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
          .value { margin-top: 6px; font-size: 16px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; text-align: left; }
          th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; color: #374151; }
          .note { margin-top: 18px; color: #6b7280; font-size: 11px; }
          @media print { body { margin: 18mm; } button { display: none; } }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>Reporte MensualPay</h1>
            <p>Historial de turnos y pago neto estimado</p>
          </div>
          <div class="meta">Generado: ${escapeHTML(generado)}<br>Registros: ${registros.length}</div>
        </header>
        <section class="summary">
          <div class="box"><div class="label">Turnos</div><div class="value">${resumen.turnos}</div></div>
          <div class="box"><div class="label">Horas</div><div class="value">${numero(resumen.horas)} h</div></div>
          <div class="box"><div class="label">Bruto</div><div class="value">${escapeHTML(dinero(resumen.bruto))}</div></div>
          <div class="box"><div class="label">Neto</div><div class="value">${escapeHTML(dinero(resumen.neto))}</div></div>
        </section>
        <section class="summary">
          <div class="box"><div class="label">Nocturnas</div><div class="value">${numero(resumen.nocturnas)} h</div></div>
          <div class="box"><div class="label">Feriados</div><div class="value">${resumen.feriados}</div></div>
          <div class="box"><div class="label">Descuentos</div><div class="value">${escapeHTML(dinero(resumen.descuentos))}</div></div>
          <div class="box"><div class="label">Vista</div><div class="value">${escapeHTML(nombreFiltroActivo())}</div></div>
        </section>
        <table>
          <thead>
            <tr>
              <th>Fecha</th><th>Turno</th><th>Trabajador</th><th>Horas</th><th>Noct.</th><th>Bruto</th><th>Desc.</th><th>Neto</th><th>Feriado</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
        <p class="note">EsSalud es referencial del empleador y no se descuenta del pago neto del trabajador. Verifica porcentajes AFP/ONP con tu boleta o entidad correspondiente.</p>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    ventana.document.close();
  }

  function descargarArchivo(nombre, contenido, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function valorCSV(value) {
    const texto = String(value ?? '');
    return '"' + texto.replace(/"/g, '""') + '"';
  }

  function numero(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : '';
  }

  function nombreFiltroActivo() {
    const nombres = {
      todos: 'Todos',
      hoy: 'Hoy',
      semana: 'Esta semana',
      mes: 'Este mes',
      feriados: 'Feriados'
    };
    return nombres[filtroActivo] || 'Todos';
  }


  // ─── RENDER HISTORIAL ────────────────────────────────────────
  function renderHistorial() {
    const container = document.getElementById('historialContainer');
    const db = getDB();
    const registros = aplicarFiltro(db);

    if (registros.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="e-icon">📋</div>
          <p>No hay registros en esta vista.<br>Calcula un turno y guárdalo.</p>
        </div>`;
      return;
    }

    const rows = registros.map(r => `
      <tr>
        <td>
          ${formatearFecha(r.fecha)}
          ${r.esFeriado ? '<span class="badge-feriado">FERIADO</span>' : ''}
        </td>
        <td>
          <span class="hora-range">
            ${r.ingreso}<span class="sep">→</span>${r.salida}
          </span>
        </td>
        <td class="mono">${r.horasTrabajadas.toFixed(1)}h</td>
        <td class="mono" style="color:#a78bfa">${r.horasNoct.toFixed(1)}h</td>
        <td>${r.trabajador ? escapeHTML(r.trabajador) : '<span style="color:var(--text-muted)">—</span>'}</td>
        <td class="total-cell">${dinero(r.total)}</td>
        <td class="net-cell">${dinero(r.neto ?? r.total)}</td>
        <td><button class="btn-del" onclick="eliminarRegistro(${r.id})" title="Eliminar">✕</button></td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="historial-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Turno</th>
            <th>Horas</th>
            <th>Nocturnas</th>
            <th>Trabajador</th>
            <th>Bruto</th>
            <th>Neto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // ─── RENDER STATS ────────────────────────────────────────────
  function renderStats() {
    const db = getDB();
    const total = db.reduce((s, r) => s + r.total, 0);
    const neto = db.reduce((s, r) => s + (r.neto ?? r.total), 0);
    const noct  = db.reduce((s, r) => s + r.horasNoct, 0);
    const prom  = db.length ? total / db.length : 0;

    document.getElementById('st-turnos').textContent = db.length;
    document.getElementById('st-total').textContent  = dinero(total);
    const netoEl = document.getElementById('st-neto');
    if (netoEl) netoEl.textContent = dinero(neto);
    document.getElementById('st-noct').textContent   = noct.toFixed(1) + ' h';
    document.getElementById('st-prom').textContent   = dinero(prom);
  }

  // ─── UTILS ───────────────────────────────────────────────────
  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[char]));
  }

  function formatearFecha(fecha) {
    const [y, m, d] = fecha.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
  }



  Object.assign(window, {
    calcular,
    guardarRegistro,
    eliminarRegistro,
    limpiarTodo,
    filtrar,
    actualizarCamposPension,
    aplicarAFPReferencia,
    copiarResumen,
    exportarCSV,
    exportarPDF
  });


  // ─── INIT ─────────────────────────────────────────────────────
  renderHistorial();
  renderStats();

  // Animación shake CSS
  const style = document.createElement('style');
  style.textContent = `@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }`;
  document.head.appendChild(style);