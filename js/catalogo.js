const API_URL = "https://6ad7dc9f95e98f36aef2d123.mockapi.io/api/v1/lugares";
const LIMITE = 6;
const TIEMPO_MAXIMO_MS = 10000;
const IMAGEN_RESPALDO = "../assets/imagenes/Temuco-paisaje-1.webp";
const ICONO_ERROR = '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const grid = document.getElementById("catalogo-grid");
const estado = document.getElementById("catalogo-estado");
const btnAnterior = document.getElementById("pagina-anterior");
const btnSiguiente = document.getElementById("pagina-siguiente");
const indicador = document.getElementById("pagina-indicador");
const chkSoloFavoritos = document.getElementById("filtro-favoritos");
const contador = document.getElementById("catalogo-contador");
const selectorCategoria = document.getElementById("filtro-categoria");
const selectorSector = document.getElementById("filtro-sector");
const selectorCalificacion = document.getElementById("filtro-calificacion");
let todosLosLugares = [];
let lugaresFiltrados = [];
let paginaActual = 1;
let totalPaginas = 1;
const filtrosActivos = {
    categoria: "todas",
    sector: "todos",
    calificacion: "todas",
    soloFavoritos: false
};
const CLAVE_FAVORITOS = "ecolugares_favoritos";
function leerFavoritos() {
    try {
        const raw = localStorage.getItem(CLAVE_FAVORITOS);
        const datos = raw ? JSON.parse(raw) : [];
        return Array.isArray(datos)
            ? datos.filter((x) => typeof x === "string")
            : [];
    }
    catch {
        return [];
    }
}
function guardarFavoritos(lista) {
    try {
        localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(lista));
    }
    catch {
        // almacenamiento lleno o bloqueado: no rompemos la página
    }
}
function esFavorito(id) {
    return leerFavoritos().includes(id);
}
function pintarBoton(btn, activo) {
    btn.classList.toggle("btn-fav--activo", activo);
    btn.textContent = activo ? "♥" : "♡";
    btn.setAttribute("aria-pressed", String(activo));
    btn.setAttribute("aria-label", activo ? "Quitar de favoritos" : "Marcar como favorito");
    btn.title = activo ? "Quitar de favoritos" : "Marcar como favorito";
    btn.closest(".tarjeta")?.classList.toggle("tarjeta--favorita", activo);
}
function actualizarContador() {
    if (!contador)
        return;
    const filtros = filtrosActivos.categoria !== "todas" ||
        filtrosActivos.sector !== "todos" ||
        filtrosActivos.calificacion !== "todas" ||
        filtrosActivos.soloFavoritos;
    contador.textContent =
        `${filtros ? "Filtros activos" : "Sin filtros activos"} · ${lugaresFiltrados.length} lugares · ♥ ${leerFavoritos().length} favoritos`;
}
function toggleFavorito(id) {
    const favs = leerFavoritos();
    const i = favs.indexOf(id);
    const agregado = i === -1;
    if (agregado)
        favs.push(id);
    else
        favs.splice(i, 1);
    guardarFavoritos(favs);
    if (filtrosActivos.soloFavoritos) {
        // la tarjeta debe desaparecer de la lista: re-filtramos sin saltar de página
        aplicarFiltros(true);
    }
    else {
        grid?.querySelectorAll(".btn-fav").forEach((btn) => {
            if (btn.dataset.id === id)
                pintarBoton(btn, agregado);
        });
        actualizarContador();
    }
    mostrarAvisoExito(agregado ? "♥ Agregado a favoritos" : "♡ Quitado de favoritos");
}
let avisoExito = null;
let avisoTemporizador = null;
async function pedirJSON(url) {
    const controlador = new AbortController();
    const reloj = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);
    try {
        return await fetch(url, { signal: controlador.signal });
    }
    catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error("El servidor tardó demasiado en responder.");
        }
        throw new Error("Revisa tu conexión a internet e inténtalo de nuevo.");
    }
    finally {
        clearTimeout(reloj);
    }
}
function texto(valor) {
    return typeof valor === "string" ? valor.trim() : "";
}
function normalizarLugar(crudo) {
    if (!crudo || typeof crudo !== "object")
        return null;
    const raw = crudo;
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
function aplicarFiltros(conservarPagina = false) {
    let resultado = [...todosLosLugares];
    if (filtrosActivos.categoria !== "todas") {
        resultado = resultado.filter((lugar) => lugar.categoria.toLowerCase().trim() ===
            filtrosActivos.categoria.toLowerCase().trim());
    }
    if (filtrosActivos.sector !== "todos") {
        const sectoresPrincipales = [
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
                return (sec === "otros sectores rurales" || !sectoresPrincipales.includes(sec));
            });
        }
        else {
            resultado = resultado.filter((lugar) => lugar.sector.toLowerCase() === filtrosActivos.sector.toLowerCase());
        }
    }
    if (filtrosActivos.calificacion !== "todas") {
        const califMinima = parseFloat(filtrosActivos.calificacion);
        resultado = resultado.filter((lugar) => (lugar.calificacion || 0) >= califMinima);
    }
    if (filtrosActivos.soloFavoritos) {
        const favs = leerFavoritos();
        resultado = resultado.filter((lugar) => favs.includes(lugar.id));
    }
    lugaresFiltrados = resultado;
    totalPaginas = Math.max(1, Math.ceil(lugaresFiltrados.length / LIMITE));
    paginaActual = conservarPagina ? Math.min(paginaActual, totalPaginas) : 1;
    actualizarContador();
    mostrarPaginaActual();
}
function mostrarPaginaActual() {
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
    img.addEventListener("error", () => {
        img.src = IMAGEN_RESPALDO;
    }, { once: true });
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
    if (lugar.googleMapsUrl)
        verMas.target = "_blank";
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
        pintarBoton(btnFav, false);
        tarjeta.appendChild(btnFav);
        pintarBoton(btnFav, esFavorito(lugar.id));
    }
    return tarjeta;
}
function renderizarTarjetas(lugares) {
    if (!grid)
        return;
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
    if (!estado || !grid)
        return;
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
    if (avisoTemporizador)
        clearTimeout(avisoTemporizador);
    avisoExito.textContent = mensaje;
    avisoExito.classList.add("catalogo-toast--visible");
    avisoTemporizador = setTimeout(() => {
        avisoExito?.classList.remove("catalogo-toast--visible");
    }, 2500);
}
function mostrarError(mensajeError, reintento) {
    if (!grid || !estado)
        return;
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
function mostrarVacio() {
    if (!grid || !estado)
        return;
    grid.hidden = true;
    grid.replaceChildren();
    estado.hidden = false;
    estado.className = "catalogo-estado";
    estado.setAttribute("role", "status");
    estado.replaceChildren();
    const mensaje = document.createElement("p");
    mensaje.textContent = filtrosActivos.soloFavoritos
        ? "Aún no tienes lugares favoritos con estos filtros. Marca alguno con ♡."
        : "No se encontraron lugares con los filtros seleccionados.";
    estado.append(mensaje);
}
function mostrarExito(lugares) {
    if (!estado || !grid)
        return;
    estado.hidden = true;
    estado.replaceChildren();
    grid.hidden = false;
    renderizarTarjetas(lugares);
    mostrarAvisoExito("✓ Lugares cargados correctamente");
}
function actualizarPaginacion() {
    if (btnAnterior)
        btnAnterior.disabled = paginaActual <= 1;
    if (btnSiguiente)
        btnSiguiente.disabled = paginaActual >= totalPaginas;
    if (indicador) {
        indicador.textContent = `Pagina ${paginaActual} de ${totalPaginas}`;
    }
}
function cambiarPagina(nuevaPagina) {
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
async function cargarCatalogo() {
    mostrarCargando();
    try {
        const respuesta = await pedirJSON(API_URL);
        if (!respuesta.ok)
            throw new Error(`Error en el servidor (${respuesta.status})`);
        const datos = await respuesta.json();
        if (!Array.isArray(datos)) {
            throw new Error("La API no devolvió una lista válida.");
        }
        todosLosLugares = datos.map(normalizarLugar).filter((l) => l !== null);
        aplicarFiltros();
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : "Error desconocido";
        mostrarError(msg, cargarCatalogo);
    }
}
if (selectorCategoria) {
    selectorCategoria.addEventListener("change", (e) => {
        const target = e.target;
        filtrosActivos.categoria = target.value;
        aplicarFiltros();
    });
}
if (selectorSector) {
    selectorSector.addEventListener("change", (e) => {
        const target = e.target;
        filtrosActivos.sector = target.value;
        aplicarFiltros();
    });
}
if (selectorCalificacion) {
    selectorCalificacion.addEventListener("change", (e) => {
        const target = e.target;
        filtrosActivos.calificacion = target.value;
        aplicarFiltros();
    });
}
chkSoloFavoritos?.addEventListener("change", () => {
    filtrosActivos.soloFavoritos = chkSoloFavoritos.checked;
    aplicarFiltros();
});
// Delegación: sigue funcionando aunque se re-rendericen las tarjetas
grid?.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-fav");
    if (btn?.dataset.id)
        toggleFavorito(btn.dataset.id);
});
btnAnterior?.addEventListener("click", () => cambiarPagina(paginaActual - 1));
btnSiguiente?.addEventListener("click", () => cambiarPagina(paginaActual + 1));
cargarCatalogo();
export {};
