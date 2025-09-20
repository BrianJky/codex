<template>
  <div class="app-container">
    <div class="page-header">
      <div>
        <h2>书籍管理</h2>
        <p class="page-subtitle">维护图书信息、状态与副本数据</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新增书籍</el-button>
    </div>

    <el-alert
      v-if="errorMessage"
      type="error"
      :closable="false"
      show-icon
      class="page-alert"
      :title="errorMessage"
    />

    <el-table :data="books" border stripe style="width: 100%" height="100%" v-loading="loading">
      <el-table-column prop="id" label="编号" width="140" fixed="left" />
      <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip />
      <el-table-column prop="author" label="作者" min-width="140" show-overflow-tooltip />
      <el-table-column prop="publisher" label="出版社" min-width="180" show-overflow-tooltip />
      <el-table-column prop="publishDate" label="出版时间" width="120" />
      <el-table-column prop="price" label="价格" width="90">
        <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="pages" label="页数" width="80" />
      <el-table-column prop="isbn" label="ISBN" width="150" show-overflow-tooltip />
      <el-table-column prop="quantity" label="数量" width="80" />
      <el-table-column prop="entryDate" label="入库时间" width="120" />
      <el-table-column prop="borrowCount" label="借阅次数" width="100" />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)">{{ BOOK_STATUS_TEXT[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" width="320">
        <template #default="{ row }">
          <div class="table-operations">
            <el-button link type="primary" size="small" @click="openEditDialog(row)">修改</el-button>
            <el-button
              v-if="row.status !== BOOK_STATUS.FORBIDDEN"
              link
              type="warning"
              size="small"
              @click="setForbidden(row)"
            >禁止借阅</el-button>
            <el-button
              v-else
              link
              type="success"
              size="small"
              @click="restoreBook(row)"
            >恢复借阅</el-button>
            <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
            <el-button link type="info" size="small" @click="viewCopies(row)">副本详情</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="640px" destroy-on-close>
      <el-form :model="bookForm" label-width="120px" class="book-form" size="default">
        <el-form-item label="书籍编号">
          <el-input v-model="bookForm.id" placeholder="自动生成可留空" clearable />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="bookForm.name" placeholder="请输入书名" />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="bookForm.author" placeholder="请输入作者" />
        </el-form-item>
        <el-form-item label="出版社">
          <el-input v-model="bookForm.publisher" placeholder="请输入出版社" />
        </el-form-item>
        <el-form-item label="出版时间">
          <el-date-picker v-model="bookForm.publishDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model="bookForm.price" :min="0" :step="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="页数">
          <el-input-number v-model="bookForm.pages" :min="0" :step="10" controls-position="right" />
        </el-form-item>
        <el-form-item label="ISBN">
          <el-input v-model="bookForm.isbn" placeholder="请输入 ISBN" />
        </el-form-item>
        <el-form-item label="入库时间">
          <el-date-picker v-model="bookForm.entryDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
        </el-form-item>
        <el-form-item label="借阅次数">
          <el-input-number v-model="bookForm.borrowCount" :min="0" :step="1" controls-position="right" disabled />
        </el-form-item>
        <el-form-item label="副本数量">
          <el-input-number v-model="bookForm.quantity" :min="0" :step="1" controls-position="right" disabled />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="bookForm.status" placeholder="请选择">
            <el-option v-for="item in bookStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  libraryStore,
  BOOK_STATUS,
  BOOK_STATUS_TEXT,
  addBook,
  updateBook,
  removeBook,
  fetchBooks,
  resolveApiError
} from '../store/libraryStore'

const router = useRouter()
const books = computed(() => libraryStore.books)
const loading = computed(() => libraryStore.loading)
const errorMessage = computed(() => libraryStore.error)

const dialogVisible = ref(false)
const dialogMode = ref('create')
const dialogTitle = computed(() => (dialogMode.value === 'create' ? '新增书籍' : '编辑书籍'))
const currentBookId = ref('')

const bookStatusOptions = [
  { label: BOOK_STATUS_TEXT[BOOK_STATUS.NORMAL], value: BOOK_STATUS.NORMAL },
  { label: BOOK_STATUS_TEXT[BOOK_STATUS.ALL_BORROWED], value: BOOK_STATUS.ALL_BORROWED },
  { label: BOOK_STATUS_TEXT[BOOK_STATUS.FORBIDDEN], value: BOOK_STATUS.FORBIDDEN }
]

const createEmptyForm = () => ({
  id: '',
  name: '',
  author: '',
  publisher: '',
  publishDate: '',
  price: 0,
  pages: 0,
  isbn: '',
  quantity: 0,
  entryDate: '',
  borrowCount: 0,
  status: BOOK_STATUS.NORMAL
})

const bookForm = reactive(createEmptyForm())

const handleRequestError = (error, fallback) => {
  ElMessage.error(resolveApiError(error, fallback))
}

onMounted(() => {
  fetchBooks().catch((error) => {
    handleRequestError(error, '加载书籍数据失败')
  })
})

const statusTagType = (status) => {
  if (status === BOOK_STATUS.NORMAL) return 'success'
  if (status === BOOK_STATUS.ALL_BORROWED) return 'warning'
  if (status === BOOK_STATUS.FORBIDDEN) return 'danger'
  return 'info'
}

const openCreateDialog = () => {
  dialogMode.value = 'create'
  Object.assign(bookForm, createEmptyForm())
  dialogVisible.value = true
}

const openEditDialog = (book) => {
  dialogMode.value = 'edit'
  currentBookId.value = book.id
  Object.assign(bookForm, {
    id: book.id,
    name: book.name,
    author: book.author,
    publisher: book.publisher,
    publishDate: book.publishDate,
    price: book.price,
    pages: book.pages,
    isbn: book.isbn,
    quantity: book.copies.length,
    entryDate: book.entryDate,
    borrowCount: book.borrowCount,
    status: book.status
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!bookForm.name) {
    ElMessage.warning('请填写书籍名称')
    return
  }

  const payload = {
    id: bookForm.id,
    name: bookForm.name,
    author: bookForm.author,
    publisher: bookForm.publisher,
    publishDate: bookForm.publishDate,
    price: Number(bookForm.price) || 0,
    pages: Number(bookForm.pages) || 0,
    isbn: bookForm.isbn,
    entryDate: bookForm.entryDate,
    borrowCount: Number(bookForm.borrowCount) || 0,
    status: bookForm.status
  }

  try {
    if (dialogMode.value === 'create') {
      await addBook({
        ...payload,
        quantity: 0,
        borrowCount: 0,
        status: payload.status,
        copies: []
      })
      ElMessage.success('新增书籍成功')
    } else {
      const updated = await updateBook(currentBookId.value, payload)
      currentBookId.value = updated.id
      ElMessage.success('书籍信息已更新')
    }
    dialogVisible.value = false
  } catch (error) {
    handleRequestError(error, '保存书籍失败')
  }
}

const setForbidden = async (book) => {
  try {
    await updateBook(book.id, { status: BOOK_STATUS.FORBIDDEN })
    ElMessage.success('已设置为禁止借阅')
  } catch (error) {
    handleRequestError(error, '更新书籍状态失败')
  }
}

const restoreBook = async (book) => {
  try {
    await updateBook(book.id, { status: BOOK_STATUS.NORMAL })
    ElMessage.success('已恢复借阅状态')
  } catch (error) {
    handleRequestError(error, '更新书籍状态失败')
  }
}

const remove = (book) => {
  ElMessageBox.confirm(`确定要删除《${book.name}》吗？删除后不可恢复。`, '提示', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        await removeBook(book.id)
        ElMessage.success('书籍已删除')
      } catch (error) {
        handleRequestError(error, '删除书籍失败')
      }
    })
    .catch(() => {})
}

const viewCopies = (book) => {
  router.push({ name: 'book-copies', params: { id: book.id } })
}
</script>

<style scoped>
.page-subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.page-alert {
  margin-bottom: 12px;
}

.book-form {
  max-height: 60vh;
  overflow-y: auto;
}

.table-operations {
  gap: 4px;
}
</style>
