import { build, context } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

type Mode = 'development' | 'production';

function getMode(): Mode {
  const flagIndex = process.argv.indexOf('--mode=development');
  if (flagIndex !== -1) return 'development';
  return 'production';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

async function copyHtml(): Promise<void> {
  const srcPath = join(ROOT, 'src', 'ui.html');
  const outDir = join(ROOT, 'dist');
  mkdirSync(outDir, { recursive: true });
  const html = readFileSync(srcPath, 'utf8');
  writeFileSync(join(outDir, 'ui.html'), html);
}

async function buildAll(mode: Mode): Promise<void> {
  const isDev = mode === 'development';

  // 1) Build UI first (with CSS bundled)
  await build({
    entryPoints: [join(ROOT, 'src/ui.tsx')],
    bundle: true,
    outfile: join(ROOT, 'dist/ui.js'),
    platform: 'browser',
    target: 'es2018',
    sourcemap: isDev,
    minify: !isDev,
    legalComments: 'none',
    loader: { 
      '.png': 'dataurl', 
      '.svg': 'dataurl',
      '.css': 'css',
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
  });

  // 1b) Build CSS separately
  await build({
    entryPoints: [join(ROOT, 'src/styles/globals.css')],
    bundle: true,
    outfile: join(ROOT, 'dist/ui.css'),
    minify: !isDev,
  });

  // 2) Copy ui.html to dist
  await copyHtml();

  // 3) Inline ui.js and ui.css safely
  const srcHtml = readFileSync(join(ROOT, 'src', 'ui.html'), 'utf8');
  const uiJs = readFileSync(join(ROOT, 'dist', 'ui.js'), 'utf8');
  const uiCss = readFileSync(join(ROOT, 'dist', 'ui.css'), 'utf8');
  
  // Inline CSS
  const cssTag = `<style>${uiCss}</style>`;
  
  // Inline JS via base64 to avoid </script> parse issues
  const uiB64 = Buffer.from(uiJs, 'utf8').toString('base64');
  const loader = [
    '<script>(function(){try{',
    'var js = atob("',
    uiB64,
    '");',
    "var s = document.createElement('script');",
    "s.type = 'text/javascript';",
    's.text = js;',
    'document.body.appendChild(s);',
    '}catch(e){',
    "var pre=document.createElement('pre');",
    "pre.style.color='red';",
    'pre.textContent = String(e && (e.stack || e.message) || e);',
    'document.body.appendChild(pre);',
    '}})();</script>',
  ].join('');
  
  // Add version meta tag and build timestamp for cache busting
  const packageJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const version = packageJson.version || '1.10.0';
  const buildTime = Date.now();
  const versionMetaTags = `<meta name="plugin-version" content="${version}"><meta name="build-time" content="${buildTime}">`;
  
  // Insert CSS before </head> and JS before </body>
  let inlineHtml = srcHtml.replace('</head>', `${versionMetaTags}${cssTag}</head>`);
  inlineHtml = inlineHtml.replace(/<script\s+src=["']ui\.js["']><\/script>/, loader);

  // 4) Build controller with __html__ defined at build time
  await build({
    entryPoints: [join(ROOT, 'src/code.ts')],
    bundle: true,
    outfile: join(ROOT, 'dist/code.js'),
    platform: 'browser',
    target: 'es2018',
    sourcemap: isDev,
    minify: !isDev,
    legalComments: 'none',
    define: {
      __html__: JSON.stringify(inlineHtml),
    },
  });

  console.log(`✅ Build complete (${mode})`);
}

async function watchAll(): Promise<void> {
  const codeCtx = await context({
    entryPoints: [join(ROOT, 'src/code.ts')],
    bundle: true,
    outfile: join(ROOT, 'dist/code.js'),
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    legalComments: 'none',
  });

  const uiCtx = await context({
    entryPoints: [join(ROOT, 'src/ui.tsx')],
    bundle: true,
    outfile: join(ROOT, 'dist/ui.js'),
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    legalComments: 'none',
    loader: { '.png': 'dataurl', '.svg': 'dataurl' },
    define: {
      'process.env.NODE_ENV': JSON.stringify('development'),
    },
  });

  await Promise.all([codeCtx.watch(), uiCtx.watch()]);
  await copyHtml();

  console.log('👀 Watching for changes...');
}

async function main() {
  const mode = getMode();
  if (process.argv.includes('--watch')) {
    await watchAll();
  } else {
    await buildAll(mode);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

