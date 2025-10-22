import EventBus from "../common/EventBus";
import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";

export const useBookStore = defineStore("bookStore", {
  state: () => ({
    isFirst: true,
    metaData: null, //书籍信息
    toc: null, //目录
    curChapter: {
      bookId: 0,
      href: "",
      label: "",
      content: "",
    }, //当前编辑的章节
    isAllEdit: false, //是否全部编辑
    isTitleIn: false, //保留章名在内容里面
    selectColor: "#FF0000",
  }),
  actions: {
    setFirst(isF) {
      this.isFirst = isF;
    },
    setMetaData(metaData) {
      this.metaData = metaData;
    },
    setToc(toc) {
      this.toc = toc;
    },
    // 插入数据库中 并更新目录以及当前章节
    async addTocByHref(href, tocItem) {
      await invoke("add_chapter", tocItem).then((res) => {
        if (res.success) {
          const item = {
            label: tocItem.label,
            href: res.data,
            subitems: null,
          };
          if (href) {
            const parentItem = this.findTocByHref(href);
            if (parentItem.subitems) {
              parentItem.subitems.push(item);
            } else {
              parentItem.subitems = [item];
            }
          } else {
            if (!this.toc) {
              this.toc = [];
            }
            this.toc.push(item);
          }
          // 发送插入成功事件
          EventBus.emit("addChapterRes", res);
          // 发送更新目录事件
          EventBus.emit("updateToc", item.href);
        }
      });
    },
    findTocByHref(href) {
      const findItem = (href, items) => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.href == href) {
            return item;
          }
          if (item.subitems && item.subitems.length > 0) {
            const result = findItem(href, item.subitems);
            if (result) {
              return result;
            }
          }
        }
      };
      return findItem(href, this.toc);
    },
  },
  persist: {
    enabled: true,
    strategies: [
      {
        storage: localStorage,
        paths: ["selectColor", "isTitleIn"],
      },
    ],
  },
});
