import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'virtual:uno.css'

import SidePanel from './SidePanel.vue'

const app = createApp(SidePanel)
app.use(createPinia())
app.mount('#app')
