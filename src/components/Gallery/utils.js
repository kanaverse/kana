import { code } from "../../utils/utils";

export function get_image_title(data) {
  let text = `${data?.config?.embedding}`;
  if (data?.config?.gene) {
    text += `_${data?.config?.gene}`;
  }

  if (data?.config?.annotation && !data?.config?.gene) {
    const sanitized_anno = data.config?.annotation.replace(`${code}::`, "");
    text += `_${sanitized_anno.toLowerCase()}`;
  }

  return text;
}
