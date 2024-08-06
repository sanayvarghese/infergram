# import os
# import json

# s = []
# for i in os.listdir("compressed"):
#     s.append({"id":i.split(".")[0],})

# with open("id.json", "r") as f:
#     json.dump({
#         "data": 
#     })


import csv
import os
import urllib.request
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor
import json
files = os.listdir("compressed")

data = {
    "data":[]
}
def download_image(row):
    id = row[0]
    url = row[1]
    description = row[7]
    ratio = row[5]

    if(f"{id}.jpeg" in files):
        data["data"].append({
            "id": id,
            "url":url,
            "description":description,
            "ratio":ratio,
        })


    # filename = f"images/{id}.jpeg"
    
    # if not os.path.exists(filename):
    #     try:
    #         urllib.request.urlretrieve(url, filename)
    #         return True
    #     except Exception as e:
    #         print(f"Failed to download {url}: {e}")
    #         return False
    # else:
    #     return False

def main():
    with open("edited.csv", "r", encoding="utf8") as f:
        r = csv.reader(f)
        next(r)
        
        rows = [next(r) for _ in range(1, 2001)]

        with ThreadPoolExecutor(max_workers=10) as executor:
            results = list(tqdm(executor.map(download_image, rows), total=len(rows)))
            with open("data.json","w") as f:
                json.dump(data,f)
if __name__ == "__main__":
    main()
