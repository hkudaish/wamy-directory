const fs = require('node:fs');
const path = require('node:path');

const output = path.join(__dirname, 'public');
fs.mkdirSync(output, { recursive: true });
for (const name of ['index.html', 'wamy-logo.png']) {
  fs.copyFileSync(path.join(__dirname, name), path.join(output, name));
}
