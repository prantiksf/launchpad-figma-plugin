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
  
  // Generate unique build identifiers for cache busting
  const packageJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const version = packageJson.version || '1.10.0';
  const buildTime = Date.now();
  const buildHash = buildTime.toString(36); // Convert to base36 for shorter hash
  const cacheBuster = `<!-- Plugin v${version} built at ${buildTime} (${buildHash}) -->`;
  
  // Inject build hash into UI JS to make it unique
  const uiJsWithBuildId = uiJs.replace(
    /\/\* BUILD_ID_PLACEHOLDER \*\//g,
    `/* BUILD_ID: ${buildHash} - ${buildTime} */`
  );
  
  // Inline CSS with build hash comment
  const cssTag = `<style>/* Build: ${buildHash} */\n${uiCss}</style>`;
  
  // Inline JS via base64 to avoid </script> parse issues
  // Use a more robust loader that handles errors gracefully
  const uiB64 = Buffer.from(uiJsWithBuildId, 'utf8').toString('base64');
  const loader = [
    '<script>(function(){',
    'try{',
    'if(typeof atob==="undefined"){',
    'throw new Error("atob not available");',
    '}',
    'var js = atob("',
    uiB64,
    '");',
    "var s = document.createElement('script');",
    "s.type = 'text/javascript';",
    's.text = js;',
    'document.body.appendChild(s);',
    '}catch(e){',
    "console.error('Plugin loader error:',e);",
    "var pre=document.createElement('pre');",
    "pre.style.cssText='color:red;padding:20px;font-family:monospace;white-space:pre-wrap;';",
    'pre.textContent = "Plugin failed to load:\\n" + String(e && (e.stack || e.message) || e);',
    'document.body.appendChild(pre);',
    'document.getElementById("root").innerHTML="";',
    '}})();</script>',
  ].join('');
  
  // Insert cache buster comment, CSS before </head> and JS before </body
  // Also add data attribute to body for cache busting
  let inlineHtml = srcHtml.replace('<head>', `<head>${cacheBuster}`);
  inlineHtml = inlineHtml.replace('</head>', `${cssTag}</head>`);
  inlineHtml = inlineHtml.replace(/<script\s+src=["']ui\.js["']><\/script>/, loader);
  inlineHtml = inlineHtml.replace('<body', `<body data-build="${buildHash}" data-build-time="${buildTime}"`);

  // 4) Build controller with __html__ defined at build time
  // Inject build hash and timestamp into code for cache busting
  
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
      'BUILD_TIMESTAMP': JSON.stringify(buildTime),
      'BUILD_HASH': JSON.stringify(buildHash),
    },
    banner: {
      js: `/* Starter Kit Plugin v${version} - Build ${buildHash} - ${new Date(buildTime).toISOString()} */`,
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

