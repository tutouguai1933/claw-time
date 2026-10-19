const path = require('node:path');
const {createApp} = require('./app.cjs');
const root = path.resolve(__dirname, '..');
const app = createApp({root, databasePath: path.join(process.env.DATA_DIR || path.join(root, 'data'), 'claw-time.sqlite'), publicOrigin: process.env.PUBLIC_ORIGIN, secureCookies: process.env.SECURE_COOKIES === 'true' || process.env.PUBLIC_ORIGIN?.startsWith('https://'), version: process.env.APP_VERSION});
app.server.listen(Number(process.env.PORT || 3080), process.env.HOST || '127.0.0.1', () => console.log('Claw Time listening on port ' + app.server.address().port));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.close().then(() => process.exit(0)));
