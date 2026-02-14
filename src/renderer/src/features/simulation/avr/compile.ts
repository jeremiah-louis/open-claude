/**
 * Build Hex — Adapted from avr8js-electron-playground
 *
 * Compiles Arduino sketches via the Wokwi Hexi cloud compiler.
 *
 * Copyright (C) 2019, Uri Shaked
 */
const HEXI_URL = 'https://hexi.wokwi.com';

export interface HexiResult {
  stdout: string;
  stderr: string;
  hex: string;
}

export async function buildHex(
  source: string,
  board: string = 'uno',
): Promise<HexiResult> {
  const resp = await fetch(HEXI_URL + '/build', {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sketch: source,
      board,
      files: [],
      options: {},
    }),
  });

  if (!resp.ok) {
    throw new Error(`Compilation server error: ${resp.status}`);
  }

  return (await resp.json()) as HexiResult;
}
