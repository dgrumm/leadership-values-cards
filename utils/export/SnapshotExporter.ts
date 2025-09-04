import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { RevealSnapshot } from '@/lib/reveals/SimpleRevealManager';

export interface ExportOptions {
  format: 'pdf' | 'png' | 'jpeg';
  quality: number; // 0.1 to 1.0 for JPEG, ignored for PNG/PDF
  scale: number; // Canvas scale factor (1.0 = normal, 2.0 = high-DPI)
  backgroundColor: string;
}

export class SnapshotExporter {
  private defaultOptions: ExportOptions = {
    format: 'pdf',
    quality: 0.95,
    scale: 2,
    backgroundColor: '#ffffff'
  };

  /**
   * Export reveal snapshot as PDF
   * Creates a beautifully formatted PDF with header, cards grid, and metadata
   */
  async exportAsPDF(
    snapshot: RevealSnapshot, 
    isOwnReveal: boolean = false,
    options?: Partial<ExportOptions>
  ): Promise<void> {
    const exportOptions = { ...this.defaultOptions, ...options };

    try {
      // Find the reveal canvas element (should be the main card grid)
      const element = document.querySelector('.reveal-canvas') as HTMLElement;
      if (!element) {
        throw new Error('Reveal canvas element not found for export');
      }

      // Generate canvas from the element
      const canvas = await html2canvas(element, {
        backgroundColor: exportOptions.backgroundColor,
        scale: exportOptions.scale,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        width: element.offsetWidth,
        height: element.offsetHeight
      });

      // Create PDF in landscape orientation for better card layout
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // PDF Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      const title = `${snapshot.participantName}'s ${this.getRevealTypeText(snapshot.type)} Leadership Values`;
      const titleWidth = pdf.getTextWidth(title);
      const titleX = (pageWidth - titleWidth) / 2;
      pdf.text(title, titleX, 20);

      // Metadata
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const metadata = [
        `Revealed: ${new Date(snapshot.revealedAt).toLocaleDateString()}`,
        `Generated: ${new Date().toLocaleDateString()}`,
        `Cards: ${snapshot.cards.length}`
      ].join(' • ');
      const metadataWidth = pdf.getTextWidth(metadata);
      const metadataX = (pageWidth - metadataWidth) / 2;
      pdf.text(metadata, metadataX, 30);

      // Card arrangement image
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 40; // 20mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Center the image and ensure it fits
      const maxImgHeight = pageHeight - 60; // Leave space for header and footer
      const finalImgHeight = Math.min(imgHeight, maxImgHeight);
      const finalImgWidth = (canvas.width * finalImgHeight) / canvas.height;
      
      const imgX = (pageWidth - finalImgWidth) / 2;
      const imgY = 40;

      pdf.addImage(imgData, 'PNG', imgX, imgY, finalImgWidth, finalImgHeight);

      // Footer
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      const footerY = pageHeight - 15;
      pdf.text('Generated with Leadership Values Cards', 20, footerY);
      pdf.text(`Page 1 of 1`, pageWidth - 35, footerY);

      // Generate filename
      const sanitizedName = snapshot.participantName.replace(/[^a-zA-Z0-9]/g, '-');
      const filename = `${sanitizedName}-${snapshot.type}-leadership-values.pdf`;

      // Download PDF
      pdf.save(filename);

      console.log(`✅ [SnapshotExporter] PDF exported successfully: ${filename}`);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ [SnapshotExporter] PDF export failed:`, error);
      throw new Error(`Failed to export PDF: ${message}`);
    }
  }

  /**
   * Export reveal snapshot as PNG image
   */
  async exportAsPNG(
    snapshot: RevealSnapshot,
    options?: Partial<ExportOptions>
  ): Promise<void> {
    const exportOptions = { ...this.defaultOptions, format: 'png' as const, ...options };

    try {
      const element = document.querySelector('.reveal-canvas') as HTMLElement;
      if (!element) {
        throw new Error('Reveal canvas element not found for export');
      }

      const canvas = await html2canvas(element, {
        backgroundColor: exportOptions.backgroundColor,
        scale: exportOptions.scale,
        useCORS: true,
        allowTaint: true
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to generate PNG blob');
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const sanitizedName = snapshot.participantName.replace(/[^a-zA-Z0-9]/g, '-');
        link.download = `${sanitizedName}-${snapshot.type}-leadership-values.png`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`✅ [SnapshotExporter] PNG exported successfully`);
      }, 'image/png');

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ [SnapshotExporter] PNG export failed:`, error);
      throw new Error(`Failed to export PNG: ${message}`);
    }
  }

  /**
   * Export reveal snapshot as JPEG image
   */
  async exportAsJPEG(
    snapshot: RevealSnapshot,
    options?: Partial<ExportOptions>
  ): Promise<void> {
    const exportOptions = { ...this.defaultOptions, format: 'jpeg' as const, ...options };

    try {
      const element = document.querySelector('.reveal-canvas') as HTMLElement;
      if (!element) {
        throw new Error('Reveal canvas element not found for export');
      }

      const canvas = await html2canvas(element, {
        backgroundColor: exportOptions.backgroundColor,
        scale: exportOptions.scale,
        useCORS: true,
        allowTaint: true
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to generate JPEG blob');
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const sanitizedName = snapshot.participantName.replace(/[^a-zA-Z0-9]/g, '-');
        link.download = `${sanitizedName}-${snapshot.type}-leadership-values.jpg`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`✅ [SnapshotExporter] JPEG exported successfully`);
      }, 'image/jpeg', exportOptions.quality);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ [SnapshotExporter] JPEG export failed:`, error);
      throw new Error(`Failed to export JPEG: ${message}`);
    }
  }

  /**
   * Print-friendly display optimization
   * Adds CSS to optimize the page for printing
   */
  optimizeForPrint(): () => void {
    const printStyles = document.createElement('style');
    printStyles.id = 'snapshot-print-styles';
    printStyles.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        .reveal-canvas,
        .reveal-canvas * {
          visibility: visible;
        }
        .reveal-canvas {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: white;
          padding: 20px;
        }
        .static-card-grid {
          display: grid;
          gap: 16px;
          margin: 0;
        }
        .card {
          page-break-inside: avoid;
          background: white;
          border: 2px solid #333;
          box-shadow: none;
        }
      }
    `;
    document.head.appendChild(printStyles);

    // Return cleanup function
    return () => {
      const styles = document.getElementById('snapshot-print-styles');
      if (styles) {
        document.head.removeChild(styles);
      }
    };
  }

  /**
   * Trigger browser print dialog with optimizations
   */
  print(snapshot: RevealSnapshot): void {
    try {
      const cleanup = this.optimizeForPrint();
      
      // Trigger print dialog
      window.print();
      
      // Clean up styles after a delay (print dialog is async)
      setTimeout(cleanup, 1000);
      
      console.log(`🖨️ [SnapshotExporter] Print dialog opened`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ [SnapshotExporter] Print failed:`, error);
      throw new Error(`Failed to print: ${message}`);
    }
  }

  /**
   * Get display text for reveal type
   */
  private getRevealTypeText(type: 'top8' | 'top3'): string {
    return type === 'top8' ? 'Top 8' : 'Top 3';
  }

  /**
   * Validate that required DOM elements exist for export
   */
  validateExportReady(): { isReady: boolean; missingElements: string[] } {
    const requiredSelectors = [
      '.reveal-canvas',
      '.static-card-grid',
      '.card'
    ];

    const missingElements: string[] = [];
    
    for (const selector of requiredSelectors) {
      const element = document.querySelector(selector);
      if (!element) {
        missingElements.push(selector);
      }
    }

    return {
      isReady: missingElements.length === 0,
      missingElements
    };
  }
}