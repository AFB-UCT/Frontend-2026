const API_URL = "https://6ad7dc9f95e98f36aef2d123.mockapi.io/api/v1/lugares";
const LIMITE = 6;

const grid = document.getElementById("catalogo-grid");
const estado = document.getElementById("catalogo-estado");
const btnAnterior = document.getElementById("pagina-anterior");
const btnSiguiente = document.getElementById("pagina-siguiente");
const indicador = document.getElementById("pagina-indicador");

const IMAGEN_RESPALDO = "../assets/imagenes/Temuco-paisaje-1.webp";

let paginaActual = 1;
let totalPaginas = null;

async function obtenerLugares(pagina) {
  const respuesta = await fetch(`${API_URL}?page=${pagina}&limit=${LIMITE}`);

  if (respuesta.status === 404 && pagina > 1) {
    return [];
  }
  if (!respuesta.ok) {
    throw new Error(`Error del servidor (código ${respuesta.status})`);
  }

  const datos = await respuesta.json();

  if (!Array.isArray(datos)) {
    throw new Error("La API no devolvió una lista de lugares");
  }
  return datos;
}

async function obtenerTotalPaginas() {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) return null;
    const datos = await respuesta.json();
    return Array.isArray(datos) ? Math.max(1, Math.ceil(datos.length / LIMITE)) : null;
  } catch {
    return null;
  }
}

function mostrarCargando() {
  grid.hidden = true;
  grid.replaceChildren();
  estado.hidden = false;
  estado.className = "catalogo-estado catalogo-estado--cargando";
  estado.replaceChildren();

  const spinner = document.createElement("span");
  spinner.className = "catalogo-spinner";
  spinner.setAttribute("aria-hidden", "true");

  const texto = document.createElement("p");
  texto.textContent = "Cargando lugares...";

  estado.append(spinner, texto);
}

function mostrarError(mensaje, reintento) {
  grid.hidden = true;
  estado.hidden = false;
  estado.className = "catalogo-estado catalogo-estado--error";
  estado.replaceChildren();

  const texto = document.createElement("p");
  texto.textContent = `No pudimos cargar los lugares. ${mensaje}`;

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "catalogo-reintentar";
  boton.textContent = "Reintentar";
  boton.addEventListener("click", reintento);

  estado.append(texto, boton);
}

function mostrarVacio() {
  grid.hidden = true;
  estado.hidden = false;
  estado.className = "catalogo-estado";
  estado.replaceChildren();

  const texto = document.createElement("p");
  texto.textContent = "Aún no hay lugares disponibles.";
  estado.append(texto);
}

function mostrarExito(lugares) {
  estado.hidden = true;
  estado.replaceChildren();
  grid.hidden = false;
  renderizarTarjetas(lugares);
}

function crearLinea(clase, texto) {
  const p = document.createElement("p");
  p.className = clase;
  p.textContent = texto;
  return p;
}

function crearTarjeta(lugar) {
  const nombre = lugar.name || "Lugar sin nombre";
  const descripcion = lugar.description || "";
  const imagen = lugar.image || IMAGEN_RESPALDO;

  const tarjeta = document.createElement("div");
  tarjeta.className = "tarjeta";
  tarjeta.dataset.id = lugar.id;

  const contenedorImg = document.createElement("div");
  contenedorImg.className = "tarjeta__img";

  const img = document.createElement("img");
  img.src = imagen;
  img.alt = `Imagen de ${nombre}`;
  img.loading = "lazy";
  img.addEventListener("error", () => {
    img.src = IMAGEN_RESPALDO;
  }, { once: true });
  contenedorImg.appendChild(img);

  const contenedorTxt = document.createElement("div");
  contenedorTxt.className = "tarjeta__texto";

  const titulo = document.createElement("h3");
  titulo.textContent = nombre;
  contenedorTxt.appendChild(titulo);

  if (lugar.address) {
    contenedorTxt.appendChild(crearLinea("tarjeta__direccion", lugar.address));
  }
  if (descripcion) {
    contenedorTxt.appendChild(crearLinea("tarjeta__descripcion", descripcion));
  }
  if (lugar.phone) {
    contenedorTxt.appendChild(crearLinea("tarjeta__contacto", `Tel: ${lugar.phone}`));
  }
  if (lugar.email) {
    contenedorTxt.appendChild(crearLinea("tarjeta__contacto", lugar.email));
  }

  const verMas = document.createElement("a");
  verMas.href = "#";
  verMas.className = "boton__vermas";
  verMas.textContent = "Ver mas";
  verMas.dataset.id = lugar.id;
  verMas.setAttribute("aria-label", `Ver más detalles sobre ${nombre}`);
  contenedorTxt.appendChild(verMas);

  tarjeta.append(contenedorImg, contenedorTxt);
  return tarjeta;
}

function renderizarTarjetas(lugares) {
  const fragmento = document.createDocumentFragment();
  for (const lugar of lugares) {
    fragmento.appendChild(crearTarjeta(lugar));
  }
  grid.replaceChildren(fragmento);
}

function actualizarPaginacion(cargando = false) {
  btnAnterior.disabled = cargando || paginaActual <= 1;
  btnSiguiente.disabled =
    cargando || (totalPaginas !== null && paginaActual >= totalPaginas);

  indicador.textContent = totalPaginas
    ? `Pagina ${paginaActual} de ${totalPaginas}`
    : `Pagina ${paginaActual}`;
}

async function irAPagina(pagina) {
  mostrarCargando();
  actualizarPaginacion(true);

  try {
    const lugares = await obtenerLugares(pagina);

    if (lugares.length === 0) {
      if (pagina > 1) {
        totalPaginas = pagina - 1;
        return irAPagina(pagina - 1);
      }
      paginaActual = 1;
      mostrarVacio();
      return;
    }

    paginaActual = pagina;
    if (lugares.length < LIMITE) {
      totalPaginas = pagina;
    }
    mostrarExito(lugares);
  } catch (error) {
    console.error("Error al cargar el catálogo:", error);
    mostrarError(error.message, () => irAPagina(pagina));
  } finally {
    actualizarPaginacion();
  }
}

function cambiarPagina(nuevaPagina) {
  document.querySelector(".catalogo").scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
  irAPagina(nuevaPagina);
}

btnAnterior.addEventListener("click", () => cambiarPagina(paginaActual - 1));
btnSiguiente.addEventListener("click", () => cambiarPagina(paginaActual + 1));

irAPagina(1);
obtenerTotalPaginas().then((total) => {
  if (total) {
    totalPaginas = total;
    actualizarPaginacion();
  }
});