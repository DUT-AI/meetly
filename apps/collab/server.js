// Meetly Real-time Collaboration Service Entrypoint
const path = require('path');

process.env.HOST = process.env.HOST || '0.0.0.0';
process.env.PORT = process.env.PORT || '1234';

console.log(`[Meetly Collab] Starting Yjs collaboration server on ${process.env.HOST}:${process.env.PORT}...`);
require(path.join(__dirname, 'node_modules/y-websocket/bin/server.cjs'));
