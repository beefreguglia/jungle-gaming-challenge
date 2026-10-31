import type { Socket } from 'socket.io-client'

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

/**
 * socket.io-client is loaded on the first connect(), not with this module: Engine.IO keeps
 * `globalThis.WebSocket` from the moment it is evaluated, and the mock layer (MSW) swaps
 * that class only once its worker starts. Loading it lazily lets the app bundle download
 * in parallel with MSW while the socket still goes through the mock.
 */
export function createRealtimeClient({ url, getToken }: RealtimeClientOptions): RealtimeClient {
  let socket: Socket | null = null
  let loading: Promise<Socket> | null = null
  // Whether the socket should be open, so a disconnect() during the load wins
  let wanted = false
  const eventListeners = new Map<string, Set<(payload: unknown) => void>>()

  let status: RealtimeStatus = 'idle'
  const statusListeners = new Set<(next: RealtimeStatus, previous: RealtimeStatus) => void>()

  function setStatus(next: RealtimeStatus): void {
    if (next === status) return
    const previous = status
    status = next
    for (const listener of statusListeners) listener(next, previous)
  }

  function load(): Promise<Socket> {
    loading ??= import('socket.io-client').then(({ io }) => {
      const created = io(url ?? '', {
        autoConnect: false,
        // The mock transport (MSW) only speaks WebSocket; no HTTP long-polling
        transports: ['websocket'],
        auth: (callback) => callback({ token: getToken() }),
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 8_000,
      })
      created.on('connect', () => setStatus('connected'))
      created.on('connect_error', () => setStatus(created.active ? 'reconnecting' : 'offline'))
      created.on('disconnect', () => setStatus(created.active ? 'reconnecting' : 'offline'))
      created.io.on('reconnect_attempt', () => setStatus('reconnecting'))
      for (const [event, listeners] of eventListeners) {
        for (const listener of listeners) created.on(event, listener)
      }
      socket = created
      return created
    })
    return loading
  }

  function open(): void {
    wanted = true
    setStatus('connecting')
    void load().then((loaded) => {
      if (wanted && !loaded.connected && !loaded.active) loaded.connect()
    })
  }

  return {
    get status() {
      return status
    },
    connect() {
      // Loaded: the socket's own state decides; still loading: a pending open is enough
      if (socket ? socket.connected || socket.active : wanted) return
      open()
    },
    disconnect() {
      wanted = false
      socket?.disconnect()
      setStatus('idle')
    },
    reconnect() {
      socket?.disconnect()
      open()
    },
    on(event, listener) {
      const listeners = eventListeners.get(event) ?? new Set()
      listeners.add(listener)
      eventListeners.set(event, listeners)
      socket?.on(event, listener)
      return () => {
        listeners.delete(listener)
        socket?.off(event, listener)
      }
    },
    onStatus(listener) {
      statusListeners.add(listener)
      return () => void statusListeners.delete(listener)
    },
  }
}
