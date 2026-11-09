"use strict";

const ENDPOINT = "https://6ad7dc9f95e98f36aef2d123.mockapi.io/api/v1/lugares";
const contenedor = document.getElementById("lista-recomendados");
// Obtener lugares desde MockAPI
async function obtenerRecomendados() {
    try {
        const respuesta = await fetch(ENDPOINT);
        if (!respuesta.ok) {
            throw new Error("No se pudieron obtener los lugares");
        }
        const lugares = await respuesta.json();
        // Filtrar únicamente los recomendados
        const recomendados = lugares.filter(lugar => lugar.recomendado === true);
        // Limpiar el contenido anterior
        contenedor.innerHTML = "";
        // Comprobar si existen recomendados
        if (recomendados.length === 0) {
            contenedor.innerHTML = `
                <p class="estado-vacio">
                    Actualmente no hay lugares recomendados.
                </p>
            `;
            return;
        }
        // Crear una carta por cada lugar recomendado
        recomendados.forEach(lugar => {
            // Contenedor principal
            const elemento = document.createElement("div");
            elemento.className = "recomendado-item";
            // Carta de imagen
            const tarjeta = document.createElement("article");
            tarjeta.className = "lugar-card";
            const imagen = document.createElement("img");
            imagen.src = lugar.image;
            imagen.alt = `Imagen de ${lugar.name}`;
            imagen.loading = "lazy";
            // Información de la tarjeta
            const informacionTarjeta = document.createElement("div");
            informacionTarjeta.className = "lugar-card__info";
            // Botón de Google Maps
            const botonRuta = document.createElement("button");
            botonRuta.className = "btn-ruta";
            botonRuta.textContent = "Ver Ruta";
            botonRuta.setAttribute("aria-label", `Ver ruta para ${lugar.name}`);
            botonRuta.addEventListener("click", () => {
                if (lugar.googleMapsUrl) {
                    window.open(lugar.googleMapsUrl, "_blank", "noopener,noreferrer");
                }
            });
            informacionTarjeta.appendChild(botonRuta);
            tarjeta.appendChild(imagen);
            tarjeta.appendChild(informacionTarjeta);
            // Panel de información
            const aside = document.createElement("aside");
            aside.className = "lugar-aside";
            // Nombre
            const titulo = document.createElement("h3");
            titulo.textContent = lugar.name;
            // Descripción
            const descripcion = document.createElement("p");
            descripcion.className = "lugar-descripcion";
            descripcion.textContent = lugar.description;
            // Calificación
            const calificacion = document.createElement("div");
            calificacion.className = "lugar-calificacion";
            const etiqueta = document.createElement("strong");
            etiqueta.textContent = "Calificación:";
            const estrella = document.createElement("span");
            estrella.className = "calificacion-estrella";
            estrella.textContent = "★";
            const valor = document.createElement("span");
            valor.className = "calificacion-valor";
            valor.textContent = `${lugar.calificacion} Estrellas`;
            calificacion.appendChild(etiqueta);
            calificacion.appendChild(estrella);
            calificacion.appendChild(valor);
            // Dirección
            const direccion = document.createElement("div");
            direccion.className = "lugar-direccion";
            const etiquetaDireccion = document.createElement("strong");
            etiquetaDireccion.textContent = "Dirección: ";
            const textoDireccion = document.createElement("span");
            textoDireccion.textContent = lugar.address;
            direccion.appendChild(etiquetaDireccion);
            direccion.appendChild(textoDireccion);
            // Unir información
            aside.appendChild(titulo);
            aside.appendChild(descripcion);
            aside.appendChild(calificacion);
            aside.appendChild(direccion);
            // Agregar las dos columnas
            elemento.appendChild(tarjeta);
            elemento.appendChild(aside);
            // Agregar al HTML
            contenedor.appendChild(elemento);
        });
    }
    catch (error) {
        console.error("Error cargando recomendados:", error);
        contenedor.innerHTML = `
            <p class="estado-error">
                No se pudieron cargar los lugares recomendados.
                Intenta nuevamente más tarde.
            </p>
        `;
    }
}
// Ejecutar al cargar la página
obtenerRecomendados();
