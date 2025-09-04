
const client = mqtt.connect('wss://c716f0944e684366a99bddcfc868dcbe.s1.eu.hivemq.cloud:8884/mqtt', {
    username: 'alfonso',
    password: 'lA2240#%'
});


function crearGrafico(ctx, etiqueta, color) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: etiqueta,
        data: [],
        borderColor: color,
        backgroundColor: color + '33',
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: { title: { display: true, text: 'Hora' } },
        y: { beginAtZero: true, title: { display: true, text: etiqueta } }
      }
    }
  });
}

const grafPh = crearGrafico(document.getElementById('graficoPh'), 'pH', 'blue');
const grafCond = crearGrafico(document.getElementById('graficoCond'), 'Conductividad (µS/cm)', 'green');
const grafTemp = crearGrafico(document.getElementById('graficoTemp'), 'Temperatura (°C)', 'red');
const grafTurb = crearGrafico(document.getElementById('graficoTurb'), 'Turbidez (NTU)', 'orange');

client.on("connect", () => {
  console.log("Conectado a MQTT");
  client.subscribe("sensores/datos");
});

function agregarDato(chart, valor) {
  const ahora = new Date().toLocaleTimeString();
  chart.data.labels.push(ahora);
  chart.data.datasets[0].data.push(parseFloat(valor));
  if (chart.data.labels.length > 20) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update();
}

/* ---------------------------
   LÓGICA PARA GUARDAR EN CSV
---------------------------- */
let guardando = false;         // Estado de guardado
let datosCSV = [];             // Array para almacenar los datos
const encabezados = ["Hora", "pH", "Temperatura", "Conductividad", "Turbidez"];

function toggleGuardar() {
  const boton = document.getElementById("btnGuardar");

  if (!guardando) {
    // Iniciar guardado
    guardando = true;
    datosCSV = []; // Limpiar datos anteriores
    datosCSV.push(encabezados); // Agregar encabezados
    boton.textContent = "Detener y Descargar";
    boton.classList.add("activo");
    console.log("🔴 Guardado de datos iniciado...");
  } else {
    // Detener y descargar CSV
    guardando = false;
    boton.textContent = "Guardar";
    boton.classList.remove("activo");
    console.log("🟢 Guardado detenido. Generando archivo CSV...");

    // Convertir a CSV
    const csvContent = datosCSV.map(fila => fila.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    // Crear enlace de descarga
    const a = document.createElement("a");
    a.href = url;
    const fecha = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = obtenerNombreArchivo();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    console.log("📂 Archivo CSV descargado.");
  }
}


client.on("message", (topic, message) => {
  console.log("📩 Mensaje recibido:", topic, message.toString());
  if (topic === "sensores/datos") {
    try {
      const datos = JSON.parse(message.toString());

      if (datos.ph !== undefined) {
        agregarDato(grafPh, datos.ph);
        document.getElementById("ph-value").textContent = datos.ph.toFixed(2);
      }

      if (datos.temperatura !== undefined) {
        agregarDato(grafTemp, datos.temperatura);
        document.getElementById("temperatura-value").textContent = datos.temperatura.toFixed(2); // + " °C";
      }

      if (datos.conductividad !== undefined) {
        agregarDato(grafCond, datos.conductividad);
        document.getElementById("conductividad-value").textContent = datos.conductividad.toFixed(2); // + " µS/cm";
      }

      if (datos.turbidez !== undefined) {
        agregarDato(grafTurb, datos.turbidez);
        document.getElementById("turbidez-value").textContent = datos.turbidez.toFixed(2); // + " NTU";
      }

      // Guardar en CSV si está activo
      if (guardando) {
        const horaActual = new Date().toLocaleTimeString(); // Genera la hora actual
        
        datosCSV.push([
          horaActual,
          datos.ph !== undefined ? datos.ph.toFixed(2) : "",
          datos.temperatura !== undefined ? datos.temperatura.toFixed(2) : "",
          datos.conductividad !== undefined ? datos.conductividad.toFixed(2) : "",
          datos.turbidez !== undefined ? datos.turbidez.toFixed(2) : ""
        ]);
      }

    } catch (e) {
      console.error("❌ Error al parsear JSON:", e);
    }
  }
});

function obtenerNombreArchivo() {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');

  return `datos_sensores_${año}-${mes}-${dia}.csv`;
}


function enviarOK(idCampo) {
  const valor = document.getElementById(idCampo).value;
  client.publish(`control/${idCampo}`, valor);
  console.log(`📤 OK enviado: control/${idCampo} = ${valor}`);
}

function toggleDispositivo(dispositivo, botonId) {
  const boton = document.getElementById(botonId);
  const estadoActual = boton.textContent;
  const nuevoEstado = estadoActual === "ON" ? "OFF" : "ON";
  boton.textContent = nuevoEstado;
  boton.classList.remove("ON", "OFF");
  boton.classList.add(nuevoEstado);
  client.publish(`control/${dispositivo}`, nuevoEstado);
  console.log(`🔄 ${dispositivo} cambiado a: ${nuevoEstado}`);
}

function publicarAccion(accion) {
  client.publish("control/accion", accion);
  console.log(`🚀 Acción enviada: ${accion}`);
}
