const API_URL = "https://TU_ID.mockapi.io/api/v1/lugares";

const grid = document.getElementById("catalogo-grid");
const estado = document.getElementById("catalogo-estado");

const IMAGEN_RESPALDO = "../assets/imagenes/Temuco-paisaje-1.webp";

async function obtenerLugares() {
  const respuesta = await fetch(API_URL);

  if (!respuesta.ok) {
    throw new Error(`Error del servidor (código ${respuesta.status})`);
  }

  const datos = await respuesta.json();

  if (!Array.isArray(datos)) {
    throw new Error("La API no devolvió una lista de lugares");
  }
  return datos;
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

function mostrarError(mensaje) {
  grid.hidden = true;
  estado.hidden = false;
  estado.className = "catalogo-estado catalogo-estado--error";
  estado.replaceChildren();

  const texto = document.createElement("p");
  texto.textContent = `No pudimos cargar los lugares. ${mensaje}`;

  const reintentar = document.createElement("button");
  reintentar.type = "button";
  reintentar.className = "catalogo-reintentar";
  reintentar.textContent = "Reintentar";
  reintentar.addEventListener("click", cargarCatalogo);

  estado.append(texto, reintentar);
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

function crearTarjeta(lugar) {
  const nombre = lugar.nombre ?? lugar.name ?? "Lugar sin nombre";
  const categoria = lugar.categoria ?? lugar.category ?? "Sin categoría";
  const descripcion = lugar.descripcion ?? lugar.description ?? "";
  const imagen = lugar.imagen ?? lugar.image ?? lugar.avatar ?? IMAGEN_RESPALDO;

  const tarjeta = document.createElement("div");
  tarjeta.className = "tarjeta";

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

  const pCategoria = document.createElement("p");
  pCategoria.className = "tarjeta__categoria";
  pCategoria.textContent = categoria;

  const pDescripcion = document.createElement("p");
  pDescripcion.className = "tarjeta__descripcion";
  pDescripcion.textContent = descripcion;

  const verMas = document.createElement("a");
  verMas.href = "#";
  verMas.className = "boton__vermas";
  verMas.textContent = "Ver mas";
  verMas.setAttribute("aria-label", `Ver más detalles sobre ${nombre}`);

  contenedorTxt.append(titulo, pCategoria, pDescripcion, verMas);
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

async function cargarCatalogo() {
  mostrarCargando();
  try {
    const lugares = await obtenerLugares();
    if (lugares.length === 0) {
      mostrarVacio();
      return;
    }
    mostrarExito(lugares);
  } catch (error) {
    console.error("Error al cargar el catálogo:", error);
    mostrarError(error.message);
  }
}

cargarCatalogo();