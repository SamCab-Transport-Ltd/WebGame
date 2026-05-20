// Socket.IO event names. Keep stable - clients depend on these strings.
export const SOCKET_EVENTS = {
  TOWN_UPDATED: 'town:updated',
  WEATHER_CHANGED: 'weather:changed',
  WORLD_EVENT_CREATED: 'world:event',
  COMBAT_RESOLVED: 'combat:resolved',
  ALLIANCE_MESSAGE: 'alliance:message',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
