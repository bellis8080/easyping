/**
 * Docker healthcheck script for EasyPing
 * Performs HTTP GET request to /api/health endpoint
 * Exit codes: 0 = healthy, 1 = unhealthy
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/health',
  method: 'GET',
  timeout: 3000, // 3 second timeout
};

const req = http.request(options, (res) => {
  // Consider 200 OK as healthy
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    console.error(`Health check failed with status code: ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', (error) => {
  console.error(`Health check request failed: ${error.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Health check request timed out');
  req.destroy();
  process.exit(1);
});

req.end();
