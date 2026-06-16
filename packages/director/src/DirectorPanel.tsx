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

import './DirectorPanel.css'

import { SplitView } from '@web/components/splitView'
import React from 'react'

import { DirectorEditor } from './DirectorEditor'
import type { DirectorOutputEntry, StageProgress, TestFile } from './DirectorModel'
import { DirectorOutput } from './DirectorOutput'
import { FileExplorer } from './FileExplorer'

export interface DirectorPanelProps {
  files: TestFile[]
  onFileSelect: (file: TestFile) => void
  onFileContentChange: (path: string, content: string) => void
  onStage: (file: TestFile) => void
  onSyncWithTest: (scenarioName: string) => void
  onFilesRefresh?: (files: TestFile[]) => void
}

export const DirectorPanel: React.FC<DirectorPanelProps> = ({
  files,
  onFileSelect,
  onFileContentChange,
  onStage,
  onSyncWithTest: _onSyncWithTest,
  onFilesRefresh
}) => {
  const [selectedFile, setSelectedFile] = React.useState<TestFile | null>(null)
  const [outputEntries, setOutputEntries] = React.useState<DirectorOutputEntry[]>([])
  const [stageProgress, setStageProgress] = React.useState<StageProgress | undefined>()
  const [isStaging, setIsStaging] = React.useState(false)
  // Handle file selection
  const handleFileSelect = (file: TestFile) => {
    setSelectedFile(file)
    onFileSelect(file)

    // Add to output
    addOutputEntry('info', `Selected: ${file.name}`)
  }

  // Handle content change
  const handleContentChange = (content: string) => {
    if (selectedFile) {
      onFileContentChange(selectedFile.path, content)
    }
  }

  // Handle new file via WebSocket
  const handleNewFile = async (name: string, ext: string) => {
    const fullName = name.trim() + ext

    try {
      const { createFile, getFiles } = await import('./wsClient')
      await createFile(fullName, '# New Test\n\n')
      addOutputEntry('success', `Created: ${fullName}`)
      // Refresh file list without reload
      const updatedFiles = await getFiles() as TestFile[]
      onFilesRefresh?.(updatedFiles)
    } catch (e) {
      addOutputEntry('error', `Failed to create ${fullName}: ${e}`)
    }
  }

  // Handle delete file via WebSocket
  const handleDeleteFile = async (file: TestFile) => {
    try {
      const { deleteFile, getFiles } = await import('./wsClient')
      await deleteFile(file.name)
      addOutputEntry('error', `Deleted: ${file.name}`)
      if (selectedFile?.path === file.path) {
        setSelectedFile(null)
      }
      // Refresh file list without reload
      const updatedFiles = await getFiles() as TestFile[]
      onFilesRefresh?.(updatedFiles)
    } catch (e) {
      addOutputEntry('error', `Failed to delete ${file.name}: ${e}`)
    }
  }

  // Handle stage - run real npm run stage via WebSocket
  const handleStage = async () => {
    const mdFiles = files.filter(f => f.name.endsWith('.md'))
    if (mdFiles.length === 0) {
      addOutputEntry('error', 'No Markdown files to stage')
      return
    }

    setIsStaging(true)
    addOutputEntry('progress', `Staging ${mdFiles.length} file(s)...`)

    try {
      const { runStage } = await import('./wsClient')
      const result = await runStage()

      // Add output lines from stage command
      const lines = result.output.split('\n').filter(l => l.trim())
      lines.forEach(line => {
        if (line.includes('error') || line.includes('Error')) {
          addOutputEntry('error', line)
        } else if (line.includes('success') || line.includes('✅') || line.includes('fixed')) {
          addOutputEntry('success', line)
        } else {
          addOutputEntry('info', line)
        }
      })

      setStageProgress({
        file: '',
        status: 'done',
        progress: 100,
        message: 'Stage complete!'
      })

      // Refresh files after stage (may have generated new test files)
      const { getFiles } = await import('./wsClient')
      const updatedFiles = await getFiles() as TestFile[]
      onFilesRefresh?.(updatedFiles)

      // Notify all files were staged
      mdFiles.forEach(file => onStage(file))
    } catch (e) {
      addOutputEntry('error', `Stage failed: ${e}`)
    }

    setTimeout(() => {
      setStageProgress(undefined)
      setIsStaging(false)
    }, 1500)
  }

  // Add output entry
  const addOutputEntry = (type: DirectorOutputEntry['type'], message: string) => {
    setOutputEntries((prev) => [
      ...prev,
      {
        type,
        message,
        timestamp: Date.now()
      }
    ])
  }

  // Clear output
  const handleClearOutput = () => {
    setOutputEntries([])
  }

  return (
    <div className="director-panel">
      {/* Main content */}
      <SplitView
        sidebarSize={150}
        minSidebarSize={100}
        orientation="horizontal"
        sidebarIsFirst={true}
        settingName="directorFileExplorer"
        sidebar={
          <FileExplorer
            files={files}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onNewFile={handleNewFile}
            onDeleteFile={handleDeleteFile}
            onStage={handleStage}
            isStaging={isStaging}
          />
        }
        main={
          <SplitView
            sidebarSize={250}
            minSidebarSize={150}
            orientation="vertical"
            sidebarIsFirst={false}
            settingName="directorEditorOutput"
            sidebar={
              <DirectorOutput
                entries={outputEntries}
                progress={stageProgress}
                onClear={handleClearOutput}
              />
            }
            main={
              <DirectorEditor
                file={selectedFile}
                onContentChange={handleContentChange}
              />
            }
          />
        }
      />
    </div>
  )
}
