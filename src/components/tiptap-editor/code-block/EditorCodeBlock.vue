<template>
  <node-view-wrapper>
    <details
      :open
      @toggle="open = ($event as any).target.open"
      bg-sur-c-low
      rd
      my-2
    >
      <summary
        flex
        cursor-pointer
      >
        <input
          type="text"
          :value="node.attrs.language"
          @change="updateAttributes({ language: ($event as any).target.value })"
          text-on-sur-var
          border-none
          outline-none
          bg-transparent
          ml-3
        >
        <q-space />
        <copy-btn
          :value="node.textContent"
          text-on-sur-var
          flat
          round
          size="sm"
        />
        <q-btn
          icon="sym_o_chevron_right"
          flat
          round
          size="sm"
          :class="{ 'rotate-90': open }"
          @click="open = !open"
        />
      </summary>
      <node-view-content
        p-3
        text-on-sur-var
        class="code-block-content"
      />
    </details>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewContent, nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import CopyBtn from 'src/components/CopyBtn.vue'
import { ref } from 'vue'

defineProps(nodeViewProps)

const open = ref(true)
</script>
<style lang="scss" scoped>
.code-block-content {
  font-family: source-code-pro, Menlo, Monaco, Consolas, Courier New, monospace;
  font-size: 14px;
}
</style>
