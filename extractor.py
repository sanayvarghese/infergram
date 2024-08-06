import csv
import os
import urllib.request
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor

def download_image(row):
    id = row[0]
    url = row[1]
    filename = f"images/{id}.jpeg"
    
    if not os.path.exists(filename):
        try:
            urllib.request.urlretrieve(url, filename)
            return True
        except Exception as e:
            print(f"Failed to download {url}: {e}")
            return False
    else:
        return False

def main():
    with open("edited.csv", "r", encoding="utf8") as f:
        r = csv.reader(f)
        next(r)
        
        rows = [next(r) for _ in range(1, 2001)]

        with ThreadPoolExecutor(max_workers=10) as executor:
            results = list(tqdm(executor.map(download_image, rows), total=len(rows)))

if __name__ == "__main__":
    main()
