import { io, type Socket } from 'socket.io-client'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

/**
 * Transport port for realtime events. Socket.IO stays an implementation detail of this
 * module; consumers subscribe to named events and to connection status only.
 */
export interface RealtimeClient {
  readonly status: RealtimeStatus
  connect(): void
  disconnect(): void
  // Drops the current connection and opens a new one with fresh credentials
  reconnect(): void
  on(event: string, listener: (payload: unknown) => void): () => void
  onStatus(listener: (status: RealtimeStatus, previous: RealtimeStatus) => void): () => void
}

interface RealtimeClientOptions {
  // Undefined connects to the page origin
  url?: string
  // Read on every (re)connection, so a new session is picked up by reconnect()
  getToken: () => string | null
}

export function createRealtimeClient({ url, getToken }: RealtimeClientOptions): RealtimeClient {
  const socket: Socket = io(url ?? '', {
    autoConnect: false,
    // The mock transport (MSW) only speaks WebSocket; no HTTP long-polling
    transports: ['websocket'],
    auth: (callback) => callback({ token: getToken() }),
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 8_000,
  })

  let status: RealtimeStatus = 'idle'
  const statusListeners = new Set<(next: RealtimeStatus, previous: RealtimeStatus) => void>()

  function setStatus(next: RealtimeStatus): void {
    if (next === status) return
    const previous = status
    status = next
    for (const listener of statusListeners) listener(next, previous)
  }

  socket.on('connect', () => setStatus('connected'))
  socket.on('connect_error', () => setStatus(socket.active ? 'reconnecting' : 'offline'))
  socket.on('disconnect', () => setStatus(socket.active ? 'reconnecting' : 'offline'))
  socket.io.on('reconnect_attempt', () => setStatus('reconnecting'))

  return {
    get status() {
      return status
    },
    connect() {
      if (socket.connected || socket.active) return
      setStatus('connecting')
      socket.connect()
    },
    disconnect() {
      socket.disconnect()
      setStatus('idle')
    },
    reconnect() {
      socket.disconnect()
      setStatus('connecting')
      socket.connect()
    },
    on(event, listener) {
      socket.on(event, listener)
      return () => void socket.off(event, listener)
    },
    onStatus(listener) {
      statusListeners.add(listener)
      return () => void statusListeners.delete(listener)
    },
  }
}
