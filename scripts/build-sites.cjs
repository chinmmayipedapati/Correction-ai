const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const { build } = require('../client/node_modules/esbuild');
const vite = path.join(root, 'client/node_modules/vite/bin/vite.js');
const result = spawnSync(process.execPath, [vite, 'build'], { cwd: path.join(root, 'client'), stdio: 'inherit', env: { ...process.env, VITE_API_BASE_URL: '' } });
if (result.status !== 0) process.exit(result.status || 1);
fs.mkdirSync(path.join(root, 'dist/client'), { recursive: true });
fs.cpSync(path.join(root, 'client/dist'), path.join(root, 'dist/client'), { recursive: true });
const assets = {};
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
function collect(directory, prefix = '') {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) collect(filename, relative);
    else {
      const type = contentTypes[path.extname(entry.name)];
      if (!type) throw new Error(`Unsupported asset type: ${relative}`);
      assets[relative] = { type, content: fs.readFileSync(filename, 'utf8') };
    }
  }
}
collect(path.join(root, 'client/dist'));
fs.mkdirSync(path.join(root, '.sites-runtime'), { recursive: true });
fs.writeFileSync(path.join(root, '.sites-runtime/assets.mjs'), `export default ${JSON.stringify(assets)};`);
fs.mkdirSync(path.join(root, 'dist/.openai'), { recursive: true });
fs.copyFileSync(path.join(root, '.openai/hosting.json'), path.join(root, 'dist/.openai/hosting.json'));
build({ entryPoints: [path.join(root, 'worker/index.mjs')], outfile: path.join(root, 'dist/server/index.js'), bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', external: ['node:buffer'], minify: true }).catch(() => { process.exitCode = 1; });
