
// ── Formulario de constancias ──────────────────────────────

var input = document.getElementById('inputNoControl');
var btn = document.getElementById('btnSolicitar');
var btnIcon = document.getElementById('btnIcon');
var btnTexto = document.getElementById('btnTexto');
var hint = document.getElementById('hintFormato');
var preview = document.getElementById('correoPreview');
var correoTxt = document.getElementById('correoTexto');
var msgBox = document.getElementById('msgResultado');
var msgIcon = document.getElementById('msgIcon');
var msgTexto = document.getElementById('msgTexto');

var countdownTimer = null;

/** Construye el correo institucional */
function toCorreo(noControl) {
    return 'L' + noControl + '@veracruz.tecnm.mx';
}

/** Valida 8 dígitos exactos */
function esValido(val) {
    return /^\d{8}$/.test(val);
}

/**
 * Formatea segundos en texto legible.
 * 86400 → "24h"  |  5400 → "1h 30m"  |  120 → "2m"  |  45 → "45s"
 */
function formatearTiempo(s) {
    if (s >= 3600) {
        var h = Math.floor(s / 3600);
        var m = Math.floor((s % 3600) / 60);
        return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
    }
    if (s >= 60) return Math.floor(s / 60) + 'm';
    return s + 's';
}

/**
 * Arranca el countdown en el botón cuando la API devuelve 429.
 * El botón muestra "Disponible en 23h 59m" y se decrementa cada segundo.
 * Al llegar a 0 se rehabilita automáticamente si el input es válido.
 */
function startCooldown(segundos) {
    btn.disabled = true;
    clearInterval(countdownTimer);

    var restantes = segundos;

    var actualizar = function () {
        btnIcon.className = 'fa fa-clock-o';
        btnTexto.textContent = 'Disponible en ' + formatearTiempo(restantes);
    };

    actualizar();

    countdownTimer = setInterval(function () {
        restantes--;
        if (restantes <= 0) {
            clearInterval(countdownTimer);
            countdownTimer = null;
            btnIcon.className = 'fa fa-paper-plane';
            btnTexto.textContent = 'Enviar constancias';
            btn.disabled = !esValido(input.value);
        } else {
            actualizar();
        }
    }, 1000);
}

/** Validación en tiempo real mientras el alumno escribe */
input.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '');
    ocultarMensaje();

    var val = this.value;

    if (val.length === 0) {
        this.classList.remove('input-error', 'input-ok');
        preview.classList.add('hidden');
        hint.textContent = '8 dígitos numéricos — Ej: 23020095';
        hint.classList.remove('hint-error');
        if (!countdownTimer) btn.disabled = true;
        return;
    }

    if (esValido(val)) {
        this.classList.remove('input-error');
        this.classList.add('input-ok');
        hint.textContent = 'Formato correcto ✓';
        hint.classList.remove('hint-error');
        correoTxt.textContent = 'Se enviará a: ' + toCorreo(val);
        preview.classList.remove('hidden');
        if (!countdownTimer) btn.disabled = false;
    } else {
        this.classList.remove('input-ok');
        this.classList.add('input-error');
        hint.textContent = 'Debe contener exactamente 8 dígitos numéricos';
        hint.classList.add('hint-error');
        preview.classList.add('hidden');
        btn.disabled = true;
    }
});

/** Enter dispara el envío */
input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !btn.disabled) btn.click();
});

/** Envío del formulario */
btn.addEventListener('click', async function () {
    var noControl = input.value.trim();
    if (!esValido(noControl)) return;

    setLoadingState(true);
    mostrarMensaje('loading', 'fa-circle-o-notch fa-spin-anim', 'Buscando constancias…', '');

    try {
        var response = await fetch('/api/constancias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ noControl: noControl })
        });

        var data = await response.json();

        // ── 429: límite diario alcanzado ──────────────────
        if (response.status === 429) {
            var matchH = data.message && data.message.match(/(\d+)\s*hora/);
            var matchS = data.message && data.message.match(/(\d+)\s*segundo/);
            var secs = matchH ? parseInt(matchH[1], 10) * 3600
                : matchS ? parseInt(matchS[1], 10)
                    : 86400;   // 24 h por defecto

            mostrarMensaje(
                'warn',
                'fa-clock-o',
                'Límite diario alcanzado',
                data.message || 'Ya solicitaste tu constancia hoy. Vuelve mañana.'
            );
            setLoadingState(false);
            startCooldown(secs);
            return;
        }

        // ── 200: éxito ────────────────────────────────────
        if (response.ok && data.ok) {
            mostrarMensaje(
                'ok',
                'fa-check-circle',
                '¡Constancias enviadas!',
                'Revisa tu correo institucional: <strong>' + toCorreo(noControl) + '</strong>. '
                + 'Tarda unos minutos. <strong>No olvides revisar tu correo no deseado o spam.</strong>'
            );
            input.value = '';
            input.classList.remove('input-ok');
            preview.classList.add('hidden');
            hint.textContent = '8 dígitos numéricos — Ej: 23020095';
            hint.classList.remove('hint-error');

            // ── 404 / error de negocio ────────────────────────
        } else {
            var motivo = (data && data.message)
                ? data.message
                : 'No se encontraron constancias for este número de control.';
            mostrarMensaje(
                'error',
                'fa-times-circle',
                'No se encontraron constancias',
                motivo + ' Si crees que es un error, contáctanos.'
            );
        }

    } catch (err) {
        mostrarMensaje(
            'error',
            'fa-exclamation-circle',
            'Error de conexión',
            'No se pudo conectar con el servidor. Intenta de nuevo más tarde.'
        );
    }

    setLoadingState(false);
});


// ── Helpers ───────────────────────────────────────────────

function setLoadingState(loading) {
    btn.disabled = loading;
    if (loading) {
        btnIcon.className = 'fa fa-circle-o-notch fa-spin-anim';
        btnTexto.textContent = 'Enviando…';
    } else if (!countdownTimer) {
        btnIcon.className = 'fa fa-paper-plane';
        btnTexto.textContent = 'Enviar constancias';
    }
}

function mostrarMensaje(tipo, icono, titulo, detalle) {
    msgBox.className = 'msg-resultado msg-' + tipo;
    msgIcon.className = 'fa ' + icono;
    msgTexto.innerHTML = titulo + (detalle ? '<small>' + detalle + '</small>' : '');
}

function ocultarMensaje() {
    msgBox.className = 'msg-resultado';
}
