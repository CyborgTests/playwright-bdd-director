let ws: WebSocket | null = null;
let messageId = 0;
const pendingRequests = new Map<number, { resolve: (data: any) => void; reject: (error: string) => void }>();

export function connectWs(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(`ws://localhost:${port}`);
    
    ws.onopen = () => {
      console.log('🔗 Director connected');
      resolve();
    };
    
    ws.onerror = (err) => {
      console.error('❌ Director connection failed');
      reject(err);
    };
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const pending = pendingRequests.get(msg.id);
        if (pending) {
          pendingRequests.delete(msg.id);
          if (msg.type === 'ERROR') {
            pending.reject(msg.error);
          } else {
            pending.resolve(msg.data);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    };
    
    ws.onclose = () => {
      ws = null;
    };
  });
}

function sendRequest(type: string, data?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject('WebSocket not connected');
      return;
    }
    
    const id = ++messageId;
    pendingRequests.set(id, { resolve, reject });
    
    ws.send(JSON.stringify({ id, type, data }));
    
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject('Request timeout');
      }
    }, 5000);
  });
}

export async function getFiles() {
  return sendRequest('GET_FILES');
}

export async function createFile(name: string, content: string) {
  const result = await sendRequest('CREATE_FILE', { name, content });
  console.log(`📄 Created: ${name}`);
  return result;
}

export async function saveFile(name: string, content: string) {
  return sendRequest('SAVE_FILE', { name, content });
}

export async function deleteFile(name: string) {
  const result = await sendRequest('DELETE_FILE', { name });
  console.log(`🗑️ Deleted: ${name}`);
  return result;
}
