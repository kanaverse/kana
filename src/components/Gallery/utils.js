import { code } from "../../utils/utils";

export function get_image_title(data) {
    let text = ` ${data?.config?.embedding} `;
    if (data?.config?.gene) {
      text += `⊃ ${data?.config?.gene} `;
    }

    let set = false;

    if (data?.config?.annotation) {
      const sanitized_anno = data.config?.annotation.replace(`${code}::`, "");
      text += `⊃ ${sanitized_anno.toLowerCase()} `;

      if (data?.config?.highlight) {
        if (String(data?.config?.highlight).startsWith("cs")) {
          text += `(selection ${data?.config?.highlight.replace("cs", "")}) `;
        } else {
          text += `(${data?.config?.highlight
            .replace("Cluster ", "")
            .replace(`${code}::`, "")}) `;
        }
      }

      set = true;
    }

    return text;
  }