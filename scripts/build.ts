import { build, context } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type Mode = 'development' | 'production';

function getMode(): Mode {
  const flagIndex = process.argv.indexOf('--mode=development');
  if (flagIndex !== -1) return 'development';
  return 'production';
}

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

  // 1) Build UI first
  await build({
    entryPoints: [join(ROOT, 'src/ui.tsx')],
    bundle: true,
    outfile: join(ROOT, 'dist/ui.js'),
    platform: 'browser',
    target: 'es2018',
    sourcemap: isDev,
    minify: !isDev,
    legalComments: 'none',
    loader: { '.png': 'dataurl', '.svg': 'dataurl' },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
  });

  // 2) Copy ui.html to dist
  await copyHtml();

  // 3) Inline ui.js safely via base64 to avoid </script> parse issues
  const srcHtml = readFileSync(join(ROOT, 'src', 'ui.html'), 'utf8');
  const uiJs = readFileSync(join(ROOT, 'dist', 'ui.js'), 'utf8');
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
  const inlineHtml = srcHtml.replace(/<script\s+src=["']ui\.js["']><\/script>/, loader);

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

