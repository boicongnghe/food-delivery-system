import { useEffect, useState } from 'react'
import commissionRuleApi from '../../../api/commissionRuleApi.js'
import useDebounce from '../../../hooks/useDebounce.js'
import { ADMIN_INPUT } from '../../../utils/adminClassNames.js'

/**
 * Search box + list of matching restaurants.
 * @param {string} value - selected restaurant id
 * @param {{ _id: string, name: string } | null} initialRestaurant - selected one when editing (may not be in the results)
 */
export default function RestaurantPicker({ value, initialRestaurant, disabled, onChange }) {
  const [searchText, setSearchText] = useState('')
  const keyword = useDebounce(searchText.trim(), 300)
  const [options, setOptions] = useState([])

  useEffect(() => {
    let ignore = false
    commissionRuleApi
      .searchRestaurants(keyword)
      .then((response) => {
        if (!ignore) setOptions(response.data)
      })
      .catch(() => {
        if (!ignore) setOptions([])
      })
    return () => {
      ignore = true
    }
  }, [keyword])

  const hasInitial = initialRestaurant && !options.some((option) => option._id === initialRestaurant._id)
  const choices = hasInitial ? [initialRestaurant, ...options] : options

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        disabled={disabled}
        placeholder="Tìm nhà hàng theo tên..."
        aria-label="Tìm nhà hàng"
        className={ADMIN_INPUT}
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label="Chọn nhà hàng"
        className={ADMIN_INPUT}
      >
        <option value="">-- Chọn nhà hàng ({choices.length} kết quả) --</option>
        {choices.map((restaurant) => (
          <option key={restaurant._id} value={restaurant._id}>
            {restaurant.name}
          </option>
        ))}
      </select>
    </div>
  )
}
