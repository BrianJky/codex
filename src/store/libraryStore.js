import { reactive } from 'vue'

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

const now = new Date()
const formatDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = formatDate(now)

export const libraryStore = reactive({
  books: [
    {
      id: 'B2023-001',
      name: 'Vue 3 实战指南',
      author: '张伟',
      publisher: '电子工业出版社',
      publishDate: '2023-04-02',
      price: 88,
      pages: 432,
      isbn: '9787121428854',
      quantity: 3,
      entryDate: '2023-04-16',
      borrowCount: 26,
      status: BOOK_STATUS.NORMAL,
      copies: [
        {
          id: 'B2023-001-01',
          location: '一楼 A 区 01 架',
          status: COPY_STATUS.AVAILABLE,
          borrowCount: 12,
          borrowRecords: [
            {
              borrower: '李雷',
              borrowTime: '2023-05-01 10:00',
              returnTime: '2023-05-21 14:30'
            },
            {
              borrower: '韩梅梅',
              borrowTime: '2023-07-18 09:30',
              returnTime: '2023-08-02 16:20'
            }
          ]
        },
        {
          id: 'B2023-001-02',
          location: '一楼 A 区 01 架',
          status: COPY_STATUS.BORROWED,
          borrowCount: 9,
          borrowRecords: [
            {
              borrower: '王芳',
              borrowTime: '2023-09-06 11:10',
              returnTime: '2023-09-28 18:40'
            },
            {
              borrower: '陈强',
              borrowTime: '2023-10-12 15:25',
              returnTime: ''
            }
          ]
        },
        {
          id: 'B2023-001-03',
          location: '一楼 A 区 02 架',
          status: COPY_STATUS.PENDING,
          borrowCount: 5,
          borrowRecords: []
        }
      ]
    },
    {
      id: 'B2022-035',
      name: '数据库系统概念',
      author: 'Abraham Silberschatz',
      publisher: '机械工业出版社',
      publishDate: '2021-12-10',
      price: 128,
      pages: 900,
      isbn: '9787111658596',
      quantity: 2,
      entryDate: '2022-01-05',
      borrowCount: 48,
      status: BOOK_STATUS.ALL_BORROWED,
      copies: [
        {
          id: 'B2022-035-01',
          location: '二楼 B 区 11 架',
          status: COPY_STATUS.BORROWED,
          borrowCount: 25,
          borrowRecords: [
            {
              borrower: '赵云',
              borrowTime: '2023-08-15 13:15',
              returnTime: ''
            }
          ]
        },
        {
          id: 'B2022-035-02',
          location: '二楼 B 区 11 架',
          status: COPY_STATUS.DAMAGED,
          borrowCount: 23,
          borrowRecords: [
            {
              borrower: '刘备',
              borrowTime: '2023-05-10 10:05',
              returnTime: '2023-05-30 09:50'
            }
          ]
        }
      ]
    },
    {
      id: 'B2021-120',
      name: 'Python 编程：从入门到实践',
      author: '埃里克·马瑟斯',
      publisher: '人民邮电出版社',
      publishDate: '2020-06-01',
      price: 89,
      pages: 632,
      isbn: '9787115533073',
      quantity: 1,
      entryDate: '2021-03-20',
      borrowCount: 54,
      status: BOOK_STATUS.FORBIDDEN,
      copies: [
        {
          id: 'B2021-120-01',
          location: '二楼 C 区 03 架',
          status: COPY_STATUS.LOST,
          borrowCount: 54,
          borrowRecords: [
            {
              borrower: '周瑜',
              borrowTime: '2022-11-01 09:00',
              returnTime: ''
            }
          ]
        }
      ]
    }
  ]
})

export function getBooks() {
  return libraryStore.books
}

export function getBookById(id) {
  return libraryStore.books.find((book) => book.id === id)
}

export function addBook(book) {
  libraryStore.books.unshift({
    ...book,
    id: book.id || `B${Date.now()}`,
    quantity: book.copies?.length ?? book.quantity ?? 0,
    copies: book.copies ?? []
  })
}

export function updateBook(bookId, payload) {
  const target = getBookById(bookId)
  if (!target) return
  Object.assign(target, payload)
  target.quantity = target.copies.length
}

export function removeBook(bookId) {
  const index = libraryStore.books.findIndex((item) => item.id === bookId)
  if (index !== -1) {
    libraryStore.books.splice(index, 1)
  }
}

export function addCopy(bookId, copy) {
  const book = getBookById(bookId)
  if (!book) return
  book.copies.unshift({
    borrowCount: 0,
    borrowRecords: [],
    ...copy
  })
  book.quantity = book.copies.length
  updateBookBorrowStatus(book)
}

export function updateCopy(bookId, copyId, payload) {
  const book = getBookById(bookId)
  if (!book) return
  const copy = book.copies.find((item) => item.id === copyId)
  if (!copy) return
  Object.assign(copy, payload)
  updateBookBorrowStatus(book)
}

export function removeCopy(bookId, copyId) {
  const book = getBookById(bookId)
  if (!book) return
  const index = book.copies.findIndex((item) => item.id === copyId)
  if (index !== -1) {
    book.copies.splice(index, 1)
    book.quantity = book.copies.length
    updateBookBorrowStatus(book)
  }
}

export function borrowCopy(bookId, copyId, record) {
  const book = getBookById(bookId)
  if (!book) return
  const copy = book.copies.find((item) => item.id === copyId)
  if (!copy) return
  copy.status = COPY_STATUS.BORROWED
  copy.borrowCount += 1
  copy.borrowRecords.push({ ...record, returnTime: '' })
  book.borrowCount += 1
  updateBookBorrowStatus(book)
}

export function returnCopy(bookId, copyId, returnTime = `${today} 10:00`) {
  const book = getBookById(bookId)
  if (!book) return
  const copy = book.copies.find((item) => item.id === copyId)
  if (!copy) return
  copy.status = COPY_STATUS.AVAILABLE
  const latestRecord = [...copy.borrowRecords].reverse().find((item) => !item.returnTime)
  if (latestRecord) {
    latestRecord.returnTime = returnTime
  }
  updateBookBorrowStatus(book)
}

export function archiveCopy(bookId, copyId) {
  const book = getBookById(bookId)
  if (!book) return
  const copy = book.copies.find((item) => item.id === copyId)
  if (!copy) return
  copy.status = COPY_STATUS.AVAILABLE
  updateBookBorrowStatus(book)
}

export function updateBookBorrowStatus(book) {
  const hasAvailable = book.copies.some((copy) => copy.status === COPY_STATUS.AVAILABLE || copy.status === COPY_STATUS.PENDING)
  const allBorrowed = book.copies.every((copy) => copy.status === COPY_STATUS.BORROWED)
  if (book.status !== BOOK_STATUS.FORBIDDEN) {
    if (allBorrowed) {
      book.status = BOOK_STATUS.ALL_BORROWED
    } else if (hasAvailable) {
      book.status = BOOK_STATUS.NORMAL
    }
  }
}

export function resetBookQuantities() {
  libraryStore.books.forEach((book) => {
    book.quantity = book.copies.length
  })
}
