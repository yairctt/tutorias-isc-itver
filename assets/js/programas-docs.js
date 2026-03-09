/*
=====================================================
  programas-docs.js — Documentos del programa ISC
  Coordinación de Tutorías — Depto. de Sistemas
=====================================================
*/

/* ── Periodo actual ─────────────────────────────── */
const PERIODO = "ENERO - JUNIO 2026";


/* ── Archivos de Tutoría I ──────────────────────── */
const PROGRAMA_T1 = [
    {
        nombre: "Programa de Actividades — Tutoría I",
        desc: "Calendario de sesiones y temas del semestre",
        pdf: "assets/pdf/programa_tutoria_1.pdf",
        tipo: "pdf",
        verBtn: true,
    },
];


/* ── Archivos de Tutoría II ─────────────────────── */
const PROGRAMA_T2 = [
    {
        nombre: "Programa de Actividades — Tutoría II",
        desc: "Calendario de sesiones y temas del semestre",
        pdf: "assets/pdf/programa_tutoria_2.pdf",
        tipo: "pdf",
        verBtn: true,
    },
];


/* ── Recursos adicionales ───────────────────────── */
const RECURSOS = [
    {
        nombre: "Manual del Tutor",
        desc: "Guía oficial para el docente tutor asignado",
        pdf: "assets/pdf/manual_tutor.pdf",
        tipo: "pdf",
        verBtn: true,
    },
    {
        nombre: "Cuaderno de Trabajo — Tutoría I",
        desc: "Actividades y ejercicios de la primera etapa",
        pdf: "assets/pdf/cuaderno_tutoria_1.pdf",
        tipo: "pdf",
        verBtn: true,
    },
    {
        nombre: "Cuaderno de Trabajo — Tutoría II",
        desc: "Actividades y ejercicios de la segunda etapa",
        pdf: "assets/pdf/cuaderno_tutoria_2.pdf",
        tipo: "pdf",
        verBtn: true,
    },
];


/* =====================================================
   RENDERIZADO 
   ===================================================== */

const ICONOS = {
    pdf: "fa-file-pdf-o",
    word: "fa-file-word-o",
    excel: "fa-file-excel-o",
    img: "fa-file-image-o",
};

function crearFileRow(doc) {
    const icono = ICONOS[doc.tipo] || "fa-file-o";
    const btnVer = doc.verBtn
        ? `<a href="${doc.pdf}" target="_blank" class="btn-ver">
         <i class="fa fa-eye"></i> Ver
       </a>`
        : "";

    return `
    <div class="doc-file-row">
      <div class="doc-file-info">
        <i class="fa ${icono}"></i>
        <div>
          <span class="doc-file-name">${doc.nombre}</span>
          <span class="doc-file-desc">${doc.desc}</span>
        </div>
      </div>
      <div class="doc-file-actions">
        ${btnVer}
        <a href="${doc.pdf}" download class="btn-descargar">
          <i class="fa fa-download"></i> Descargar
        </a>
      </div>
    </div>
  `;
}

function renderProgramas() {
    /* Período */
    document.querySelectorAll(".doc-periodo span")
        .forEach(el => el.textContent = `Periodo: ${PERIODO}`);

    /* Tutoría I */
    document.getElementById("files-tutoria-1").innerHTML =
        PROGRAMA_T1.map(crearFileRow).join("");

    /* Tutoría II */
    document.getElementById("files-tutoria-2").innerHTML =
        PROGRAMA_T2.map(crearFileRow).join("");

    /* Recursos adicionales */
    document.getElementById("files-recursos").innerHTML =
        RECURSOS.map(crearFileRow).join("");
}

document.addEventListener("DOMContentLoaded", renderProgramas);