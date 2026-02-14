/**
 * Arduino/C++ Monarch language definition for Monaco Editor
 *
 * Extends C++ with Arduino-specific keywords, types, and built-in functions.
 */
import type { languages } from "monaco-editor"

export const arduinoLanguageId = "arduino"

export const arduinoLanguageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
}

export const arduinoLanguageDef: languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".arduino",

  keywords: [
    "auto", "break", "case", "catch", "class", "const", "continue",
    "default", "delete", "do", "else", "enum", "extern", "false",
    "for", "goto", "if", "inline", "namespace", "new", "nullptr",
    "operator", "private", "protected", "public", "return", "sizeof",
    "static", "struct", "switch", "template", "this", "throw", "true",
    "try", "typedef", "typename", "union", "using", "virtual", "volatile",
    "while", "define", "include", "ifdef", "ifndef", "endif", "pragma",
  ],

  arduinoKeywords: [
    "setup", "loop", "pinMode", "digitalWrite", "digitalRead",
    "analogRead", "analogWrite", "delay", "delayMicroseconds",
    "millis", "micros", "Serial", "Wire", "SPI",
    "attachInterrupt", "detachInterrupt", "interrupts", "noInterrupts",
    "tone", "noTone", "pulseIn", "shiftOut", "shiftIn",
    "map", "constrain", "min", "max", "abs", "pow", "sqrt",
    "sin", "cos", "tan", "randomSeed", "random",
    "bitRead", "bitWrite", "bitSet", "bitClear", "bit",
    "highByte", "lowByte",
    "INPUT", "OUTPUT", "INPUT_PULLUP",
    "HIGH", "LOW",
    "LED_BUILTIN",
    "A0", "A1", "A2", "A3", "A4", "A5",
  ],

  typeKeywords: [
    "void", "bool", "byte", "char", "double", "float", "int", "long",
    "short", "signed", "unsigned", "string", "String",
    "boolean", "word", "uint8_t", "uint16_t", "uint32_t",
    "int8_t", "int16_t", "int32_t", "size_t",
  ],

  operators: [
    "=", ">", "<", "!", "~", "?", ":",
    "==", "<=", ">=", "!=", "&&", "||", "++", "--",
    "+", "-", "*", "/", "&", "|", "^", "%", "<<",
    ">>", "+=", "-=", "*=", "/=", "&=", "|=", "^=",
    "%=", "<<=", ">>=",
  ],

  symbols: /[=><!~?:&|+\-*/^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      // Preprocessor directives
      [/#\s*(include|define|ifdef|ifndef|endif|pragma|if|else|elif|undef)\b/, "keyword.directive"],
      [/<[a-zA-Z_][\w.]*>/, "string.include"],

      // Identifiers and keywords
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@typeKeywords": "keyword.type",
          "@arduinoKeywords": "keyword.arduino",
          "@keywords": "keyword",
          "@default": "identifier",
        },
      }],

      // Whitespace
      { include: "@whitespace" },

      // Delimiters and operators
      [/[{}()[\]]/, "@brackets"],
      [/[<>](?!@symbols)/, "@brackets"],
      [/@symbols/, {
        cases: {
          "@operators": "operator",
          "@default": "",
        },
      }],

      // Numbers
      [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
      [/0[xX][0-9a-fA-F]+/, "number.hex"],
      [/0[bB][01]+/, "number.binary"],
      [/\d+/, "number"],

      // Strings
      [/"([^"\\]|\\.)*$/, "string.invalid"],
      [/"/, "string", "@string"],
      [/'[^\\']'/, "string"],
      [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
      [/'/, "string.invalid"],

      // Delimiter
      [/[;,.]/, "delimiter"],
    ],

    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"],
    ],

    comment: [
      [/[^/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"],
    ],

    string: [
      [/[^\\"]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/"/, "string", "@pop"],
    ],
  },
}
