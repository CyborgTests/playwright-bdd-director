let ws: WebSocket | null = null
let messageId = 0
const pendingRequests = new Map<
  number,
  { resolve: (data: unknown) => void; reject: (error: string) => void }
>()

export function connectWs(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(`ws://localhost:${port}`)

    ws.onopen = () => {
      // eslint-disable-next-line no-console
      console.log('🔗 Director connected')
      resolve()
    }

    ws.onerror = (err) => {
      // eslint-disable-next-line no-console
      console.error('❌ Director connection failed')
      reject(err)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const pending = pendingRequests.get(msg.id)
        if (pending) {
          pendingRequests.delete(msg.id)
          if (msg.type === 'ERROR') {
            pending.reject(msg.error)
          } else {
            pending.resolve(msg.data)
          }
        }
      } catch (_e) {
        // Ignore parse errors
      }
    }

    ws.onclose = () => {
      ws = null
    }
  })
}

function sendRequest(type: string, data?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject('WebSocket not connected')
      return
    }

    const id = ++messageId
    pendingRequests.set(id, { resolve, reject })

    ws.send(JSON.stringify({ id, type, data }))

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        reject('Request timeout')
      }
    }, 5000)
  })
}

export async function getFiles() {
  return sendRequest('GET_FILES')
}

export async function createFile(name: string, content: string) {
  const result = await sendRequest('CREATE_FILE', { name, content })
  // eslint-disable-next-line no-console
  console.log(`📄 Created: ${name}`)
  return result
}

export async function saveFile(name: string, content: string) {
  return sendRequest('SAVE_FILE', { name, content })
}

export async function deleteFile(name: string) {
  const result = await sendRequest('DELETE_FILE', { name })
  // eslint-disable-next-line no-console
  console.log(`🗑️ Deleted: ${name}`)
  return result
}
