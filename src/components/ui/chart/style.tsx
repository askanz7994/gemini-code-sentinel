
import * as React from "react"

import { THEMES, type ChartConfig } from "./context"
import { sanitizeCssValue } from "./utils"

export const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([_, config]) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  // Create CSS rules using a more secure approach
  const cssRules = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const rules = colorConfig
        .map(([key, itemConfig]) => {
          const color =
            itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
            itemConfig.color
          
          if (!color) return null
          
          // Enhanced sanitization to prevent XSS
          const sanitizedColor = sanitizeCssValue(color)
          const sanitizedKey = key.replace(/[^a-zA-Z0-9-_]/g, '')
          
          // Additional validation to ensure the color value is safe
          if (!sanitizedColor || sanitizedColor !== color) {
            console.warn(`Potentially unsafe CSS value filtered: ${color}`)
            return null
          }
          
          return `  --color-${sanitizedKey}: ${sanitizedColor};`
        })
        .filter(Boolean)
        .join("\n")

      if (!rules) return null
      
      return `${prefix} [data-chart=${id}] {\n${rules}\n}`
    })
    .filter(Boolean)
    .join("\n")

  // Use a safer approach by creating the style element directly
  React.useEffect(() => {
    const styleId = `chart-style-${id}`
    let styleElement = document.getElementById(styleId) as HTMLStyleElement
    
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }
    
    // Directly set textContent instead of innerHTML to prevent XSS
    styleElement.textContent = cssRules
    
    return () => {
      // Cleanup on unmount
      const element = document.getElementById(styleId)
      if (element) {
        element.remove()
      }
    }
  }, [id, cssRules])

  return null
}
