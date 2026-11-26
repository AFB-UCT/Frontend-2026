export {};

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
  soloFavoritos: boolean;
}

type ClaveFiltroSelect = "categoria" | "sector" | "calificacion";

interface EstadoGuardado {
  version: number;
  filtros: FiltrosActivos;
  pagina: number;
  scrollY: number;
  desdeFicha: boolean;
}

const API_URL: string = "https://6ad7dc9f95e98f36aef2d123.mockapi.io/api/v1/lugares";
const LIMITE: number = 6;
const TIEMPO_MAXIMO_MS: number = 10000;
const IMAGEN_RESPALDO: string = "../assets/imagenes/Temuco-paisaje-1.webp";
const ICONO_ERROR: string = '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const CLAVE_ESTADO: string = "ecoruta:catalogo:estado";
const CLAVE_FAVORITOS: string = "ecoruta:catalogo:favoritos";
const VERSION_ESTADO: number = 1;
const FILTROS_POR_DEFECTO: FiltrosActivos = {
  categoria: "todas",
  sector: "todos",
  calificacion: "todas",
  soloFavoritos: false
};
const CLAVES_FILTRO: ClaveFiltroSelect[] = ["categoria", "sector", "calificacion"];

const grid = document.getElementById("catalogo-grid") as HTMLElement | null;
const estado = document.getElementById("catalogo-estado") as HTMLElement | null;
const btnAnterior = document.getElementById("pagina-anterior") as HTMLButtonElement | null;
const btnSiguiente = document.getElementById("pagina-siguiente") as HTMLButtonElement | null;
const indicador = document.getElementById("pagina-indicador") as HTMLElement | null;
const chkSoloFavoritos = document.getElementById("filtro-favoritos") as HTMLInputElement | null;
const selectorCategoria = document.getElementById("filtro-categoria") as HTMLSelectElement | null;
const selectorSector = document.getElementById("filtro-sector") as HTMLSelectElement | null;
const selectorCalificacion = document.getElementById("filtro-calificacion") as HTMLSelectElement | null;
const contenedorFiltros = document.getElementById("filtros-activos") as HTMLElement | null;

const selectores: Record<ClaveFiltroSelect, HTMLSelectElement | null> = {
  categoria: selectorCategoria,
  sector: selectorSector,
  calificacion: selectorCalificacion
};

let todosLosLugares: Lugar[] = [];
let lugaresFiltrados: Lugar[] = [];
let paginaActual: number = 1;
let totalPaginas: number = 1;

const filtrosActivos: FiltrosActivos = { ...FILTROS_POR_DEFECTO };

let datosCargados: boolean = false;
let estadoRestaurado: boolean = false;
let scrollPendiente: number | null = null;
let saliendoAFicha: boolean = false;
let avisoExito: HTMLDivElement | null = null;
let avisoTemporizador: ReturnType<typeof setTimeout> | null = null;

function leerFavoritos(): string[] {
  try {
    const crudo = localStorage.getItem(CLAVE_FAVORITOS);
    const parsed: unknown = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function guardarFavoritos(ids: string[]): void {
  try {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(ids));
  } catch {
  }
}

function esFavorito(id: string): boolean {
  return leerFavoritos().includes(String(id));
}

function pintarBoton(boton: HTMLButtonElement, activo: boolean): void {
  boton.classList.toggle("btn-fav--activo", activo);
  boton.setAttribute("aria-pressed", String(activo));
  boton.setAttribute(
    "aria-label",
    activo ? "Quitar de favoritos" : "Agregar a favoritos"
  );
  boton.textContent = activo ? "♥" : "♡";
}

function toggleFavorito(id: string): void {
  const idStr = String(id);
  const actuales = leerFavoritos();
  const existe = actuales.includes(idStr);
  const siguientes = existe
    ? actuales.filter((item) => item !== idStr)
    : [...actuales, idStr];

  guardarFavoritos(siguientes);

  const activo = !existe;
  document
    .querySelectorAll<HTMLButtonElement>(`.btn-fav[data-id="${CSS.escape(idStr)}"]`)
    .forEach((btn) => pintarBoton(btn, activo));

  if (filtrosActivos.soloFavoritos) {
    aplicarFiltros(paginaActual);
  }
}

function guardarEstado(): void {
  if (!datosCargados) return;
  try {
    const estadoActual: EstadoGuardado = {
      version: VERSION_ESTADO,
      filtros: { ...filtrosActivos },
      pagina: paginaActual,
      scrollY: Math.round(window.scrollY),
      desdeFicha: saliendoAFicha
    };
    sessionStorage.setItem(CLAVE_ESTADO, JSON.stringify(estadoActual));
  } catch {
  }
}

function leerEstadoGuardado(): EstadoGuardado | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE_ESTADO);
    if (!crudo) return null;
    const guardado: unknown = JSON.parse(crudo);
    if (!guardado || typeof guardado !== "object") return null;

    const candidato = guardado as Partial<EstadoGuardado>;
    if (
      candidato.version !== VERSION_ESTADO ||
      !candidato.filtros ||
      typeof candidato.filtros !== "object"
    ) {
      return null;
    }
    return candidato as EstadoGuardado;
  } catch {
    return null;
  }
}

function restaurarFiltrosGuardados(guardado: EstadoGuardado): void {
  for (const clave of CLAVES_FILTRO) {
    const select = selectores[clave];
    const valor: unknown = guardado.filtros[clave];
    if (!select || typeof valor !== "string") continue;

    const existe = Array.from(select.options).some((op) => op.value === valor);
    if (existe) {
      select.value = valor;
      filtrosActivos[clave] = valor;
    }
  }

  if (typeof guardado.filtros.soloFavoritos === "boolean") {
    filtrosActivos.soloFavoritos = guardado.filtros.soloFavoritos;
    if (chkSoloFavoritos) {
      chkSoloFavoritos.checked = guardado.filtros.soloFavoritos;
    }
  }
}

function volvioPorHistorial(): boolean {
  const entradas = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return entradas.length > 0 && entradas[0].type === "back_forward";
}

function aplicarScrollPendiente(): void {
  if (scrollPendiente === null) return;
  const y = scrollPendiente;
  scrollPendiente = null;
  requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
}

function textoFiltro(clave: ClaveFiltroSelect, valor: string): string {
  if (clave === "categoria") return `Categoría: ${valor}`;
  if (clave === "sector") return `Sector: ${valor}`;
  return `Calificación: ${valor} o más`;
}

function restablecerFiltro(clave: ClaveFiltroSelect): void {
  filtrosActivos[clave] = FILTROS_POR_DEFECTO[clave];
  const select = selectores[clave];
  if (select) select.value = FILTROS_POR_DEFECTO[clave];
}

function limpiarFiltros(): void {
  for (const clave of CLAVES_FILTRO) {
    restablecerFiltro(clave);
  }
  filtrosActivos.soloFavoritos = false;
  if (chkSoloFavoritos) chkSoloFavoritos.checked = false;
  aplicarFiltros();
}

function actualizarFiltrosActivos(): void {
  const activos = CLAVES_FILTRO.filter(
    (clave) => filtrosActivos[clave] !== FILTROS_POR_DEFECTO[clave]
  );
  const totalActivos = activos.length + (filtrosActivos.soloFavoritos ? 1 : 0);

  for (const clave of CLAVES_FILTRO) {
    selectores[clave]?.classList.toggle("filtro--activo", activos.includes(clave));
  }

  if (!contenedorFiltros) return;

  const total = lugaresFiltrados.length;
  const textoLugares = total === 1 ? "1 lugar" : `${total} lugares`;
  const textoFiltros =
    totalActivos === 0
      ? "Sin filtros activos"
      : totalActivos === 1
        ? "1 filtro activo"
        : `${totalActivos} filtros activos`;

  const resumen = document.createElement("p");
  resumen.className = "filtros-activos__resumen";
  resumen.textContent = `${textoFiltros} · ${textoLugares}`;
  contenedorFiltros.replaceChildren(resumen);

  if (totalActivos === 0) return;

  const lista = document.createElement("ul");
  lista.className = "filtros-activos__lista";

  for (const clave of activos) {
    const etiqueta = textoFiltro(clave, filtrosActivos[clave]);

    const item = document.createElement("li");
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "filtros-activos__chip";
    chip.textContent = `${etiqueta} ✕`;
    chip.setAttribute("aria-label", `Quitar filtro ${etiqueta}`);
    chip.addEventListener("click", () => {
      restablecerFiltro(clave);
      aplicarFiltros();
      selectores[clave]?.focus();
    });

    item.appendChild(chip);
    lista.appendChild(item);
  }

  if (filtrosActivos.soloFavoritos) {
    const item = document.createElement("li");
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "filtros-activos__chip";
    chip.textContent = "Solo favoritos ✕";
    chip.setAttribute("aria-label", "Quitar filtro Solo favoritos");
    chip.addEventListener("click", () => {
      filtrosActivos.soloFavoritos = false;
      if (chkSoloFavoritos) chkSoloFavoritos.checked = false;
      aplicarFiltros();
      chkSoloFavoritos?.focus();
    });

    item.appendChild(chip);
    lista.appendChild(item);
  }

  const limpiar = document.createElement("button");
  limpiar.type = "button";
  limpiar.className = "filtros-activos__limpiar";
  limpiar.textContent = "Limpiar filtros";
  limpiar.addEventListener("click", limpiarFiltros);

  contenedorFiltros.append(lista, limpiar);
}

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
    id: raw.id !== undefined && raw.id !== null ? String(raw.id) : "",
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

function aplicarFiltros(paginaDeseada: number = 1): void {
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

  if (filtrosActivos.soloFavoritos) {
    const favs = leerFavoritos();
    resultado = resultado.filter((lugar) => favs.includes(lugar.id));
  }

  lugaresFiltrados = resultado;
  totalPaginas = Math.max(1, Math.ceil(lugaresFiltrados.length / LIMITE));
  paginaActual = Math.min(Math.max(1, paginaDeseada), totalPaginas);

  mostrarPaginaActual();
  actualizarFiltrosActivos();
  guardarEstado();
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
    califTexto.innerHTML = `⭐ <strong>${lugar.calificacion}</strong> <span class="tarjeta__fuente">(Google Maps)</span>`;
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

  if (lugar.id) {
    const btnFav = document.createElement("button");
    btnFav.type = "button";
    btnFav.className = "btn-fav";
    btnFav.dataset.id = lugar.id;
    pintarBoton(btnFav, esFavorito(lugar.id));
    tarjeta.appendChild(btnFav);
  }

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

  const limpiar = document.createElement("button");
  limpiar.type = "button";
  limpiar.className = "catalogo-reintentar";
  limpiar.textContent = "Limpiar filtros";
  limpiar.addEventListener("click", limpiarFiltros);

  estado.append(mensaje, limpiar);
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
    guardarEstado();
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

    let paginaInicial = 1;
    if (!estadoRestaurado) {
      estadoRestaurado = true;
      const guardado = leerEstadoGuardado();
      if (guardado) {
        restaurarFiltrosGuardados(guardado);
        paginaInicial = Number.isInteger(guardado.pagina) ? guardado.pagina : 1;
        const volvio = guardado.desdeFicha === true || volvioPorHistorial();
        if (volvio && Number.isFinite(guardado.scrollY)) {
          scrollPendiente = guardado.scrollY;
        }
      }
    }

    datosCargados = true;
    aplicarFiltros(paginaInicial);
    aplicarScrollPendiente();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    mostrarError(msg, cargarCatalogo);
  }
}

for (const clave of CLAVES_FILTRO) {
  const select = selectores[clave];
  if (!select) continue;
  select.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    filtrosActivos[clave] = target.value;
    aplicarFiltros();
  });
}

chkSoloFavoritos?.addEventListener("change", () => {
  filtrosActivos.soloFavoritos = chkSoloFavoritos.checked;
  aplicarFiltros();
});

grid?.addEventListener("click", (e: MouseEvent) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".btn-fav");
  if (btn?.dataset.id) {
    toggleFavorito(btn.dataset.id);
    return;
  }

  const enlace = (e.target as HTMLElement).closest(".boton__vermas");
  if (!enlace) return;
  saliendoAFicha = true;
  guardarEstado();
});

btnAnterior?.addEventListener("click", () => cambiarPagina(paginaActual - 1));
btnSiguiente?.addEventListener("click", () => cambiarPagina(paginaActual + 1));

window.addEventListener("pagehide", guardarEstado);

function marcarRegreso(): void {
  saliendoAFicha = false;
  guardarEstado();
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") marcarRegreso();
});
window.addEventListener("pageshow", (e: PageTransitionEvent) => {
  if (e.persisted) marcarRegreso();
});

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

cargarCatalogo();
