"""Prepare the supplied official artwork for a shared decal; no redrawing."""
import argparse
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('destination', type=Path)
args = parser.parse_args()
image = Image.open(args.source).convert('RGBA')
pixels = []
for r, g, b, _ in image.getdata():
    # White JPEG matte only. Saturated yellow and red stay fully opaque.
    minimum = min(r, g, b)
    alpha = 0 if minimum >= 248 else min(255, round((255 - minimum) * 255 / 225))
    if alpha and alpha < 255:
        a = alpha / 255
        r, g, b = [max(0, min(255, round((c - 255 * (1 - a)) / a))) for c in (r, g, b)]
    pixels.append((r, g, b, alpha))
image.putdata(pixels)
bounds = image.getchannel('A').point(lambda a: 255 if a > 128 else 0).getbbox()
image = image.crop((bounds[0] - 4, bounds[1] - 4, bounds[2] + 4, bounds[3] + 4))
image.thumbnail((768, 768), Image.Resampling.LANCZOS)
image = image.quantize(colors=128, method=Image.Quantize.FASTOCTREE,
                       dither=Image.Dither.NONE)
args.destination.parent.mkdir(parents=True, exist_ok=True)
image.save(args.destination, optimize=True)
print(image.size, args.destination.stat().st_size)
