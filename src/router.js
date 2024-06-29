import {createRouter, createWebHistory} from 'vue-router'

// Компоненты страниц
import RssFeed from './components/RssFeed.vue'

// Создание роутера с правильной базой
const router = createRouter({
    history: createWebHistory('/rss-feed/'), // Замените 'rickmorty' на название вашего репозитория
    routes: [
        {
            path: '/',
            name: 'Home',
            component: RssFeed,
        },
    ],
})

export default router