// generate-sitemap.js - Auto update sitemap
const fs = require('fs');
const { format } = require('date-fns');

const baseUrl = 'https://viralx-24.netlify.app';
const currentDate = format(new Date(), 'yyyy-MM-dd');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/stories.html</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- Add more URLs -->
</urlset>`;

fs.writeFileSync('sitemap.xml', sitemap);
console.log('Sitemap generated successfully!');