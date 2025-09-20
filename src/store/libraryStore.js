import { reactive } from 'vue'
import axios from 'axios'

export const BOOK_STATUS = {
  NORMAL: 'normal',
  ALL_BORROWED: 'allBorrowed',
  FORBIDDEN: 'forbidden'
}

export const BOOK_STATUS_TEXT = {
  [BOOK_STATUS.NORMAL]: '正常',
  [BOOK_STATUS.ALL_BORROWED]: '全部借出',
  [BOOK_STATUS.FORBIDDEN]: '禁止借出'
}

export const COPY_STATUS = {
  AVAILABLE: 'available',
  LOST: 'lost',
  DAMAGED: 'damaged',
  BORROWED: 'borrowed',
  PENDING: 'pending'
}

export const COPY_STATUS_TEXT = {
  [COPY_STATUS.AVAILABLE]: '在库',
  [COPY_STATUS.LOST]: '丢失',
  [COPY_STATUS.DAMAGED]: '损坏',
  [COPY_STATUS.BORROWED]: '借出',
  [COPY_STATUS.PENDING]: '未归档'
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
})

export const libraryStore = reactive({
  books: [],
  loading: false,
  error: null,
  initialized: false
})

function setError(message) {
  libraryStore.error = message
}

function clearError() {
  libraryStore.error = null
}

function getErrorMessage(error, fallback = '请求失败') {
  return error?.response?.data?.message || error?.message || fallback
}

export async function fetchBooks() {
  libraryStore.loading = true
  try {
    const { data } = await apiClient.get('/books')
    libraryStore.books = data
    libraryStore.initialized = true
    clearError()
    return data
  } catch (error) {
    const message = getErrorMessage(error, '获取书籍数据失败')
    setError(message)
    throw error
  } finally {
    libraryStore.loading = false
  }
}

export async function ensureBooksLoaded() {
  if (!libraryStore.initialized) {
    await fetchBooks()
  }
}

export function getBookById(id) {
  return libraryStore.books.find((book) => book.id === id)
}

function replaceBook(originalId, updatedBook) {
  if (!updatedBook) return

  const originalIndex = originalId
    ? libraryStore.books.findIndex((item) => item.id === originalId)
    : -1

  if (originalIndex !== -1) {
    libraryStore.books[originalIndex] = updatedBook
    return
  }

  const currentIndex = libraryStore.books.findIndex((item) => item.id === updatedBook.id)
  if (currentIndex !== -1) {
    libraryStore.books[currentIndex] = updatedBook
    return
  }

  libraryStore.books.unshift(updatedBook)
}

export async function addBook(payload) {
  const { data } = await apiClient.post('/books', payload)
  libraryStore.books.unshift(data)
  return data
}

export async function updateBook(bookId, payload) {
  const { data } = await apiClient.put(`/books/${encodeURIComponent(bookId)}`, payload)
  replaceBook(bookId, data)
  return data
}

export async function removeBook(bookId) {
  await apiClient.delete(`/books/${encodeURIComponent(bookId)}`)
  const index = libraryStore.books.findIndex((book) => book.id === bookId)
  if (index !== -1) {
    libraryStore.books.splice(index, 1)
  }
}

function updateBookFromResponse(bookId, responseBook) {
  replaceBook(bookId, responseBook)
  return responseBook
}

export async function addCopy(bookId, payload) {
  const { data } = await apiClient.post(`/books/${encodeURIComponent(bookId)}/copies`, payload)
  return updateBookFromResponse(bookId, data)
}

export async function updateCopy(bookId, copyId, payload) {
  const { data } = await apiClient.put(
    `/books/${encodeURIComponent(bookId)}/copies/${encodeURIComponent(copyId)}`,
    payload
  )
  return updateBookFromResponse(bookId, data)
}

export async function removeCopy(bookId, copyId) {
  const { data } = await apiClient.delete(
    `/books/${encodeURIComponent(bookId)}/copies/${encodeURIComponent(copyId)}`
  )
  return updateBookFromResponse(bookId, data)
}

export async function borrowCopy(bookId, copyId, payload) {
  const { data } = await apiClient.post(
    `/books/${encodeURIComponent(bookId)}/copies/${encodeURIComponent(copyId)}/borrow`,
    payload
  )
  return updateBookFromResponse(bookId, data)
}

export async function returnCopy(bookId, copyId, payload) {
  const { data } = await apiClient.post(
    `/books/${encodeURIComponent(bookId)}/copies/${encodeURIComponent(copyId)}/return`,
    payload
  )
  return updateBookFromResponse(bookId, data)
}

export async function archiveCopy(bookId, copyId) {
  const { data } = await apiClient.post(
    `/books/${encodeURIComponent(bookId)}/copies/${encodeURIComponent(copyId)}/archive`
  )
  return updateBookFromResponse(bookId, data)
}

export function resolveApiError(error, fallback = '操作失败') {
  return getErrorMessage(error, fallback)
}
