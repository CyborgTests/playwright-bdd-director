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

import '@web/third_party/vscode/codicon.css'
import './FileExplorer.css'

import { ListView } from '@web/components/listView'
import { Toolbar } from '@web/components/toolbar'
import { ToolbarButton } from '@web/components/toolbarButton'
import { Dialog } from '@web/shared/dialog'
import React from 'react'

import type { TestFile } from './DirectorModel'

export interface FileExplorerProps {
  files: TestFile[]
  selectedFile: TestFile | null
  onFileSelect: (file: TestFile) => void
  onNewFile?: (name: string, ext: string) => void
  onDeleteFile?: (file: TestFile) => void
  runningFile?: string
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  selectedFile,
  onFileSelect,
  onNewFile,
  onDeleteFile,
  runningFile: _runningFile
}) => {
  // Dialog states
  const [showNewFileDialog, setShowNewFileDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [newFileName, setNewFileName] = React.useState('')
  const [newFileExt, setNewFileExt] = React.useState('.md')
  const [fileToDelete, setFileToDelete] = React.useState<TestFile | null>(null)
  const [deleteButtonRef, setDeleteButtonRef] = React.useState<HTMLButtonElement | null>(null)

  // Button refs for anchoring
  const newFileButtonRef = React.useRef<HTMLButtonElement>(null)

  // Handlers
  const handleNewFile = () => {
    setShowDeleteDialog(false)
    setFileToDelete(null)
    setDeleteButtonRef(null)
    setShowNewFileDialog(true)
    setNewFileName('')
    setNewFileExt('.md')
  }

  const handleConfirmNewFile = () => {
    if (!newFileName.trim()) return
    onNewFile?.(newFileName, newFileExt)
    setShowNewFileDialog(false)
  }

  const handleDeleteFile = (file: TestFile, buttonEl: HTMLButtonElement | null) => {
    setShowNewFileDialog(false)
    setNewFileName('')
    setNewFileExt('.md')
    // Select the file being deleted
    onFileSelect(file)
    setFileToDelete(file)
    setDeleteButtonRef(buttonEl)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = () => {
    if (!fileToDelete) return
    onDeleteFile?.(fileToDelete)
    setShowDeleteDialog(false)
    setFileToDelete(null)
  }

  return (
    <div className="director-file-explorer">
      <Toolbar noShadow={true} className="director-section-toolbar">
        <img src="cyborgtests-logo.svg" alt="CyborgTests" className="director-panel-logo" />
        <div className="section-title">DIRECTOR</div>
        {onNewFile && (
          <ToolbarButton
            ref={newFileButtonRef}
            icon="add"
            title="New file"
            onClick={handleNewFile}
          />
        )}
      </Toolbar>
      <div className="director-files-wrapper">
        <ListView
          name="director-files"
          items={files}
          id={(file) => file?.path || ''}
          isDeleting={(file) => fileToDelete?.path === file?.path && showDeleteDialog}
          render={(file) => {
            if (!file) return null
            return (
              <div className="hbox director-tree-item">
                <div className="director-tree-item-title">
                  <span>{file.name}</span>
                  {file.isModified && <span className="director-file-modified">●</span>}
                </div>
                <Toolbar noShadow={true}>
                  {onDeleteFile && (
                    <ToolbarButton
                      icon="trash"
                      title="Delete"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        handleDeleteFile(file, e.currentTarget as HTMLButtonElement)
                      }}
                    />
                  )}
                </Toolbar>
              </div>
            )
          }}
          selectedItem={selectedFile}
          onSelected={(file) => {
            if (file) onFileSelect(file)
          }}
          noItemsMessage="No files"
        />
      </div>

      {/* New File Dialog */}
      <Dialog
        open={showNewFileDialog}
        isModal={false}
        requestClose={() => setShowNewFileDialog(false)}
        style={{ minWidth: 250, maxWidth: 250, width: 250 }}
        anchor={newFileButtonRef}
        verticalOffset={4}
        horizontalOffset={0}
        anchorRightEdge={true}
      >
        <div className="title">New File</div>
        <div className="body">
          <div style={{ marginBottom: '15px' }}>
            <label
              style={{ color: 'var(--vscode-foreground)', display: 'block', marginBottom: '5px' }}
            >
              File Name:
            </label>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleConfirmNewFile()}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: 'var(--vscode-input-background)',
                border: '1px solid var(--vscode-input-border)',
                color: 'var(--vscode-input-foreground)',
                borderRadius: '4px'
              }}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label
              style={{ color: 'var(--vscode-foreground)', display: 'block', marginBottom: '5px' }}
            >
              Extension:
            </label>
            <select
              value={newFileExt}
              onChange={(e) => setNewFileExt(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: 'var(--vscode-input-background)',
                border: '1px solid var(--vscode-input-border)',
                color: 'var(--vscode-input-foreground)',
                borderRadius: '4px'
              }}
            >
              <option value=".md">.md (Markdown)</option>
              <option value=".feature">.feature (Gherkin)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="button" onClick={() => setShowNewFileDialog(false)}>
              Cancel
            </button>
            <button
              className="button"
              onClick={handleConfirmNewFile}
              style={{ backgroundColor: '#4caf50' }}
            >
              Create
            </button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        isModal={false}
        requestClose={() => {
          setShowDeleteDialog(false)
          setFileToDelete(null)
          setDeleteButtonRef(null)
        }}
        style={{ minWidth: 250, maxWidth: 250, width: 250 }}
        anchor={{ current: deleteButtonRef }}
        verticalOffset={4}
        horizontalOffset={0}
        anchorRightEdge={true}
      >
        <div className="title">Delete File</div>
        <div className="body">
          <p style={{ color: 'var(--vscode-foreground)', marginBottom: '20px' }}>
            Are you sure you want to delete <strong>{fileToDelete?.name}</strong>?
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              className="button"
              onClick={() => {
                setShowDeleteDialog(false)
                setFileToDelete(null)
              }}
            >
              Cancel
            </button>
            <button
              className="button"
              onClick={handleConfirmDelete}
              style={{ backgroundColor: 'var(--vscode-errorForeground)' }}
            >
              Delete
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
