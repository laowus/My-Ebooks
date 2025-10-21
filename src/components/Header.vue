<script setup>
import { ref, onMounted, inject, toRaw } from "vue";
import { open} from "../libs/parseBook.js"

const initDom = () => {
  $("#add-file").addEventListener("change", (e) => {
    // 检查用户是否选择了文件
    if (e.target.files.length > 0) {
      const newFile = e.target.files[0];
      const ext = newFile.name.split(".").pop();
      if (ext === "txt" || ext === "html") {
        let fileStr = "";
      } else if (ext === "epub" || ext === "mobi") {
        open(newFile).then((res) => {
          console.log(" 02 open", res);
        });
      }
      e.target.value = "";
    } else {
      console.log("用户未选择文件");
    }
  });

  $("#add-file-btn").addEventListener("click", () => $("#add-file").click());
};

onMounted(() => {
  initDom();
});
</script>
<template>
  <div class="header">
    <input
      type="file"
      id="add-file"
      hidden
      accept=".txt,.html,.epub,.mobi,.azw3"
    />
    <button class="btn-icon" id="add-file-btn">
      <span class="iconfont icon-Epub" style="color: green"></span>
      <span>导入文件</span>
    </button>
  </div>
</template>
<style>
.header {
  width: 100%;
  background-color: #f0f0f0;
  display: flex;
  flex-direction: row;
  border: 1px solid #add8e6;
  height: 100px;
}
.tabs {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.tabnames {
  width: 100%;
  display: flex;
  flex-direction: row;
  background-color: #87ceeb;
  padding-left: 10px;
  gap: 10px;
}

.tabname {
  font-size: 14px;
  width: 60px;
  height: 30px;
  align-items: center;
  justify-content: center;
  display: flex;
  cursor: pointer;
}
.tabname.active {
  background-color: white;
  border: 1px solid #87ceeb;
  /* 设置下边框颜色为白色 */
  border-bottom-color: white;
  border-radius: 10px 10px 0 0;
}

.drag-tab {
  flex: 1;
  user-select: none;
  -webkit-app-region: drag;
  -webkit-user-select: none;
}

.tabcontent div {
  padding-left: 5px;
  font-size: 12px;
  background-color: white;
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: center;
  background-color: #add8e6;
}
.btn-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: transparent;
  transition: background-color 0.3s ease;
  margin: 10px;
  font-size: 12px;
}
.btn-icon-row {
  flex-direction: row;
  border: 1px solid #87ceeb;
  border-radius: 5px;
  padding: 5px;
  background-color: #add8e6;
}

.btn-icon .iconfont {
  font-size: 2rem;
}

.btn-icon:hover {
  background-color: #ffffcc;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
} /* 添加按钮禁用状态样式 */
.btn-icon:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  /* 降低透明度，让按钮看起来变灰 */
}

.btn-icon:disabled .iconfont {
  color: #ccc;
  /* 禁用状态下图标颜色变灰 */
}

.btn-icon:disabled:hover {
  background-color: transparent;
  /* 禁用状态下鼠标悬停不改变背景色 */
  box-shadow: none;
  /* 禁用状态下鼠标悬停不显示阴影 */
}
</style>
