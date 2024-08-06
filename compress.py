import os
from PIL import Image, ImageFile
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor

ImageFile.LOAD_TRUNCATED_IMAGES = True

def compress_image(image_path, output_path, output_size, quality=20):
    """
    Compress a PNG image to an optimal size for websites.

    Parameters:
    - image_path: the path to the input image
    - output_path: the path to the output image
    - output_size: the desired output size of the image, in pixels
    - quality: the image quality, as a percentage (default is 20)
    """
    try:
        # Open the image
        with Image.open(image_path) as img:
            # Resize the image
            # Compress the image
            img.save(output_path, quality=quality, optimize=True)
        return True
    except Exception as e:
        print(f"Failed to compress {image_path}: {e}")
        return False

def main():
    input_dir = "images"
    output_dir = "compressed"
    output_size = 60
    quality = 20

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    images = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f))]

    with ThreadPoolExecutor(max_workers=10) as executor:
        list(tqdm(executor.map(lambda img: compress_image(os.path.join(input_dir, img), os.path.join(output_dir, img), output_size, quality), images), total=len(images)))

if __name__ == "__main__":
    main()
