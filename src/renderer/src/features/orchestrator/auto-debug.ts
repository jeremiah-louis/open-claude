/**
 * Builds an auto-debug message to send back to Claude when compilation fails.
 */
export function buildAutoDebugMessage(
  error: string,
  attempt: number,
  maxAttempts: number,
): string {
  return [
    `The code failed to compile (attempt ${attempt}/${maxAttempts}):`,
    "",
    "```",
    error.trim(),
    "```",
    "",
    "Please fix the code. Output ONLY the corrected code in a single ```arduino code block.",
    "",
    "Reminder: Only Wire.h, SPI.h, Servo.h, EEPROM.h and Arduino core are available. Do NOT use Adafruit_SSD1306, Adafruit_GFX, LiquidCrystal_I2C, FastLED, or any third-party library. For SSD1306 OLED, use Wire.h with raw I2C commands to address 0x3D. For LCD1602, use Wire.h with raw I2C commands to address 0x27.",
  ].join("\n")
}
