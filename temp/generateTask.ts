import { Chance } from "chance";
import data from "../server/utils/data.json";
import { runGemini } from "../indexsd";
const chance = new Chance();

export async function getImage() {
  const image = chance.pickone(data["data"]);
  console.log(image);
  const ai_descirption = await runGemini(image["id"], image["description"]);

  return {
    ai_descirption,
    imageDetails: image,
  };
}

/**
 *
 * {
 *  hiddenWord:
 *  imageUrl
 *  id
 *  ratio
 * }
 *
 */
