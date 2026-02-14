/**
 * Data-driven wiring of AVR port listeners to Wokwi element refs.
 *
 * Given a parsed diagram.json and a running AVRRunner, attaches
 * port listeners that update the corresponding Wokwi custom elements.
 */
import type { AVRRunner } from "../avr/avr-runner"
import { I2CBus } from "./i2c-bus"
import { SSD1306Controller, SSD1306_ADDR_OTHER } from "./ssd1306"
import { LCD1602Controller, LCD1602_ADDR } from "./lcd1602"
import { WS2812Controller } from "./ws2812"
import type { DiagramJson, DiagramConnection } from "../types"

export interface WiredPeripherals {
  cleanup: () => void
}

/**
 * Build a map of partId -> Arduino pin number by parsing the connections array.
 * Connection format: ["uno:13", "led1:A", "green", []]
 * Extracts the Arduino pin from "uno:<pin>" and maps it to the component.
 */
function buildPinMap(connections: DiagramConnection[] | undefined): Map<string, number> {
  const pinMap = new Map<string, number>()
  if (!connections) return pinMap

  for (const conn of connections) {
    const [a, b] = conn
    // Find which side references the Arduino (uno:<pin>)
    let unoSide: string | null = null
    let partSide: string | null = null

    if (a.startsWith("uno:")) {
      unoSide = a
      partSide = b
    } else if (b.startsWith("uno:")) {
      unoSide = b
      partSide = a
    }

    if (!unoSide || !partSide) continue

    const pinStr = unoSide.split(":")[1]
    // Skip GND and power pins
    if (pinStr.startsWith("GND") || pinStr === "5V" || pinStr === "3.3V" || pinStr === "VIN") continue

    // Parse pin number (handles "13", "A0"-"A5", etc.)
    let pinNum: number
    if (pinStr.startsWith("A")) {
      pinNum = 14 + parseInt(pinStr.slice(1), 10) // A0=14, A1=15, ...
    } else {
      pinNum = parseInt(pinStr, 10)
    }
    if (isNaN(pinNum)) continue

    // Extract the part ID (e.g., "led1" from "led1:A")
    const partId = partSide.split(":")[0]

    // Only set the first pin found (the signal pin, not GND)
    if (!pinMap.has(partId)) {
      pinMap.set(partId, pinNum)
    }
  }

  return pinMap
}

export function wirePeripherals(
  runner: AVRRunner,
  diagram: DiagramJson,
  elementRefs: Map<string, HTMLElement>,
  onSerialOutput: (char: string) => void,
): WiredPeripherals {
  const cpuNanos = () => Math.round((runner.cpu.cycles / runner.frequency) * 1000000000)
  const cpuMillis = () => Math.round((runner.cpu.cycles / runner.frequency) * 1000)

  const i2cBus = new I2CBus(runner.twi)
  const ssd1306Controller = new SSD1306Controller(cpuMillis)
  const lcd1602Controller = new LCD1602Controller(cpuMillis)

  i2cBus.registerDevice(SSD1306_ADDR_OTHER, ssd1306Controller)
  i2cBus.registerDevice(LCD1602_ADDR, lcd1602Controller)

  // Build pin map from connections
  const pinMap = buildPinMap(diagram.connections)

  // Detect component types in diagram
  const hasLeds = diagram.parts.some((p) => p.type === "wokwi-led")
  const hasNeopixels = diagram.parts.some(
    (p) => p.type === "wokwi-neopixel-matrix" || p.type === "wokwi-neopixel",
  )
  const hasBuzzer = diagram.parts.some((p) => p.type === "wokwi-buzzer")
  const hasSsd1306 = diagram.parts.some((p) => p.type === "wokwi-ssd1306")
  const hasLcd1602 = diagram.parts.some((p) => p.type === "wokwi-lcd1602")
  const hasButtons = diagram.parts.some((p) => p.type === "wokwi-pushbutton")
  const hasSegment = diagram.parts.some((p) => p.type === "wokwi-7segment")

  // Find neopixel pin
  let matrixPin = 3
  const neopixelPart = diagram.parts.find(
    (p) => p.type === "wokwi-neopixel-matrix" || p.type === "wokwi-neopixel",
  )
  if (neopixelPart) {
    matrixPin = pinMap.get(neopixelPart.id) ?? parseInt(neopixelPart.attrs?.pin || "3", 10)
  }

  // Find neopixel count
  let neopixelCount = 0
  if (neopixelPart) {
    const cols = parseInt(neopixelPart.attrs?.cols || "8", 10)
    const rows = parseInt(neopixelPart.attrs?.rows || "8", 10)
    neopixelCount = cols * rows
  }

  const matrixController = hasNeopixels ? new WS2812Controller(neopixelCount) : null

  // Resolve pin for a given part: connections > attrs > fallback
  function getPinForPart(partId: string, attrs: Record<string, string> | undefined, fallback: number): number {
    return pinMap.get(partId) ?? parseInt(attrs?.pin || String(fallback), 10)
  }

  // Set up push button listeners
  if (hasButtons) {
    diagram.parts
      .filter((p) => p.type === "wokwi-pushbutton")
      .forEach((part) => {
        const el = elementRefs.get(part.id)
        if (!el) return
        const pin = getPinForPart(part.id, part.attrs, 2)
        el.addEventListener("button-press", () => runner.portD.setPin(pin, true))
        el.addEventListener("button-release", () => runner.portD.setPin(pin, false))
      })
  }

  // Enable analog port simulation
  runner.analogPort()

  // Build LED pin map for quick lookup
  const ledPins = new Map<string, number>()
  if (hasLeds) {
    diagram.parts
      .filter((p) => p.type === "wokwi-led")
      .forEach((part) => {
        const pin = getPinForPart(part.id, part.attrs, 13)
        ledPins.set(part.id, pin)
      })
  }

  // Helper to update LEDs
  function updateLEDs(value: number, startPin: number) {
    if (!hasLeds) return
    for (const [partId, pin] of ledPins) {
      if (pin < startPin || pin > startPin + 7) continue
      const el = elementRefs.get(partId) as any
      if (!el) continue
      const bit = 1 << (pin - startPin)
      el.value = (value & bit) ? true : false
    }
  }

  // Hook to PORTB (pins 8-13)
  runner.portB.addListener((value) => {
    updateLEDs(value, 8)
    if (hasBuzzer) {
      const buzzerPart = diagram.parts.find((p) => p.type === "wokwi-buzzer")
      if (buzzerPart) {
        const buzzerEl = elementRefs.get(buzzerPart.id) as any
        if (buzzerEl) {
          buzzerEl.hasSignal = (value & 0x01) === 1
        }
      }
    }
  })

  // Hook to PORTC (analog pins A0-A5 = pins 14-19)
  runner.portC.addListener((value) => {
    updateLEDs(value, 14)
  })

  // Hook to PORTD (pins 0-7)
  runner.portD.addListener((value) => {
    updateLEDs(value, 0)
    if (matrixController) {
      matrixController.feedValue(runner.portD.pinState(matrixPin), cpuNanos())
    }
    if (hasSegment) {
      const segPart = diagram.parts.find((p) => p.type === "wokwi-7segment")
      if (segPart) {
        const segEl = elementRefs.get(segPart.id) as any
        if (segEl) {
          segEl.values = [
            value & (1 << 0), value & (1 << 1), value & (1 << 2), value & (1 << 3),
            value & (1 << 4), value & (1 << 5), value & (1 << 6), value & (1 << 7),
          ]
        }
      }
    }
  })

  // Serial output
  runner.usart.onByteTransmit = (value: number) => {
    onSerialOutput(String.fromCharCode(value))
  }

  // SPI output
  runner.spi.onTransfer = (value: number) => {
    onSerialOutput("SPI: 0x" + value.toString(16) + "\n")
    return value
  }

  // Frame callback — updates displays
  runner.execute((_cpu) => {
    if (matrixController) {
      const pixels = matrixController.update(cpuNanos())
      if (pixels && neopixelPart) {
        const el = elementRefs.get(neopixelPart.id) as any
        if (el?.setPixel) {
          const cols = parseInt(neopixelPart.attrs?.cols || "8", 10)
          const rows = parseInt(neopixelPart.attrs?.rows || "8", 10)
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const v = pixels[row * cols + col]
              el.setPixel(row, col, {
                b: (v & 0xff) / 255,
                r: ((v >> 8) & 0xff) / 255,
                g: ((v >> 16) & 0xff) / 255,
              })
            }
          }
        }
      }
    }

    if (hasSsd1306) {
      const ssd1306Part = diagram.parts.find((p) => p.type === "wokwi-ssd1306")
      if (ssd1306Part) {
        const ssd1306El = elementRefs.get(ssd1306Part.id) as any
        if (ssd1306El) {
          ssd1306Controller.update()
          ssd1306Controller.toImageData(ssd1306El.imageData)
          ssd1306El.redraw()
        }
      }
    }

    if (hasLcd1602) {
      const lcd1602Part = diagram.parts.find((p) => p.type === "wokwi-lcd1602")
      if (lcd1602Part) {
        const lcd1602El = elementRefs.get(lcd1602Part.id) as any
        if (lcd1602El) {
          const lcd = lcd1602Controller.update()
          if (lcd) {
            lcd1602El.blink = lcd.blink
            lcd1602El.cursor = lcd.cursor
            lcd1602El.cursorX = lcd.cursorX
            lcd1602El.cursorY = lcd.cursorY
            lcd1602El.characters = lcd.characters
            lcd1602El.backlight = lcd.backlight
            if (lcd.cgramUpdated && lcd1602El.font) {
              const font = lcd1602El.font.slice(0)
              const cgramChars = lcd.cgram.slice(0, 0x40)
              font.set(cgramChars, 0)
              font.set(cgramChars, 0x40)
              lcd1602El.font = font
            }
          }
        }
      }
    }
  })

  return {
    cleanup: () => {
      runner.stop()
    },
  }
}
