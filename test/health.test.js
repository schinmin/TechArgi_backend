const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');

test('GET /health returns API status', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const body = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/health`, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, data: JSON.parse(data) }));
    }).on('error', reject);
  });
  await new Promise((resolve) => server.close(resolve));
  assert.equal(body.status, 200);
  assert.equal(body.data.success, true);
});
