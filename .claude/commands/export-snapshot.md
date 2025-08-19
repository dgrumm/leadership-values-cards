---
name: export-snapshot  
description: Test snapshot export functionality in multiple formats
match: export|snapshot|pdf|download
---

Test and debug the snapshot export feature:

1. Basic implementation:
```javascript
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const exportSnapshot = async (format: 'png' | 'jpg' | 'pdf') => {
  const element = document.getElementById('canvas-area');
  
  const canvas = await html2canvas(element, {
    scale: 2, // Higher quality
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
  
  if (format === 'pdf') {
    const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 10, 10, 277, 190);
    pdf.setProperties({
      title: `Leadership Values - ${userName}`,
      subject: `Session: ${sessionCode}`,
      creator: 'Leadership Values Card Sort',
    });
    pdf.save(`values-${sessionCode}-${Date.now()}.pdf`);
  } else {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `values-${sessionCode}-${Date.now()}.${format}`;
      a.click();
    }, `image/${format}`, 0.95);
  }
};
```

2. Add metadata overlay:
```javascript
// Before capture, temporarily add overlay
const overlay = document.createElement('div');
overlay.innerHTML = `
  <div class="snapshot-header">
    <h2>${userName}'s Top ${cardCount} Leadership Values</h2>
    <p>Session: ${sessionCode} | ${new Date().toLocaleDateString()}</p>
  </div>
`;
element.prepend(overlay);
// Capture
// Remove overlay
```

3. Test different scenarios:
- Export during drag (should complete drop first)
- Export with 0, 3, 8 cards
- Export on slow connections
- Export very long card descriptions

4. Validate output quality at different zoom levels

---