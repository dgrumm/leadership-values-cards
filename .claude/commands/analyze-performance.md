---
name: analyze-performance
description: Profile drag-drop performance and animation frames
match: performance|perf|slow|lag|fps
---

Analyze and optimize performance issues:

1. Enable React DevTools Profiler:
```javascript
// Wrap problem area in Profiler
import { Profiler } from 'react';

<Profiler id="CardDrag" onRender={onRenderCallback}>
  <DraggableCard />
</Profiler>
```

2. Check frame rate during drag:
```javascript
// Add to drag handler
let lastTime = performance.now();
const checkFPS = () => {
  const now = performance.now();
  const fps = 1000 / (now - lastTime);
  if (fps < 55) console.warn(`Low FPS: ${fps.toFixed(1)}`);
  lastTime = now;
};
```

3. Measure animation performance:
```javascript
// In Card component
const measureFlip = () => {
  performance.mark('flip-start');
  // ... animation code ...
  performance.mark('flip-end');
  performance.measure('flip', 'flip-start', 'flip-end');
  
  const measure = performance.getEntriesByName('flip')[0];
  if (measure.duration > 300) {
    console.warn(`Slow flip: ${measure.duration}ms`);
  }
};
```

4. Profile WebSocket message frequency:
```javascript
const messageCounter = new Map();
channel.subscribe((msg) => {
  const count = messageCounter.get(msg.name) || 0;
  messageCounter.set(msg.name, count + 1);
  
  // Log every second
  setTimeout(() => {
    console.log('Message rates:', Object.fromEntries(messageCounter));
    messageCounter.clear();
  }, 1000);
});
```

5. Run Lighthouse CI:
```bash
npm install -D @lhci/cli
npx lhci autorun
```

Key metrics to maintain:
- First Contentful Paint < 1s
- Time to Interactive < 2s  
- Drag operations at 60fps
- WebSocket messages < 50/second

---