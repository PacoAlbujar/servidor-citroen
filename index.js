const http = require('http');
const { WebSocketServer } = require('ws');

// Render asigna un puerto mediante process.env.PORT
const PORT = process.env.PORT || 10000;

// 1. Creación del servidor HTTP
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Servidor WebSocket Citroën funcionando correctamente en Render.');
});

// 2. Creación del servidor WebSocket acoplado al servidor HTTP
const wss = new WebSocketServer({ server });

console.log(`Iniciando servidor de sockets en el puerto ${PORT}...`);

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[+] Nuevo visitante conectado desde IP: ${ip}`);

    ws.on('message', (message) => {
        // Reenviar la posición/rotación a todos los demás usuarios conectados
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === 1) { // 1 = WebSocket.OPEN
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('[-] Un visitante se ha desconectado.');
    });

    ws.on('error', (err) => {
        console.error('Error en socket cliente:', err.message);
    });
});

// 3. Puesta en marcha del puerto
server.listen(PORT, () => {
    console.log(`>>> Servidor de carreras escuchando en el puerto ${PORT} <<<`);
});
