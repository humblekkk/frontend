const withSyncMeta = (payload = {}) => ({
  ...payload,
  syncedAt: new Date().toISOString(),
  mode: 'front-end-demo',
})

export function syncCourse(payload) {
  return Promise.resolve(withSyncMeta(payload))
}

export function syncUser(payload) {
  return Promise.resolve(withSyncMeta(payload))
}
