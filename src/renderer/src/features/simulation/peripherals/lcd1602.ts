/**
 * LCD1602 Controller — Adapted from avr8js-electron-playground
 *
 * Copyright (C) 2019, Uri Shaked
 * Copyright (C) 2020, Anderson Costa
 */
import { I2CDevice } from "./i2c-bus";

export const LCD1602_ADDR = 0x27;

const LCD_CMD_CLEAR = 0x01;
const LCD_CMD_HOME = 0x02;

const LCD_CMD_ENTRY_MODE = 0x04;
const LCD_CMD_ENTRY_MODE_INCREMENT = 0x02;
const LCD_CMD_ENTRY_MODE_SHIFT = 0x01;

const LCD_CMD_DISPLAY_CONTROL = 0x08;
const LCD_CMD_DISPLAY_ENABLE = 0x04;
const LCD_CMD_DISPLAY_CURSOR = 0x02;
const LCD_CMD_DISPLAY_CURSOR_BLINK = 0x01;

const LCD_CMD_SHIFT = 0x10;
const LCD_CMD_SHIFT_DISPLAY = 0x08;
const LCD_CMD_SHIFT_RIGHT = 0x04;

const LCD_CMD_FUNCTION = 0x20;

const LCD_CMD_SET_CGRAM_ADDR = 0x40;
const LCD_CMD_SET_DRAM_ADDR = 0x80;

export class LCD1602Controller implements I2CDevice {
  private cgram = new Uint8Array(64);
  private ddram = new Uint8Array(128);

  private addr = 0x00;
  private shift = 0x00;
  private data = 0x00;

  private displayOn = false;
  private blinkOn = false;
  private cursorOn = false;
  private backlight = false;

  private firstByte = true;
  private cgramMode = false;
  private cgramUpdated = true;
  private incrementMode = true;
  private shiftMode = false;
  private is8bit = true;
  private updated = false;

  constructor(private cpuMillis: () => number) {
    this.render();
  }

  update() {
    // cpuMillis available for timing-sensitive operations
    void this.cpuMillis;
    if (this.updated) {
      this.updated = false;
      return this.render();
    }
    return false;
  }

  render() {
    const characters = new Uint8Array(32);

    if (this.displayOn) {
      const r1 = this.shift % 64;
      const r2 = 64 + (this.shift % 64);
      characters.set(this.ddram.slice(r1, r1 + 16));
      characters.set(this.ddram.slice(r2, r2 + 16), 16);
    } else {
      characters.fill(32);
    }

    return {
      blink: this.blinkOn,
      cursor: this.cursorOn,
      cursorX: this.addr % 64,
      cursorY: Math.floor(this.addr / 64),
      characters,
      backlight: this.backlight,
      cgram: this.cgram,
      cgramUpdated: this.cgramUpdated,
    };
  }

  backlightOn(value: boolean) {
    if (this.backlight !== value) {
      this.backlight = value;
    }
  }

  i2cConnect() {
    return true;
  }

  i2cDisconnect() {}

  i2cReadByte(): number {
    return 0xff;
  }

  i2cWriteByte(value: number) {
    const data = value & 0xf0;
    const rs = (value & 0x01) ? true : false;
    const bl = (value & LCD_CMD_DISPLAY_CONTROL) ? true : false;

    this.backlightOn(bl);

    if ((value & 0x04) && !(value & 0x02)) {
      this.writeData(data, rs);
    }

    return (this.updated = true);
  }

  writeData(value: number, rs: boolean): boolean {
    if (!this.is8bit) {
      if (this.firstByte) {
        this.firstByte = false;
        this.data = value;
        return false;
      }
      value = this.data | (value >> 4);
      this.firstByte = true;
    }

    if (rs) {
      this.processData(value);
    } else {
      this.processCommand(value);
    }

    this.updated = true;
    return true;
  }

  processCommand(value: number) {
    if (value & LCD_CMD_FUNCTION) {
      this.is8bit = (value & 0x10) ? true : false;
    } else if (value & LCD_CMD_SET_DRAM_ADDR) {
      this.cgramMode = false;
      this.addr = value & 0x7f;
    } else if (value & LCD_CMD_SET_CGRAM_ADDR) {
      this.cgramMode = true;
      this.addr = value & 0x3f;
    } else if (value & LCD_CMD_SHIFT) {
      const shiftDisplay = (value & LCD_CMD_SHIFT_DISPLAY) ? true : false;
      const shiftRight = (value & LCD_CMD_SHIFT_RIGHT) ? 1 : -1;
      this.cgramMode = false;
      this.addr = (this.addr + shiftRight) % 128;
      if (shiftDisplay) {
        this.shift = (this.shift + shiftRight) % 64;
      }
    } else if (value & LCD_CMD_DISPLAY_CONTROL) {
      this.displayOn = (value & LCD_CMD_DISPLAY_ENABLE) ? true : false;
      this.blinkOn = (value & LCD_CMD_DISPLAY_CURSOR_BLINK) ? true : false;
      this.cursorOn = (value & LCD_CMD_DISPLAY_CURSOR) ? true : false;
    } else if (value & LCD_CMD_ENTRY_MODE) {
      this.cgramMode = false;
      this.incrementMode = (value & LCD_CMD_ENTRY_MODE_INCREMENT) ? true : false;
      this.shiftMode = (value & LCD_CMD_ENTRY_MODE_SHIFT) ? true : false;
    } else if (value & LCD_CMD_HOME) {
      this.cgramMode = false;
      this.addr = 0x00;
      this.shift = 0x00;
    } else if (value & LCD_CMD_CLEAR) {
      this.cgramMode = false;
      this.incrementMode = true;
      this.addr = 0x00;
      this.shift = 0x00;
      this.ddram.fill(32);
    }
  }

  processData(value: number) {
    if (this.cgramMode) {
      const data =
        ((value & 0x01) << 4) |
        ((value & 0x02) << 2) |
        (value & 0x04) |
        ((value & 0x08) >> 2) |
        ((value & 0x10) >> 4);
      this.cgram[this.addr] = data;
      this.addr = (this.addr + 1) % 64;
      this.cgramUpdated = true;
    } else {
      const mode = this.incrementMode ? 1 : -1;
      this.ddram[this.addr] = value;
      this.addr = (this.addr + mode) % 128;
      if (this.shiftMode) {
        this.shift = (this.shift + mode) % 40;
      }
    }
  }
}
