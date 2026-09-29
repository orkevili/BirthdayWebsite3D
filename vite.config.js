import { defineConfig } from 'vite';
import { config } from './src/config.js';

// Link-előnézet (Open Graph) meta tagek a config.js alapján
function socialPreview() {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return {
    name: 'social-preview',
    transformIndexHtml(html) {
      const { title, description } = config.preview;
      const base = config.siteUrl ? config.siteUrl.replace(/\/?$/, '/') : '';
      const tags = [
        ['og:type', 'website'],
        ['og:title', title],
        ['og:description', description],
        ['og:image', `${base}preview.jpg`],
        ['og:image:width', '1200'],
        ['og:image:height', '630'],
        ...(base ? [['og:url', base]] : []),
      ].map(([property, content]) => `<meta property="${property}" content="${esc(content)}" />`);
      tags.push(
        `<meta name="description" content="${esc(description)}" />`,
        '<meta name="twitter:card" content="summary_large_image" />',
      );
      return html.replace('</head>', `  ${tags.join('\n    ')}\n  </head>`);
    },
  };
}

// base: './' → a build bármilyen alkönyvtárból (pl. GitHub Pages) működik
export default defineConfig({
  base: './',
  plugins: [socialPreview()],
});
