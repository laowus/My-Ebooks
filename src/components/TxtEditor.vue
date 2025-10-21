<script setup>
import { ref, reactive, watch, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useBookStore } from "../store/bookStore";
import EventBus from "../common/EventBus";
const { curChapter, selectColor } = storeToRefs(useBookStore());

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
    });
  },
  { immediate: true, deep: true }
);

onMounted(() => {
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
  </div>
</template>

<style>
.out-editor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
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

.line-edit-wrapper {
  width: 100%;
  display: flex;
  flex-direction: row;
  flex: 1;
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
</style>
