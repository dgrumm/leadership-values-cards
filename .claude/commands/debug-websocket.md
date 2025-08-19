---
name: debug-websocket
description: Debug Ably WebSocket connections and message flow
match: debug ws|websocket|ably issues|sync problems
---

Debug WebSocket/Ably connection issues:

1. Enable Ably debug logging:
```javascript
// In lib/ably/client.ts
const ably = new Ably.Realtime({
  key: process.env.NEXT_PUBLIC_ABLY_KEY,
  logLevel: 4, // Maximum verbosity
  echoMessages: true, // See own messages
});
```

1. Add connection state monitoring:
```javascript
ably.connection.on('connected', () => console.log('✅ Ably connected'));
ably.connection.on('disconnected', () => console.log('❌ Ably disconnected'));
ably.connection.on('suspended', () => console.log('⚠️ Ably suspended'));
```

1. Monitor specific channels:
```javascript
const channel = ably.channels.get(`session:${sessionCode}:presence`);
channel.subscribe((message) => {
  console.log('Message received:', {
    name: message.name,
    data: message.data,
    timestamp: new Date().toISOString()
  });
});
```

1. Check presence set:
```javascript
channel.presence.get((err, members) => {
  console.log('Current members:', members?.map(m => m.clientId));
});
```

1. Use Ably's debug dashboard: https://ably.com/accounts/[your-account]/apps/[app-id]/app_stats

Common issues to check:
- API key permissions (publish, subscribe, presence)
- Channel naming consistency
- Message size limits (65KB)
- Connection limits per key

---