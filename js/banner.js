const diapositivas = [
    {
        imagen: "https://media.istockphoto.com/id/522629342/es/foto/araucaria-bosque-en-conguillio-parque-nacional-chile.jpg?s=612x612&w=0&k=20&c=WV_sJsuUyDALHfGpSMAKbXt1bhhFWoMemsHRofh_BBQ=",
        titulo: "EcoRuta Temuco",
        descripcion: "Conectando rutas al aire libre con emprendedores locales",
    },
    {
        imagen: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCMuNhsMsSUfuZolzSBhDLriOP7q2wEFhtuRrlSse5Aw&s=10",
        titulo: "Cerro Ñielol",
        descripcion: "Senderos y miradores en pleno centro de la ciudad",
    },
    {
        imagen: "https://lenguasyliteraturas.ufro.cl/wp-content/uploads/2014/12/Museo_Nacional_Ferroviario_Pablo_Neruda_de_Temuco_11-scaled.jpg",
        titulo: "Museo Ferroviario",
        descripcion: "Un gran recorrido historico por los trenes de Chile",
    },
    {
        imagen: "https://destinotemuco.cl/wp-content/uploads/2024/09/Feria-Pinto-01-1-1024x483.jpg",
        titulo: "Feria Pinto",
        descripcion: "Cultura y tradición local",
    },
];

const INTERVALO = 5000;

const banner = document.getElementById("banner");
const fondo = document.getElementById("banner-fondo");
const titulo = document.getElementById("banner-titulo");
const descripcion = document.getElementById("banner-descripcion");
const btnAnterior = document.getElementById("anterior");
const btnSiguiente = document.getElementById("siguiente");
const contenedorPuntos = document.getElementById("banner-puntos");

let indice = 0;
let temporizador = null;
const puntos = [];

diapositivas.forEach((d) => {
    const img = new Image();
    img.src = d.imagen;
});

diapositivas.forEach((_, i) => {
    const punto = document.createElement("button");
    punto.className = "banner-punto";
    punto.setAttribute("aria-label", `Ir a la imagen ${i + 1}`);
    punto.addEventListener("click", () => {
        mostrar(i);
        reiniciarAutoplay();
    });
    contenedorPuntos.appendChild(punto);
    puntos.push(punto);
});

function mostrar(nuevoIndice) {
    indice = (nuevoIndice + diapositivas.length) % diapositivas.length;
    const actual = diapositivas[indice];

    banner.classList.add("banner--cambiando");

    setTimeout(() => {
        fondo.style.backgroundImage = `url("${actual.imagen}")`;
        titulo.textContent = actual.titulo;
        descripcion.textContent = actual.descripcion;
        banner.classList.remove("banner--cambiando");
    }, 250);

    puntos.forEach((p, i) => {
        p.classList.toggle("activo", i === indice);
        p.setAttribute("aria-current", i === indice ? "true" : "false");
    });
}

function siguiente() {
    mostrar(indice + 1);
}

function anterior() {
    mostrar(indice - 1);
}

const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function iniciarAutoplay() {
    if (reducirMovimiento) return;
    detenerAutoplay();
    temporizador = setInterval(siguiente, INTERVALO);
}

function detenerAutoplay() {
    clearInterval(temporizador);
    temporizador = null;
}

function reiniciarAutoplay() {
    detenerAutoplay();
    iniciarAutoplay();
}

btnSiguiente.addEventListener("click", () => {
    siguiente();
    reiniciarAutoplay();
});

btnAnterior.addEventListener("click", () => {
    anterior();
    reiniciarAutoplay();
});

banner.addEventListener("mouseenter", detenerAutoplay);
banner.addEventListener("mouseleave", iniciarAutoplay);
banner.addEventListener("focusin", detenerAutoplay);
banner.addEventListener("focusout", iniciarAutoplay);

banner.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
        siguiente();
    } else if (e.key === "ArrowLeft") {
        anterior();
    }
});

let inicioX = 0;

banner.addEventListener("touchstart", (e) => {
    inicioX = e.touches[0].clientX;
}, { passive: true });

banner.addEventListener("touchend", (e) => {
    const diferencia = e.changedTouches[0].clientX - inicioX;
    if (Math.abs(diferencia) > 50) {
        if (diferencia < 0) {
            siguiente();
        } else {
            anterior();
        }
        reiniciarAutoplay();
    }
});

fondo.style.backgroundImage = `url("${diapositivas[0].imagen}")`;
titulo.textContent = diapositivas[0].titulo;
descripcion.textContent = diapositivas[0].descripcion;
puntos[0].classList.add("activo");
puntos[0].setAttribute("aria-current", "true");
iniciarAutoplay();