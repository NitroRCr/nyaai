<template>
  <router-view />
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router'

const router = useRouter()
router.afterEach(to => {
  if (to.meta.title) {
    document.title = `${to.meta.title as string} - Nya AI`
  }
})
</script>
