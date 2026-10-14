
const form = document.querySelector(".formulario-contacto__form");
const boton = document.querySelector(".formulario-contacto__btn");
const nombre = document.querySelector("#nombre");
const correo = document.querySelector("#correo");
const numero = document.querySelector("#numero");
const mensaje = document.querySelector("#mensaje");

const campos = [nombre, correo, numero, mensaje];

form.noValidate = true;

for (const campo of campos) {
  const aviso = document.createElement("small");
  campo.parentElement.appendChild(aviso);
}

function mostrarError(campo, texto) {
  campo.classList.add("error");
  campo.classList.remove("exito");
  const aviso = campo.parentElement.querySelector("small");
  aviso.textContent = texto;
  aviso.className = "aviso-error";
}

function mostrarExito(campo) {
  campo.classList.remove("error");
  campo.classList.add("exito");
  const aviso = campo.parentElement.querySelector("small");
  aviso.textContent = "Correcto";
  aviso.className = "aviso-exito";
}

function validarNombre() {
  if (nombre.value.trim() === "") {
    mostrarError(nombre, "El nombre es obligatorio");
    return false;
  }
  if (nombre.value.trim().length < 3) {
    mostrarError(nombre, "Escribe al menos 3 letras");
    return false;
  }
  mostrarExito(nombre);
  return true;
}

function validarCorreo() {
  if (correo.value.trim() === "") {
    mostrarError(correo, "El correo es obligatorio");
    return false;
  }
  if (!correo.value.includes("@") || !correo.value.includes(".")) {
    mostrarError(correo, "Escribe un correo válido");
    return false;
  }
  mostrarExito(correo);
  return true;
}

function validarNumero() {
  if (numero.value.trim() === "") {
    mostrarError(numero, "El número es obligatorio");
    return false;
  }
  if (isNaN(numero.value) || numero.value.trim().length < 8) {
    mostrarError(numero, "Escribe solo números (mínimo 8)");
    return false;
  }
  mostrarExito(numero);
  return true;
}

function validarMensaje() {
  if (mensaje.value.trim() === "") {
    mostrarError(mensaje, "El mensaje es obligatorio");
    return false;
  }
  if (mensaje.value.trim().length < 10) {
    mostrarError(mensaje, "Escribe al menos 10 caracteres");
    return false;
  }
  mostrarExito(mensaje);
  return true;
}

nombre.addEventListener("input", validarNombre);
correo.addEventListener("input", validarCorreo);
numero.addEventListener("input", validarNumero);
mensaje.addEventListener("input", validarMensaje);

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const nombreOk = validarNombre();
  const correoOk = validarCorreo();
  const numeroOk = validarNumero();
  const mensajeOk = validarMensaje();

  if (nombreOk && correoOk && numeroOk && mensajeOk) {
    boton.textContent = "¡Mensaje enviado!";
    boton.classList.add("enviado");

    setTimeout(() => {
      form.reset();
      boton.textContent = "Enviar Mensaje";
      boton.classList.remove("enviado");
      for (const campo of campos) {
        campo.classList.remove("error", "exito");
        campo.parentElement.querySelector("small").textContent = "";
      }
    }, 3000);
  }
});