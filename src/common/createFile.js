import JSZip from "jszip";
import { invoke } from "@tauri-apps/api/core";
import {
  exists,
  readDir,
  readFile,
  writeFile,
  mkdir,
} from "@tauri-apps/plugin-fs";
import { join, appDataDir, dirname, basename } from "@tauri-apps/api/path";
import EventBus from "./EventBus";

// 递归生成 navPoints 的函数
const generateNavPoints = (chapters, parentPlayOrder = 1) => {
  let currentPlayOrder = parentPlayOrder;
  return chapters.map((chapter, index) => {
    const id = `chapter${chapter.href}`;
    const playOrder = currentPlayOrder++;
    let navPoint = `<navPoint id="navPoint-${id}" playOrder="${playOrder}">
                  <navLabel>
                    <text>${chapter.label}</text>
                  </navLabel>
                  <content src="./OEBPS/${id}.html" />`;
    if (chapter.subitems && chapter.subitems.length > 0) {
      const subNavPoints = generateNavPoints(
        chapter.subitems,
        currentPlayOrder
      );
      currentPlayOrder += subNavPoints.length;
      navPoint += subNavPoints.join("\n");
    }
    navPoint += `</navPoint>`;
    return navPoint.trim();
  });
};

// 扁平化章节列表的函数
const flattenChapters = (chapters) => {
  return chapters.flatMap((chapter) => [
    chapter,
    ...(chapter.subitems ? flattenChapters(chapter.subitems) : []),
  ]);
};

// 格式化文本，添加分段和缩进
const formatText = (text) => {
  const lines = text.split("\n");
  let paragraphs = [];

  for (let line of lines) {
    line = line.trim();
    if (line !== "") {
      paragraphs.push(`<p>${line}</p>`);
    }
  }

  return paragraphs.join("\n");
};

export const createEpub = async (metadata, chapters) => {
  return new Promise(async (resolve, reject) => {
    try {
      // 4. 现在才开始生成 EPUB 文件内容
      const imagesList = [];
      const { author, title, bookId } = metadata;
      //内容页的图片保存目录
      const imagesDir = await join(
        await appDataDir(),
        "epub",
        `${bookId}`,
        "images"
      );
      //封面图片保存目录
      const coverPath = await join(
        await appDataDir(),
        "covers",
        `${bookId}.jpg`
      );

      const isCoverExists = await exists(coverPath);

      const zip = new JSZip();

      zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
      zip.folder("META-INF").file(
        "container.xml",
        ` <?xml version="1.0" encoding="UTF-8"?>
            <container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
                <rootfiles>
                <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
                </rootfiles>
            </container>`.trim()
      );

      if (isCoverExists) {
        const coverData = await readFile(coverPath);
        zip.folder("OEBPS").file("cover.jpg", coverData);
      }

      if (await exists(imagesDir)) {
        const imageFiles = await readDir(imagesDir);
        if (imageFiles && imageFiles.length > 0) {
          for (const file of imageFiles) {
            imagesList.push(`OEBPS/images/${file.name}`);
            const filePath = await join(imagesDir, file.name);
            const imgData = await readFile(filePath);
            zip.folder("OEBPS").folder("images").file(file.name, imgData);
          }
        }
      }

      const navPoints = generateNavPoints(chapters).join("\n");

      // 目录页面
      zip.folder("").file(
        "toc.ncx",
        ` <?xml version="1.0" encoding="UTF-8"?>
            <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
                <head>
                <meta name="dtb:uid" content="book-id" />
                <meta name="dtb:depth" content="1" />
                <meta name="dtb:totalPageCount" content="0" />
                <meta name="dtb:maxPageNumber" content="0" />
                </head>
                <docTitle>
                <text>${title}</text>
                </docTitle>
                <docAuthor>
                <text>${author}</text>
                </docAuthor>
                <navMap>
                ${navPoints}
                </navMap>
            </ncx>`.trim()
      );

      // 扁平化章节列表
      const flatChapters = flattenChapters(chapters);
      // 生成 manifest
      const manifestItems = flatChapters.map(
        (chapter, index) => `
        <item id="chap${chapter.href}" href="OEBPS/chapter${chapter.href}.html" media-type="application/xhtml+xml"/>
    `
      );

      if (isCoverExists) {
        manifestItems.push(`
          <item id="cover-image" href="OEBPS/cover.jpg" media-type="image/jpeg"/>
          <item id="cover" href="OEBPS/cover.html" media-type="application/xhtml+xml"/>
        `);
      }
      // 添加图片到 manifest
      if (imagesList.length > 0) {
        imagesList.forEach((image, index) => {
          manifestItems.push(`
          <item id="img${index}" href="${image}" media-type="image/jpeg"/>
        `);
        });
      }

      const manifest = manifestItems.join("").trim();
      // 生成 spine
      const spineItems = flatChapters.map(
        (chapter, index) => `
        <itemref idref="chap${chapter.href}"/>`
      );

      if (isCoverExists) {
        spineItems.unshift(`<itemref idref="cover" linear="yes"/>`);
      }
      const spine = spineItems.join("").trim();

      // 生成封面页面
      if (isCoverExists) {
        const coverFileName = "cover.jpg";
        zip.folder("OEBPS").file(
          "cover.html",
          `<?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
          <html xmlns="http://www.w3.org/1999/xhtml" lang="zh">
            <head>
              <title>封面</title>
            </head>
            <body>
              <img src="${coverFileName}" alt="封面" />
            </body>
          </html>
          `.trim()
        );
      }

      // 生成内容页面
      const addChapterFiles = async () => {
        for (const [index, chapter] of flatChapters.entries()) {
          EventBus.emit(
            "showTip",
            chapter.label +
              " 正在添加到 EPUB 文件... (" +
              (index + 1) +
              "/" +
              flatChapters.length +
              ")"
          );
          const result = await invoke("get_chapter", {
            id: String(chapter.href),
          });
          // 检查返回结果是否成功
          const content = result.success
            ? formatText(result.data[0].content)
            : "";

          zip.folder("OEBPS").file(
            `chapter${chapter.href}.html`,
            `<?xml version="1.0" encoding="UTF-8"?>
                <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
                <html xmlns="http://www.w3.org/1999/xhtml" lang="zh">
                  <head>
                    <title>${chapter.label}</title>
                    <link rel="stylesheet" type="text/css" href="../style.css"/>
                  </head>
                  <body>
                  ${content}
                  </body>
                </html>
              `.trim()
          );
        }
      };

      // 等待所有章节文件添加完成
      addChapterFiles()
        .then(() => {
          const tocManifest = `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`;
          // 生成 content.opf
          zip.folder("").file(
            "content.opf",
            `<?xml version="1.0" encoding="UTF-8"?>
            <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="2.0">
              <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
                <dc:title>${title}</dc:title>
                <dc:language>zh</dc:language>
                <dc:creator>${author}</dc:creator>
                <dc:identifier id="book-id">${new Date().getTime()}</dc:identifier>
                ${
                  isCoverExists
                    ? '<meta name="cover" content="cover-image"/>'
                    : ""
                }
              </metadata>
              <manifest>
                ${manifest}
                ${tocManifest}
              </manifest>
              <spine toc="ncx">
                ${spine}
              </spine>
            </package>
          `.trim()
          );

          zip
            .generateAsync({ type: "nodebuffer" })
            .then((epubContent) => {
              EventBus.emit("hideTip", "EPUB 文件创建成功！");
              resolve(epubContent);
            })
            .catch((err) => {
              console.error("转换过程中出现错误:", err);
              reject(err);
            });
        })
        .catch((err) => {
          console.error("添加章节文件时出现错误:", err);
          reject(err);
        });
    } catch (error) {
      console.error("创建 EPUB 文件失败:", error);
      throw error;
    }
  });
};

const generateTxt = async (chapters, isHtml = false) => {
  let localTxtContent = "";
  // 添加 HTML 标签去除函数
  const removeHtmlTags = (htmlString) => {
    if (!htmlString) return "";
    // 使用正则表达式去除 HTML 标签
    return htmlString.replace(/<[^>]*>/g, "");
  };
  for (const chapter of chapters) {
    const result = await invoke("get_chapter", {
      id: String(chapter.href),
    });
    EventBus.emit("showtip", chapter.label);
    const content = result.success
      ? (isHtml ? "<h2>" + chapter.label + "</h2>\n" : chapter.label + "\n") +
        removeHtmlTags(result.data[0].content)
      : "";
    localTxtContent += content;

    if (chapter.subitems) {
      // 递归调用并等待结果
      const subContent = await generateTxt(chapter.subitems, isHtml);
      localTxtContent += subContent;
    }
  }
  EventBus.emit("hidetip");
  return localTxtContent;
};

export const createTxt = async (chapters) => {
  console.log("createTxt", chapters);
  // 检查 chapters 是否为空
  if (!chapters || chapters.length === 0) {
    console.log("chapters 数组为空");
    return "";
  }

  try {
    // 等待 generateTxt 执行完成
    const txtContent = await generateTxt(chapters);
    return txtContent;
  } catch (err) {
    console.error("转换过程中出现错误:", err);
    throw err;
  }
};

export const createHtml = async (chapters, title) => {
  console.log("createTxt", chapters);
  // 检查 chapters 是否为空
  if (!chapters || chapters.length === 0) {
    console.log("chapters 数组为空");
    return "";
  }

  try {
    // 等待 generateTxt 执行完成
    const txtContent = await generateTxt(chapters, true);
    return txtContent;
  } catch (err) {
    console.error("转换过程中出现错误:", err);
    throw err;
  }
};

/**
 * 打包应用目录为ZIP文件
 * @param {string} sourceDir - 要打包的源目录路径
 * @param {string} zipFilePath - 输出的ZIP文件路径
 * @returns {Promise<void>}
 */
export const createBackZip = async () => {
  try {
    // 创建JSZip实例
    const zip = new JSZip();
    const _appData = await appDataDir();
    await addDirectoryToZip(zip, _appData, "");
    const appDataZip = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    });

    return appDataZip;
  } catch (error) {
    console.error("打包目录失败:", error);
  }
};
/**
 * 递归将目录内容添加到ZIP
 * @param {JSZip} zip - JSZip实例
 * @param {string} dirPath - 当前目录路径
 * @param {string} zipPath - 在ZIP中的路径
 */
async function addDirectoryToZip(zip, dirPath, zipPath) {
  const entries = await readDir(dirPath);

  for (const entry of entries) {
    const fullPath = await join(dirPath, entry.name);
    const relativePath = zipPath ? `${zipPath}/${entry.name}` : entry.name;

    // 如果是目录，递归处理
    if (entry.children) {
      await addDirectoryToZip(zip, fullPath, relativePath);
    } else {
      // 如果是文件，读取并添加到ZIP
      const fileContent = await readFile(fullPath);
      zip.file(relativePath, fileContent);
    }
  }
}

    }

/**
 * 将File对象或Blob对象转换为ArrayBuffer
 * @param {File|Blob} file - 要转换的文件对象
 * @returns {Promise<ArrayBuffer>}
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
