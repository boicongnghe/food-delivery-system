import { ShieldAlert } from 'lucide-react'
import settingApi from '../../../api/settingApi.js'
import useSettingsForm from '../../../hooks/useSettingsForm.js'
import { VIOLATION_FIELDS } from '../constants.js'
import SettingRow from './SettingRow.jsx'
import SettingsSection from './SettingsSection.jsx'

// Violation policy: how many penalties an account may receive before it is suspended automatically (UC45)
export default function ViolationPolicySection() {
  const { settings, form, errors, saving, isDirty, change, resetToDefaults, save } = useSettingsForm(
    settingApi.getViolationPolicy,
    settingApi.updateViolationPolicy,
    'cấu hình xử phạt',
  )

  return (
    <SettingsSection
      icon={ShieldAlert}
      title="Xử phạt vi phạm"
      description={
        <>
          Mỗi lần xử phạt (cảnh cáo, phạt tiền, đình chỉ) từ báo cáo sự cố giao hàng tính là một lần vi phạm. Khi lần phạt mới làm
          tài khoản đạt ngưỡng, nhà hàng bị đình chỉ, shipper hoặc khách hàng bị khóa tài khoản. Bộ đếm bắt đầu lại từ 0 sau mỗi
          lần tài khoản bị đình chỉ.
        </>
      }
      settings={settings}
      isDirty={isDirty}
      saving={saving}
      onReset={resetToDefaults}
      onSubmit={save}
    >
      {form &&
        VIOLATION_FIELDS.map((field) => (
          <SettingRow
            key={field.key}
            field={field}
            unit="lần"
            value={form[field.key]}
            defaultValue={settings.defaults[field.key]}
            error={errors[field.key]}
            onChange={change}
          />
        ))}
    </SettingsSection>
  )
}
