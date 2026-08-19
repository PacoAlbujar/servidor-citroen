const WebSocket = require('ws');
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

let clienteIdCounter = 1;

console.log(`Servidor multijugador activo en el puerto ${port}`);

wss.on('connection', (ws) => {
  // Asignar un ID único a cada cliente que se conecta
  ws.id = "cliente_" + clienteIdCounter++;
  console.log(`¡Un Citroën se ha conectado! ID asignado: ${ws.id}`);

  // Enviar al cliente recién conectado su propio ID de bienvenida
  ws.send(JSON.stringify({ tipo: "bienvenida", tu_id: ws.id }));

  ws.on('message', (message) => {
    try {
      let datos = JSON.parse(message.toString());
      datos.id = ws.id; // Asegurar que el ID del paquete sea el del cliente emisor

      const paqueteAEnviar = JSON.stringify(datos);

      // Reenviar ÚNICAMENTE a los demás jugadores (excluyendo al que lo envió)
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(paqueteAEnviar);
        }
      });
    } catch (e) {
      // Ignorar paquetes mal formados
    }
  });

  ws.on('close', () => {
    console.log(`Un Citroën se ha desconectado (ID: ${ws.id}).`);
  });
});
