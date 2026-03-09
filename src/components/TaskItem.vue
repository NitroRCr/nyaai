<template>
  <q-item :to="task.link">
    <q-item-section>
      <q-item-label>
        {{ task.title }}
      </q-item-label>
      <template v-if="task.status === 'running'">
        <q-item-label>
          <q-linear-progress
            :value="task.progress"
            :indeterminate="task.progress == null"
            my-1
          />
        </q-item-label>
        <q-item-label
          caption
          v-if="task.progressText"
        >
          {{ task.progressText }}
        </q-item-label>
      </template>
      <q-item-label
        caption
        v-if="task.status === 'completed'"
      >
        {{ t('Completed') }}
      </q-item-label>
      <q-item-label
        caption
        v-if="task.errorText"
        text-err
      >
        {{ task.errorText }}
      </q-item-label>
    </q-item-section>
    <q-item-section side>
      <q-btn
        v-if="task.status === 'running'"
        icon="sym_o_cancel"
        :title="t('Abort Task')"
        hover:text-err
        @click="task.abort"
        flat
        dense
        round
      />
      <q-btn
        v-else
        icon="sym_o_close"
        @click="tasks.splice(tasks.indexOf(task), 1)"
        flat
        dense
        round
      />
    </q-item-section>
  </q-item>
</template>
<script setup lang="ts">
import { t } from 'src/utils/i18n'
import { tasks, type Task } from 'src/utils/tasks'

defineProps<{
  task: Task
}>()
</script>
