const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Servidor WebSocket Citroën funcionando correctamente en Render.');
});

const wss = new WebSocketServer({ server });

console.log(`Iniciando servidor de sockets en el puerto ${PORT}...`);

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[+] Nuevo visitante conectado desde IP: ${ip}`);

    ws.on('message', (message) => {
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
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

server.listen(PORT, () => {
    console.log(`>>> Servidor de carreras escuchando en el puerto ${PORT} <<<`);
});
