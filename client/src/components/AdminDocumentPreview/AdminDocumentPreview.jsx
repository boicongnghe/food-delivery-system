import toast from 'react-hot-toast'
import { ExternalLink, FileText } from 'lucide-react'
import { formatDateTime } from '../../utils/formatDate.js'

const isImageFile = (file) => file.fileType === 'image' || file.fileData.startsWith('data:image/')

const formatFileSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

// Browsers refuse to navigate a tab to a data: URL, so the file is opened as a blob: URL.
// The tab is opened during the click, otherwise the popup blocker stops it.
const openInNewTab = async (dataUrl) => {
  const tab = window.open('', '_blank')
  try {
    const blob = await (await fetch(dataUrl)).blob()
    tab.location.href = URL.createObjectURL(blob)
  } catch {
    tab?.close()
    toast.error('Không mở được tệp đính kèm')
  }
}

/**
 * A file uploaded with the registration (stored as a data URL): image thumbnail or PDF card.
 * @param {{ fileName, fileType, fileSize, fileData, uploadedAt } | null} file
 */
export default function AdminDocumentPreview({ file, emptyText = 'Chưa nộp tệp' }) {
  if (!file?.fileData) {
    return <p className="text-sm text-red-600 dark:text-red-400">{emptyText}</p>
  }
  const isImage = isImageFile(file)
  const details = [isImage ? 'Hình ảnh' : 'Tài liệu PDF', file.fileSize > 0 && formatFileSize(file.fileSize)]
  if (file.uploadedAt) details.push(`tải lên ${formatDateTime(file.uploadedAt)}`)

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 p-3">
      {isImage ? (
        <button type="button" onClick={() => openInNewTab(file.fileData)} className="shrink-0" aria-label="Xem ảnh">
          <img src={file.fileData} alt={file.fileName || 'Giấy tờ đính kèm'} className="h-20 w-28 rounded-xl object-cover" />
        </button>
      ) : (
        <span className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-300">
          <FileText className="h-8 w-8" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{file.fileName || 'Tệp đính kèm'}</p>
        <p className="text-xs text-slate-500">{details.filter(Boolean).join(' · ')}</p>
        <button
          type="button"
          onClick={() => openInNewTab(file.fileData)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Mở {isImage ? 'ảnh' : 'PDF'} trong tab mới
        </button>
      </div>
    </div>
  )
}
