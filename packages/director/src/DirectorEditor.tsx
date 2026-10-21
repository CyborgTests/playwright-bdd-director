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
}

export const DirectorEditor: React.FC<DirectorEditorProps> = ({ file, onContentChange }) => {
  const [mode, setMode] = React.useState<EditorMode>('editor')
  const [editedContent, setEditedContent] = React.useState<string>(file?.content || '')
  const markdownComponents = React.useMemo(
    () => buildMarkdownComponents(editedContent),
    [editedContent]
  )

  React.useEffect(() => {
    setEditedContent(file?.content || '')
  }, [file?.path])

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
        <span className="director-editor-filename">{file?.name || 'No file selected'}</span>
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
