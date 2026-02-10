const http = require('http');
const app = require('./src/server');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
  // Simple startup log for now
  console.log(`Eval engine API listening on port ${PORT}`);
});
