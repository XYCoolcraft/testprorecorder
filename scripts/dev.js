'use strict';
// `npm run dev`: bangun ulang otomatis lalu jalankan server (dipicu oleh --watch-path).
const { execFileSync } = require('node:child_process');
const path = require('node:path');
execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
require('../server.js');
