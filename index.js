const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8'
    });

    res.end(
        'Servidor WebSocket Citroën funcionando correctamente en Render.'
    );
});

const wss = new WebSocketServer({ server });

console.log(
    `Iniciando servidor de sockets en el puerto ${PORT}...`
);

// ------------------------------------------------------------
// CONTADOR DE JUGADORES
// ------------------------------------------------------------

let siguiente_id = 1;


// ------------------------------------------------------------
// CONEXIÓN DE UN NUEVO JUGADOR
// ------------------------------------------------------------

wss.on('connection', (ws, req) => {

    const ip = req.socket.remoteAddress;

    // ID ÚNICO ASIGNADO POR EL SERVIDOR
    const id_jugador = siguiente_id++;

    // Guardamos el ID dentro de la conexión
    ws.id_jugador = id_jugador;

    console.log(
        `[+] Nuevo visitante conectado desde IP: ${ip} | ID: ${id_jugador}`
    );


    // --------------------------------------------------------
    // INFORMAR AL NUEVO JUGADOR DE SU ID
    // --------------------------------------------------------

    const mensaje_bienvenida = {
        tipo: "bienvenida",
        id: id_jugador
    };

    if (ws.readyState === 1) {
        ws.send(
            JSON.stringify(mensaje_bienvenida)
        );
    }


    // --------------------------------------------------------
    // RECIBIR DATOS DE UN JUGADOR
    // --------------------------------------------------------

    ws.on('message', (message) => {

        try {

            const texto = message.toString();

            const datos = JSON.parse(texto);

            // Solo aceptamos mensajes con posición y rotación
            if (
                !datos.pos ||
                !datos.rot
            ) {
                return;
            }


            // ------------------------------------------------
            // EL SERVIDOR ASIGNA EL ID
            // ------------------------------------------------

            const datos_servidor = {

                tipo: "posicion",

                // IMPORTANTE:
                // ignoramos cualquier ID enviado por el cliente
                id: ws.id_jugador,

                pos: datos.pos,

                rot: datos.rot
            };


            // Mantener volante
            if (datos.steering !== undefined) {

                datos_servidor.steering =
                    datos.steering;
            }


            // Mantener freno
            if (datos.freno !== undefined) {

                datos_servidor.freno =
                    datos.freno;
            }


            const mensaje = JSON.stringify(
                datos_servidor
            );


            // ------------------------------------------------
            // ENVIAR A TODOS LOS DEMÁS JUGADORES
            // ------------------------------------------------

            wss.clients.forEach((client) => {

                if (
                    client !== ws &&
                    client.readyState === 1
                ) {

                    client.send(mensaje);
                }

            });

        } catch (error) {

            console.error(
                'Error procesando mensaje:',
                error.message
            );

        }

    });


    // --------------------------------------------------------
    // DESCONEXIÓN
    // --------------------------------------------------------

    ws.on('close', () => {

        console.log(
            `[-] Visitante desconectado | ID: ${ws.id_jugador}`
        );


        const mensaje_desconexion = {

            tipo: "desconexion",

            id: ws.id_jugador
        };


        const mensaje = JSON.stringify(
            mensaje_desconexion
        );


        // Avisar inmediatamente a los demás
        wss.clients.forEach((client) => {

            if (
                client !== ws &&
                client.readyState === 1
            ) {

                client.send(mensaje);
            }

        });

    });


    // --------------------------------------------------------
    // ERROR
    // --------------------------------------------------------

    ws.on('error', (err) => {

        console.error(
            `Error en socket ID ${ws.id_jugador}:`,
            err.message
        );

    });

});


server.listen(PORT, () => {

    console.log(
        `>>> Servidor de carreras escuchando en el puerto ${PORT} <<<`
    );

});
