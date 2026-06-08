/*
  Copyright (c) Microsoft Corporation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import * as React from 'react'

import { useMeasureForRef } from '../uiUtils'

export interface DialogProps {
  className?: string
  style?: React.CSSProperties
  open: boolean
  isModal?: boolean
  minWidth?: number
  verticalOffset?: number
  horizontalOffset?: number
  alignRight?: boolean
  anchorRightEdge?: boolean
  requestClose?: () => void
  anchor?: React.RefObject<HTMLElement | null>
  dataTestId?: string
}

export const Dialog: React.FC<React.PropsWithChildren<DialogProps>> = ({
  className,
  style: externalStyle,
  open,
  isModal,
  minWidth,
  verticalOffset,
  horizontalOffset,
  alignRight,
  anchorRightEdge,
  requestClose,
  anchor,
  dataTestId,
  children
}) => {
  const dialogRef = React.useRef<HTMLDialogElement>(null)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setRecalculateDimensionsCount] = React.useState(0)
  const [dialogMeasure] = useMeasureForRef(dialogRef)
  const [anchorMeasure, recalculateAnchorMeasure] = useMeasureForRef(anchor)
  const position = anchor
    ? dialogPosition(
        dialogMeasure,
        anchorMeasure,
        verticalOffset,
        horizontalOffset,
        alignRight,
        anchorRightEdge
      )
    : undefined

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!dialogRef.current || !(event.target instanceof Node)) return

      if (!dialogRef.current.contains(event.target)) requestClose?.()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose?.()
    }

    if (open) {
      document.addEventListener('mousedown', onClick)
      document.addEventListener('keydown', onKeyDown)

      return () => {
        document.removeEventListener('mousedown', onClick)
        document.removeEventListener('keydown', onKeyDown)
      }
    }

    return () => {}
  }, [open, requestClose])

  React.useLayoutEffect(() => recalculateAnchorMeasure(), [open, recalculateAnchorMeasure])

  React.useEffect(() => {
    const onResize = () => setRecalculateDimensionsCount((count) => count + 1)

    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  React.useLayoutEffect(() => {
    if (!dialogRef.current) return

    if (open) {
      if (isModal) dialogRef.current.showModal()
      else dialogRef.current.show()
    } else {
      dialogRef.current.close()
    }
  }, [open, isModal])

  return (
    <dialog
      ref={dialogRef}
      style={{
        position: 'fixed',
        margin: position ? 0 : undefined,
        zIndex: 110, // on top of split view resizer
        top: position?.top,
        left: position?.left,
        minWidth: minWidth || 0,
        ...externalStyle
      }}
      className={className}
      data-testid={dataTestId}
    >
      {children}
    </dialog>
  )
}

// Note: there is a copy of this method in highlight.ts. Please fix bugs in both places.
function dialogPosition(
  dialogBox: DOMRect,
  anchorBox: DOMRect,
  verticalOffset = 4,
  horizontalOffset = 4,
  alignRight = false,
  anchorRightEdge = false
): { top: number; left: number } {
  let left: number
  if (anchorRightEdge) {
    // Align dialog's left edge with anchor's right edge
    left = anchorBox.right + horizontalOffset
  } else if (alignRight) {
    // Align dialog's right edge with anchor's right edge
    left = anchorBox.right - dialogBox.width + horizontalOffset
  } else {
    // Default: align dialog's left edge with anchor's left edge
    left = anchorBox.left + horizontalOffset
  }
  if (left + dialogBox.width > window.innerWidth - 4) left = window.innerWidth - dialogBox.width - 4
  if (left < 4) left = 4
  let top = Math.max(0, anchorBox.bottom) + verticalOffset
  if (top + dialogBox.height > window.innerHeight - verticalOffset) {
    // If can't fit below, either position above...
    if (Math.max(0, anchorBox.top) > dialogBox.height + verticalOffset) {
      top = Math.max(0, anchorBox.top) - dialogBox.height - verticalOffset
    } else {
      // Or on top in case of large element
      top = window.innerHeight - verticalOffset - dialogBox.height
    }
  }
  return { left, top }
}
