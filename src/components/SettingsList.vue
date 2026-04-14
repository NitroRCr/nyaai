<template>
  <q-list pb-2>
    <q-item-label
      header
      id="ui"
    >
      {{ t('UI') }}
    </q-item-label>
    <setting-item
      icon="sym_o_dark_mode"
      :label="t('Appearance')"
      :modified-in="state.darkMode.modifiedIn"
      @reset="$emit('reset', 'darkMode')"
    >
      <q-select
        class="min-w-120px"
        filled
        dense
        :options="[
          { label: t('Follow System'), value: 'auto' },
          { label: t('Light'), value: false },
          { label: t('Dark'), value: true },
        ]"
        :model-value="state.darkMode.value"
        @update:model-value="$emit('update', 'darkMode', $event)"
        emit-value
        map-options
      />
    </setting-item>
    <setting-item
      icon="sym_o_palette"
      :label="t('Theme color')"
      :modified-in="state.themeHue.modifiedIn"
      @reset="$emit('reset', 'themeHue')"
      clickable
      v-ripple
      @click="pickThemeHue"
    >
      <hct-preview-circle :hue="state.themeHue.value" />
    </setting-item>
    <setting-item
      icon="sym_o_report"
      :label="t('Show warnings')"
      :caption="t('Show warnings in assistant messages')"
      :modified-in="state.showMessageWarnings.modifiedIn"
      @reset="$emit('reset', 'showMessageWarnings')"
    >
      <q-toggle
        :model-value="state.showMessageWarnings.value"
        @update:model-value="$emit('update', 'showMessageWarnings', $event)"
      />
    </setting-item>
    <common-item
      v-if="scope === 'local'"
      icon="sym_o_language"
      :label="t('Language')"
    >
      <q-select
        filled
        dense
        :options="localeOptions"
        v-model="localData.locale"
        emit-value
        map-options
        class="w-120px"
      />
    </common-item>
    <q-expansion-item
      :label="t('Markdown rendering')"
      icon="sym_o_markdown"
      :content-inset-level="1"
    >
      <setting-item
        :label="t('Theme')"
        :modified-in="state.mdPreviewTheme.modifiedIn"
        @reset="$emit('reset', 'mdPreviewTheme')"
      >
        <q-select
          :options="mdPreviewThemes"
          :model-value="state.mdPreviewTheme.value"
          @update:model-value="$emit('update', 'mdPreviewTheme', $event)"
          dense
          filled
        />
      </setting-item>
      <setting-item
        :label="t('Code Theme')"
        :modified-in="state.mdCodeTheme.modifiedIn"
        @reset="$emit('reset', 'mdCodeTheme')"
      >
        <q-select
          :options="mdCodeThemes"
          :model-value="state.mdCodeTheme.value"
          @update:model-value="$emit('update', 'mdCodeTheme', $event)"
          dense
          filled
        />
      </setting-item>
      <setting-item
        :label="t('Disable mermaid diagrams')"
        :modified-in="state.mdNoMermaid.modifiedIn"
        @reset="$emit('reset', 'mdNoMermaid')"
      >
        <q-toggle
          :model-value="state.mdNoMermaid.value"
          @update:model-value="$emit('update', 'mdNoMermaid', $event)"
        />
      </setting-item>
      <setting-item
        :label="t('Code Auto Fold Threshold')"
        :caption="t('Automatically fold code blocks after the number of lines exceeds this number. Do not fold by default')"
        :modified-in="state.mdAutoFoldThreshold.modifiedIn"
        @reset="$emit('reset', 'mdAutoFoldThreshold')"
      >
        <a-input
          type="number"
          :model-value="state.mdAutoFoldThreshold.value"
          @update:model-value="$emit('update', 'mdAutoFoldThreshold', $event ? parseInt($event) : null)"
          dense
          filled
          class="w-120px"
          clearable
        />
      </setting-item>
    </q-expansion-item>
    <q-separator spaced />
    <q-item-label
      header
      id="actions"
    >
      {{ t('Actions') }}
    </q-item-label>
    <q-expansion-item
      :label="t('Keyboard shortcuts')"
      icon="sym_o_keyboard"
      :content-inset-level="1"
    >
      <setting-item
        :label="t('Send message')"
        :modified-in="state.sendMessageKey.modifiedIn"
        @reset="$emit('reset', 'sendMessageKey')"
      >
        <send-key-select
          :model-value="state.sendMessageKey.value"
          @update:model-value="$emit('update', 'sendMessageKey', $event)"
          dense
          filled
        />
      </setting-item>
      <setting-item
        :label="t('Translate')"
        :modified-in="state.translateKey.modifiedIn"
        @reset="$emit('reset', 'translateKey')"
      >
        <send-key-select
          :model-value="state.translateKey.value"
          @update:model-value="$emit('update', 'translateKey', $event)"
          dense
          filled
        />
      </setting-item>
      <setting-item
        :label="t('Navigation panel')"
        :modified-in="state.navigationPanelShortcut.modifiedIn"
        @reset="$emit('reset', 'navigationPanelShortcut')"
      >
        <shortcut-key-input
          :model-value="state.navigationPanelShortcut.value"
          @update:model-value="$emit('update', 'navigationPanelShortcut', $event)"
          dense
          filled
          class="min-w-100px"
        />
      </setting-item>
      <setting-item
        :label="t('Regenerate current message')"
        :modified-in="state.regenerateCurrKey.modifiedIn"
        @reset="$emit('reset', 'regenerateCurrKey')"
      >
        <shortcut-key-input
          :model-value="state.regenerateCurrKey.value"
          @update:model-value="$emit('update', 'regenerateCurrKey', $event)"
          dense
          filled
          class="min-w-100px"
        />
      </setting-item>
      <setting-item
        :label="t('Edit current message')"
        :modified-in="state.editCurrKey.modifiedIn"
        @reset="$emit('reset', 'editCurrKey')"
      >
        <shortcut-key-input
          :model-value="state.editCurrKey.value"
          @update:model-value="$emit('update', 'editCurrKey', $event)"
          dense
          filled
          class="min-w-100px"
        />
      </setting-item>
      <setting-item
        :label="t('Focus input')"
        :modified-in="state.focusInputKey.modifiedIn"
        @reset="$emit('reset', 'focusInputKey')"
      >
        <shortcut-key-input
          :model-value="state.focusInputKey.value"
          @update:model-value="$emit('update', 'focusInputKey', $event)"
          dense
          filled
          class="min-w-100px"
        />
      </setting-item>
      <setting-item
        :label="t('Scroll up')"
        :modified-in="state.scrollUpKey.modifiedIn"
        @reset="$emit('reset', 'scrollUpKey')"
      >
        <shortcut-key-input
          :model-value="state.scrollUpKey.value"
          @update:model-value="$emit('update', 'scrollUpKey', $event)"
          dense
          filled
          class="min-w-100px"
        />
      </setting-item>
      <setting-item
        :label="t('Scroll down')"
        :modified-in="state.scrollDownKey.modifiedIn"
        @reset="$emit('reset', 'scrollDownKey')"
      >
        <shortcut-key-input
          :model-value="state.scrollDownKey.value"
          @update:model-value="$emit('update', 'scrollDownKey', $event)"
          dense
          filled
          class="min-w-100px"
        />
      </setting-item>
      <setting-item
        :label="t('Scroll to top')"
        :modified-in="state.scrollTopKey.modifiedIn"
        @reset="$emit('reset', 'scrollTopKey')"
      >
        <shortcut-key-input
          :model-value="state.scrollTopKey.value"
          @update:model-value="$emit('update', 'scrollTopKey', $event)"
          dense
          filled
          class="min-w-100px"
        />
      </setting-item>
      <setting-item
        :label="t('Scroll to bottom')"
        :modified-in="state.scrollBottomKey.modifiedIn"
        @reset="$emit('reset', 'scrollBottomKey')"
      >
        <shortcut-key-input
          :model-value="state.scrollBottomKey.value"
          @update:model-value="$emit('update', 'scrollBottomKey', $event)"
          dense
          filled
          class="min-w-100px"
        />
      </setting-item>
    </q-expansion-item>
    <setting-item
      icon="sym_o_auto_awesome"
      :label="t('Auto expand reasoning content')"
      :caption="t('Automatically expand reasoning content when generating chat responses')"
      :modified-in="state.expandReasoningContent.modifiedIn"
      @reset="$emit('reset', 'expandReasoningContent')"
    >
      <q-toggle
        :model-value="state.expandReasoningContent.value"
        @update:model-value="$emit('update', 'expandReasoningContent', $event)"
      />
    </setting-item>
    <q-separator spaced />
    <q-item-label
      header
      id="features"
    >
      {{ t('Features') }}
    </q-item-label>
    <setting-item
      :label="t('Summarize chat title')"
      :caption="t('Automatically summarize the title at the end of the first round of conversation')"
      :modified-in="state.autoGenChatTitle.modifiedIn"
      @reset="$emit('reset', 'autoGenChatTitle')"
    >
      <q-toggle
        :model-value="state.autoGenChatTitle.value"
        @update:model-value="$emit('update', 'autoGenChatTitle', $event)"
      />
    </setting-item>
    <setting-item
      :label="t('Message selection menu')"
      :caption="t('Display the floating menu when message text is selected.')"
      :modified-in="state.messageSelectionMenu.modifiedIn"
      @reset="$emit('reset', 'messageSelectionMenu')"
    >
      <q-toggle
        :model-value="state.messageSelectionMenu.value"
        @update:model-value="$emit('update', 'messageSelectionMenu', $event)"
      />
    </setting-item>
    <setting-item
      :label="t('Chat scroll buttons')"
      :caption="t('Display quick scroll buttons in the right bottom corner of the chat.')"
      :modified-in="state.chatScrollBtns.modifiedIn"
      @reset="$emit('reset', 'chatScrollBtns')"
    >
      <q-toggle
        :model-value="state.chatScrollBtns.value"
        @update:model-value="$emit('update', 'chatScrollBtns', $event)"
      />
    </setting-item>
    <setting-item
      :label="t('Channel scroll buttons')"
      :caption="t('Display quick scroll buttons in the right bottom corner of the channel.')"
      :modified-in="state.channelScrollBtns.modifiedIn"
      @reset="$emit('reset', 'channelScrollBtns')"
    >
      <q-toggle
        :model-value="state.channelScrollBtns.value"
        @update:model-value="$emit('update', 'channelScrollBtns', $event)"
      />
    </setting-item>
    <setting-item
      :label="t('Auto lock bottom')"
      :caption="t('Automatically lock bottom when generating chat responses')"
      :modified-in="state.streamingLockBottom.modifiedIn"
      @reset="$emit('reset', 'streamingLockBottom')"
    >
      <q-toggle
        :model-value="state.streamingLockBottom.value"
        @update:model-value="$emit('update', 'streamingLockBottom', $event)"
      />
    </setting-item>
    <setting-item
      :label="t('Paste code optimization')"
      :caption="t('Automatically wrap the code copied from VSCode with markdown code blocks when pasting to chat')"
      :modified-in="state.codePasteOptimize.modifiedIn"
      @reset="$emit('reset', 'codePasteOptimize')"
    >
      <q-toggle
        :model-value="state.codePasteOptimize.value"
        @update:model-value="$emit('update', 'codePasteOptimize', $event)"
      />
    </setting-item>
    <q-separator spaced />
    <q-item-label
      header
      id="others"
    >
      {{ t('Others') }}
    </q-item-label>
    <common-item
      :label="t('Directory config')"
      :caption="directoryConfigCaption"
      :to="`/folder/${workspaceStore.id}`"
    >
      <q-icon name="sym_o_chevron_right" />
    </common-item>
    <common-item
      :label="t('Import data')"
      :caption="t('Currently, only importing from AIaW is supported.')"
      clickable
      @click="fileInput?.click()"
    >
      <q-icon name="sym_o_chevron_right" />
      <input
        type="file"
        accept=".json"
        hidden
        ref="fileInput"
        @change="importData"
      >
    </common-item>
  </q-list>
</template>

<script setup lang="ts">
import { t } from 'src/utils/i18n'
import type { Perfs } from 'src/stores/perfs'
import SettingItem from './SettingItem.vue'
import type { PerfsState } from 'src/composables/perfs-state'
import { useQuasar } from 'quasar'
import HueSliderDialog from './HueSliderDialog.vue'
import HctPreviewCircle from './HctPreviewCircle.vue'
import AInput from './AInput'
import SendKeySelect from './SendKeySelect.vue'
import ShortcutKeyInput from './ShortcutKeyInput.vue'
import CommonItem from './CommonItem.vue'
import { localData } from 'src/utils/local-data'
import { useWorkspaceStore } from 'src/stores/workspace'
import { useTemplateRef } from 'vue'
import { genId } from 'app/src-shared/utils/id'
import { mutate } from 'src/utils/zero-session'
import { mutators } from 'app/src-shared/mutators'
import { importAiaw } from 'src/services/import-aiaw'

const props = defineProps<{
  state: PerfsState<Perfs>
  scope: 'user' | 'workspace' | 'local'
}>()

const emit = defineEmits<{
  update: [key: keyof Perfs, value: any]
  reset: [key: keyof Perfs]
}>()

const $q = useQuasar()
function pickThemeHue() {
  $q.dialog({
    component: HueSliderDialog,
    componentProps: { value: props.state.themeHue.value },
  }).onOk(hue => { emit('update', 'themeHue', hue) })
}

const mdPreviewThemes = ['default', 'vuepress', 'github', 'mk-cute', 'smart-blue', 'cyanosis', 'arknights']
const mdCodeThemes = ['atom', 'ally', 'github', 'gradient', 'kimbie', 'paraiso', 'qtcreator', 'stackoverflow']

const localeOptions = [
  { label: t('Auto'), value: null },
  { label: 'English', value: 'en-US' },
  { label: '简体中文', value: 'zh-CN' },
  { label: '繁體中文', value: 'zh-TW' },
]

const directoryConfigCaption = t('Some settings apply at the directory level and are not displayed here. Right-click the directory in the right sidebar and click "Properties" to modify the configuration of that directory.')
const workspaceStore = useWorkspaceStore()

const fileInput = useTemplateRef('fileInput')
async function importData({ target }) {
  const files: File[] = Array.from(target.files)
  if (!files.length) return
  target.value = ''
  const folderId = genId()
  const notif = $q.notify({
    group: false,
    timeout: 0,
    spinner: true,
    message: t('Importing...'),
    caption: '0%',
  })
  await mutate(mutators.createFolder({
    id: folderId,
    parentId: workspaceStore.id!,
    name: t('AIaW Import'),
  })).client
  await importAiaw(files[0], folderId, progress => {
    notif({
      caption: `${(progress * 100).toFixed(1)}%`,
    })
  }).then(() => {
    notif({
      type: 'positive',
      icon: 'sym_o_done',
      spinner: false,
      message: t('Import successful'),
      caption: t('Imported to the workspace root'),
      timeout: 3000,
    })
  }).catch(err => {
    console.error(err)
    notif({
      type: 'negative',
      icon: 'sym_o_error',
      spinner: false,
      message: t('Import failed'),
      caption: err.message,
      timeout: 3000,
    })
  })
}
</script>
