import fs from 'fs';
import path from 'path';

const srcDir = './src';
const devHtml = fs.readFileSync('./dev.html', 'utf-8');

// Ordered list of source modules to inline
// Node.js-only modules excluded from browser build
const NODE_ONLY = new Set(['ai-neural-node.js']);

const modules = fs.readdirSync(srcDir)
  .filter(f => f.endsWith('.js') && !NODE_ONLY.has(f))
  .sort();

let combinedJs = '';
for (const mod of modules) {
  const content = fs.readFileSync(path.join(srcDir, mod), 'utf-8');
  // Strip import/export statements for single-file bundling
  const cleaned = content
    .replace(/^\s*import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^\s*import\s+\{[\s\S]*?\}\s+from\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^\s*import\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^\s*export\s+/gm, '');
  // Wrap experimental clones in IIFE to avoid name collisions with the original
  if (mod.includes('-optimized')) {
    combinedJs += `// ===== ${mod} =====\n;(function() {\n${cleaned}\n})();\n`;
  } else {
    combinedJs += `// ===== ${mod} =====\n${cleaned}\n`;
  }
}

// Replace the module script block with inlined modules + bootstrap call
const productionHtml = devHtml
  .replace(
    /<script type="module">[\s\S]*?<\/script>/,
    `<script>\n${combinedJs}\nstartApp();\n</script>`
  )
  .replace('[DEV]', '')
  .replace(
    '</head>',
    '  <script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/ort.min.js" async></script>\n</head>'
  );

fs.writeFileSync('./index.html', productionHtml);
console.log(`Built index.html (${modules.length} modules inlined: ${modules.join(', ')})`);
