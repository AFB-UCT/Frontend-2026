const API_URL = "https://6ad7dc9f95e98f36aef2d123.mockapi.io/api/v1/lugares";
const LIMITE = 6;
const TIEMPO_MAXIMO_MS = 10000;
const IMAGEN_RESPALDO = "../assets/imagenes/Temuco-paisaje-1.webp";
const ICONO_ERROR =
  '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

const grid = document.getElementById("catalogo-grid");
const estado = document.getElementById("catalogo-estado");
const btnAnterior = document.getElementById("pagina-anterior");
const btnSiguiente = document.getElementById("pagina-siguiente");
const indicador = document.getElementById("pagina-indicador");

let paginaActual = 1;
let totalPaginas = null;
let avisoExito = null;
let avisoTemporizador = null;

async function pedirJSON(url) {
  const controlador = new AbortController();
  const reloj = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);

  try {
    return await fetch(url, { signal: controlador.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("El servidor tardó demasiado en responder.");
    }
    throw new Error("Revisa tu conexión a internet e inténtalo de nuevo.");
  } finally {
    clearTimeout(reloj);
  }
}

async function obtenerLugares(pagina) {
  const respuesta = await pedirJSON(`${API_URL}?page=${pagina}&limit=${LIMITE}`);

  if (respuesta.status === 404 && pagina > 1) {
    return [];
  }
  if (!respuesta.ok) {
    throw new Error(`Error del servidor (código ${respuesta.status}).`);
  }

  let datos;
  try {
    datos = await respuesta.json();
  } catch {
    throw new Error("La respuesta del servidor no es un JSON válido.");
  }

  if (!Array.isArray(datos)) {
    throw new Error("La API no devolvió una lista de lugares.");
  }

  return datos.map(normalizarLugar).filter(Boolean);
}

async function obtenerTotalPaginas() {
  try {
    const respuesta = await pedirJSON(API_URL);
    if (!respuesta.ok) return null;
    const datos = await respuesta.json();
    return Array.isArray(datos)
      ? Math.max(1, Math.ceil(datos.length / LIMITE))
      : null;
  } catch {
    return null;
  }
}

function texto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

function normalizarLugar(crudo) {
  if (!crudo || typeof crudo !== "object") return null;

  const nombre = texto(crudo.name) || "Lugar sin nombre";
  const imagen = texto(crudo.image);

  return {
    id: crudo.id ?? "",
    nombre,
    descripcion: texto(crudo.description),
    direccion: texto(crudo.address),
    telefono: texto(crudo.phone),
    correo: texto(crudo.email),
    imagen: /^(https?:\/\/|\.{0,2}\/)/i.test(imagen) ? imagen : IMAGEN_RESPALDO,
  };
}

function crearLinea(clase, contenido) {
  const p = document.createElement("p");
  p.className = clase;
  p.textContent = contenido;
  return p;
}

function crearTarjeta(lugar) {
  const tarjeta = document.createElement("div");
  tarjeta.className = "tarjeta";
  tarjeta.dataset.id = lugar.id;

  const contenedorImg = document.createElement("div");
  contenedorImg.className = "tarjeta__img";

  const img = document.createElement("img");
  img.src = lugar.imagen;
  img.alt = `Imagen de ${lugar.nombre}`;
  img.loading = "lazy";
  img.addEventListener(
    "error",
    () => {
      img.src = IMAGEN_RESPALDO;
    },
    { once: true }
  );
  contenedorImg.appendChild(img);

  const contenedorTxt = document.createElement("div");
  contenedorTxt.className = "tarjeta__texto";

  const titulo = document.createElement("h3");
  titulo.textContent = lugar.nombre;
  contenedorTxt.appendChild(titulo);

  if (lugar.direccion) {
    contenedorTxt.appendChild(crearLinea("tarjeta__direccion", lugar.direccion));
  }
  if (lugar.descripcion) {
    contenedorTxt.appendChild(crearLinea("tarjeta__descripcion", lugar.descripcion));
  }
  if (lugar.telefono) {
    contenedorTxt.appendChild(crearLinea("tarjeta__contacto", `Tel: ${lugar.telefono}`));
  }
  if (lugar.correo) {
    contenedorTxt.appendChild(crearLinea("tarjeta__contacto", lugar.correo));
  }

  const verMas = document.createElement("a");
  verMas.href = "#";
  verMas.className = "boton__vermas";
  verMas.textContent = "Ver mas";
  verMas.dataset.id = lugar.id;
  verMas.setAttribute("aria-label", `Ver más detalles sobre ${lugar.nombre}`);
  verMas.addEventListener("click", (e) => e.preventDefault());
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

function crearLineaSkeleton(variante) {
  const linea = document.createElement("span");
  linea.className = variante
    ? `skeleton-linea skeleton-linea--${variante}`
    : "skeleton-linea";
  return linea;
}

function crearTarjetaSkeleton() {
  const tarjeta = document.createElement("div");
  tarjeta.className = "tarjeta tarjeta--skeleton";
  tarjeta.setAttribute("aria-hidden", "true");

  const contenedorImg = document.createElement("div");
  contenedorImg.className = "tarjeta__img";

  const bloqueImg = document.createElement("div");
  bloqueImg.className = "skeleton-img";
  contenedorImg.appendChild(bloqueImg);

  const contenedorTxt = document.createElement("div");
  contenedorTxt.className = "tarjeta__texto";

  const titulo = document.createElement("h3");
  titulo.appendChild(crearLineaSkeleton("titulo"));
  contenedorTxt.appendChild(titulo);

  contenedorTxt.appendChild(crearLineaSkeleton("corta"));
  contenedorTxt.appendChild(crearLineaSkeleton());
  contenedorTxt.appendChild(crearLineaSkeleton());
  contenedorTxt.appendChild(crearLineaSkeleton("media"));

  const boton = document.createElement("span");
  boton.className = "skeleton-boton";
  contenedorTxt.appendChild(boton);

  tarjeta.append(contenedorImg, contenedorTxt);
  return tarjeta;
}

function mostrarCargando() {
  estado.hidden = false;
  estado.className = "catalogo-estado catalogo-estado--cargando";
  estado.setAttribute("role", "status");
  estado.replaceChildren();

  const spinner = document.createElement("span");
  spinner.className = "catalogo-spinner";
  spinner.setAttribute("aria-hidden", "true");

  const mensaje = document.createElement("p");
  mensaje.textContent = "Cargando lugares...";

  estado.append(spinner, mensaje);

  const fragmento = document.createDocumentFragment();
  for (let i = 0; i < LIMITE; i += 1) {
    fragmento.appendChild(crearTarjetaSkeleton());
  }
  grid.hidden = false;
  grid.replaceChildren(fragmento);
}

function mostrarAvisoExito(mensaje) {
  if (!avisoExito) {
    avisoExito = document.createElement("div");
    avisoExito.className = "catalogo-toast";
    avisoExito.setAttribute("role", "status");
    avisoExito.setAttribute("aria-live", "polite");
    document.body.appendChild(avisoExito);
  }
  clearTimeout(avisoTemporizador);
  avisoExito.textContent = mensaje;
  avisoExito.classList.add("catalogo-toast--visible");
  avisoTemporizador = setTimeout(() => {
    avisoExito.classList.remove("catalogo-toast--visible");
  }, 2500);
}

function mostrarError(mensajeError, reintento) {
  grid.hidden = true;
  grid.replaceChildren();
  estado.hidden = false;
  estado.className = "catalogo-estado catalogo-estado--error";
  estado.setAttribute("role", "alert");
  estado.replaceChildren();

  const icono = document.createElement("span");
  icono.className = "catalogo-error-icono";
  icono.setAttribute("aria-hidden", "true");
  icono.innerHTML = ICONO_ERROR;

  const titulo = document.createElement("h3");
  titulo.className = "catalogo-error-titulo";
  titulo.textContent = "No pudimos cargar los lugares";

  const detalle = document.createElement("p");
  detalle.className = "catalogo-error-detalle";
  detalle.textContent = mensajeError;

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "catalogo-reintentar";
  boton.textContent = "Reintentar";
  boton.addEventListener("click", reintento);

  estado.append(icono, titulo, detalle, boton);
}

function mostrarVacio() {
  grid.hidden = true;
  grid.replaceChildren();
  estado.hidden = false;
  estado.className = "catalogo-estado";
  estado.setAttribute("role", "status");
  estado.replaceChildren();

  const mensaje = document.createElement("p");
  mensaje.textContent = "Aún no hay lugares disponibles.";
  estado.append(mensaje);
}

function mostrarExito(lugares) {
  estado.hidden = true;
  estado.replaceChildren();
  grid.hidden = false;
  renderizarTarjetas(lugares);
  mostrarAvisoExito("✓ Lugares cargados correctamente");
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