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
  const handleNewFile = async (name: string, ext: string) => {
    const fullName = name.trim() + ext;
    
    try {
      const { createFile } = await import('./wsClient');
      await createFile(fullName, '# New Test\n\n');
      addOutputEntry('info', `Created: ${fullName}`);
      window.location.reload();
    } catch (e) {
      addOutputEntry('error', `Failed to create ${fullName}: ${e}`);
    }
  };

  // Handle delete file via WebSocket
  const handleDeleteFile = async (file: TestFile) => {
    try {
      const { deleteFile } = await import('./wsClient');
      await deleteFile(file.name);
      addOutputEntry('info', `Deleted: ${file.name}`);
      if (selectedFile?.path === file.path) {
        setSelectedFile(null);
      }
      window.location.reload();
    } catch (e) {
      addOutputEntry('error', `Failed to delete ${file.name}: ${e}`);
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
      {/* Main content */}
      <SplitView
        sidebarSize={130}
        minSidebarSize={70}
        orientation='horizontal'
        sidebarIsFirst={true}
        settingName='directorFileExplorer'
        sidebar={<FileExplorer
          files={files}
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
          onNewFile={handleNewFile}
          onDeleteFile={handleDeleteFile}
        />}
        main={<SplitView
          sidebarSize={250}
          minSidebarSize={150}
          orientation='vertical'
          sidebarIsFirst={false}
          settingName='directorEditorOutput'
          sidebar={<DirectorOutput
            entries={outputEntries}
            progress={stageProgress}
            onClear={handleClearOutput}
          />}
          main={<DirectorEditor
            file={selectedFile}
            onContentChange={handleContentChange}
            onStage={handleStage}
            isStaging={isStaging}
          />}
        />}
      />
    </div>
  );
};
