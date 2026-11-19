const fs = require('fs');
const path = require('path');
const lessonChapters = require('../demoLessonChapters');

const outputDirectory = path.join(__dirname, '../../client/public/lesson-illustrations');
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const escapeXml = (value) => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
}[character]));
const wrapText = (value, limit, maxLines = 2) => {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > limit && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
  }
  return lines;
};

fs.mkdirSync(outputDirectory, { recursive: true });

for (const chapter of lessonChapters.values()) {
  const cards = chapter.games[0].cards.slice(0, 3);
  const cardsMarkup = cards.map((card, index) => {
    const x = 54 + index * 381;
    const definitionLines = wrapText(card.back, 36, 2);
    const definitionMarkup = definitionLines.map((line, lineIndex) =>
      `<tspan x="${x + 26}" dy="${lineIndex === 0 ? 0 : 29}">${escapeXml(line)}</tspan>`).join('');
    return `
      <g>
        <rect x="${x}" y="215" width="330" height="228" rx="24" fill="#ffffff" stroke="#dce7f5" stroke-width="2" />
        <circle cx="${x + 35}" cy="255" r="20" fill="${['#dbeafe', '#dcfce7', '#ede9fe'][index]}" />
        <text x="${x + 35}" y="262" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#1d4ed8">0${index + 1}</text>
        <text x="${x + 26}" y="306" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#13233e">${escapeXml(wrapText(card.front, 25, 1)[0])}</text>
        <path d="M${x + 26} 324h58" stroke="#60a5fa" stroke-width="4" stroke-linecap="round" />
        <text x="${x + 26}" y="359" font-family="Arial, sans-serif" font-size="17" fill="#52637c">${definitionMarkup}</text>
        <text x="${x + 26}" y="416" font-family="Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="1.5" fill="#2563eb">RECALL  ·  REVEAL  ·  APPLY</text>
      </g>`;
  }).join('');
  const connectors = [0, 1].map(index => {
    const x = 54 + index * 381 + 330;
    return `<path d="M${x + 10} 327h35m-8 -8 8 8-8 8" fill="none" stroke="#93a9c8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
  }).join('');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" role="img" aria-labelledby="title description">
  <title id="title">${escapeXml(chapter.title)} concept map</title>
  <desc id="description">Three connected lesson concepts: ${escapeXml(cards.map(card => card.front).join(', '))}.</desc>
  <defs>
    <linearGradient id="canvas" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4f8ff"/><stop offset="1" stop-color="#f5f3ff"/></linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#2563eb"/><stop offset="1" stop-color="#7c3aed"/></linearGradient>
  </defs>
  <rect width="1200" height="500" rx="32" fill="url(#canvas)" />
  <circle cx="1120" cy="86" r="112" fill="#dbeafe" opacity=".45" />
  <circle cx="92" cy="438" r="96" fill="#ede9fe" opacity=".45" />
  <text x="54" y="74" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="2.4" fill="#2563eb">LESSON CONCEPT MAP</text>
  <text x="54" y="132" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#13233e">${escapeXml(wrapText(chapter.title, 48, 1)[0])}</text>
  <text x="54" y="169" font-family="Arial, sans-serif" font-size="17" fill="#64748b">Connect the ideas, then use the flashcards to practise retrieval.</text>
  <rect x="54" y="184" width="1092" height="4" rx="2" fill="url(#accent)" opacity=".7" />
  ${connectors}
  ${cardsMarkup}
</svg>`;
  fs.writeFileSync(path.join(outputDirectory, `${slugify(chapter.title)}.svg`), svg, 'utf8');
}

console.log(`Generated ${lessonChapters.size} lesson concept maps in ${outputDirectory}`);
