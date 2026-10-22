import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Exercise the same native library resolved by Astro, not a separate image stack.
const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve('astro/package.json'));
const sharp = astroRequire('sharp');

test('the Astro image stack decodes an existing trusted AVIF and generates resized WebP', async () => {
  const image = sharp('src/assets/images/logo.avif');
  assert.equal((await image.metadata()).format, 'heif');
  const { data, info } = await image.resize({ width: 32 }).webp().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 32);
  assert(info.height > 0);
  assert.equal(info.format, 'webp');
  assert.equal((await sharp(data).metadata()).width, 32);
});

test('the corrected SVG decoder rasterizes trusted markup and preserves dimensions and color', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="#2468ac"/></svg>');
  const { data, info } = await sharp(svg).resize(16, 12).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 16);
  assert.equal(info.height, 12);
  assert.equal(info.channels, 3);
  assert.deepEqual([...data.subarray(0, 3)], [0x24, 0x68, 0xac]);
});

test('PNG, JPEG, WebP and AVIF encode/decode through the actual installed codecs', async t => {
  for (const format of ['png', 'jpeg', 'webp', 'avif']) {
    await t.test(format, async () => {
      const input = await sharp({ create: { width: 24, height: 16, channels: 3, background: { r: 36, g: 104, b: 172 } } }).toFormat(format).toBuffer();
      const metadata = await sharp(input).metadata();
      assert.equal(metadata.format, format === 'avif' ? 'heif' : format);
      assert.equal(metadata.width, 24);
      assert.equal(metadata.height, 16);
      const { info } = await sharp(input).resize(12, 8).png().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, 12);
      assert.equal(info.height, 8);
    });
  }
});
