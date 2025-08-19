# .claude/hooks/on-error.md

```yaml
name: on-error
description: Handles errors during development
trigger: on_error
```

When encountering an error:

1. **For TypeScript errors**: Check if it's a missing type definition
```bash
npm install -D @types/[package-name]
```

2. **For Drag-Drop issues**: Verify DndContext wrapper
```javascript
// App must be wrapped in DndContext
<DndContext onDragEnd={handleDragEnd}>
  {children}
</DndContext>
```

3. **For WebSocket errors**: Check Ably connection
```javascript
console.log('Ably state:', ably.connection.state);
console.log('Ably error:', ably.connection.errorReason);
```

4. **For Animation glitches**: Verify Framer Motion setup
```javascript
// Cards need layoutId for smooth transitions
<motion.div layoutId={`card-${card.id}`}>
```

5. **For State sync issues**: Check Zustand devtools
```javascript
window.__ZUSTAND_DEVTOOLS__ = true;
```

---