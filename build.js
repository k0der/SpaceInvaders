import fs from 'fs';
import path from 'path';

const srcDir = './src';
const devHtml = fs.readFileSync('./dev.html', 'utf-8');

// Ordered list of source modules to inline
const modules = fs.readdirSync(srcDir)
  .filter(f => f.endsWith('.js'))
  .sort();

let combinedJs = '';
for (const mod of modules) {
  const content = fs.readFileSync(path.join(srcDir, mod), 'utf-8');
  // Strip import/export statements for single-file bundling
  const cleaned = content
    .replace(/^\s*import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^\s*export\s+/gm, '');
  combinedJs += `// ===== ${mod} =====\n${cleaned}\n`;
}

// Replace the module script block with inlined modules + bootstrap call
const productionHtml = devHtml
  .replace(
    /<script type="module">[\s\S]*?<\/script>/,
    `<script>\n${combinedJs}\nstartApp();\n</script>`
  )
  .replace('[DEV]', '');

fs.writeFileSync('./index.html', productionHtml);
console.log(`Built index.html (${modules.length} modules inlined: ${modules.join(', ')})`);
