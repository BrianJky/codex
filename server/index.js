import express from 'express'
import cors from 'cors'
import {
  initLibrary,
  listBooks,
  findBookById,
  createBook,
  updateBookById,
  removeBookById,
  addCopyToBook,
  updateCopyOfBook,
  removeCopyFromBook,
  borrowCopyFromBook,
  returnCopyToBook,
  archiveCopyOfBook,
  HttpError
} from './libraryService.js'

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use(cors())
app.use(express.json())

await initLibrary()

app.get('/api/books', (req, res) => {
  res.json(listBooks())
})

app.get('/api/books/:id', (req, res) => {
  const book = findBookById(req.params.id)
  if (!book) {
    res.status(404).json({ message: '未找到对应的书籍' })
    return
  }
  res.json(book)
})

app.post('/api/books', async (req, res) => {
  try {
    const book = await createBook(req.body ?? {})
    res.status(201).json(book)
  } catch (error) {
    handleError(res, error)
  }
})

app.put('/api/books/:id', async (req, res) => {
  try {
    const book = await updateBookById(req.params.id, req.body ?? {})
    res.json(book)
  } catch (error) {
    handleError(res, error)
  }
})

app.delete('/api/books/:id', async (req, res) => {
  try {
    await removeBookById(req.params.id)
    res.status(204).end()
  } catch (error) {
    handleError(res, error)
  }
})

app.post('/api/books/:id/copies', async (req, res) => {
  try {
    const book = await addCopyToBook(req.params.id, req.body ?? {})
    res.status(201).json(book)
  } catch (error) {
    handleError(res, error)
  }
})

app.put('/api/books/:bookId/copies/:copyId', async (req, res) => {
  try {
    const book = await updateCopyOfBook(req.params.bookId, req.params.copyId, req.body ?? {})
    res.json(book)
  } catch (error) {
    handleError(res, error)
  }
})

app.delete('/api/books/:bookId/copies/:copyId', async (req, res) => {
  try {
    const book = await removeCopyFromBook(req.params.bookId, req.params.copyId)
    res.json(book)
  } catch (error) {
    handleError(res, error)
  }
})

app.post('/api/books/:bookId/copies/:copyId/borrow', async (req, res) => {
  try {
    const book = await borrowCopyFromBook(req.params.bookId, req.params.copyId, req.body ?? {})
    res.json(book)
  } catch (error) {
    handleError(res, error)
  }
})

app.post('/api/books/:bookId/copies/:copyId/return', async (req, res) => {
  try {
    const book = await returnCopyToBook(req.params.bookId, req.params.copyId, req.body ?? {})
    res.json(book)
  } catch (error) {
    handleError(res, error)
  }
})

app.post('/api/books/:bookId/copies/:copyId/archive', async (req, res) => {
  try {
    const book = await archiveCopyOfBook(req.params.bookId, req.params.copyId)
    res.json(book)
  } catch (error) {
    handleError(res, error)
  }
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Library API server is running at http://localhost:${PORT}`)
})

function handleError(res, error) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message })
    return
  }

  // eslint-disable-next-line no-console
  console.error(error)
  res.status(500).json({ message: '服务器内部错误' })
}
