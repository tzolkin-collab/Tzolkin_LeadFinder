from PIL import Image
import numpy as np

img = Image.open('transparent_test.png')
print(f"Image size: {img.size}, mode: {img.mode}")

# Check non-transparent pixels
alpha = np.array(img.split()[-1])
opaque_pixels = np.where(alpha > 0)

print(f"Opaque pixels count: {len(opaque_pixels[0])} / {alpha.size}")
if len(opaque_pixels[0]) > 0:
    min_y, max_y = opaque_pixels[0].min(), opaque_pixels[0].max()
    min_x, max_x = opaque_pixels[1].min(), opaque_pixels[1].max()
    print(f"Opaque bounding box: X={min_x}..{max_x} (w={max_x-min_x}), Y={min_y}..{max_y} (h={max_y-min_y})")
