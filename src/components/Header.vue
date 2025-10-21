<script setup>
import { invoke } from "@tauri-apps/api/core";
import { ref, onMounted, inject, toRaw } from "vue";
import { storeToRefs } from "pinia";
import WindowCtr from "./WindowCtr.vue";
import { ElMessage, ElMessageBox } from "element-plus";
import EventBus from "../common/EventBus";
import { open } from "../libs/parseBook.js";
import { readTxtFile, getTextFromHTML } from "../common/utils";
import { useBookStore } from "../store/bookStore";
import { useAppStore } from "../store/appStore";
const { curChapter, metaData, isFirst, toc, isAllEdit, isTitleIn } =
  storeToRefs(useBookStore());
const { setMetaData, setFirst, setIsAllEdit, setTitleIn } = useBookStore();
const { showHistoryView, showNewBook, showAbout } = useAppStore();

const curIndex = ref(1);
const indentNum = ref(2);
const changeTab = (index) => {
  curIndex.value = index;
};
// 正则表达式
const reg = {
  pre: ["", "第", "卷", "chapter"],
  aft: ["", "章", "回", "节", "集", "部", "篇", "部分"],
  selected: [1, 1],
};
const strNum = ref(20);
const initDom = () => {
  $("#add-file").addEventListener("change", (e) => {
    // 检查用户是否选择了文件
    if (e.target.files.length > 0) {
      const newFile = e.target.files[0];
      const ext = newFile.name.split(".").pop();
      if (ext === "txt" || ext === "html") {
        let fileStr = "";
        readTxtFile(newFile).then(async (data) => {
          fileStr = ext === "html" ? getTextFromHTML(data) : data;
          console.log("fileStr", fileStr);
          if (isFirst.value) {
            const meta = {
              title: newFile.name.split(".")[0],
              author: "Unknown",
              description: "Unknown",
              toc: "",
            };
            const res = await invoke("add_book", meta);
            if (res.success) {
              meta.bookId = res.data.id;
              setMetaData(meta);
              const chapter = {
                bookId: metaData.value.bookId,
                label: metaData.value.title,
                href: `OPS/chapter-${Date.now()}`,
                content: fileStr,
              };
              EventBus.emit("addChapter", { href: null, chapter: chapter });
              setFirst(false);
            } else {
              ElMessage.error("插入失败");
            }
          } else {
            const chapter = {
              bookId: metaData.value.bookId,
              label: newFile.name.split(".")[0],
              href: `OPS/chapter-${Date.now()}`,
              content: fileStr,
            };
            EventBus.emit("addChapter", { href: null, chapter: chapter });
          }
        });
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
    <div class="tabs">
      <div class="tabnames">
        <div
          class="tabname"
          @click="changeTab(0)"
          :class="{ active: curIndex === 0 }"
        >
          开始
        </div>
        <div
          class="tabname"
          @click="changeTab(1)"
          :class="{ active: curIndex === 1 }"
        >
          导入
        </div>
        <div
          class="tabname"
          @click="changeTab(2)"
          :class="{ active: curIndex === 2 }"
        >
          编辑
        </div>
        <div
          class="tabname"
          @click="changeTab(3)"
          :class="{ active: curIndex === 3 }"
        >
          工具
        </div>
        <div
          class="tabname"
          @click="changeTab(4)"
          :class="{ active: curIndex === 4 }"
        >
          发布
        </div>
        <div
          class="tabname"
          @click="changeTab(5)"
          :class="{ active: curIndex === 5 }"
        >
          帮助
        </div>
        <div class="drag-tab"></div>

        <WindowCtr />
      </div>
      <div class="tabcontent">
        <div v-show="curIndex === 0">
          <button class="btn-icon" @click="">
            <span class="iconfont icon-xinjian" style="color: green"></span>
            <span>新建</span>
          </button>
        </div>
        <div v-show="curIndex === 1">
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
          <button class="btn-icon" @click="">
            <span class="iconfont icon-lishijilu" style="color: green"></span>
            <span>历史记录</span>
          </button>
          <button class="btn-icon" @click="">
            <span class="iconfont icon-zhongqi" style="color: red"></span>
            <span> 重 启 </span>
          </button>
        </div>
        <div v-show="curIndex === 2">
          <button class="btn-icon" @click="" :disabled="!curChapter.bookId">
            <span
              class="iconfont icon-shanchukonghang"
              style="color: red"
            ></span>
            <span>删除空行</span>
          </button>
          <select
            @change="indentNum = parseInt($event.target.value)"
            :value="indentNum"
          >
            <option v-for="index in [0, 1, 2, 3, 4, 5, 6]" :key="index">
              {{ index }}
            </option>
          </select>
          <button class="btn-icon" @click="" :disabled="!curChapter.bookId">
            <span
              class="iconfont icon-shouhangsuojin"
              style="color: green"
            ></span>
            <span>首行缩进</span>
          </button>

          <button class="btn-icon" @click="" :disabled="!curChapter.bookId">
            <span
              class="iconfont icon-shanchukonghang"
              style="color: red"
            ></span>
            <span>删除章名</span>
          </button>

          <button class="btn-icon" @click="" :disabled="!curChapter.bookId">
            <span class="iconfont icon-xinjian"></span>
            <span>添加章名</span>
          </button>
          <button class="btn-icon" @click="">
            <span
              class="iconfont"
              :class="isAllEdit ? 'icon-gouxuananniu' : 'icon-gouxuananniu1'"
              style="color: green; font-size: 18px; padding-top: 8px"
            ></span>
            <span style="padding-top: 8px">应用全书</span>
          </button>
        </div>
        <div v-show="curIndex === 3">
          <div class="reg-string">
            <span>规则:</span>
            <select id="pre">
              <option
                v-for="(pr, index) in reg.pre"
                :selected="reg.selected[0] == index"
              >
                {{ pr }}
              </option>
            </select>
            <span>[数字]</span>
            <select id="aft">
              <option
                v-for="(af, index) in reg.aft"
                :selected="reg.selected[1] == index"
              >
                {{ af }}
              </option>
            </select>
            <span><</span>
            <input
              id="strNum"
              style="width: 30px; height: 20px; font-size: 12px"
              v-model="strNum"
            />
            <span>特别:</span>
            <input
              id="attach"
              style="width: 150px; height: 20px; font-size: 12px"
              placeholder="多个用|分开"
            />

            <button class="btn-icon" @click="">
              <span
                class="iconfont"
                :class="isTitleIn ? 'icon-gouxuananniu' : 'icon-gouxuananniu1'"
                style="color: green; font-size: 18px; padding-top: 8px"
              ></span>
              <span style="padding-top: 8px">保留章名</span>
            </button>
            <button class="btn-icon" @click="" :disabled="!curChapter.bookId">
              <span class="iconfont icon-jianqie" style="color: green"></span>
              <span>开始分割</span>
            </button>
          </div>
        </div>
        <div v-show="curIndex === 4">
          <button class="btn-icon" @click="" :disabled="!curChapter.bookId">
            <span class="iconfont icon-daochuexl" style="color: green"></span>
            <span>生成epub</span>
          </button>
          <button class="btn-icon" @click="" :disabled="!curChapter.bookId">
            <span class="iconfont icon-daochutxt" style="color: green"></span>
            <span>生成txt</span>
          </button>
          <button class="btn-icon" @click="" :disabled="!curChapter.bookId">
            <span class="iconfont icon-HTML" style="color: green"></span>
            <span>生成Html</span>
          </button>
        </div>
        <div v-show="curIndex === 5">
          <button class="btn-icon" @click="">
            <span class="iconfont icon-daochuexl" style="color: green"></span>
            <span>关于</span>
          </button>
        </div>
      </div>
    </div>
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
