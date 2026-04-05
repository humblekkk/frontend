import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import { installDemoMode } from '@/mock/installDemoMode'

const app = createApp(App)

installDemoMode()

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
