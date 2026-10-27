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
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'

import type { TestFile } from './DirectorModel'

type EditorMode = 'editor' | 'preview'

const HEADING_INDENT: Record<string, number> = { h2: 0, h3: 16, h4: 32 }
const LIST_BASE_INDENT = 20

function buildMarkdownComponents(content: string): Components {
  const headingIndentRef = { current: 0 }

  const makeHeading =
    (tag: keyof typeof HEADING_INDENT, bold = false): Components['h2'] =>
    ({ children, ...props }) => {
      headingIndentRef.current = HEADING_INDENT[tag] ?? 0
      return React.createElement(
        tag,
        props,
        bold ? React.createElement('strong', null, children) : children
      )
    }

  void content
  return {
    h2: makeHeading('h2', true),
    h3: makeHeading('h3', true),
    h4: makeHeading('h4', true),
    ul: ({ children, ...props }) => {
      return (
        <ul {...props} style={{ paddingLeft: LIST_BASE_INDENT + headingIndentRef.current }}>
          {children}
        </ul>
      )
    },
    ol: ({ children, ...props }) => {
      return (
        <ol {...props} style={{ paddingLeft: LIST_BASE_INDENT + headingIndentRef.current }}>
          {children}
        </ol>
      )
    }
  }
}

export interface DirectorEditorProps {
  file: TestFile | null
  onContentChange: (content: string) => void
  /** The file name was edited in the toolbar: a new extension converts the spec */
  onRename?: (file: TestFile, newName: string) => void
}

export const DirectorEditor: React.FC<DirectorEditorProps> = ({
  file,
  onContentChange,
  onRename
}) => {
  const [mode, setMode] = React.useState<EditorMode>('editor')
  const [renaming, setRenaming] = React.useState(false)
  const [editedContent, setEditedContent] = React.useState<string>(file?.content || '')
  const markdownComponents = React.useMemo(
    () => buildMarkdownComponents(editedContent),
    [editedContent]
  )

  React.useEffect(() => {
    setEditedContent(file?.content || '')
    setRenaming(false)
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
        {renaming ? (
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
              onRename ? 'Double-click to rename; .md ↔ .feature converts the spec' : undefined
            }
            onDoubleClick={() => onRename && startRename()}
          >
            {file.name}
          </span>
        )}
        <div className="director-spacer" />

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

      <div className="director-editor-content">
        {mode === 'editor' ? (
          <CodeMirrorWrapper
            text={editedContent}
            highlighter="markdown"
            onChange={handleContentChange}
            lineNumbers={true}
            wrapLines={true}
            placeholder="Write your test scenario here..."
          />
        ) : (
          <div className="director-preview-content">
            {file.name.endsWith('.feature') ? (
              // Gherkin is plain text: keep its indentation instead of rendering it as Markdown
              <pre className="director-preview-gherkin">{editedContent}</pre>
            ) : (
              <ReactMarkdown components={markdownComponents}>{editedContent}</ReactMarkdown>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
