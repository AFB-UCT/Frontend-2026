export {}; // Evita el error de funciones duplicadas con otros archivos

interface LugarRaw {
  id?: string;
  name?: string;
  description?: string;
  image?: string;
  address?: string;
  phone?: string;
  email?: string;
  sector?: string;
  calificacion?: number | string;
  categoria?: string;
  googleMapsUrl?: string;
  recomendado?: boolean;
}

interface Lugar {
  id: string;
  nombre: string;
  descripcion: string;
  direccion: string;
  telefono: string;
  correo: string;
  sector: string;
  categoria: string;
  calificacion: number | null;
  googleMapsUrl: string;
  imagen: string;
}

interface FiltrosActivos {
  categoria: string;
  sector: string;
  calificacion: string;
}

const API_URL: string = "https://6ad7dc9f95e98f36aef2d123.mockapi.io/api/v1/lugares";
const LIMITE: number = 6;
const TIEMPO_MAXIMO_MS: number = 10000;
const IMAGEN_RESPALDO: string = "../assets/imagenes/Temuco-paisaje-1.webp";
const ICONO_ERROR: string = '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const grid = document.getElementById("catalogo-grid") as HTMLElement | null;
const estado = document.getElementById("catalogo-estado") as HTMLElement | null;
const btnAnterior = document.getElementById("pagina-anterior") as HTMLButtonElement | null;
const btnSiguiente = document.getElementById("pagina-siguiente") as HTMLButtonElement | null;
const indicador = document.getElementById("pagina-indicador") as HTMLElement | null;
const selectorCategoria = document.getElementById("filtro-categoria") as HTMLSelectElement | null;
const selectorSector = document.getElementById("filtro-sector") as HTMLSelectElement | null;
const selectorCalificacion = document.getElementById("filtro-calificacion") as HTMLSelectElement | null;
let todosLosLugares: Lugar[] = [];
let lugaresFiltrados: Lugar[] = [];
let paginaActual: number = 1;
let totalPaginas: number = 1;
const filtrosActivos: FiltrosActivos = {
  categoria: "todas",
  sector: "todos",
  calificacion: "todas"
};

let avisoExito: HTMLDivElement | null = null;
let avisoTemporizador: ReturnType<typeof setTimeout> | null = null;

async function pedirJSON(url: string): Promise<Response> {
  const controlador = new AbortController();
  const reloj = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);

  try {
    return await fetch(url, { signal: controlador.signal });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("El servidor tardó demasiado en responder.");
    }
    throw new Error("Revisa tu conexión a internet e inténtalo de nuevo.");
  } finally {
    clearTimeout(reloj);
  }
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function normalizarLugar(crudo: unknown): Lugar | null {
  if (!crudo || typeof crudo !== "object") return null;

  const raw = crudo as LugarRaw;
  const nombre = texto(raw.name) || "Lugar sin nombre";
  const imagen = texto(raw.image);

  return {
    id: raw.id ?? "",
    nombre,
    descripcion: texto(raw.description),
    direccion: texto(raw.address),
    telefono: texto(raw.phone),
    correo: texto(raw.email),
    sector: texto(raw.sector) || "Temuco",
    categoria: texto(raw.categoria) || "Lugar natural",
    calificacion: raw.calificacion ? Number(raw.calificacion) : null,
    googleMapsUrl: texto(raw.googleMapsUrl),
    imagen: /^(https?:\/\/|\.{0,2}\/)/i.test(imagen) ? imagen : IMAGEN_RESPALDO,
  };
}

function aplicarFiltros(): void {
  let resultado: Lugar[] = [...todosLosLugares];

  if (filtrosActivos.categoria !== "todas") {
    resultado = resultado.filter(
      (lugar) =>
        lugar.categoria.toLowerCase().trim() ===
        filtrosActivos.categoria.toLowerCase().trim()
    );
  }

  if (filtrosActivos.sector !== "todos") {
    const sectoresPrincipales: string[] = [
      "temuco",
      "padre las casas",
      "labranza",
      "cholchol",
      "vilcún",
      "vilcun"
    ];

    if (filtrosActivos.sector === "Otros sectores rurales") {
      resultado = resultado.filter((lugar) => {
        const sec = lugar.sector.toLowerCase();
        return (
          sec === "otros sectores rurales" || !sectoresPrincipales.includes(sec)
        );
      });
    } else {
      resultado = resultado.filter(
        (lugar) =>
          lugar.sector.toLowerCase() === filtrosActivos.sector.toLowerCase()
      );
    }
  }

  if (filtrosActivos.calificacion !== "todas") {
    const califMinima = parseFloat(filtrosActivos.calificacion);
    resultado = resultado.filter(
      (lugar) => (lugar.calificacion || 0) >= califMinima
    );
  }

  lugaresFiltrados = resultado;
  paginaActual = 1;
  totalPaginas = Math.max(1, Math.ceil(lugaresFiltrados.length / LIMITE));

  mostrarPaginaActual();
}

function mostrarPaginaActual(): void {
  if (lugaresFiltrados.length === 0) {
    mostrarVacio();
    actualizarPaginacion();
    return;
  }

  const inicio = (paginaActual - 1) * LIMITE;
  const fin = inicio + LIMITE;
  const lugaresDeLaPagina = lugaresFiltrados.slice(inicio, fin);

  mostrarExito(lugaresDeLaPagina);
  actualizarPaginacion();
}

function crearLinea(clase: string, contenido: string): HTMLParagraphElement {
  const p = document.createElement("p");
  p.className = clase;
  p.textContent = contenido;
  return p;
}

function crearTarjeta(lugar: Lugar): HTMLDivElement {
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

  if (lugar.calificacion) {
    const califTexto = document.createElement("p");
    califTexto.className = "tarjeta__calificacion";
    califTexto.innerHTML = `⭐ <strong>${lugar.calificacion}</strong> <span style="font-size:0.8rem; color:#666;">(Google Maps)</span>`;
    contenedorTxt.appendChild(califTexto);
  }

  if (lugar.direccion) {
    contenedorTxt.appendChild(crearLinea("tarjeta__direccion", `📍 ${lugar.direccion}`));
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
  verMas.href = lugar.googleMapsUrl || "#";
  if (lugar.googleMapsUrl) verMas.target = "_blank";
  verMas.className = "boton__vermas";
  verMas.textContent = "Ver mas";
  verMas.dataset.id = lugar.id;
  verMas.setAttribute("aria-label", `Ver más detalles sobre ${lugar.nombre}`);
  contenedorTxt.appendChild(verMas);

  tarjeta.append(contenedorImg, contenedorTxt);
  return tarjeta;
}

function renderizarTarjetas(lugares: Lugar[]): void {
  if (!grid) return;
  const fragmento = document.createDocumentFragment();
  for (const lugar of lugares) {
    fragmento.appendChild(crearTarjeta(lugar));
  }
  grid.replaceChildren(fragmento);
}

function crearLineaSkeleton(variante?: string): HTMLSpanElement {
  const linea = document.createElement("span");
  linea.className = variante
    ? `skeleton-linea skeleton-linea--${variante}`
    : "skeleton-linea";
  return linea;
}

function crearTarjetaSkeleton(): HTMLDivElement {
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

function mostrarCargando(): void {
  if (!estado || !grid) return;
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

function mostrarAvisoExito(mensaje: string): void {
  if (!avisoExito) {
    avisoExito = document.createElement("div");
    avisoExito.className = "catalogo-toast";
    avisoExito.setAttribute("role", "status");
    avisoExito.setAttribute("aria-live", "polite");
    document.body.appendChild(avisoExito);
  }
  if (avisoTemporizador) clearTimeout(avisoTemporizador);
  avisoExito.textContent = mensaje;
  avisoExito.classList.add("catalogo-toast--visible");
  avisoTemporizador = setTimeout(() => {
    avisoExito?.classList.remove("catalogo-toast--visible");
  }, 2500);
}

function mostrarError(mensajeError: string, reintento: () => void): void {
  if (!grid || !estado) return;
  grid.hidden = true;
  grid.replaceChildren();
  estado.hidden = false;
  estado.className = "catalogo-error";
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

function mostrarVacio(): void {
  if (!grid || !estado) return;
  grid.hidden = true;
  grid.replaceChildren();
  estado.hidden = false;
  estado.className = "catalogo-estado";
  estado.setAttribute("role", "status");
  estado.replaceChildren();

  const mensaje = document.createElement("p");
  mensaje.textContent = "No se encontraron lugares con los filtros seleccionados.";
  estado.append(mensaje);
}

function mostrarExito(lugares: Lugar[]): void {
  if (!estado || !grid) return;
  estado.hidden = true;
  estado.replaceChildren();
  grid.hidden = false;
  renderizarTarjetas(lugares);
  mostrarAvisoExito("✓ Lugares cargados correctamente");
}

function actualizarPaginacion(): void {
  if (btnAnterior) btnAnterior.disabled = paginaActual <= 1;
  if (btnSiguiente) btnSiguiente.disabled = paginaActual >= totalPaginas;

  if (indicador) {
    indicador.textContent = `Pagina ${paginaActual} de ${totalPaginas}`;
  }
}

function cambiarPagina(nuevaPagina: number): void {
  if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
    paginaActual = nuevaPagina;
    document.querySelector(".catalogo")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    mostrarPaginaActual();
  }
}

async function cargarCatalogo(): Promise<void> {
  mostrarCargando();
  try {
    const respuesta = await pedirJSON(API_URL);
    if (!respuesta.ok) throw new Error(`Error en el servidor (${respuesta.status})`);

    const datos: unknown = await respuesta.json();
    if (!Array.isArray(datos)) {
      throw new Error("La API no devolvió una lista válida.");
    }

    todosLosLugares = datos.map(normalizarLugar).filter((l): l is Lugar => l !== null);

    aplicarFiltros();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    mostrarError(msg, cargarCatalogo);
  }
}

if (selectorCategoria) {
  selectorCategoria.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    filtrosActivos.categoria = target.value;
    aplicarFiltros();
  });
}

if (selectorSector) {
  selectorSector.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    filtrosActivos.sector = target.value;
    aplicarFiltros();
  });
}

if (selectorCalificacion) {
  selectorCalificacion.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    filtrosActivos.calificacion = target.value;
    aplicarFiltros();
  });
}

btnAnterior?.addEventListener("click", () => cambiarPagina(paginaActual - 1));
btnSiguiente?.addEventListener("click", () => cambiarPagina(paginaActual + 1));

cargarCatalogo();