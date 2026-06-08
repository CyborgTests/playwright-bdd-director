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
import { Toolbar } from '@web/components/toolbar';
import { ToolbarButton } from '@web/components/toolbarButton';
import { CodeMirrorWrapper } from '@web/components/codeMirrorWrapper';
import ReactMarkdown from 'react-markdown';
import type { TestFile } from './DirectorModel';

import './DirectorEditor.css';

type EditorMode = 'editor' | 'preview';

export interface DirectorEditorProps {
  file: TestFile | null;
  onContentChange: (content: string) => void;
  onStage: () => void;
  isStaging: boolean;
}

export const DirectorEditor: React.FC<DirectorEditorProps> = ({
  file,
  onContentChange,
  onStage,
  isStaging,
}) => {
  const [mode, setMode] = React.useState<EditorMode>('editor');
  const [editedContent, setEditedContent] = React.useState<string>(file?.content || '');

  React.useEffect(() => {
    setEditedContent(file?.content || '');
  }, [file?.path]);

  const handleContentChange = (content: string) => {
    setEditedContent(content);
    onContentChange(content);
  };

  if (!file) {
    return (
      <div className="director-editor">
        <Toolbar noShadow={true} className='director-section-toolbar'>
          <span className="director-editor-filename">No file selected</span>
          <div className="director-spacer" />
        </Toolbar>
        <div className="director-editor-content">
          <div className="director-empty">Select a file to edit</div>
        </div>
      </div>
    );
  }

  return (
    <div className="director-editor">
      <Toolbar noShadow={true} className='director-section-toolbar'>
        <span className="director-editor-filename">{file?.name || 'No file selected'}</span>
        <div className="director-spacer" />
        
        {/* Mode toggle */}
        <div className="director-mode-toggle">
          <ToolbarButton
            icon='edit'
            title='Editor'
            toggled={mode === 'editor'}
            onClick={() => setMode('editor')}
          />
          <ToolbarButton
            icon='eye'
            title='Preview'
            toggled={mode === 'preview'}
            onClick={() => setMode('preview')}
          />
        </div>
        
        {/* Stage button */}
        <ToolbarButton
          icon={isStaging ? 'sync~spin' : 'sync'}
          title={isStaging ? 'Staging...' : 'Stage (generate tests)'}
          onClick={onStage}
          disabled={!file || isStaging}
        />
      </Toolbar>
      
      <div className="director-editor-content">
        {mode === 'editor' ? (
          <CodeMirrorWrapper
            text={editedContent}
            highlighter='markdown'
            onChange={handleContentChange}
            lineNumbers={true}
            wrapLines={true}
            placeholder="Write your test scenario here..."
          />
        ) : (
          <div className="director-preview-content">
            <ReactMarkdown>{editedContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
