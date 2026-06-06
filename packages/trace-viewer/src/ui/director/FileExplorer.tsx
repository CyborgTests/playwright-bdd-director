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
import { clsx } from '@web/uiUtils';
import type { TestFile } from './DirectorModel';

import './FileExplorer.css';

export interface FileExplorerProps {
  files: TestFile[];
  selectedFile: TestFile | null;
  onFileSelect: (file: TestFile) => void;
  onNewFile?: () => void;
  onDeleteFile?: (file: TestFile) => void;
  runningFile?: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  selectedFile,
  onFileSelect,
  onNewFile,
  onDeleteFile,
  runningFile,
}) => {
  return (
    <div className="director-file-explorer">
      <div className="director-section-title">
        📁 test-suites
        {onNewFile && (
          <button 
            className="director-new-file-btn" 
            onClick={onNewFile}
            title="New file"
          >
            + New
          </button>
        )}
      </div>
      <div className="director-file-list">
        {files.map(file => (
          <div
            key={file.path}
            className={clsx(
              'director-file-item',
              selectedFile?.path === file.path && 'selected',
              file.status === 'running' && 'running',
              file.status === 'passed' && 'passed',
              file.status === 'failed' && 'failed',
              file.status === 'staged' && 'staged'
            )}
            onClick={() => onFileSelect(file)}
          >
            <span className="director-file-icon">
              {file.status === 'passed' && '✓'}
              {file.status === 'failed' && '✗'}
              {file.status === 'running' && '⏳'}
              {file.status === 'staged' && '🔄'}
              {file.status === 'idle' && '📝'}
            </span>
            <span className="director-file-name">{file.name}</span>
            {file.isModified && <span className="director-file-modified">●</span>}
            {onDeleteFile && (
              <button 
                className="director-delete-btn" 
                onClick={(e) => { e.stopPropagation(); onDeleteFile(file); }}
                title="Delete file"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
