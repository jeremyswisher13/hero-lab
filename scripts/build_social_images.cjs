/* Render the native SVG artwork. Install @resvg/resvg-js@2.6.2 separately;
 * see LINK_PREVIEWS.md for the reproducible command. No browser is required. */
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'link-previews.json'), 'utf8'));
const images = [...new Set(manifest.map(entry => entry.image))];
for (const image of images) {
  const output = path.join(root, image.replace(/^\//, ''));
  const key = path.basename(output).replace(/-\d{8}\.png$/, '');
  const source = path.join(root, 'images/social/source', `${key}.svg`);
  const renderer = new Resvg(fs.readFileSync(source), {
    font: { loadSystemFonts: false },
    fitTo: { mode: 'width', value: 1200 },
  });
  const raster = renderer.render();
  if (raster.width !== 1200 || raster.height !== 630) throw new Error(`Unexpected dimensions: ${source}`);
  fs.writeFileSync(output, raster.asPng());
  console.log(`${path.relative(root, output)} (${raster.width} x ${raster.height})`);
}
