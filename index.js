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


// ============================================================
// CONFIGURACIÓN DE LA PARRILLA
// ============================================================

const casillas_spawn = [
    { x: 0.000, y: 13.356, z: 0.000 },
    { x: 0.456, y: 13.646, z: -10.000 },
    { x: 1.716, y: 13.870, z: -20.000 },
    { x: 3.712, y: 14.122, z: -30.000 },
    { x: 6.140, y: 14.336, z: -40.000 }
];


// Distancia que debe recorrer un coche para liberar
// definitivamente su casilla de salida.

const DISTANCIA_LIBERACION = 4.0;


// ============================================================
// COLORES
// ============================================================

// El servidor asigna un color a cada jugador.
// El cliente utiliza el índice para aplicar el color.

const colores = [
    { r: 0.80, g: 0.05, b: 0.05 }, // Rojo
    { r: 0.02, g: 0.02, b: 0.02 }, // Negro
    { r: 0.95, g: 0.75, b: 0.02 }, // Amarillo
    { r: 0.05, g: 0.25, b: 0.85 }, // Azul
    { r: 0.05, g: 0.65, b: 0.15 }, // Verde
    { r: 1.00, g: 0.35, b: 0.02 }, // Naranja
    { r: 0.55, g: 0.05, b: 0.65 }, // Morado
    { r: 0.85, g: 0.85, b: 0.85 }, // Blanco
    { r: 0.05, g: 0.75, b: 0.75 }, // Turquesa
    { r: 0.95, g: 0.30, b: 0.55 }, // Rosa
    { r: 0.45, g: 0.25, b: 0.08 }, // Marrón
    { r: 0.65, g: 0.65, b: 0.05 }  // Lima
];


// ============================================================
// IDENTIFICADORES
// ============================================================

let siguiente_id = 1;


// ============================================================
// INFORMACIÓN DE LOS JUGADORES
// ============================================================

// Cada conexión tendrá:
//
// id
// spawn
// color
// spawn_liberado

const jugadores = new Map();


// ============================================================
// BUSCAR CASILLA LIBRE
// ============================================================

function buscar_casilla_libre() {

    for (let i = 0; i < casillas_spawn.length; i++) {

        let ocupada = false;

        for (const jugador of jugadores.values()) {

            if (
                jugador.spawn === i &&
                !jugador.spawn_liberado
            ) {
                ocupada = true;
                break;
            }
        }

        if (!ocupada) {
            return i;
        }
    }

    return -1;
}


// ============================================================
// CALCULAR DISTANCIA
// ============================================================

function distancia(pos, spawn) {

    const dx = pos[0] - spawn.x;
    const dy = pos[1] - spawn.y;
    const dz = pos[2] - spawn.z;

    return Math.sqrt(
        dx * dx +
        dy * dy +
        dz * dz
    );
}


// ============================================================
// CONEXIÓN
// ============================================================

wss.on('connection', (ws, req) => {

    const ip = req.socket.remoteAddress;

    const id_jugador = siguiente_id++;

    const casilla = buscar_casilla_libre();


    // --------------------------------------------------------
    // Si no hay ninguna casilla libre
    // --------------------------------------------------------

    if (casilla === -1) {

        console.log(
            `[!] Jugador rechazado. No hay casillas libres. IP: ${ip}`
        );

        ws.send(
            JSON.stringify({
                tipo: "sin_casilla"
            })
        );

        ws.close();

        return;
    }


    // --------------------------------------------------------
    // COLOR
    // --------------------------------------------------------

    const color_index =
        (id_jugador - 1) % colores.length;


    // --------------------------------------------------------
    // CREAR REGISTRO DEL JUGADOR
    // --------------------------------------------------------

    const jugador = {

        id: id_jugador,

        spawn: casilla,

        color: color_index,

        spawn_liberado: false
    };


    jugadores.set(ws, jugador);

    ws.id_jugador = id_jugador;


    console.log(
        `[+] Nuevo visitante | ID: ${id_jugador} | Casilla: ${casilla + 1} | IP: ${ip}`
    );


    // --------------------------------------------------------
    // ENVIAR DATOS AL NUEVO JUGADOR
    // --------------------------------------------------------

    const mensaje_bienvenida = {

        tipo: "bienvenida",

        id: id_jugador,

        spawn: casilla,

        posicion: casillas_spawn[casilla],

        color: color_index
    };


    ws.send(
        JSON.stringify(mensaje_bienvenida)
    );


    // ========================================================
    // MENSAJES
    // ========================================================

    ws.on('message', (message) => {

        try {

            const texto = message.toString();

            const datos = JSON.parse(texto);


            if (!datos.pos || !datos.rot) {
                return;
            }


            // ------------------------------------------------
            // COMPROBAR SI HA ABANDONADO SU CASILLA
            // ------------------------------------------------

            if (!jugador.spawn_liberado) {

                const spawn_actual =
                    casillas_spawn[jugador.spawn];

                const distancia_actual =
                    distancia(
                        datos.pos,
                        spawn_actual
                    );


                if (
                    distancia_actual >
                    DISTANCIA_LIBERACION
                ) {

                    jugador.spawn_liberado = true;


                    console.log(
                        `[>] ID ${jugador.id} ha abandonado la casilla ${jugador.spawn + 1}.`
                    );
                }
            }


            // ------------------------------------------------
            // CREAR MENSAJE DE POSICIÓN
            // ------------------------------------------------

            const datos_servidor = {

                tipo: "posicion",

                id: jugador.id,

                pos: datos.pos,

                rot: datos.rot,

                color: jugador.color
            };


            if (datos.steering !== undefined) {

                datos_servidor.steering =
                    datos.steering;
            }


            if (datos.freno !== undefined) {

                datos_servidor.freno =
                    datos.freno;
            }


            const mensaje =
                JSON.stringify(
                    datos_servidor
                );


            // ------------------------------------------------
            // ENVIAR A TODOS LOS DEMÁS
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


    // ========================================================
    // DESCONEXIÓN
    // ========================================================

    ws.on('close', () => {

        const jugador_actual =
            jugadores.get(ws);


        if (!jugador_actual) {
            return;
        }


        console.log(
            `[-] Visitante desconectado | ID: ${jugador_actual.id}`
        );


        // ----------------------------------------------------
        // AVISAR A LOS DEMÁS
        // ----------------------------------------------------

        const mensaje_desconexion = {

            tipo: "desconexion",

            id: jugador_actual.id
        };


        const mensaje =
            JSON.stringify(
                mensaje_desconexion
            );


        wss.clients.forEach((client) => {

            if (
                client !== ws &&
                client.readyState === 1
            ) {

                client.send(mensaje);
            }

        });


        // ----------------------------------------------------
        // LIBERAR SU CASILLA
        // ----------------------------------------------------

        jugadores.delete(ws);

    });


    // ========================================================
    // ERROR
    // ========================================================

    ws.on('error', (err) => {

        console.error(
            `Error en socket ID ${id_jugador}:`,
            err.message
        );
    });

});


server.listen(PORT, () => {

    console.log(
        `>>> Servidor de carreras escuchando en el puerto ${PORT} <<<`
    );

});
