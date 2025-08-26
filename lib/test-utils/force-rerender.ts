/**
 * Force React re-render after state injection
 * This ensures components update when Zustand state is directly modified during testing
 */

export const forceReactRerender = () => {
  return `
    (() => {
      // Force React to re-render by dispatching a custom event
      const event = new CustomEvent('state-injection-complete', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(event);
      
      // Also trigger a resize event which often forces re-render
      window.dispatchEvent(new Event('resize'));
      
      // Force focus/blur to trigger component updates
      const activeElement = document.activeElement;
      if (activeElement && activeElement !== document.body) {
        (activeElement as any).blur?.();
        setTimeout(() => (activeElement as any).focus?.(), 10);
      }
      
      console.log('🔄 Forced React re-render after state injection');
    })();
  `;
};