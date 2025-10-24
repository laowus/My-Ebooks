import JSZip from "jszip";
import { writeFile } from "@tauri-apps/plugin-fs";
import { join, appDataDir } from "@tauri-apps/api/path";

/**
 * 使用 JSZip 创建 EPUB 文件
 * @param {Object} bookInfo - 书籍信息
 * @param {Array} chapters - 章节内容数组
 * @returns {Promise<string>} - 返回生成的 EPUB 文件路径
 */
export async function createEpub(bookInfo, chapters) {
  try {
    const zip = new JSZip();

    // 1. 添加 mimetype 文件（必须是第一个文件且不压缩）
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    // 2. 创建 META-INF 目录并添加 container.xml
    const metaInf = zip.folder("META-INF");
    metaInf.file("container.xml", generateContainerXml());

    // 3. 创建 OEBPS 目录
    const oebps = zip.folder("OEBPS");

    // 4. 添加章节文件并收集信息用于 OPF 和 NCX
    const manifestItems = [];
    const spineItems = [];
    const tocItems = [];

    chapters.forEach((chapter, index) => {
      const id = `chapter${index + 1}`;
      const href = `text/chapter${index + 1}.xhtml`;

      // 添加章节 HTML 文件
      oebps.file(href, generateChapterHtml(chapter.title, chapter.content));

      // 收集清单信息
      manifestItems.push(
        `    <item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`
      );
      spineItems.push(`    <itemref idref="${id}"/>`);
      tocItems.push(generateNcxNavPoint(index + 1, chapter.title, href));
    });

    // 5. 生成并添加 OPF 文件
    const opfContent = generateOpfFile(bookInfo, manifestItems, spineItems);
    oebps.file("content.opf", opfContent);

    // 6. 生成并添加 NCX 文件
    const ncxContent = generateNcxFile(bookInfo, tocItems);
    oebps.file("toc.ncx", ncxContent);

    // 7. 生成 EPUB 文件
    const epubBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // 8. 确定保存路径
    const appDataPath = await appDataDir();
    const epubDir = await join(appDataPath, "epub");

    // 确保目录存在
    try {
      const { exists, mkdir } = await import("@tauri-apps/plugin-fs");
      if (!(await exists(epubDir))) {
        await mkdir(epubDir, { recursive: true });
      }
    } catch (error) {
      console.warn("创建目录失败，将直接保存文件:", error);
    }

    // 9. 保存 EPUB 文件
    const outputPath = await join(
      epubDir,
      `${sanitizeFilename(bookInfo.title || "未命名")}.epub`
    );
    await writeFile(outputPath, new Uint8Array(epubBuffer));

    return outputPath;
  } catch (error) {
    console.error("创建 EPUB 文件失败:", error);
    throw error;
  }
}

/**
 * 生成 container.xml 内容
 */
function generateContainerXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

/**
 * 生成章节 HTML 内容
 */
function generateChapterHtml(title, content) {
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(title)}</title>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
  ${content}
</body>
</html>`;
}

/**
 * 生成 OPF 文件内容
 */
function generateOpfFile(bookInfo, manifestItems, spineItems) {
  const uuid = generateUuid();
  return `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
  <dc:title>${escapeXml(bookInfo.title || "未命名")}</dc:title>
  <dc:creator opf:role="aut">${escapeXml(
    bookInfo.author || "未知作者"
  )}</dc:creator>
  <dc:language>${bookInfo.language || "zh-CN"}</dc:language>
  <dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>
  ${
    bookInfo.description
      ? `<dc:description>${escapeXml(bookInfo.description)}</dc:description>`
      : ""
  }
</metadata>
<manifest>
${manifestItems.join("\n")}
  <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
</manifest>
<spine toc="ncx">
${spineItems.join("\n")}
</spine>
</package>`;
}

/**
 * 生成 NCX 文件内容
 */
function generateNcxFile(bookInfo, navPoints) {
  const uuid = generateUuid();
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx version="2.0" xmlns="http://www.daisy.org/z3986/2005/ncx/">
<head>
  <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
  <meta name="dtb:depth" content="1"/>
  <meta name="dtb:totalPageCount" content="0"/>
  <meta name="dtb:maxPageNumber" content="0"/>
</head>
<docTitle>
  <text>${escapeXml(bookInfo.title || "未命名")}</text>
</docTitle>
<docAuthor>
  <text>${escapeXml(bookInfo.author || "未知作者")}</text>
</docAuthor>
<navMap>
${navPoints.join("\n")}
</navMap>
</ncx>`;
}

/**
 * 生成 NCX 导航点
 */
function generateNcxNavPoint(playOrder, title, contentSrc) {
  return `  <navPoint id="chapter${playOrder}" playOrder="${playOrder}">
    <navLabel><text>${escapeXml(title)}</text></navLabel>
    <content src="${contentSrc}"/>
  </navPoint>`;
}

/**
 * 生成 UUID
 */
function generateUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, function (m) {
    return map[m];
  });
}

/**
 * 清理文件名
 */
function sanitizeFilename(filename) {
  // 移除或替换文件名中的非法字符
  return filename.replace(/[<>:"/\|?*]/g, "_").trim() || "未命名";
}
