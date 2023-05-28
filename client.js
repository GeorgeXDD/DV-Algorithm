const dgram = require('dgram');
const client = dgram.createSocket('udp4');

const MY_IP = process.argv[2];
const SERVER_IP = process.argv[3] || '127.0.0.1';
const SERVER_PORT = 3232;
const CLIENT_PORT = 3333;

client.on('error', (err) => {
  console.log(`Client error:\n${err.stack}`);
  client.close();
});

client.on('message', (message) => {
  const routingTable = JSON.parse(message);

  console.log(`Routing table for ${MY_IP}`);
  console.log(`Destination: ${MY_IP} | Distance: 0 | Next Hop: null`);

  for (const destinationIp in routingTable) {
    if (destinationIp !== MY_IP) {
      const { distance, nextHop } = routingTable[destinationIp];
      console.log(
        `Destination: ${destinationIp} | Distance: ${distance} | Next Hop: ${nextHop}`
      );
    }
  }
});

client.on('listening', () => {
  const address = client.address();
  console.log(`Client listening on ${address.address}:${address.port}`);
});

client.bind(CLIENT_PORT, MY_IP, () => {
  client.send(MY_IP, SERVER_PORT, SERVER_IP, (err) => {
    if (err) {
      console.log(`Failed to send message to server.`);
    }
  });
});
