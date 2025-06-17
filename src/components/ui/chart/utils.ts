
import type { ChartConfig } from "./context"

// Helper to extract item config from a payload.
export function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}

// Enhanced CSS value sanitizer with stricter validation
export const sanitizeCssValue = (value: string) => {
  if (typeof value !== "string") {
    return ""
  }
  
  // Remove any potentially dangerous characters and patterns
  // Allow only safe CSS characters: letters, numbers, spaces, hyphens, percentages, periods, parentheses, commas, hash for colors
  const sanitized = value.replace(/[^a-zA-Z0-9\s_#\-%.,()]/g, "")
  
  // Additional safety checks for common XSS patterns
  const dangerousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /on\w+=/i,
    /<script/i,
    /<\/script/i,
    /expression\s*\(/i,
    /url\s*\(/i,
    /@import/i
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      console.warn(`Dangerous CSS pattern detected and filtered: ${value}`)
      return ""
    }
  }
  
  // Validate that it looks like a legitimate CSS value
  const validCssPatterns = [
    /^#[0-9a-fA-F]{3,8}$/,           // Hex colors
    /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/,  // RGB colors
    /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/, // RGBA colors
    /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/, // HSL colors
    /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)$/, // HSLA colors
    /^[a-zA-Z]+$/,                    // Named colors
    /^var\(--[a-zA-Z0-9-_]+\)$/      // CSS variables
  ]
  
  const isValid = validCssPatterns.some(pattern => pattern.test(sanitized.trim()))
  
  if (!isValid && sanitized.trim()) {
    console.warn(`Invalid CSS value format filtered: ${value}`)
    return ""
  }
  
  return sanitized
}
