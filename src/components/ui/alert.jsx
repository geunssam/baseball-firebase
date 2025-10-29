import * as React from "react"

const Alert = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={`relative w-full rounded-lg border p-4 ${className}`}
    {...props}
  />
))
Alert.displayName = "Alert"

export { Alert }
