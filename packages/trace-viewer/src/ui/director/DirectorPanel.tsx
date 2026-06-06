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

import React from 'react';
import { Toolbar } from '@web/components/toolbar';
import { SplitView } from '@web/components/splitView';
import { Dialog } from '@web/shared/dialog';
import { FileExplorer } from './FileExplorer';
import { DirectorEditor } from './DirectorEditor';
import { DirectorOutput } from './DirectorOutput';
import type { TestFile, DirectorOutputEntry, StageProgress } from './DirectorModel';

import './DirectorPanel.css';

export interface DirectorPanelProps {
  files: TestFile[];
  onFileSelect: (file: TestFile) => void;
  onFileContentChange: (path: string, content: string) => void;
  onStage: (file: TestFile) => void;
  onSyncWithTest: (scenarioName: string) => void;
}

export const DirectorPanel: React.FC<DirectorPanelProps> = ({
  files,
  onFileSelect,
  onFileContentChange,
  onStage,
  onSyncWithTest,
}) => {
  const [selectedFile, setSelectedFile] = React.useState<TestFile | null>(null);
  const [outputEntries, setOutputEntries] = React.useState<DirectorOutputEntry[]>([]);
  const [stageProgress, setStageProgress] = React.useState<StageProgress | undefined>();
  const [isStaging, setIsStaging] = React.useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = React.useState(false);
  const [newFileName, setNewFileName] = React.useState('');
  const [newFileExt, setNewFileExt] = React.useState('.md');
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [fileToDelete, setFileToDelete] = React.useState<TestFile | null>(null);

  // Handle file selection
  const handleFileSelect = (file: TestFile) => {
    setSelectedFile(file);
    onFileSelect(file);
    
    // Add to output
    addOutputEntry('info', `Selected: ${file.name}`);
  };

  // Handle content change
  const handleContentChange = (content: string) => {
    if (selectedFile) {
      onFileContentChange(selectedFile.path, content);
    }
  };

  // Handle new file via WebSocket
  const handleNewFile = () => {
    setShowNewFileDialog(true);
    setNewFileName('');
    setNewFileExt('.md');
  };

  // Confirm new file creation
  const handleConfirmNewFile = async () => {
    if (!newFileName.trim()) return;
    
    const fullName = newFileName.trim() + newFileExt;
    
    try {
      const { createFile } = await import('./wsClient');
      await createFile(fullName, '# New Test\n\n');
      addOutputEntry('info', `Created: ${fullName}`);
      setShowNewFileDialog(false);
      window.location.reload();
    } catch (e) {
      addOutputEntry('error', `Failed to create ${fullName}: ${e}`);
    }
  };

  // Handle delete file via WebSocket
  const handleDeleteFile = (file: TestFile) => {
    setFileToDelete(file);
    setShowDeleteDialog(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      const { deleteFile } = await import('./wsClient');
      await deleteFile(fileToDelete.name);
      addOutputEntry('info', `Deleted: ${fileToDelete.name}`);
      if (selectedFile?.path === fileToDelete.path) {
        setSelectedFile(null);
      }
      setShowDeleteDialog(false);
      setFileToDelete(null);
      window.location.reload();
    } catch (e) {
      addOutputEntry('error', `Failed to delete ${fileToDelete.name}: ${e}`);
    }
  };

  // Handle stage
  const handleStage = async () => {
    if (!selectedFile) return;
    
    setIsStaging(true);
    addOutputEntry('progress', `Staging ${selectedFile.name}...`);
    
    // Simulate progress
    setStageProgress({
      file: selectedFile.name,
      status: 'parsing',
      progress: 0,
      message: 'Parsing Markdown...',
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setStageProgress({
      file: selectedFile.name,
      status: 'generating',
      progress: 33,
      message: 'Generating test code...',
    });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setStageProgress({
      file: selectedFile.name,
      status: 'compiling',
      progress: 66,
      message: 'Compiling TypeScript...',
    });
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setStageProgress({
      file: selectedFile.name,
      status: 'done',
      progress: 100,
      message: 'Done!',
    });
    
    addOutputEntry('success', `Successfully staged ${selectedFile.name}`);
    
    onStage(selectedFile);
    
    setTimeout(() => {
      setStageProgress(undefined);
      setIsStaging(false);
    }, 1000);
  };

  // Add output entry
  const addOutputEntry = (type: DirectorOutputEntry['type'], message: string) => {
    setOutputEntries(prev => [...prev, {
      type,
      message,
      timestamp: Date.now(),
    }]);
  };

  // Clear output
  const handleClearOutput = () => {
    setOutputEntries([]);
  };

  return (
    <div className="director-panel">
      {/* Header */}
      <Toolbar noShadow={true} noMinHeight={true} style={{ height: '32px' }}>
        <img src='cyborgtests-logo.svg' alt="CyborgTests" className="director-panel-logo" />
        <div className='section-title'>DIRECTOR</div>
      </Toolbar>
      
      {/* Main content */}
      <SplitView
        sidebarSize={180}
        minSidebarSize={150}
        orientation='horizontal'
        sidebarIsFirst={true}
        settingName='directorFileExplorer'
        sidebar={<div className="director-sidebar">
          <FileExplorer
            files={files}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onNewFile={handleNewFile}
            onDeleteFile={handleDeleteFile}
          />
        </div>}
        main={<SplitView
          sidebarSize={250}
          minSidebarSize={150}
          orientation='vertical'
          sidebarIsFirst={true}
          settingName='directorEditorOutput'
          sidebar={<div className="director-editor-panel">
            <DirectorEditor
              file={selectedFile}
              onContentChange={handleContentChange}
              onStage={handleStage}
              isStaging={isStaging}
            />
          </div>}
          main={<div className="director-output-panel">
            <DirectorOutput
              entries={outputEntries}
              progress={stageProgress}
              onClear={handleClearOutput}
            />
          </div>}
        />}
      />
      
      {/* New File Dialog */}
      <Dialog
        open={showNewFileDialog}
        isModal={true}
        requestClose={() => setShowNewFileDialog(false)}
        style={{ minWidth: 300 }}
      >
        <div className="title">New File</div>
        <div className="body">
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: 'var(--vscode-foreground)', display: 'block', marginBottom: '5px' }}>File Name:</label>
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
            <label style={{ color: 'var(--vscode-foreground)', display: 'block', marginBottom: '5px' }}>Extension:</label>
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
            <button
              className="button"
              onClick={() => setShowNewFileDialog(false)}
            >
              Cancel
            </button>
            <button
              className="button"
              onClick={handleConfirmNewFile}
            >
              Create
            </button>
          </div>
        </div>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        isModal={true}
        requestClose={() => {
          setShowDeleteDialog(false);
          setFileToDelete(null);
        }}
        style={{ minWidth: 300 }}
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
                setShowDeleteDialog(false);
                setFileToDelete(null);
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
  );
};
