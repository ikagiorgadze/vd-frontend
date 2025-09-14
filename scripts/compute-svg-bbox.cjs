const fs = require('fs');
const path = require('path');

const svgPath = path.resolve(__dirname, '../public/logo2.svg');
const svg = fs.readFileSync(svgPath, 'utf8');

// extract transform from the <g ... transform="..."> if present
const gMatch = svg.match(/<g[^>]*transform="([^"]+)"[^>]*>/i);
let transform = gMatch ? gMatch[1] : null;
let translate = { x: 0, y: 0 };
let scale = { x: 1, y: 1 };
if (transform) {
  const tMatch = transform.match(/translate\s*\(\s*([\d\.-]+)\s*,\s*([\d\.-]+)\s*\)/i);
  const sMatch = transform.match(/scale\s*\(\s*([\d\.-]+)\s*,\s*([\d\.-]+)\s*\)/i);
  if (tMatch) {
    translate.x = parseFloat(tMatch[1]);
    translate.y = parseFloat(tMatch[2]);
  }
  if (sMatch) {
    scale.x = parseFloat(sMatch[1]);
    scale.y = parseFloat(sMatch[2]);
  } else {
    // maybe scale single arg
    const sMatch1 = transform.match(/scale\s*\(\s*([\d\.-]+)\s*\)/i);
    if (sMatch1) {
      scale.x = scale.y = parseFloat(sMatch1[1]);
    }
  }
}

// find all path d attributes
const pathRegex = /<path[^>]*d="([^"]+)"/ig;
let m;
const points = [];
while ((m = pathRegex.exec(svg)) !== null) {
  const d = m[1];
  // extract numbers
  const nums = d.match(/-?\d+\.?\d*/g);
  if (!nums) continue;
  // pair them sequentially as x,y pairs
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = parseFloat(nums[i]);
    const y = parseFloat(nums[i+1]);
    if (isNaN(x) || isNaN(y)) continue;
    // apply transform: x' = translate.x + x * scale.x; y' = translate.y + y * scale.y
    const xp = translate.x + x * scale.x;
    const yp = translate.y + y * scale.y;
    points.push({ x: xp, y: yp });
  }
}

if (points.length === 0) {
  console.error('No points found');
  process.exit(2);
}

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const p of points) {
  if (p.x < minX) minX = p.x;
  if (p.y < minY) minY = p.y;
  if (p.x > maxX) maxX = p.x;
  if (p.y > maxY) maxY = p.y;
}

// add a small padding
const padding = 6;
const bbMinX = minX - padding;
const bbMinY = minY - padding;
const bbWidth = (maxX - minX) + padding*2;
const bbHeight = (maxY - minY) + padding*2;

console.log('transform:', transform);
console.log('points:', points.length);
console.log('minX', minX, 'minY', minY, 'maxX', maxX, 'maxY', maxY);
console.log('suggested viewBox:', [bbMinX.toFixed(3), bbMinY.toFixed(3), bbWidth.toFixed(3), bbHeight.toFixed(3)].join(' '));

process.exit(0);
