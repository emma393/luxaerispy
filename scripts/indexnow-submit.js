const fs = require('fs');
const https = require('https');

const data = JSON.parse(fs.readFileSync('./static/indexnow.json'));

const options = {
  hostname: 'api.indexnow.org',
  path: '/indexnow',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = https.request(options, res => {
  console.log(`Status: ${res.statusCode}`);
});

req.write(JSON.stringify(data));
req.end();
