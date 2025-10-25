<script setup>
import { storeToRefs } from "pinia";
import EventBus from "../common/EventBus";
import { useAppStore } from "../store/appStore";
import Tip from "./Tip.vue";
import EditBook from "./EditBook.vue";
import NewBook from "./NewBook.vue";
import HistoryView from "./HistoryView.vue";
import About from "./About.vue";
const { tipShow, tipText } = storeToRefs(useAppStore());
const { showTip, hideTip } = useAppStore();

EventBus.on("showTip", (text) => {
  showTip(text);
});

EventBus.on("hideTip", (text = "完成!") => {
  showTip(text);
  hideTip();
});
</script>
<template>
  <div id="popovers">
    <HistoryView> </HistoryView>
    <EditBook> </EditBook>
    <NewBook> </NewBook>
    <About> </About>
    <Tip v-show="tipShow">
      <template #text>
        <p v-html="tipText"></p>
      </template>
    </Tip>
  </div>
</template>

<style></style>
