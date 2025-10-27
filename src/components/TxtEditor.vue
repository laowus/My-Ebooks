<script setup>
import { invoke } from "@tauri-apps/api/core";
import { join, appDataDir } from "@tauri-apps/api/path";
import { exists, readDir } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ref, watch, onMounted, toRaw } from "vue";
import { storeToRefs } from "pinia";
import { useBookStore } from "../store/bookStore";

const { curChapter, selectColor } = storeToRefs(useBookStore());

// 先声明变量，稍后在onMounted中初始化
let appDataPath;
let epubDir;
let imageDir;

const curTabIndex = ref(0);
const barValue = ref("1");
const suffix = ref("\n");
const editArea = ref(null);
const barArea = ref(null);

// 同步滚动条位置方法
const syncScrollTop = () => {
  if (barArea.value && editArea.value) {
    barArea.value.scrollTop = editArea.value.scrollTop;
  }
};

// 设置行号方法
const line = (n) => {
  let num = "";
  for (let i = 1; i <= n; i++) {
    num += i + suffix.value;
  }
  barValue.value = num;
};
// 滚动到顶部的方法
const scrollRightWrapperToTop = () => {
  if (editArea.value) {
    editArea.value.scrollTop = 0;
  }
};

watch(
  curChapter,
  (val) => {
    console.log(val);
    queueMicrotask(() => {
      const textarea = editArea.value;
      if (!textarea) return;
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
      const scrollHeight = textarea.scrollHeight;
      const rows = Math.ceil(scrollHeight / lineHeight);
      line(rows);
      if (val && val.content.length > 0) {
        invoke("update_chapter", toRaw(val)).then((res) => {});
      } else {
        console.log("val 无效，不发送消息");
      }
    });
  },
  { immediate: true, deep: true }
);

onMounted(async () => {
  // 在onMounted中初始化异步路径
  appDataPath = await appDataDir();
  epubDir = await join(appDataPath, "epub");
  if (editArea.value) {
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width !== entry.borderBoxSize[0].inlineSize) {
          const textarea = editArea.value;
          const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
          const scrollHeight = textarea.scrollHeight;
          const rows = Math.ceil(scrollHeight / lineHeight);
          line(rows);
        }
      }
    });
    observer.observe(editArea.value);
  }
  // 组件挂载时滚动到顶部
  scrollRightWrapperToTop();
});

const formattedContent = ref("");

const getFormattedContent = async (content) => {
  if (!content) {
    formattedContent.value = "";
    return;
  }
  imageDir = await join(epubDir, `${curChapter.value?.bookId}`, "images");
  const dirExists = await exists(imageDir);
  if (dirExists) {
    const files = await readDir(imageDir);
    if (files.length > 0) {
      const lines = content.split("\n").filter((line) => line.trim() !== "");
      const processedLines = await Promise.all(
        lines.map(async (line) => {
          if (line.includes("src=")) {
            const imagePath = line.match(/src="([^"]+)"/)[1];
            const absoluteImagePath = await join(
              imageDir,
              imagePath.replace("images/", "")
            );
            const imageUrl = convertFileSrc(absoluteImagePath);
            line = line.replace(/src="[^"]+"/, `src="${imageUrl}"`);
          }
          return `<p>${line}</p>`;
        })
      );
      formattedContent.value = processedLines.join("");
    }
  } else {
    formattedContent.value = content;
  }
};

watch(
  () => curChapter.value?.content,
  (val) => {
    getFormattedContent(val);
  },
  { immediate: true }
);

// 添加斜体格式化功能
const formatTag = (tag) => {
  if (!editArea.value) return;

  const textarea = editArea.value;
  const { selectionStart, selectionEnd, value } = textarea;

  // 获取选中的文本
  const selectedText = value.substring(selectionStart, selectionEnd);
  //判断selectedText 是否包含tag
  if (selectedText === "" || selectedText.length === 0) {
    ElMessage({
      message: "请先选择文本",
      type: "warning",
    });
    return;
  }
  const formattedText = `<${tag}>${selectedText}</${tag}>`;

  // 更新文本内容
  const newContent =
    value.substring(0, selectionStart) +
    formattedText +
    value.substring(selectionEnd);

  // 保存当前章节内容
  curChapter.value.content = newContent;
};

const addImage = async () => {
  if (!editArea.value) return;
  try {
    const defaultFileName = `${sanitizeFilename(
      metaData.value.title || "未命名"
    )}.epub`;

    const defaultPath = await join(await appDataDir(), defaultFileName);
    const selectedPath = await save({
      title: "保存 EPUB 文件",
      defaultPath: defaultPath,
      filters: [
        {
          name: "EPUB 文件",
          extensions: ["epub"],
        },
        {
          name: "所有文件",
          extensions: ["*"],
        },
      ],
    });
  } catch (error) {
    console.error(error);
  }

  ipcRenderer
    .invoke("select-image", `${curChapter.value?.bookId}`)
    .then((imagePath) => {
      if (!imagePath) return; // 用户取消选择

      const imgUrl = imagePath;

      // 创建图片标签
      const imgTag = `<img src="images/${imgUrl}" />`;

      const textarea = editArea.value;
      const { selectionStart, selectionEnd, value } = textarea;

      // 在光标位置插入图片标签
      const newContent =
        value.substring(0, selectionStart) +
        imgTag +
        value.substring(selectionEnd);

      // 更新内容
      curChapter.value.content = newContent;
    })
    .catch((err) => {
      console.error("图片选择失败:", err);
      ElMessage.error("图片选择失败");
    });
};

const insertStyle = (styleStr) => {
  if (!editArea.value) return;

  // 获取textarea和选中信息
  const textarea = editArea.value;
  const { selectionStart, selectionEnd, value } = textarea;
  const selectedText = value.substring(selectionStart, selectionEnd);

  if (!selectedText) return; // 如果没有选中文字，直接返回

  // 按换行符分割选中的文字
  const lines = selectedText.split("\n");

  // 给每段添加span标签
  const formattedLines = lines.map((line) => {
    if (styleStr.ty === "color")
      return `<span style="color: ${styleStr.val}">${line}</span>`;
    else if (styleStr.ty === "align")
      return `<p style="text-align: ${styleStr.val};">${line}</p>`;
  });

  // 用<br>连接处理后的段落，保持原来的换行效果
  const formattedText = formattedLines.join("\n");

  // 更新内容
  const newContent =
    value.substring(0, selectionStart) +
    formattedText +
    value.substring(selectionEnd);

  curChapter.value.content = newContent;
};
</script>

<template>
  <div class="out-editor">
    <div class="top-bar">
      <div class="top-bar">
        <button @click="curTabIndex = 0" :class="{ active: curTabIndex === 0 }">
          编辑
        </button>
        <button @click="curTabIndex = 1" :class="{ active: curTabIndex === 1 }">
          预览
        </button>
      </div>
    </div>
    <div class="edit-bar" v-if="curTabIndex === 0 && curChapter.content !== ''">
      <button class="btn-icon-normal" title="添加图片" @click="addImage">
        <span class="iconfont icon-tianjiatupian"></span>
      </button>
      <button class="btn-icon-normal" title="斜体" @click="formatTag('i')">
        <span class="iconfont icon-zitixieti"></span>
      </button>
      <button class="btn-icon-normal" title="下划线" @click="formatTag('u')">
        <span class="iconfont icon-zitixiahuaxian"></span>
      </button>
      <button class="btn-icon-normal" title="加粗" @click="formatTag('b')">
        <span class="iconfont icon-zitijiacu"></span>
      </button>
      <div class="color-select-wrapper">
        <button
          class="btn-icon-small"
          title="颜色"
          @click="insertStyle({ ty: 'color', val: selectColor })"
        >
          <span
            class="iconfont icon-yanseban"
            :style="{ color: selectColor }"
          ></span>
        </button>
        <input
          class="select-panel"
          type="color"
          v-model="selectColor"
          title="选择颜色"
        />
      </div>
      <div class="color-select-wrapper">
        <button
          class="btn-icon-small"
          title="居左"
          @click="insertStyle({ ty: 'align', val: 'left' })"
        >
          <span class="iconfont icon-juzuo"></span>
        </button>
        <button
          class="btn-icon-small"
          title="居中"
          @click="insertStyle({ ty: 'align', val: 'center' })"
        >
          <span class="iconfont icon-juzhongduiqi"></span>
        </button>
        <button
          class="btn-icon-small"
          title="居右"
          @click="insertStyle({ ty: 'align', val: 'right' })"
        >
          <span class="iconfont icon-juyou"></span>
        </button>
      </div>
      <button class="btn-icon-normal" title="查找替换" @click="">
        <span class="iconfont icon-chazhaotihuan"></span>
      </button>
    </div>
    <div class="line-edit-wrapper" v-if="curTabIndex === 0">
      <div class="left-bar-wrapper">
        <textarea
          ref="barArea"
          v-model="barValue"
          class="bar-area"
          wrap="off"
          cols="2"
          disabled
        />
      </div>
      <div class="rigth-edit-wrapper">
        <textarea
          ref="editArea"
          v-model="curChapter.content"
          class="edit-area"
          name="content"
          @scroll="syncScrollTop"
        />
      </div>
    </div>
    <div class="preview-wrapper" v-if="curTabIndex === 1">
      <div class="preview-content">
        <div v-html="formattedContent"></div>
      </div>
    </div>
  </div>
</template>

<style>
.search-left {
  display: flex;
  align-items: center;
}
.search-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.edit-bar {
  height: 28px;
  display: flex;
  flex-direction: row;
  background-color: white;
  /* 添加垂直居中对齐 */
  align-items: center;
  /* 设置内边距：上下5px，左边10px */
  padding: 5px 0 5px 20px;
  gap: 20px;
}

.select-panel {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  border-color: transparent;
}
.color-select-wrapper {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  border: 1px solid #ccc;
  padding: 2px 5px;
  border-radius: 5px;
}
.out-editor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.top-bar {
  width: 100%;
  height: 30px;
  background-color: #f0efe2;
  display: flex;
  flex-direction: row;
  gap: 5px;
}

.top-bar button {
  cursor: pointer;
  font-size: 12px;
  color: #333;
  transition: background-color 0.3s, color 0.3s;
  padding-left: 2%;
  padding-right: 20px;
  justify-content: center;
  align-items: center;
}

.top-bar button.active {
  background-color: #ffffcc;
  color: #000;
  font-weight: bold;
  font-size: 14px;
}

.btn-icon-normal {
  height: 1.5rem;
  width: 1.5rem;
  cursor: pointer;
  /* 添加flex布局确保图标居中 */
  display: flex;
  justify-content: center;
  align-items: center;
  /* 添加透明边框避免hover时布局跳动 */
  border: 1px solid #ccc;
  /* 圆角美化 */
  border-radius: 4px;
  /* 过渡动画使效果更平滑 */
  transition: all 0.2s ease;
}

.btn-icon-normal:hover {
  background-color: #ffffcc;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  /* 优化边框样式 */
  border: 1px solid #eee;
}

.btn-icon-normal .iconfont {
  font-size: 1.2rem;
  color: green;
}

.btn-icon-small {
  height: 1.2rem;
  width: 1.2rem;
  cursor: pointer;
  /* 添加flex布局确保图标居中 */
  display: flex;
  justify-content: center;
  align-items: center;
  /* 添加透明边框避免hover时布局跳动 */
  border: 1px solid #ccc;
  /* 圆角美化 */
  border-radius: 4px;
  /* 过渡动画使效果更平滑 */
  transition: all 0.2s ease;
}

.btn-icon-small:hover {
  background-color: #ffffcc;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  /* 优化边框样式 */
  border: 1px solid #eee;
}

.btn-icon-small .iconfont {
  font-size: 1rem;
  color: green;
}

.line-edit-wrapper {
  width: 100%;
  display: flex;
  flex-direction: row;
  flex: 1;
}

.preview-wrapper {
  width: 100%;
  display: flex;
  flex-direction: row;
  flex: 1;
  background-color: white !important;
  overflow: hidden; /* 防止容器本身滚动 */
}

.preview-content {
  padding: 20px;
  width: 100%;
  height: 100%;
  overflow-y: auto; /* 内容超出时显示垂直滚动条 */
  overflow-x: hidden; /* 禁止水平滚动 */
  margin-bottom: 10px;
  white-space: pre-wrap;
}
.preview-content p {
  margin-bottom: 16px; /* 设置段落间距 */
  line-height: 1.6; /* 设置行高 */
}
/* 添加斜体样式 */
.preview-content i {
  font-style: italic;
}

.preview-content u {
  text-decoration: underline;
}

.preview-content b {
  font-weight: bold;
}
.preview-content img {
  max-width: 80%;
  height: auto;
}

.left-bar-wrapper {
  background-color: #f0efe2;
  width: 50px;
  height: 100%;
  text-align: left;
  float: left;
}

.rigth-edit-wrapper {
  height: 100%;
  flex: 1;
}

.edit-area {
  border: 1px solid #eaeaea;
  outline: none;
  width: 100%;
  height: 100%;
  resize: none;
  line-height: 28px;
  font-size: 14px;
  float: left;
  padding: 0;
  color: black;
  font-family: inherit;
  box-sizing: border-box;
  padding-left: 5px;
  background-image: repeating-linear-gradient(#eee 0 1px, transparent 1px 28px);
  background-size: 100% 28px;
  background-attachment: local;
}

.rigth-edit-wrapper textarea {
  caret-color: #ff0000; /* 将光标颜色设置为红色，可以根据需要修改 */
  caret-width: 2px; /* 增加光标宽度，某些浏览器可能不支持 */
}
.rigth-edit-wrapper textarea:focus {
  outline: none; /* 移除默认的聚焦轮廓 */
  caret-color: #ff0000; /* 确保聚焦时光标颜色仍然明显 */
}

.bar-area {
  height: 100%;
  width: 100%;
  resize: none;
  outline: none;
  overflow-y: hidden;
  overflow-x: hidden;
  border: 0;
  background: rgb(247, 247, 247);
  color: #999;
  line-height: 28px;
  font-size: 14px;
  padding: 0 5px;
  text-align: right;
  font-weight: bold;
  box-sizing: border-box;
}

/* 优化查找替换浮动块样式 - 单行紧凑版 */
.search-float-panel {
  position: fixed;
  top: 100px;
  right: 20px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  display: flex;
  flex-direction: row;
  gap: 10px;
}

.replace-content {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 10px;
  flex-direction: row;
}

.search-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-title {
  font-weight: 600;
  color: #333;
  font-size: 13px;
  white-space: nowrap;
}
.search-float-panel i:hover {
  color: #409eff;
  cursor: pointer;
}

.search-input {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
  width: 100px;
  height: 26px;
}

.search-input:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.search-controls {
  display: flex;
  flex-direction: row;
  gap: 5px;
}

.search-btn {
  padding: 2px 6px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.search-btn:hover {
  background-color: #e6f7ff;
  border-color: #409eff;
  color: #409eff;
}

.search-info {
  display: flex;
  align-items: center;
}

.match-count {
  font-size: 12px;
  color: #666;
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 10px;
  font-family: monospace;
}

.search-close {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.search-close:hover {
  background-color: #f5f5f5;
  color: #333;
}

/* 移除原有的search-header和search-body样式 */
.search-header,
.search-body {
  display: none;
}
</style>
