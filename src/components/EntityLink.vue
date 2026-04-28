<template>
  <router-link
    v-if="entity"
    :to="entityRoute(entity.type, entity.id)"
    important:text-on-sur
    important:transition="background-color 250"
    hover:bg-sur-dim
    pr-6px
    mr-1
    rd
    inline-block
  >
    <a-avatar
      :avatar="entityAvatar(entity)"
      text-1.6em
      align-bottom
    />
    <span decoration="underline out-var offset-2">{{ entityName(entity) }}</span>
  </router-link>
</template>

<script setup lang="ts">
import AAvatar from 'src/components/AAvatar.vue'
import { entityAvatar, entityName } from 'src/utils/defaults'
import { entityRoute } from 'src/utils/functions'
import { useQuery } from 'src/composables/zero/query'
import { queries } from 'app/src-shared/queries'
import { nextTick, watch } from 'vue'

const props = defineProps<{
  id: string
}>()

const emit = defineEmits<{
  updateAttrs: [attrs: Record<string, any>]
  deleteNode: []
}>()

const { data: entity } = useQuery(() => queries.entity({ id: props.id }), {
  onNotFound() {
    emit('deleteNode')
  },
})

watch(() => entity.value?.name, () => {
  nextTick(() => {
    if (!entity.value) return
    emit('updateAttrs', {
      text: entityName(entity.value),
      href: `${location.origin}/${entity.value.type}/${entity.value.id}`,
    })
  })
}, { immediate: true })
</script>
