import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export const BOOK_STATUS = {
  NORMAL: 'normal',
  ALL_BORROWED: 'allBorrowed',
  FORBIDDEN: 'forbidden'
}

export const COPY_STATUS = {
  AVAILABLE: 'available',
  LOST: 'lost',
  DAMAGED: 'damaged',
  BORROWED: 'borrowed',
  PENDING: 'pending'
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const BOOK_STATUS_VALUES = Object.values(BOOK_STATUS)
const COPY_STATUS_VALUES = Object.values(COPY_STATUS)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataFilePath = path.resolve(__dirname, 'data', 'library.json')

let libraryData = { books: [] }

export async function initLibrary() {
  libraryData = await readDataFile()
  if (!Array.isArray(libraryData.books)) {
    libraryData.books = []
  }

  libraryData.books.forEach((book) => {
    normalizeBook(book)
    recalculateBookState(book)
  })
}

export function listBooks() {
  return libraryData.books
}

export function findBookById(bookId) {
  return libraryData.books.find((book) => book.id === bookId)
}

export async function createBook(payload) {
  const name = (payload.name ?? '').toString().trim()
  if (!name) {
    throw new HttpError(400, '书籍名称不能为空')
  }

  const desiredId = payload.id ? payload.id.toString().trim() : ''
  const bookId = desiredId || generateBookId()
  if (libraryData.books.some((item) => item.id === bookId)) {
    throw new HttpError(400, '书籍编号已存在')
  }

  const book = {
    id: bookId,
    name,
    author: (payload.author ?? '').toString().trim(),
    publisher: (payload.publisher ?? '').toString().trim(),
    publishDate: (payload.publishDate ?? '').toString().trim(),
    price: toNumber(payload.price),
    pages: toNumber(payload.pages),
    isbn: (payload.isbn ?? '').toString().trim(),
    entryDate: (payload.entryDate ?? '').toString().trim(),
    borrowCount: toNumber(payload.borrowCount),
    status: normalizeBookStatus(payload.status),
    copies: []
  }

  if (Array.isArray(payload.copies) && payload.copies.length) {
    book.copies = payload.copies.map((copy) => normalizeCopy(copy))
  }

  recalculateBookState(book)
  libraryData.books.unshift(book)
  await persist()
  return book
}

export async function updateBookById(originalId, payload) {
  const book = ensureBook(originalId)

  if (payload.id !== undefined) {
    const newId = payload.id.toString().trim()
    if (!newId) {
      throw new HttpError(400, '书籍编号不能为空')
    }
    if (newId !== originalId && libraryData.books.some((item) => item.id === newId)) {
      throw new HttpError(400, '新的书籍编号已存在')
    }
    book.id = newId
  }

  if (payload.name !== undefined) {
    const value = payload.name.toString().trim()
    if (!value) {
      throw new HttpError(400, '书籍名称不能为空')
    }
    book.name = value
  }

  if (payload.author !== undefined) {
    book.author = payload.author.toString().trim()
  }

  if (payload.publisher !== undefined) {
    book.publisher = payload.publisher.toString().trim()
  }

  if (payload.publishDate !== undefined) {
    book.publishDate = payload.publishDate.toString().trim()
  }

  if (payload.price !== undefined) {
    book.price = toNumber(payload.price)
  }

  if (payload.pages !== undefined) {
    book.pages = toNumber(payload.pages)
  }

  if (payload.isbn !== undefined) {
    book.isbn = payload.isbn.toString().trim()
  }

  if (payload.entryDate !== undefined) {
    book.entryDate = payload.entryDate.toString().trim()
  }

  if (payload.borrowCount !== undefined) {
    book.borrowCount = toNumber(payload.borrowCount)
  }

  if (payload.status !== undefined) {
    book.status = normalizeBookStatus(payload.status)
  }

  recalculateBookState(book)
  await persist()
  return book
}

export async function removeBookById(bookId) {
  const index = libraryData.books.findIndex((book) => book.id === bookId)
  if (index === -1) {
    throw new HttpError(404, '未找到对应的书籍')
  }
  libraryData.books.splice(index, 1)
  await persist()
}

export async function addCopyToBook(bookId, payload) {
  const book = ensureBook(bookId)
  const copyId = payload.id ? payload.id.toString().trim() : generateCopyId(book)
  if (!copyId) {
    throw new HttpError(400, '副本编号不能为空')
  }
  if (book.copies.some((item) => item.id === copyId)) {
    throw new HttpError(400, '副本编号已存在')
  }

  const copy = normalizeCopy({
    ...payload,
    id: copyId
  })

  book.copies.unshift(copy)
  recalculateBookState(book)
  await persist()
  return book
}

export async function updateCopyOfBook(bookId, copyId, payload) {
  const book = ensureBook(bookId)
  const copy = ensureCopy(book, copyId)

  if (payload.id !== undefined) {
    const newId = payload.id.toString().trim()
    if (!newId) {
      throw new HttpError(400, '副本编号不能为空')
    }
    if (newId !== copyId && book.copies.some((item) => item.id === newId)) {
      throw new HttpError(400, '新的副本编号已存在')
    }
    copy.id = newId
  }

  if (payload.location !== undefined) {
    copy.location = payload.location.toString().trim()
  }

  if (payload.status !== undefined) {
    copy.status = normalizeCopyStatus(payload.status)
  }

  if (payload.borrowCount !== undefined) {
    copy.borrowCount = toNumber(payload.borrowCount)
  }

  if (payload.borrowRecords !== undefined && Array.isArray(payload.borrowRecords)) {
    copy.borrowRecords = payload.borrowRecords.map((record) => normalizeBorrowRecord(record))
  }

  recalculateBookState(book)
  await persist()
  return book
}

export async function removeCopyFromBook(bookId, copyId) {
  const book = ensureBook(bookId)
  const index = book.copies.findIndex((item) => item.id === copyId)
  if (index === -1) {
    throw new HttpError(404, '未找到对应的副本')
  }

  book.copies.splice(index, 1)
  recalculateBookState(book)
  await persist()
  return book
}

export async function borrowCopyFromBook(bookId, copyId, payload) {
  const book = ensureBook(bookId)
  const copy = ensureCopy(book, copyId)

  if (copy.status === COPY_STATUS.BORROWED) {
    throw new HttpError(400, '该副本已被借出')
  }

  const borrower = (payload.borrower ?? '').toString().trim()
  if (!borrower) {
    throw new HttpError(400, '借阅人不能为空')
  }

  const borrowTime = (payload.borrowTime ?? '').toString().trim() || formatDateTime(new Date())

  copy.status = COPY_STATUS.BORROWED
  copy.borrowCount = toNumber(copy.borrowCount) + 1
  copy.borrowRecords.push({
    borrower,
    borrowTime,
    returnTime: ''
  })
  book.borrowCount = toNumber(book.borrowCount) + 1

  recalculateBookState(book)
  await persist()
  return book
}

export async function returnCopyToBook(bookId, copyId, payload = {}) {
  const book = ensureBook(bookId)
  const copy = ensureCopy(book, copyId)

  if (copy.status !== COPY_STATUS.BORROWED) {
    throw new HttpError(400, '该副本未处于借出状态')
  }

  const returnTime = (payload.returnTime ?? '').toString().trim() || formatDateTime(new Date())

  copy.status = COPY_STATUS.AVAILABLE
  const record = findLatestBorrowRecord(copy)
  if (record) {
    record.returnTime = returnTime
  }

  recalculateBookState(book)
  await persist()
  return book
}

export async function archiveCopyOfBook(bookId, copyId) {
  const book = ensureBook(bookId)
  const copy = ensureCopy(book, copyId)

  copy.status = COPY_STATUS.AVAILABLE
  recalculateBookState(book)
  await persist()
  return book
}

function ensureBook(bookId) {
  const book = findBookById(bookId)
  if (!book) {
    throw new HttpError(404, '未找到对应的书籍')
  }
  return book
}

function ensureCopy(book, copyId) {
  const copy = book.copies.find((item) => item.id === copyId)
  if (!copy) {
    throw new HttpError(404, '未找到对应的副本')
  }
  return copy
}

function normalizeBook(book) {
  book.name = (book.name ?? '').toString().trim()
  book.author = (book.author ?? '').toString().trim()
  book.publisher = (book.publisher ?? '').toString().trim()
  book.publishDate = (book.publishDate ?? '').toString().trim()
  book.price = toNumber(book.price)
  book.pages = toNumber(book.pages)
  book.isbn = (book.isbn ?? '').toString().trim()
  book.entryDate = (book.entryDate ?? '').toString().trim()
  book.borrowCount = toNumber(book.borrowCount)
  book.status = normalizeBookStatus(book.status)
  book.copies = Array.isArray(book.copies) ? book.copies.map((copy) => normalizeCopy(copy)) : []
  book.quantity = book.copies.length
}

function normalizeCopy(copy) {
  return {
    id: (copy.id ?? '').toString().trim(),
    location: (copy.location ?? '').toString().trim(),
    status: normalizeCopyStatus(copy.status),
    borrowCount: toNumber(copy.borrowCount),
    borrowRecords: Array.isArray(copy.borrowRecords)
      ? copy.borrowRecords.map((record) => normalizeBorrowRecord(record))
      : []
  }
}

function normalizeBorrowRecord(record) {
  return {
    borrower: (record?.borrower ?? '').toString().trim(),
    borrowTime: (record?.borrowTime ?? '').toString().trim(),
    returnTime: (record?.returnTime ?? '').toString().trim()
  }
}

function normalizeBookStatus(status) {
  if (!status) {
    return BOOK_STATUS.NORMAL
  }
  const value = status.toString().trim()
  if (!BOOK_STATUS_VALUES.includes(value)) {
    throw new HttpError(400, '无效的书籍状态')
  }
  return value
}

function normalizeCopyStatus(status) {
  if (!status) {
    return COPY_STATUS.PENDING
  }
  const value = status.toString().trim()
  if (!COPY_STATUS_VALUES.includes(value)) {
    throw new HttpError(400, '无效的副本状态')
  }
  return value
}

function recalculateBookState(book) {
  book.quantity = book.copies.length

  if (book.status === BOOK_STATUS.FORBIDDEN) {
    return
  }

  const hasAvailable = book.copies.some((copy) => copy.status === COPY_STATUS.AVAILABLE || copy.status === COPY_STATUS.PENDING)
  const hasCopies = book.copies.length > 0
  const allBorrowed = hasCopies && book.copies.every((copy) => copy.status === COPY_STATUS.BORROWED)

  if (allBorrowed) {
    book.status = BOOK_STATUS.ALL_BORROWED
  } else if (hasAvailable || !hasCopies) {
    book.status = BOOK_STATUS.NORMAL
  }
}

function findLatestBorrowRecord(copy) {
  for (let i = copy.borrowRecords.length - 1; i >= 0; i -= 1) {
    if (!copy.borrowRecords[i].returnTime) {
      return copy.borrowRecords[i]
    }
  }
  return null
}

function generateBookId() {
  return `B${Date.now()}`
}

function generateCopyId(book) {
  const prefix = `${book.id}-`
  const numericSuffixes = book.copies
    .map((copy) => copy.id)
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((value) => Number.isFinite(value))

  const next = (numericSuffixes.length ? Math.max(...numericSuffixes) + 1 : 1)
  return `${prefix}${String(next).padStart(2, '0')}`
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

async function persist() {
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true })
  await fs.writeFile(dataFilePath, JSON.stringify(libraryData, null, 2), 'utf-8')
}

async function readDataFile() {
  try {
    const content = await fs.readFile(dataFilePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(path.dirname(dataFilePath), { recursive: true })
      const initialData = { books: [] }
      await fs.writeFile(dataFilePath, JSON.stringify(initialData, null, 2), 'utf-8')
      return initialData
    }
    throw error
  }
}

export function formatDateTimeForNow() {
  return formatDateTime(new Date())
}
