import chardet from "chardet";
import iconv from "iconv-lite";

// 定义一个函数来提取 HTML 字符串中的纯文本
export const getTextFromHTML = (htmlString) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  return doc.body.textContent || "";
};

export const readTxtFile = async (file) => {
  try {
    const arrayBuffer = await new Response(file).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const detectedEncoding = chardet.detect(buffer) || "utf8";
    return iconv.decode(buffer, detectedEncoding);
  } catch (err) {
    console.log(err);
    throw new Error(`读取文件 ${file} 时出错: ${err.message}`);
  }
};
