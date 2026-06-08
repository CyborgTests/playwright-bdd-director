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

import './DirectorOutput.css'

import { Toolbar } from '@web/components/toolbar'
import { ToolbarButton } from '@web/components/toolbarButton'
import { clsx } from '@web/uiUtils'
import React from 'react'

import type { DirectorOutputEntry, StageProgress } from './DirectorModel'

export interface DirectorOutputProps {
  entries: DirectorOutputEntry[]
  progress?: StageProgress
  onClear: () => void
}

export const DirectorOutput: React.FC<DirectorOutputProps> = ({ entries, progress, onClear }) => {
  const outputRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [entries])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="director-output">
      <Toolbar noShadow={true} className="director-section-toolbar">
        <span className="director-output-title">Output</span>
        <div className="director-spacer" />

        {/* Progress indicator */}
        {progress && (
          <div className="director-progress">
            <span className="director-progress-file">{progress.file}</span>
            <span className={clsx('director-progress-status', progress.status)}>
              {progress.status}
            </span>
            <div className="director-progress-bar">
              <div className="director-progress-fill" style={{ width: `${progress.progress}%` }} />
            </div>
          </div>
        )}

        <ToolbarButton icon="clear-all" title="Clear output" onClick={onClear} />
      </Toolbar>

      <div ref={outputRef} className="director-output-content">
        {entries.length === 0 ? (
          <div className="director-output-empty">No output yet...</div>
        ) : (
          entries.map((entry, i) => (
            <div key={i} className={clsx('director-output-line', `type-${entry.type}`)}>
              <span className="director-output-time">{formatTime(entry.timestamp)}</span>
              <span className="director-output-message">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
