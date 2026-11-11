import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

// API errors look like [{ field: 'acceptTimeout', message }]
const toFieldErrors = (apiErrors = []) => Object.fromEntries(apiErrors.map(({ field, message }) => [field, message]))

/**
 * Load / edit / save one group of admin settings shaped { values, defaults, updatedAt, updatedBy }.
 * @param {() => Promise<{ data }>} load - API call returning the settings
 * @param {(values) => Promise<{ data, message }>} update - API call saving the whole form
 * @param {string} label - for the error toasts, e.g. "cấu hình thời hạn"
 */
export default function useSettingsForm(load, update, label) {
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let ignore = false
    load()
      .then((response) => {
        if (ignore) return
        setSettings(response.data)
        setForm(response.data.values)
      })
      .catch((error) => {
        if (!ignore) toast.error(error.response?.data?.message || `Không tải được ${label}`)
      })
    return () => {
      ignore = true
    }
  }, [load, label])

  const change = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const resetToDefaults = () => {
    setForm(settings.defaults)
    setErrors({})
  }

  const save = async () => {
    setSaving(true)
    try {
      const response = await update(form)
      setSettings(response.data)
      setForm(response.data.values)
      setErrors({})
      toast.success(response.message)
    } catch (error) {
      const data = error.response?.data
      setErrors(toFieldErrors(data?.errors))
      toast.error(data?.message || `Không lưu được ${label}`)
    } finally {
      setSaving(false)
    }
  }

  const isDirty = Boolean(settings && form) && JSON.stringify(form) !== JSON.stringify(settings.values)

  return { settings, form, errors, saving, isDirty, change, resetToDefaults, save }
}
