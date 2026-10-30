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

import { DirectorEditor, type LineToReword } from './DirectorEditor'
import type { DirectorOutputEntry, StageProgress, TestFile } from './DirectorModel'
import { DirectorOutput } from './DirectorOutput'
import { FileExplorer } from './FileExplorer'
import { onGeneration } from './wsClient'

export interface DirectorPanelProps {
  files: TestFile[]
  onFileSelect: (file: TestFile) => void
  onFileContentChange: (path: string, content: string) => void
  onStage: (file: TestFile) => void
  onFilesRefresh?: (files: TestFile[]) => void
}

const GENERATING = 'Generating tests'

export const DirectorPanel: React.FC<DirectorPanelProps> = ({
  files,
  onFileSelect,
  onFileContentChange,
  onStage,
  onFilesRefresh
}) => {
  const [selectedFile, setSelectedFile] = React.useState<TestFile | null>(null)
  const [outputEntries, setOutputEntries] = React.useState<DirectorOutputEntry[]>([])
  const [stageProgress, setStageProgress] = React.useState<StageProgress | undefined>()
  const [isStaging, setIsStaging] = React.useState(false)
  const [editorRevision, setEditorRevision] = React.useState(0) // remounts the editor: file reloaded
  // Regeneration keeps one line of the output up to date instead of a line per update
  React.useEffect(() => {
    onGeneration((event) => {
      const entry = (type: DirectorOutputEntry['type'], message: string) => ({
        type,
        message,
        timestamp: Date.now()
      })
      setOutputEntries((prev) => {
        const earlier = prev.at(-1)?.message.startsWith(GENERATING) ? prev.slice(0, -1) : prev
        if ('total' in event) {
          const counter = event.total > 0 ? `: ${event.done} / ${event.total}` : '...'
          return [...earlier, entry('progress', `${GENERATING}${counter}`)]
        }
        return [
          ...earlier,
          event.failed
            ? entry('error', 'Tests not generated - the terminal shows why')
            : entry('success', `Generated tests in ${event.seconds} s`)
        ]
      })
    })
  }, [])
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
      const updatedFiles = await getFiles()
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
      const updatedFiles = await getFiles()
      onFilesRefresh?.(updatedFiles)
    } catch (e) {
      addOutputEntry('error', `Failed to delete ${file.name}: ${e}`)
    }
  }

  // The file name edited above the editor: a new extension converts the spec (npm run adapt), a
  // new name renames it with its step file (npm run rename) - both: convert first, it may refuse
  const handleRename = async (file: TestFile, newName: string) => {
    const parse = (name: string) => name.match(/^(.*\/)?([^/]+?)(\.md|\.feature)?$/)!
    const [, folder = '', base, extension] = parse(file.name)
    const [, newFolder = '', newBase, newExtension] = parse(newName)
    if (!newExtension) {
      addOutputEntry('error', 'A spec ends with .md or .feature - nothing was renamed')
      return
    }
    if (newFolder !== folder) {
      addOutputEntry('error', 'Only the name and the extension can change here, not the folder')
      return
    }

    let current = file.name
    try {
      const { adaptFile, getFiles, renameFile } = await import('./wsClient')
      // A taken name must stop the conversion too - all or nothing
      if (newBase !== base && newExtension !== extension) await renameFile(current, newBase, true)
      if (newExtension !== extension) {
        const converted = await adaptFile(current)
        addScriptOutput(converted.output)
        current = converted.target.replace(/^test-suites\//, '')
      }
      if (newBase !== base) {
        const renamed = await renameFile(current, newBase)
        addScriptOutput(renamed.output)
        current = renamed.target.replace(/^test-suites\//, '')
      }
      const updatedFiles = await getFiles()
      onFilesRefresh?.(updatedFiles)
      const result = updatedFiles.find((f) => f.name === current)
      if (result) handleFileSelect(result)
    } catch (e) {
      addScriptOutput(String(e))
    }
  }

  // F2 or a double click on a line: npm run reword --find gives the step or title to edit there
  const handleFindLine = async (file: TestFile, line: number): Promise<LineToReword | null> => {
    try {
      const { findLine } = await import('./wsClient')
      return { line, ...(await findLine(file.name, line)) }
    } catch (e) {
      addScriptOutput(String(e))
      return null
    }
  }

  // A step: the new text in every spec and its definition pattern; a title: on its line only.
  // The editor reloads the file
  const handleReword = async (target: LineToReword, newText: string) => {
    if (!selectedFile) return
    try {
      const { getFiles, rewordStep, rewordTitle } = await import('./wsClient')
      const { output } =
        target.kind === 'title'
          ? await rewordTitle(selectedFile.name, target.line, newText)
          : await rewordStep(target.text, newText)
      addScriptOutput(output)
      const updatedFiles = await getFiles()
      onFilesRefresh?.(updatedFiles)
      const current = updatedFiles.find((f) => f.name === selectedFile?.name)
      if (current) setSelectedFile(current)
      setEditorRevision((revision) => revision + 1)
    } catch (e) {
      addScriptOutput(String(e))
    }
  }

  const addScriptOutput = (output: string) =>
    output
      .split('\n')
      .filter((line) => line.trim())
      .forEach((line) =>
        addOutputEntry(
          /❌|🔶|Set the keywords|Check that|^\s+[-•] /.test(line)
            ? 'error'
            : line.includes('→')
              ? 'success'
              : 'info',
          line.trim()
        )
      )

  // Handle stage - run real npm run stage via WebSocket
  const handleStage = async () => {
    const mdFiles = files.filter((f) => f.name.endsWith('.md') || f.name.endsWith('.feature'))
    if (mdFiles.length === 0) {
      addOutputEntry('error', 'No Markdown or Gherkin files to stage')
      return
    }

    setIsStaging(true)
    addOutputEntry('progress', `Staging ${mdFiles.length} file(s)...`)

    try {
      const { runStage } = await import('./wsClient')
      const result = await runStage()

      // Add output lines from stage command
      const lines = result.output.split('\n').filter((l) => l.trim())
      lines.forEach((line) => {
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

      // Refresh files after stage (specs may have been reformatted)
      const { getFiles } = await import('./wsClient')
      const updatedFiles = await getFiles()
      onFilesRefresh?.(updatedFiles)

      // Notify all files were staged
      mdFiles.forEach((file) => onStage(file))
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
                key={editorRevision}
                file={selectedFile}
                onContentChange={handleContentChange}
                onRename={handleRename}
                onFindLine={handleFindLine}
                onReword={handleReword}
              />
            }
          />
        }
      />
    </div>
  )
}
