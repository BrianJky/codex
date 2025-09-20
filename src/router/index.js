import { createRouter, createWebHashHistory } from 'vue-router'
import BookList from '../views/BookList.vue'
import CopyDetails from '../views/CopyDetails.vue'

const routes = [
  {
    path: '/',
    name: 'books',
    component: BookList
  },
  {
    path: '/books/:id/copies',
    name: 'book-copies',
    component: CopyDetails,
    props: true
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
