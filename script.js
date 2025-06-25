
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

client.on("message", (topic, message) => {
  console.log("📩 Mensaje recibido:", topic, message.toString());
  if (topic === "sensores/datos") {
    try {
      const datos = JSON.parse(message.toString());
      if (datos.ph !== undefined) agregarDato(grafPh, datos.ph);
      if (datos.temperatura !== undefined) agregarDato(grafTemp, datos.temperatura);
      if (datos.conductividad !== undefined) agregarDato(grafCond, datos.conductividad);
      if (datos.turbidez !== undefined) agregarDato(grafTurb, datos.turbidez);
    } catch (e) {
      console.error("❌ Error al parsear JSON:", e);
    }
  }
});

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
