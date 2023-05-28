const dgram = require('dgram');
const server = dgram.createSocket('udp4');

const MY_IP = process.argv[2];
const PORT = 3232;
const MAX_HOPS = 10;
const UPDATE_INTERVAL = 5000;
const TIMEOUT_DURATION = 30000;
const INFINITY = Infinity;

const clients = {};

function updateClientTopology(ip, cost, port) {
  clients[ip] = { cost, port, lastUpdate: Date.now() };

  const routingTable = {};
  routingTable[MY_IP] = { distance: 0, nextHop: null };

  for (const clientIp in clients) {
    if (clientIp !== MY_IP) {
      const clientCost = clients[clientIp].cost;
      routingTable[clientIp] = { distance: clientCost, nextHop: clientIp };
    }
  }

  for (const neighborIp in routingTable) {
    if (neighborIp !== MY_IP) {
      routingTable[neighborIp].lastUpdate = Date.now();
    }
  }

  sendRoutingUpdates(routingTable);
}

function sendRoutingUpdates(routingTable) {
  const message = JSON.stringify(routingTable);

  for (const clientIp in clients) {
    if (clientIp !== MY_IP) {
      const { port } = clients[clientIp];
      sendMessage(message, clientIp, port);
    }
  }
}

function sendMessage(message, destinationIp, port) {
    server.send(message, 0, message.length, port, destinationIp, (err) => {

    if (err) {
      console.log(`Failed to send message to ${destinationIp}`);
    }
  });
}

function checkClientTimeouts() {
    const currentTime = Date.now();
    for (const clientIp in clients) {
      if (currentTime - clients[clientIp].lastUpdate > TIMEOUT_DURATION) {
        const client = clients[clientIp];
        delete clients[clientIp];
        console.log(`Client ${clientIp} timed out and removed from topology.`);
        if (client) {
          updateClientTopology(clientIp, INFINITY, client.port);
        } else {
          updateClientTopology(clientIp, INFINITY);
        }
      }
    }
  }

setInterval(() => {
  checkClientTimeouts();
}, UPDATE_INTERVAL);

server.on('error', (err) => {
  console.log(`Server error:\n${err.stack}`);
  server.close();
});

server.on('message', (message, rinfo) => {
  const clientIp = rinfo.address;
  const clientPort = rinfo.port;
  const clientCost = parseInt(message.toString());

  if (!clients[clientIp]) {
    console.log(`Client ${clientIp} added to topology with cost ${clientCost}.`);
  }

  updateClientTopology(clientIp, clientCost, clientPort);
});

server.on('listening', () => {
  const address = server.address();
  console.log(`Server listening on ${address.address}:${address.port}`);
});

server.bind(PORT, MY_IP);
