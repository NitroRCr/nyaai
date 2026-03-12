<template>
  <slot
    v-if="data"
    :data
  />
  <hint-card
    v-else-if="status === 'error'"
    img-url="/emotions/nachoneko/13.webp"
    :message="t('Error occurred when loading...')"
  />
</template>

<script setup lang="ts" generic="T">
import { t } from 'src/utils/i18n'
import HintCard from './HintCard.vue'
import type { ResultType } from '@rocicorp/zero'
import type { Ref } from 'vue'
import { inject, watchEffect } from 'vue'
import type { LayoutPosition } from 'src/utils/types'
import { useRouter } from 'vue-router'

const props = defineProps<{
  data: T
  status: ResultType
}>()

const position = inject<Ref<LayoutPosition>>('position')!
const router = useRouter()
watchEffect(() => {
  if (props.status === 'complete' && !props.data) {
    if (position.value === 'right') {
      router.replace({ query: {} })
    } else {
      router.replace('/')
    }
  }
})
</script>
