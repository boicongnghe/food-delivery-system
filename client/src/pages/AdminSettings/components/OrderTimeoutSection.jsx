import { Clock } from 'lucide-react'
import settingApi from '../../../api/settingApi.js'
import useSettingsForm from '../../../hooks/useSettingsForm.js'
import { SETTING_FIELDS } from '../constants.js'
import SettingRow from './SettingRow.jsx'
import SettingsSection from './SettingsSection.jsx'

// Order timeout rules (docs/order-timeouts.md): the admin tunes the BA assumptions without a new deployment
export default function OrderTimeoutSection() {
  const { settings, form, errors, saving, isDirty, change, resetToDefaults, save } = useSettingsForm(
    settingApi.getOrderTimeouts,
    settingApi.updateOrderTimeouts,
    'cấu hình thời hạn',
  )

  return (
    <SettingsSection
      icon={Clock}
      title="Thời hạn xử lý đơn"
      description={
        <>
          Hệ thống kiểm tra mỗi phút. Bước chưa ai tốn chi phí thì tự xử lý (nhắc, tự hủy). Bước món đã nấu thì chuyển cho quản
          trị viên (tab "Cần xử lý" ở Đơn hàng toàn sàn). Giá trị mới áp dụng từ lần kiểm tra kế tiếp.
        </>
      }
      settings={settings}
      isDirty={isDirty}
      saving={saving}
      onReset={resetToDefaults}
      onSubmit={save}
    >
      {form &&
        SETTING_FIELDS.map((field) => (
          <SettingRow
            key={field.key}
            field={field}
            unit="phút"
            value={form[field.key]}
            defaultValue={settings.defaults[field.key]}
            error={errors[field.key]}
            onChange={change}
          />
        ))}
    </SettingsSection>
  )
}
