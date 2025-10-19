<script setup>
import { invoke } from "@tauri-apps/api/core";
import { onMounted } from "vue";

// 添加书籍的函数
async function addNewBook() {
  try {
    const bookId = await invoke("add_book", {
      title: "三体",
      author: "刘慈欣",
      description: "一部科幻小说",
      toc: "第一章 科学边界\n第二章 台球",
    });
    console.log("Book added with ID:", bookId);
  } catch (error) {
    console.error("Failed to add book:", error);
  }
}
</script>

<template>
  <div>
    <h1>我的电子书</h1>
    <button @click="addNewBook">添加书籍</button>
  </div>
</template>

<style></style>
