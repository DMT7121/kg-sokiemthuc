const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Read template files
let indexHtml = fs.readFileSync('Index.html', 'utf8');
const stylesHtml = fs.readFileSync('Styles.html', 'utf8');
const scriptsHtml = fs.readFileSync('Scripts.html', 'utf8');
const templatesHtml = fs.readFileSync('Templates.html', 'utf8');

// Replace GAS template include syntax
// Example: <?!= include('Styles'); ?> or <?!= include("Styles"); ?>
indexHtml = indexHtml.replace(/<\?!= include\(['"]Styles['"]\);\s*\?>/g, stylesHtml);
indexHtml = indexHtml.replace(/<\?!= include\(['"]Scripts['"]\);\s*\?>/g, scriptsHtml);
indexHtml = indexHtml.replace(/<\?!= include\(['"]Templates['"]\);\s*\?>/g, templatesHtml);

// Save to dist/index.html
fs.writeFileSync(path.join('dist', 'index.html'), indexHtml, 'utf8');
console.log('Successfully compiled Index.html into dist/index.html for static hosting.');
