<template>
  <div class="app-container copy-page">
    <el-breadcrumb separator="/" class="breadcrumb">
      <el-breadcrumb-item>
        <router-link to="/">书籍管理</router-link>
      </el-breadcrumb-item>
      <el-breadcrumb-item>{{ book?.name || '副本详情' }}</el-breadcrumb-item>
    </el-breadcrumb>

    <div class="page-header">
      <div>
        <h2>{{ book?.name || '副本管理' }}</h2>
        <p class="page-subtitle">维护书籍副本及借阅情况</p>
      </div>
      <el-button type="primary" :disabled="!book" @click="openCopyDialog('create')">新增副本</el-button>
    </div>

    <template v-if="book">
      <el-card class="summary-card" shadow="never">
        <el-descriptions :column="4" size="small" border>
          <el-descriptions-item label="书籍编号">{{ book.id }}</el-descriptions-item>
          <el-descriptions-item label="作者">{{ book.author }}</el-descriptions-item>
          <el-descriptions-item label="ISBN">{{ book.isbn }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="bookStatusTag(book.status)">{{ bookStatusText(book.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="出版社">{{ book.publisher }}</el-descriptions-item>
          <el-descriptions-item label="出版时间">{{ book.publishDate }}</el-descriptions-item>
          <el-descriptions-item label="入库时间">{{ book.entryDate }}</el-descriptions-item>
          <el-descriptions-item label="副本数量">{{ book.copies.length }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-table :data="book.copies" border stripe style="width: 100%" :row-class-name="rowClassName">
        <el-table-column prop="id" label="副本编号" width="150" />
        <el-table-column prop="location" label="位置" min-width="180" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="copyStatusTag(row.status)">{{ COPY_STATUS_TEXT[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="borrowCount" label="借阅次数" width="110" />
        <el-table-column label="操作" width="360" fixed="right">
          <template #default="{ row }">
            <div class="table-operations">
              <el-button
                v-if="row.status === COPY_STATUS.AVAILABLE"
                link
                type="primary"
                size="small"
                @click="openBorrowDialog(row)"
              >借出</el-button>
              <el-button
                v-if="row.status === COPY_STATUS.BORROWED"
                link
                type="success"
                size="small"
                @click="handleReturn(row)"
              >还回</el-button>
              <el-button
                v-if="row.status === COPY_STATUS.PENDING"
                link
                type="primary"
                size="small"
                @click="archive(row)"
              >归档</el-button>
              <el-button link type="primary" size="small" @click="openCopyDialog('edit', row)">修改</el-button>
              <el-button
                v-if="row.status !== COPY_STATUS.BORROWED"
                link
                type="danger"
                size="small"
                @click="removeCopyItem(row)"
              >删除</el-button>
              <el-button link type="info" size="small" @click="showBorrowRecords(row)">借阅记录</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </template>
    <el-empty v-else description="未找到对应的书籍" />

    <el-dialog v-model="copyDialogVisible" :title="copyDialogTitle" width="520px">
      <el-form :model="copyForm" label-width="120px">
        <el-form-item label="副本编号">
          <el-input v-model="copyForm.id" placeholder="请输入副本编号" />
        </el-form-item>
        <el-form-item label="存放位置">
          <el-input v-model="copyForm.location" placeholder="如：一楼 A 区 01 架" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="copyForm.status" placeholder="请选择状态">
            <el-option
              v-for="item in copyStatusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="copyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCopy">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="borrowDialogVisible" title="借出副本" width="480px">
      <el-form :model="borrowForm" label-width="120px">
        <el-form-item label="借阅人">
          <el-input v-model="borrowForm.borrower" placeholder="请输入借阅人姓名" />
        </el-form-item>
        <el-form-item label="借出时间">
          <el-date-picker
            v-model="borrowForm.borrowTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm"
            placeholder="选择借出时间"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="borrowDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBorrow">确认借出</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="recordsDialogVisible" :title="`借阅记录 - ${selectedCopyId}`" width="600px">
      <el-table :data="borrowRecords" border stripe>
        <el-table-column prop="borrower" label="借阅人" width="160" />
        <el-table-column prop="borrowTime" label="借阅时间" width="200" />
        <el-table-column prop="returnTime" label="归还时间" width="200">
          <template #default="{ row }">
            <span>{{ row.returnTime || '未归还' }}</span>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button type="primary" @click="recordsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getBookById,
  BOOK_STATUS,
  BOOK_STATUS_TEXT,
  COPY_STATUS,
  COPY_STATUS_TEXT,
  addCopy,
  updateCopy,
  removeCopy,
  borrowCopy,
  returnCopy,
  archiveCopy,
  ensureBooksLoaded,
  resolveApiError
} from '../store/libraryStore'

const route = useRoute()

const bookId = computed(() => route.params.id)
const book = computed(() => getBookById(bookId.value))

const copyDialogVisible = ref(false)
const copyDialogMode = ref('create')
const copyDialogTitle = computed(() => (copyDialogMode.value === 'create' ? '新增副本' : '编辑副本'))
const currentCopyId = ref('')

const borrowDialogVisible = ref(false)
const recordsDialogVisible = ref(false)
const selectedCopyId = ref('')
const borrowRecords = ref([])

const copyStatusOptions = [
  { label: COPY_STATUS_TEXT[COPY_STATUS.AVAILABLE], value: COPY_STATUS.AVAILABLE },
  { label: COPY_STATUS_TEXT[COPY_STATUS.BORROWED], value: COPY_STATUS.BORROWED },
  { label: COPY_STATUS_TEXT[COPY_STATUS.PENDING], value: COPY_STATUS.PENDING },
  { label: COPY_STATUS_TEXT[COPY_STATUS.LOST], value: COPY_STATUS.LOST },
  { label: COPY_STATUS_TEXT[COPY_STATUS.DAMAGED], value: COPY_STATUS.DAMAGED }
]

const copyForm = reactive({
  id: '',
  location: '',
  status: COPY_STATUS.PENDING
})

const borrowForm = reactive({
  borrower: '',
  borrowTime: ''
})

const handleRequestError = (error, fallback) => {
  ElMessage.error(resolveApiError(error, fallback))
}

onMounted(() => {
  ensureBooksLoaded().catch((error) => {
    handleRequestError(error, '加载书籍数据失败')
  })
})

const bookStatusText = (status) => BOOK_STATUS_TEXT[status] || '—'

const bookStatusTag = (status) => {
  if (status === BOOK_STATUS.NORMAL) return 'success'
  if (status === BOOK_STATUS.ALL_BORROWED) return 'warning'
  if (status === BOOK_STATUS.FORBIDDEN) return 'danger'
  return 'info'
}

const copyStatusTag = (status) => {
  switch (status) {
    case COPY_STATUS.AVAILABLE:
      return 'success'
    case COPY_STATUS.BORROWED:
      return 'warning'
    case COPY_STATUS.PENDING:
      return 'info'
    case COPY_STATUS.LOST:
      return 'danger'
    case COPY_STATUS.DAMAGED:
      return 'danger'
    default:
      return 'info'
  }
}

const rowClassName = ({ row }) => {
  if (row.status === COPY_STATUS.BORROWED) return 'row-borrowed'
  if (row.status === COPY_STATUS.LOST || row.status === COPY_STATUS.DAMAGED) return 'row-alert'
  return ''
}

const openCopyDialog = (mode, copy) => {
  if (!book.value) return
  copyDialogMode.value = mode
  if (mode === 'create') {
    Object.assign(copyForm, { id: '', location: '', status: COPY_STATUS.PENDING })
    currentCopyId.value = ''
  } else if (copy) {
    Object.assign(copyForm, {
      id: copy.id,
      location: copy.location,
      status: copy.status
    })
    currentCopyId.value = copy.id
  }
  copyDialogVisible.value = true
}

const saveCopy = async () => {
  if (!book.value) {
    copyDialogVisible.value = false
    return
  }
  if (!copyForm.id) {
    ElMessage.warning('请填写副本编号')
    return
  }
  if (!copyForm.location) {
    ElMessage.warning('请填写存放位置')
    return
  }

  const payload = {
    id: copyForm.id,
    location: copyForm.location,
    status: copyForm.status
  }

  try {
    if (copyDialogMode.value === 'create') {
      const exists = book.value.copies.some((item) => item.id === payload.id)
      if (exists) {
        ElMessage.error('副本编号已存在')
        return
      }
      await addCopy(book.value.id, payload)
      ElMessage.success('新增副本成功')
    } else {
      await updateCopy(book.value.id, currentCopyId.value, payload)
      currentCopyId.value = payload.id
      ElMessage.success('副本信息已更新')
    }
    copyDialogVisible.value = false
  } catch (error) {
    const message = copyDialogMode.value === 'create' ? '新增副本失败' : '更新副本失败'
    handleRequestError(error, message)
  }
}

const formatDateTime = (date = new Date()) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

const openBorrowDialog = (copy) => {
  if (!book.value) return
  currentCopyId.value = copy.id
  borrowForm.borrower = ''
  borrowForm.borrowTime = formatDateTime()
  borrowDialogVisible.value = true
}

const confirmBorrow = async () => {
  if (!book.value) return
  if (!borrowForm.borrower) {
    ElMessage.warning('请填写借阅人')
    return
  }
  try {
    await borrowCopy(book.value.id, currentCopyId.value, {
      borrower: borrowForm.borrower,
      borrowTime: borrowForm.borrowTime
    })
    borrowDialogVisible.value = false
    if (recordsDialogVisible.value && selectedCopyId.value === currentCopyId.value) {
      const latest = book.value?.copies.find((item) => item.id === currentCopyId.value)
      borrowRecords.value = latest?.borrowRecords.length ? latest.borrowRecords.slice().reverse() : []
    }
    ElMessage.success('借出成功')
  } catch (error) {
    handleRequestError(error, '借出副本失败')
  }
}

const handleReturn = (copy) => {
  if (!book.value) return
  ElMessageBox.confirm(`确认将副本 ${copy.id} 标记为已归还？`, '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        await returnCopy(book.value.id, copy.id)
        if (recordsDialogVisible.value && selectedCopyId.value === copy.id) {
          const latest = book.value?.copies.find((item) => item.id === copy.id)
          borrowRecords.value = latest?.borrowRecords.length ? latest.borrowRecords.slice().reverse() : []
        }
        ElMessage.success('副本已归还')
      } catch (error) {
        handleRequestError(error, '归还副本失败')
      }
    })
    .catch(() => {})
}

const archive = async (copy) => {
  if (!book.value) return
  try {
    await archiveCopy(book.value.id, copy.id)
    ElMessage.success('副本已归档，可供借阅')
  } catch (error) {
    handleRequestError(error, '归档副本失败')
  }
}

const removeCopyItem = (copy) => {
  if (!book.value) return
  ElMessageBox.confirm(`删除副本 ${copy.id} 后将无法恢复，确定继续吗？`, '提示', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        await removeCopy(book.value.id, copy.id)
        ElMessage.success('副本已删除')
      } catch (error) {
        handleRequestError(error, '删除副本失败')
      }
    })
    .catch(() => {})
}

const showBorrowRecords = (copy) => {
  selectedCopyId.value = copy.id
  borrowRecords.value = copy.borrowRecords.length ? copy.borrowRecords.slice().reverse() : []
  recordsDialogVisible.value = true
}
</script>

<style scoped>
.copy-page {
  padding-bottom: 40px;
}

.breadcrumb {
  margin-bottom: 16px;
}

.summary-card {
  margin-bottom: 16px;
}

.table-operations {
  gap: 6px;
  display: flex;
}

.row-borrowed {
  background: #fff7e6 !important;
}

.row-alert {
  background: #fde2e2 !important;
}
</style>
