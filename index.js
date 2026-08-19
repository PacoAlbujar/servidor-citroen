const WebSocket = require('ws');
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`Servidor multijugador activo en el puerto ${port}`);

wss.on('connection', (ws) => {
  console.log('¡Un Citroën se ha conectado!');

  ws.on('message', (message) => {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  ws.on('close', () => {
    console.log('Un Citroën se ha desconectado.');
  });
});
