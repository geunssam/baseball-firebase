import * as React from "react"

/**
 * Checkbox UI Component
 * 간단한 체크박스 컴포넌트
 */
const Checkbox = React.forwardRef(({ className = "", checked, onCheckedChange, ...props }, ref) => {
  return (
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={`h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer ${className}`}
      {...props}
    />
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
