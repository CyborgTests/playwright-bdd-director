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

import './DirectorEditor.css'

import { CodeMirrorWrapper } from '@web/components/codeMirrorWrapper'
import { Toolbar } from '@web/components/toolbar'
import { ToolbarButton } from '@web/components/toolbarButton'
import React from 'react'

import type { TestFile } from './DirectorModel'
import {
  defineSpecModes,
  GHERKIN_STEP,
  GHERKIN_TITLE,
  SPEC_FEATURE_MODE,
  SPEC_MD_MODE
} from './specModes'
import { SpecPreview } from './SpecPreview'

// The spec modes join the CodeMirror module the editor loads before it creates an editor
const specModesReady = import('@web/components/codeMirrorModule').then((module) =>
  defineSpecModes(module.default as never)
)

type EditorMode = 'editor' | 'preview'

/** Gherkin in another language (`# language: uk`) keeps the stock mode: it knows the keywords */
function highlighterFor(name: string, content: string) {
  if (!name.endsWith('.feature')) return SPEC_MD_MODE
  return /^\s*#\s*language:/m.test(content) ? 'gherkin' : SPEC_FEATURE_MODE
}

/** Lines a double click rewords: steps and titles (not Background, it has no title to change) */
function isRewordable(line: string, name: string): boolean {
  if (name.endsWith('.md')) return /^#{2,4}\s/.test(line) && !/^###\s+Background\b/.test(line)
  return (GHERKIN_TITLE.test(line) && !/^\s*Background:/.test(line)) || GHERKIN_STEP.test(line)
}

export interface DirectorEditorProps {
  file: TestFile | null
  onContentChange: (content: string) => void
  /** The file name was edited in the toolbar: a new extension converts the spec */
  onRename?: (file: TestFile, newName: string) => void
  /** F2 or a double click on a line: the step or title to reword there; null: none */
  onFindLine?: (file: TestFile, line: number) => Promise<LineToReword | null>
  /** A step reworded in every spec (and its definition pattern), a title on its line */
  onReword?: (target: LineToReword, newText: string) => void
}

export interface LineToReword {
  line: number // 1-based
  kind: 'step' | 'title'
  text: string
  definition?: string // location: the text is the pattern of this step definition
  label?: string // title of: Suite, Rule, Test case
}

export const DirectorEditor: React.FC<DirectorEditorProps> = ({
  file,
  onContentChange,
  onRename,
  onFindLine,
  onReword
}) => {
  const [mode, setMode] = React.useState<EditorMode>('editor')
  const [renaming, setRenaming] = React.useState(false)
  const [rewording, setRewording] = React.useState<LineToReword | null>(null)
  const [modesReady, setModesReady] = React.useState(false)
  React.useEffect(() => {
    specModesReady.then(() => setModesReady(true))
  }, [])
  const [editedContent, setEditedContent] = React.useState<string>(file?.content || '')

  React.useEffect(() => {
    setEditedContent(file?.content || '')
    setRenaming(false)
    setRewording(null)
  }, [file?.path])

  // Rename: the name is typed, the extension picked from the two a spec can have
  const baseRef = React.useRef<HTMLInputElement>(null)
  const extensionRef = React.useRef<HTMLSelectElement>(null)
  const renameDone = React.useRef(false)
  const nameParts = (name: string) => {
    const [, folder = '', base, extension = '.md'] = name.match(
      /^(.*\/)?([^/]+?)(\.md|\.feature)?$/
    )!
    return { folder, base, extension }
  }

  const startRename = () => {
    renameDone.current = false
    setRenaming(true)
  }

  const finishRename = (cancel = false) => {
    if (!file || renameDone.current) return // Enter / select change, then the blur of unmounting
    renameDone.current = true
    setRenaming(false)
    const base = baseRef.current?.value.trim() ?? ''
    const newName = `${nameParts(file.name).folder}${base}${extensionRef.current?.value ?? ''}`
    if (!cancel && base && newName !== file.name) onRename?.(file, newName)
  }

  // F2 or a double click on a step or title line; CodeMirror 5 keeps its editor on .CodeMirror
  const startReword = async (container: HTMLElement, onlyRewordable: boolean) => {
    if (!file || !onFindLine) return
    const editor = container.querySelector('.CodeMirror') as
      | (Element & {
          CodeMirror?: { getCursor: () => { line: number }; getLine: (line: number) => string }
        })
      | null
    const line = editor?.CodeMirror?.getCursor().line
    if (line === undefined) return
    // A double click elsewhere keeps selecting a word
    if (onlyRewordable && !isRewordable(editor!.CodeMirror!.getLine(line), file.name)) return
    const target = await onFindLine(file, line + 1)
    if (target) {
      renameDone.current = false
      setRewording(target)
    }
  }

  const finishReword = (newText: string | null) => {
    if (!rewording || renameDone.current) return
    renameDone.current = true
    setRewording(null)
    if (newText !== null && newText.trim() && newText.trim() !== rewording.text) {
      onReword?.(rewording, newText.trim())
    }
  }

  const handleContentChange = (content: string) => {
    setEditedContent(content)
    onContentChange(content)
  }

  if (!file) {
    return (
      <div className="director-editor">
        <Toolbar noShadow={true} className="director-section-toolbar">
          <span className="director-editor-filename">No file selected</span>
          <div className="director-spacer" />
        </Toolbar>
        <div className="director-editor-content">
          <div className="director-empty">Select a file to edit</div>
        </div>
      </div>
    )
  }

  return (
    <div className="director-editor">
      <Toolbar noShadow={true} className="director-section-toolbar">
        {rewording ? (
          <span className="director-editor-rename-group director-editor-reword-group">
            <span className="director-editor-filename">
              {rewording.kind === 'title'
                ? `${rewording.label}:`
                : rewording.definition
                  ? 'Step pattern:'
                  : 'Step:'}
            </span>
            <input
              className="director-editor-rename director-editor-reword"
              aria-label={rewording.kind === 'title' ? 'Title text' : 'Step text'}
              title={
                rewording.kind === 'title'
                  ? 'Only this title changes'
                  : rewording.definition
                    ? `Every spec step it matches and the pattern at ${rewording.definition} change - its code does not`
                    : 'Every spec step with this text changes'
              }
              defaultValue={rewording.text}
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => finishReword(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishReword(e.currentTarget.value)
                if (e.key === 'Escape') finishReword(null)
              }}
            />
          </span>
        ) : renaming ? (
          <span
            className="director-editor-rename-group"
            onBlur={(e) => {
              // Moving between the name and the extension keeps editing
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) finishRename()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finishRename()
              if (e.key === 'Escape') finishRename(true)
            }}
          >
            {nameParts(file.name).folder && (
              <span className="director-editor-filename">{nameParts(file.name).folder}</span>
            )}
            <input
              ref={baseRef}
              className="director-editor-filename director-editor-rename"
              aria-label="Spec name"
              defaultValue={nameParts(file.name).base}
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
            />
            <select
              ref={extensionRef}
              className="director-editor-rename"
              aria-label="Spec format"
              defaultValue={nameParts(file.name).extension}
              onChange={() => finishRename()}
            >
              <option value=".md">.md</option>
              <option value=".feature">.feature</option>
            </select>
          </span>
        ) : (
          <span
            className="director-editor-filename"
            title={
              onRename
                ? 'Double-click to rename; .md ↔ .feature converts the spec. F2 on a step rewords it everywhere'
                : undefined
            }
            onDoubleClick={() => onRename && startRename()}
          >
            {file.name}
          </span>
        )}
        {!rewording && <div className="director-spacer" />}

        {/* Mode toggle */}
        <div className="director-mode-toggle">
          <ToolbarButton
            icon="edit"
            title="Editor"
            toggled={mode === 'editor'}
            onClick={() => setMode('editor')}
          />
          <ToolbarButton
            icon="eye"
            title="Preview"
            toggled={mode === 'preview'}
            onClick={() => setMode('preview')}
          />
        </div>
      </Toolbar>

      <div
        className="director-editor-content"
        onKeyDown={(e) => {
          if (e.key !== 'F2' || mode !== 'editor') return
          e.preventDefault()
          void startReword(e.currentTarget, false)
        }}
        onDoubleClick={(e) => mode === 'editor' && void startReword(e.currentTarget, true)}
      >
        {mode === 'editor' ? (
          modesReady && (
            <CodeMirrorWrapper
              text={editedContent}
              highlighter={highlighterFor(file.name, editedContent)}
              onChange={handleContentChange}
              lineNumbers={true}
              wrapLines={true}
              placeholder="Write your test scenario here..."
            />
          )
        ) : (
          <div className="director-preview-content">
            <SpecPreview content={editedContent} markdown={!file.name.endsWith('.feature')} />
          </div>
        )}
      </div>
    </div>
  )
}
