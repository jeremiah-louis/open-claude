/**
 * AVRRunner — Adapted from avr8js-electron-playground execute.ts
 *
 * Drives the AVR8js CPU emulator for ATmega328P simulation.
 *
 * Copyright (C) 2019, Uri Shaked
 */
import {
  avrInstruction,
  avrInterrupt,
  AVRTimer,
  CPU,
  AVRIOPort,
  AVREEPROM,
  AVRUSART,
  AVRSPI,
  AVRTWI,
  portBConfig,
  portCConfig,
  portDConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  usart0Config,
  spiConfig,
  twiConfig,
} from 'avr8js';

import { loadHex } from './intelhex';
import { MicroTaskScheduler } from './task-scheduler';
import { EEPROMLocalStorageBackend } from './eeprom';

// ATmega328p params
const FLASH = 0x8000;

export class AVRRunner {
  readonly program = new Uint16Array(FLASH);
  readonly cpu: CPU;
  readonly timer0: AVRTimer;
  readonly timer1: AVRTimer;
  readonly timer2: AVRTimer;
  readonly portB: AVRIOPort;
  readonly portC: AVRIOPort;
  readonly portD: AVRIOPort;
  readonly eeprom: AVREEPROM;
  readonly usart: AVRUSART;
  readonly spi: AVRSPI;
  readonly twi: AVRTWI;
  readonly frequency = 16e6; // 16 MHz
  readonly taskScheduler = new MicroTaskScheduler();

  private serialBuffer: number[] = [];
  private stopped = false;

  constructor(hex: string) {
    // Load program
    loadHex(hex, new Uint8Array(this.program.buffer));

    // Check hex size
    if (hex.length > 2048) {
      this.cpu = new CPU(this.program, FLASH);
    } else {
      this.cpu = new CPU(this.program);
    }

    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);

    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portC = new AVRIOPort(this.cpu, portCConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);

    this.eeprom = new AVREEPROM(this.cpu, new EEPROMLocalStorageBackend());
    this.usart = new AVRUSART(this.cpu, usart0Config, this.frequency);
    this.spi = new AVRSPI(this.cpu, spiConfig, this.frequency);
    this.twi = new AVRTWI(this.cpu, twiConfig, this.frequency);

    this.cpu.readHooks[usart0Config.UDR] = () => this.serialBuffer.shift() || 0;

    this.taskScheduler.start();
  }

  serialWrite(value: string) {
    [...value].forEach((c) => {
      this.serialBuffer.push(c.charCodeAt(0));
    });
  }

  rxCompleteInterrupt() {
    const UCSRA = this.cpu.data[usart0Config.UCSRA];
    if (UCSRA & 0x20 && this.serialBuffer.length > 0) {
      avrInterrupt(this.cpu, usart0Config.rxCompleteInterrupt);
    }
  }

  execute(callback: (cpu: CPU) => void) {
    if (this.stopped) return;

    try {
      const { cpu } = this;
      const deadline = cpu.cycles + this.frequency / 60;

      while (cpu.cycles <= deadline) {
        avrInstruction(cpu);
        cpu.tick();
      }

      callback(this.cpu);
    } catch (err) {
      console.error('AVR execute error:', err);
    }

    if (!this.stopped) {
      requestAnimationFrame(() => this.execute(callback));
    }
  }

  stop() {
    this.stopped = true;
    this.taskScheduler.stop();
  }

  analogPort() {
    this.cpu.writeHooks[0x7a] = (value) => {
      if (value & (1 << 6)) {
        const analogValue = Math.floor(Math.random() * 1024);
        this.cpu.data[0x7a] = value & ~(1 << 6);
        this.cpu.data[0x78] = analogValue & 0xff;
        this.cpu.data[0x79] = (analogValue >> 8) & 0x3;
        return true;
      }
      return false;
    };
  }
}
