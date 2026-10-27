/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * CodeMirror modes for specs, one look for both formats: titles of suites, test cases and steps
 * as headers, Gherkin keywords, tags, notes, "strings", <placeholders>, [IDs], tables. The stock
 * Markdown mode takes `<query>` for an HTML tag and loses the rest of the file.
 */

interface Stream {
  sol(): boolean
  eol(): boolean
  match(pattern: RegExp): RegExpMatchArray | null
  skipToEnd(): void
  next(): string | undefined
  peek(): string | undefined
}

type LineKind = 'title' | 'step' | 'tags' | 'note' | 'table' | 'comment' | 'docString' | 'text'

interface State {
  kind: LineKind
  docString: string | null // the fence of an open Gherkin DocString
  inString: boolean // between the quotes of a "string" on this line
}

interface CodeMirrorModes {
  defineMode(name: string, factory: () => unknown): void
}

export const SPEC_MD_MODE = 'director-spec-md'
export const SPEC_FEATURE_MODE = 'director-spec-feature'

const BASE: Record<LineKind, string | null> = {
  title: 'header',
  step: 'header',
  tags: null,
  note: 'quote',
  table: null,
  comment: 'comment',
  docString: 'string',
  text: null
}

export const GHERKIN_TITLE =
  /^\s*(Feature|Rule|Background|Scenario Outline|Scenario Template|Scenario|Example|Examples|Scenarios):/
export const GHERKIN_STEP = /^\s*(Given|When|Then|And|But|\*)(?=\s)/

let defined = false

export function defineSpecModes(codeMirror: CodeMirrorModes): void {
  if (defined) return
  defined = true
  codeMirror.defineMode(SPEC_MD_MODE, () => specMode(markdownLine))
  codeMirror.defineMode(SPEC_FEATURE_MODE, () => specMode(gherkinLine))
}

/**
 * Start of a line: sets its kind and gives the token of a marker it starts with (`####`, `- `,
 * `Scenario:`), undefined when there is none - the line goes on as text of its kind
 */
type LineStart = (stream: Stream, state: State) => string | null | undefined

const markdownLine: LineStart = (stream, state) => {
  if (stream.match(/^#{2,4}(?=\s)/)) {
    state.kind = 'title'
    return 'header'
  }
  if (stream.match(/^-{3,}\s*$/)) return 'hr'
  if (stream.match(/^\s*- /)) {
    state.kind = 'note'
    return 'quote'
  }
  state.kind = stream.peek() === '@' ? 'tags' : stream.peek() === '|' ? 'table' : 'text'
  return undefined
}

const gherkinLine: LineStart = (stream, state) => {
  if (state.docString) {
    state.kind = 'docString'
    if (stream.match(/^\s*("""|```)\s*$/)) state.docString = null
    else stream.skipToEnd()
    return 'string'
  }
  const fence = stream.match(/^\s*("""|```)/)
  if (fence) {
    state.docString = fence[1]
    state.kind = 'docString'
    stream.skipToEnd()
    return 'string'
  }
  if (stream.match(GHERKIN_TITLE)) {
    state.kind = 'title'
    return 'keyword'
  }
  if (stream.match(GHERKIN_STEP)) {
    state.kind = 'step'
    return 'keyword'
  }
  if (stream.match(/^\s*#/)) {
    state.kind = 'comment'
    stream.skipToEnd()
    return 'comment'
  }
  const indent = stream.match(/^\s+/)
  state.kind = stream.peek() === '@' ? 'tags' : stream.peek() === '|' ? 'table' : 'note'
  return indent ? null : undefined
}

function specMode(lineStart: LineStart) {
  return {
    startState: (): State => ({ kind: 'text', docString: null, inString: false }),
    token(stream: Stream, state: State): string | null {
      if (stream.sol()) {
        state.inString = false
        const token = lineStart(stream, state)
        if (token !== undefined) return token
      }
      if (state.kind === 'comment' || state.kind === 'docString') {
        stream.skipToEnd()
        return BASE[state.kind]
      }
      if (state.kind === 'tags' && stream.match(/^@\S+/)) return 'tag'
      if (state.kind === 'table' && stream.match(/^\|/)) return 'bracket'
      // A placeholder stands out in a "string" too: `"<product>"`
      if (stream.match(/^<[^<>\s][^<>]*>/)) return 'variable-2'
      if (stream.peek() === '"') {
        stream.next()
        state.inString = !state.inString
        return 'string'
      }
      if (state.inString) {
        if (!stream.match(/^[^"<]+/)) stream.next()
        return 'string'
      }
      if (state.kind === 'title' && stream.match(/^\[[^\]]*\]/)) return 'atom'
      // Plain text up to the next character that may start a token
      if (!stream.match(/^[^"<[|@]+/)) stream.next()
      return BASE[state.kind]
    }
  }
}
