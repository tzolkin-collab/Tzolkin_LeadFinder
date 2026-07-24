from PIL import Image
import numpy as np

for f in ['crop_frame_01.png', 'crop_frame_15.png', 'crop_frame_30.png', 'crop_frame_50.png']:
    img = Image.open(f).convert('RGB')
    arr = np.array(img, dtype=int)
    print(f"File {f} size: {img.size}")
