import sharp from "sharp";

const MAX_DIMENSION = 4096;
const MIN_LEVEL = 1;
const MAX_LEVEL = 40;
const DEFAULT_LEVEL = 30;

function getBlock(level) {
  const v = Math.min(Math.max(Math.round(level) || DEFAULT_LEVEL, MIN_LEVEL), MAX_LEVEL);
  return 41 - v;
}

export async function pixelate(buf, level = DEFAULT_LEVEL) {
  const image = sharp(buf, { limitInputPixels: false }).rotate().ensureAlpha();
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height) throw new Error("gambar tidak valid");
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(`dimensi gambar terlalu besar (max ${MAX_DIMENSION}px)`);
  }

  const block = getBlock(level);
  const input = await image.raw().toBuffer();
  const output = Buffer.alloc(input.length);

  for (let y = 0; y < height; y += block) {
    for (let x = 0; x < width; x += block) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      const maxY = Math.min(y + block, height);
      const maxX = Math.min(x + block, width);

      for (let yy = y; yy < maxY; yy++) {
        for (let xx = x; xx < maxX; xx++) {
          const i = (yy * width + xx) * 4;
          r += input[i];
          g += input[i + 1];
          b += input[i + 2];
          a += input[i + 3];
          count++;
        }
      }

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      a = Math.round(a / count);

      for (let yy = y; yy < maxY; yy++) {
        for (let xx = x; xx < maxX; xx++) {
          const i = (yy * width + xx) * 4;
          output[i] = r;
          output[i + 1] = g;
          output[i + 2] = b;
          output[i + 3] = a;
        }
      }
    }
  }

  return await sharp(output, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
}
