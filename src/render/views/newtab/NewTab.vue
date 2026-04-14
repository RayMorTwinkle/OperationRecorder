<script setup lang="js">
import Counter from '@/components/Counter.vue'
</script>

<template>
  <div
    class="h-screen flex items-center justify-center from-indigo-500 via-purple-500 to-pink-500 bg-gradient-to-br dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900"
  >
    <n-card class="max-w-600px w-full shadow-2xl" :bordered="false">
      <template #header>
        <div class="text-center">
          <h1 class="m-0 text-3xl text-gray-800 font-bold dark:text-gray-100">NewTab 页面</h1>
        </div>
      </template>

      <div class="py-6">
        <Counter title="计数器示例" />
      </div>
    </n-card>
  </div>
</template>
