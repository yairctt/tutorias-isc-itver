/*
=====================================================
  tutores.js — Datos y renderizado de tutores ISC
  Coordinación de Tutorías — Depto. de Sistemas
=====================================================

  CÓMO AGREGAR O EDITAR TUTORES:
  Solo modifica el arreglo TUTORES de abajo.
  El HTML se genera automáticamente.

  Campos de cada tutor:
    - nombre   : string — nombre completo con grado (ej. "Dr. Juan Pérez López")
    - grado    : string — descripción del grado académico
    - grupo    : string — grupo o grupos asignados (ej. "Grupo A")
    - tutoria  : 1 | 2  — a qué etapa pertenece
*/

const TUTORES = [

    /* ── Tutoría I ─────────────────────────────── */
    {
        nombre: "José Ramón Beltrán Guzmán",
        tutoria: 1,
    },
    {
        nombre: "Daniela Hernández Barrios",
        tutoria: 1,
    },

    /* ── Tutoría II ─────────────────────────────── */
    {
        nombre: "Ana María Méndez López",
        tutoria: 2,
    },
    {
        nombre: "Carlos Julián Genis Triana",
        tutoria: 2,
    },
    {
        nombre: "Delio Coss Camilo",
        tutoria: 2,
    },
    {
        nombre: "Efrén Mendoza Chaparro",
        tutoria: 2,
    },
    {
        nombre: "Gabriel Antonio Sánchez Ortiz",
        tutoria: 2,
    },
    {
        nombre: "Héctor Pérez Ortiz",
        tutoria: 2,
    },
    {
        nombre: "Manuel Antonio López Horta",
        tutoria: 2,
    },
    {
        nombre: "José Gerardo Javier Quiroz",
        tutoria: 2,
    },
    {
        nombre: "Karla Gabriela Peralta Madrigal",
        tutoria: 2,
    },
    {
        nombre: "Leonardo Lezama Hernández",
        tutoria: 2,
    },
    {
        nombre: "Arturo Pérez Rendón",
        tutoria: 2,
    },
    {
        nombre: "Patricia Horta Rosado",
        tutoria: 2,
    },
    {
        nombre: "Rafael Córdoba Del Valle",
        tutoria: 2,
    },

];

/* =====================================================
   RENDERIZADO — no es necesario modificar esto
   ===================================================== */

function crearTarjetaTutor(tutor) {
    return `
    <div class="col-lg-4 col-md-6">
      <div class="tutor-card">
        <div class="tutor-card-top">
          <div class="tutor-avatar-circle">
            <i class="fa fa-user"></i>
          </div>
          <div class="tutor-info">
            <span class="tutor-nombre">${tutor.nombre}</span>
          </div>
        </div>
        <div class="tutorados-section">
          <div class="tutorados-label">
            <i class="fa fa-list"></i> Tutorados asignados
          </div>
          <div class="tutorados-prox">
            <i class="fa fa-clock-o"></i>
            <span>Lista disponible próximamente</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTutores() {
    const grid1 = document.getElementById("grid-tutoria-1");
    const grid2 = document.getElementById("grid-tutoria-2");

    const t1 = TUTORES.filter(t => t.tutoria === 1);
    const t2 = TUTORES.filter(t => t.tutoria === 2);

    grid1.innerHTML = t1.map(crearTarjetaTutor).join("");
    grid2.innerHTML = t2.map(crearTarjetaTutor).join("");
}

document.addEventListener("DOMContentLoaded", renderTutores);


/*
=====================================================
  TODO: cuando el back esté listo

  Reemplaza renderTutores() por:

  async function renderTutores() {
    const [t1, t2] = await Promise.all([
      fetch('/api/tutores?tutoria=1').then(r => r.json()),
      fetch('/api/tutores?tutoria=2').then(r => r.json()),
    ]);

    document.getElementById('grid-tutoria-1').innerHTML =
      t1.map(crearTarjetaTutor).join('');
    document.getElementById('grid-tutoria-2').innerHTML =
      t2.map(crearTarjetaTutor).join('');
  }

  Y para tutorados dentro de crearTarjetaTutor, reemplaza
  .tutorados-prox por:

    const filas = tutor.tutorados.map(al => `
      <div class="tutorado-row">
        <span class="tutorado-nombre">${al.nombre}</span>
        <span class="tutorado-control">${al.noControl}</span>
      </div>
    `).join('');

    return `<div class="tutorados-list">${filas}</div>`;
=====================================================
*/