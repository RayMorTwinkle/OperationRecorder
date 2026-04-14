import { createApp } from 'vue'
import 'virtual:uno.css'

import App from './DevTools.vue'

chrome.devtools.panels.create(
  '插件的测试页',
  'img/logo-48.png',
  'src/render/views/devtools/devtools.html',
  function () {
    console.log('devtools panel create')
  },
)

createApp(App).mount('#app')
