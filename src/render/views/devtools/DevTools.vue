<script setup lang="js">
import Counter from '@/components/Counter.vue'
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center from-slate-50 via-gray-50 to-zinc-50 bg-gradient-to-br p-6 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900"
  >
    <n-card class="max-w-600px w-full shadow-2xl" :bordered="false">
      <template #header>
        <div class="text-center">
          <h1 class="m-0 text-3xl text-gray-800 font-bold dark:text-gray-100">DevTools 页面</h1>
        </div>
      </template>

      <div class="py-6">
        <Counter title="计数器示例" />
      </div>
    </n-card>
  </div>
</template>
