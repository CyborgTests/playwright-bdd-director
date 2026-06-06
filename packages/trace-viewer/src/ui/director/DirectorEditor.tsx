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

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditedContent(newContent);
    onContentChange(newContent);
  };

  const renderPreview = () => {
    if (!file) return <div className="director-empty">Select a file to preview</div>;
    
    // Simple markdown-like preview
    const lines = editedContent.split('\n');
    return (
      <div className="director-preview-content">
        {lines.map((line, i) => {
          // Headers
          if (line.startsWith('### ')) {
            return <h3 key={i} className="director-preview-h3">{line.slice(4)}</h3>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={i} className="director-preview-h2">{line.slice(3)}</h2>;
          }
          if (line.startsWith('# ')) {
            return <h1 key={i} className="director-preview-h1">{line.slice(2)}</h1>;
          }
          // List items (steps)
          if (line.trim().startsWith('- ')) {
            return (
              <div key={i} className="director-preview-step">
                <span className="director-preview-bullet">•</span>
                {line.trim().slice(2)}
              </div>
            );
          }
          // Gherkin keywords
          const gherkinMatch = line.match(/^(Given|When|Then|And|But)\s+(.+)$/i);
          if (gherkinMatch) {
            const [, keyword, text] = gherkinMatch;
            return (
              <div key={i} className="director-preview-step">
                <span className={clsx('director-gherkin-keyword', keyword.toLowerCase())}>
                  {keyword}
                </span>
                {text}
              </div>
            );
          }
          // Empty line
          if (!line.trim()) {
            return <div key={i} className="director-preview-empty" />;
          }
          // Regular text
          return <div key={i} className="director-preview-text">{line}</div>;
        })}
      </div>
    );
  };

  const renderEditor = () => {
    if (!file) return <div className="director-empty">Select a file to edit</div>;
    
    return (
      <textarea
        className="director-textarea"
        value={editedContent}
        onChange={handleContentChange}
        spellCheck={false}
        placeholder="Write your test scenario here..."
      />
    );
  };

  return (
    <div className="director-editor">
      <Toolbar noShadow={true} noMinHeight={true}>
        <span className="director-editor-filename">{file?.name || 'No file selected'}</span>
        {file?.isModified && <span className="director-modified-indicator">●</span>}
        <div className="director-spacer" />
        
        {/* Mode toggle */}
        <div className="director-mode-toggle">
          <button
            className={clsx('director-mode-btn', mode === 'editor' && 'active')}
            onClick={() => setMode('editor')}
            title="Editor"
          >
            Editor
          </button>
          <button
            className={clsx('director-mode-btn', mode === 'preview' && 'active')}
            onClick={() => setMode('preview')}
            title="Preview"
          >
            Preview
          </button>
        </div>
        
        <div className="director-spacer" />
        
        {/* Stage button */}
        <ToolbarButton
          icon={isStaging ? 'sync~spin' : 'sync'}
          title={isStaging ? 'Staging...' : 'Stage (generate tests)'}
          onClick={onStage}
          disabled={!file || isStaging}
        />
      </Toolbar>
      
      <div className="director-editor-content">
        {mode === 'editor' ? renderEditor() : renderPreview()}
      </div>
    </div>
  );
};
