import React, { useState } from 'react';
import { AnalysisResult } from '../types.ts';
import { UserSubscription } from '../services/firebaseService.ts';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, VerticalAlign } from "docx";
import { saveAs } from "file-saver";
import { QRCodeSVG } from "qrcode.react";

import { Toaster, toast } from 'sonner';

interface Props {
  analysis: AnalysisResult;
  onUpdate?: (comment: string) => void;
  isUpdating?: boolean;
  onReset?: () => void;
  userSub?: UserSubscription | null;
  userId?: string;
  patientId?: string;
  scanId?: string;
}

const ReportDisplay: React.FC<Props> = ({ analysis, onUpdate, isUpdating, onReset, userSub, userId, patientId, scanId }) => {
  const isPro = userSub?.isPro || false;
  const clinic = userSub?.clinicProfile;

  const cleanMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/^###\s+/gm, '')        // Remove H3
      .replace(/^##\s+/gm, '')         // Remove H2
      .replace(/^#\s+/gm, '')          // Remove H1
      .replace(/^\*\s+/gm, '• ')       // Replace list * with bullet
      .replace(/^- \s+/gm, '• ')       // Replace list - with bullet
      .replace(/^\|.*\|$/gm, '')       // Remove table rows
      .replace(/\|/g, ' ')             // Simple table cleanup
      .trim();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    // Header Styling
    if (isPro && clinic) {
      if (clinic.logoUrl) {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text("Clinic Logo", margin, yPos);
        yPos += 10;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(0, 0, 0);
      doc.text(clinic.clinicName || "Clinic Name", margin, yPos);
      yPos += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text(clinic.doctorName || "Doctor Name", margin, yPos);
      yPos += 6;
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      const contactLines = doc.splitTextToSize(clinic.contactInfo || "", contentWidth);
      doc.text(contactLines, margin, yPos);
      yPos += (contactLines.length * 5) + 5;
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(230, 25, 43); // OGX Red
      doc.text("OGX AI CLINICAL REPORT", margin, yPos);
      yPos += 10;
      doc.setDrawColor(230, 25, 43);
      doc.setLineWidth(1);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 15;
    }

    // Content Parsing
    const lines = analysis.reportMarkdown.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        yPos += 5;
        i++;
        continue;
      }

      // Table Detection
      if (line.startsWith('|')) {
        const tableRows: string[][] = [];
        let j = i;
        while (j < lines.length && lines[j].trim().startsWith('|')) {
          const rowText = lines[j].trim();
          if (!rowText.includes('---')) {
            const cells = rowText.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
            tableRows.push(cells);
          }
          j++;
        }
        
        if (tableRows.length > 0) {
          const headers = tableRows[0];
          const body = tableRows.slice(1);
          
          autoTable(doc, {
            startY: yPos,
            head: [headers],
            body: body,
            margin: { left: margin },
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [242, 242, 247], textColor: [28, 28, 30], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [249, 249, 251] },
          });
          
          yPos = (doc as any).lastAutoTable.finalY + 10;
          i = j;
          continue;
        }
      }

      // Header Detection
      if (line.startsWith('#')) {
        const level = (line.match(/^#+/) || ['#'])[0].length;
        const text = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(level === 1 ? 18 : level === 2 ? 16 : 14);
        if (level === 1) {
          doc.setTextColor(230, 25, 43);
        } else {
          doc.setTextColor(80, 80, 80);
        }
        doc.text(text, margin, yPos);
        yPos += 10;
        i++;
        continue;
      }

      // Bold Line Detection
      if (line.startsWith('**') && line.endsWith('**') && line.length < 60) {
        const text = line.replace(/\*\*/g, '');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(text, margin, yPos);
        yPos += 7;
        i++;
        continue;
      }

      // Regular Text with Inline Bold
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);

      // Simple inline bold handling for PDF (limited)
      const parts = line.split(/(\*\*.*?\*\*)/g);
      let xOffset = margin;
      
      // Check if line needs wrapping
      const wrappedLines = doc.splitTextToSize(line.replace(/\*\*/g, ''), contentWidth);
      
      if (wrappedLines.length > 1) {
        // For multi-line, we just print plain text for now to avoid complex x-offset math
        doc.text(wrappedLines, margin, yPos);
        yPos += (wrappedLines.length * 6) + 2;
      } else {
        parts.forEach(part => {
          if (part.startsWith('**') && part.endsWith('**')) {
            doc.setFont("helvetica", "bold");
            const text = part.slice(2, -2);
            doc.text(text, xOffset, yPos);
            xOffset += doc.getTextWidth(text);
          } else {
            doc.setFont("helvetica", "normal");
            doc.text(part, xOffset, yPos);
            xOffset += doc.getTextWidth(part);
          }
        });
        yPos += 7;
      }

      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      i++;
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: "center" });
      doc.text("Generated by OGX AI - Clinical Protocol v2.5", margin, 290);
    }

    doc.save(`OGX_Report_${new Date().getTime()}.pdf`);
  };

  const exportToWord = async () => {
    const lines = analysis.reportMarkdown.split('\n');
    const children: any[] = [];

    // Header
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: clinic?.clinicName || "OGX AI CLINICAL REPORT",
            bold: true,
            size: 36,
            color: "E6192B",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    if (clinic) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: clinic.doctorName || "", bold: true, size: 24 }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: clinic.contactInfo || "", size: 20, color: "666666" }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }

    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        children.push(new Paragraph({ text: "" }));
        i++;
        continue;
      }

      // Table Detection
      if (line.startsWith('|')) {
        const tableRows: string[][] = [];
        let j = i;
        while (j < lines.length && lines[j].trim().startsWith('|')) {
          const rowText = lines[j].trim();
          if (!rowText.includes('---')) {
            const cells = rowText.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
            tableRows.push(cells);
          }
          j++;
        }

        if (tableRows.length > 0) {
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: tableRows.map((row, rIdx) => new TableRow({
                children: row.map(cell => new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: cell, bold: rIdx === 0 })],
                  })],
                  shading: rIdx === 0 ? { fill: "F2F2F7" } : undefined,
                  verticalAlign: VerticalAlign.CENTER,
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                })),
              })),
            })
          );
          children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
          i = j;
          continue;
        }
      }

      // Header Detection
      if (line.startsWith('#')) {
        const level = (line.match(/^#+/) || ['#'])[0].length;
        const text = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
        children.push(
          new Paragraph({
            text: text,
            heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 200 },
          })
        );
        i++;
        continue;
      }

      // Regular Paragraph with Inline Bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      children.push(
        new Paragraph({
          children: parts.map(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return new TextRun({ text: part.slice(2, -2), bold: true });
            }
            return new TextRun({ text: part });
          }),
          spacing: { after: 150 },
        })
      );
      i++;
    }

    // Footer
    children.push(
      new Paragraph({ text: "", spacing: { before: 800 } }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Generated by OGX AI - www.obgynx.com",
            italics: true,
            color: "888888",
            size: 18,
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `OGX_Report_${new Date().getTime()}.docx`);
    toast.success("Professional Word document exported!");
  };

  const ActionButtons = () => {
    const [copied, setCopied] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [showModify, setShowModify] = useState(false);
    const [modifyComment, setModifyComment] = useState('');

    const handleCopy = () => {
      navigator.clipboard.writeText(cleanMarkdown(analysis.reportMarkdown));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => {
      setPrinting(true);
      window.print();
      // Reset printing state after a short delay to ensure the UI updates
      setTimeout(() => setPrinting(false), 1000);
    };

    const handleModify = () => {
      if (onUpdate) {
        onUpdate(modifyComment);
        setShowModify(false);
        setModifyComment('');
      }
    };

    const handleGoogleDocs = () => {
      if (!userId || !patientId || !scanId) {
        // Fallback to clipboard if IDs are missing
        const content = cleanMarkdown(analysis.reportMarkdown);
        navigator.clipboard.writeText(content).then(() => {
          toast.success('Report copied! Paste it (Ctrl+V) into a new Google Doc.', {
            duration: 6000,
            position: 'top-center',
          });
          setTimeout(() => {
            window.open('https://docs.new', '_blank');
          }, 1500);
        }).catch(() => {
          window.open('https://docs.new', '_blank');
        });
        return;
      }

      const appUrl = window.location.origin;
      const docxUrl = `${appUrl}/api/export/docx/${userId}/${patientId}/${scanId}`;
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(docxUrl)}&embedded=false`;
      
      toast.info('Opening report in Google Docs... Click "Open with Google Docs" on the next page.', {
        duration: 5000,
        position: 'top-center',
      });
      
      setTimeout(() => {
        window.open(viewerUrl, '_blank');
      }, 1000);
    };

    const handleEmail = () => {
      const subject = encodeURIComponent(`Ultrasound Report - ${analysis.timestamp}`);
      const body = encodeURIComponent(cleanMarkdown(analysis.reportMarkdown));
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    const reportUrl = window.location.href; // In a real app, this would be a direct link to the report

    return (
      <div className="flex flex-wrap gap-3 justify-center my-6">
        <Toaster />
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-[#f5f5f7] hover:bg-[#ebebed] rounded-lg text-sm font-bold text-[#3A3A3C] transition-all">
          <i className={`fas ${printing ? 'fa-spinner animate-spin' : 'fa-print'}`}></i> {printing ? 'Preparing...' : 'Print'}
        </button>
        <button onClick={() => setShowModify(true)} className="flex items-center gap-2 px-4 py-2 bg-[#d4af37] hover:bg-[#b8962f] rounded-lg text-sm font-bold text-white transition-all">
          <i className="fas fa-edit"></i> Modify Report
        </button>
        <button onClick={handleCopy} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${copied ? 'bg-green-100 text-green-800' : 'bg-[#f5f5f7] hover:bg-[#ebebed] text-[#3A3A3C]'}`}>
          <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i> {copied ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(cleanMarkdown(analysis.reportMarkdown))}`, '_blank')} className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] rounded-lg text-sm font-bold text-white transition-all">
          <i className="fab fa-whatsapp"></i> WhatsApp
        </button>
        <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-[#FF4444] hover:bg-[#CC0000] rounded-lg text-sm font-bold text-white transition-all">
          <i className="fas fa-file-pdf"></i> PDF
        </button>
        <button onClick={exportToWord} className="flex items-center gap-2 px-4 py-2 bg-[#2B579A] hover:bg-[#1E3E6D] rounded-lg text-sm font-bold text-white transition-all">
          <i className="fas fa-file-word"></i> Word
        </button>
        <button onClick={handleEmail} className="flex items-center gap-2 px-4 py-2 bg-[#8E8E93] hover:bg-[#636366] rounded-lg text-sm font-bold text-white transition-all">
          <i className="fas fa-envelope"></i> Email
        </button>
        <button onClick={() => setShowQR(!showQR)} className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-zinc-800 rounded-lg text-sm font-bold text-white transition-all">
          <i className="fas fa-qrcode"></i> Share QR
        </button>

        {showModify && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setShowModify(false)}>
            <div className="bg-white p-8 rounded-2xl max-w-lg w-full shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black mb-4">Modify Report</h3>
              <textarea
                value={modifyComment}
                onChange={(e) => setModifyComment(e.target.value)}
                placeholder="Enter changes, additions, or corrections to the report..."
                className="w-full min-h-[150px] p-4 rounded-xl border border-zinc-200 mb-6 focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
              />
              <div className="flex gap-4">
                <button onClick={() => setShowModify(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold text-sm uppercase tracking-widest">Cancel</button>
                <button onClick={handleModify} className="flex-1 py-3 bg-[#d4af37] text-white rounded-xl font-bold text-sm uppercase tracking-widest">Regenerate</button>
              </div>
            </div>
          </div>
        )}

        {showQR && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setShowQR(false)}>
            <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black mb-2">Patient Report Access</h3>
              <p className="text-xs text-zinc-500 mb-6 uppercase tracking-widest font-bold">Patient can scan this to view their report</p>
              <div className="bg-zinc-50 p-6 rounded-xl border-2 border-dashed border-zinc-200 flex justify-center mb-6">
                <QRCodeSVG value={reportUrl} size={200} />
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed mb-6">
                1. Patient opens their phone camera.<br/>
                2. Scan this code to access the digital report.<br/>
                3. They can save or print it from their own device.
              </p>
              <button onClick={() => setShowQR(false)} className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm uppercase tracking-widest">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Helper to bold text inside a string (e.g. "Values are **Normal**")
  const parseInlineBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={index} className="font-bold text-black">{part.slice(2, -2)}</span>;
      }
      return part;
    });
  };

  const parseContent = (text: string) => {
    // Clean up excessive punctuation artifacts
    const cleanText = text.replace(/!!/g, '.').replace(/\.{2,}/g, '.');
    
    const lines = cleanText.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        elements.push(<div key={i} className="h-3" />);
        i++;
        continue;
      }

      // Table Detection
      const isTableLine = trimmed.startsWith('|');
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      const isSeparatorLine = nextLine.startsWith('|') && nextLine.includes('---');
      
      if (isTableLine && isSeparatorLine) {
        const tableRows: string[][] = [];
        let j = i;
        while (j < lines.length && lines[j].trim().startsWith('|')) {
          const rowText = lines[j].trim();
          // Remove leading and trailing pipes then split
          const cells = rowText
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map(cell => cell.trim());
          
          tableRows.push(cells);
          j++;
        }
        
        if (tableRows.length >= 2) {
          const headers = tableRows[0];
          // The separator row is usually the second row (index 1)
          // We skip index 0 (headers) and index 1 (separator)
          const body = tableRows.slice(2); 
          
          elements.push(
            <div key={i} className="overflow-x-auto my-8 apple-card border border-black/5 shadow-sm">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#F2F2F7] text-[#1C1C1E] uppercase text-[10px] font-bold tracking-widest">
                  <tr>
                    {headers.map((h, idx) => (
                      <th key={idx} className="px-6 py-4 border-b border-black/10">
                        {parseInlineBold(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {body.map((row, rIdx) => (
                    <tr key={rIdx} className={`${rIdx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9FB]'} hover:bg-[#007AFF]/5 transition-colors`}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-6 py-4 text-[#3A3A3C] font-medium leading-relaxed">
                          {parseInlineBold(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          i = j;
          continue;
        }
      }

      // 1. Headers (### or ##) -> Clean, small subtitles
      if (trimmed.startsWith('#')) {
        const content = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
        elements.push(
          <h4 key={i} className="text-sm font-bold text-[#86868b] uppercase tracking-widest mt-10 mb-4 border-b border-black/5 pb-2">
            {content}
          </h4>
        );
        i++;
        continue;
      }

      // 2. Bold Line Headers (Alternative subtitle format often used by AI)
      // e.g. "**Head & Brain:**" on its own line
      if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length < 60) {
        const content = trimmed.replace(/\*\*/g, '');
        elements.push(
          <h5 key={i} className="text-lg font-bold text-black mt-8 mb-3 tracking-tight">
            {content}
          </h5>
        );
        i++;
        continue;
      }

      // 3. Key-Value pairs (e.g., "**Nasal Bone:** Present")
      // Check if line starts with bolded text followed by colon
      const keyValMatch = trimmed.match(/^\*\*([^*]+)\*\*:(.*)/);
      if (keyValMatch) {
         elements.push(
            <div key={i} className="flex flex-col sm:flex-row gap-1 sm:gap-4 mb-3 text-base">
                <span className="font-semibold text-[#86868b] sm:w-40 shrink-0 text-sm sm:text-base uppercase sm:normal-case tracking-wide sm:tracking-normal pt-1 sm:pt-0">
                  {keyValMatch[1]}
                </span>
                <span className="text-black/90 leading-relaxed font-medium">
                  {parseInlineBold(keyValMatch[2])}
                </span>
            </div>
         );
         i++;
         continue;
      }

      // 4. List Items (* or -)
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const content = trimmed.replace(/^[\*\-]\s*/, '');
        elements.push(
          <div key={i} className="flex gap-3 mb-2 pl-2">
            <span className="text-[#d4af37] text-xs mt-1.5 shrink-0">●</span>
            <p className="text-base text-black/80 leading-relaxed">
              {parseInlineBold(content)}
            </p>
          </div>
        );
        i++;
        continue;
      }

      // 5. Numbered Lists (1. )
      if (/^\d+\./.test(trimmed)) {
        const match = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (match) {
            elements.push(
                <div key={i} className="flex gap-3 mb-3 mt-2">
                    <span className="text-base font-bold text-[#d4af37]">{match[1]}.</span>
                    <p className="text-base text-black/90 leading-relaxed font-medium">
                        {parseInlineBold(match[2])}
                    </p>
                </div>
            );
            i++;
            continue;
        }
      }

      // 6. Regular paragraphs
      elements.push(
        <p key={i} className="text-base text-black/70 leading-8 mb-5">
          {parseInlineBold(line)}
        </p>
      );
      i++;
    }
    return elements;
  };

  return (
    <div className="flex flex-col gap-12 animate-in fade-in duration-1000">
      <div className="apple-card overflow-hidden">
        {/* Header Section */}
        <div className="bg-[#f5f5f7] border-b border-black/5 px-8 py-4 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#d4af37]"></div>
              <h2 className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest">Clinical Dossier</h2>
            </div>
          </div>
          <ActionButtons />
        </div>
        
        <div className="p-8 md:p-12 relative bg-white">
          {isUpdating && (
            <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center transition-all backdrop-blur-sm">
              <div className="w-8 h-8 border-2 border-black/10 border-t-[#d4af37] rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest">Updating Clinical Context...</p>
            </div>
          )}

          {/* Title Area */}
          <div className="flex flex-col md:flex-row justify-between items-start border-b border-black/5 pb-8 mb-8">
            {isPro && clinic ? (
              <div className="flex items-start gap-6 w-full">
                {clinic.logoUrl && (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border border-black/5 shrink-0 bg-[#FAF9F6] flex items-center justify-center">
                    <img src={clinic.logoUrl} alt="Clinic Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#1C1C1E] mb-1">{clinic.clinicName}</h1>
                  <h2 className="text-lg font-bold text-[#5B6876] mb-2">{clinic.doctorName}</h2>
                  <p className="text-xs text-[#86868b] font-medium leading-relaxed whitespace-pre-line">{clinic.contactInfo}</p>
                </div>
                <div className="text-right hidden md:block">
                  <div className="text-[10px] font-bold text-[#d4af37] uppercase tracking-widest mb-1">Diagnostic Report</div>
                  <div className="text-xs font-medium text-[#86868b]">{analysis.timestamp}</div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-2 text-black">Diagnostic Report</h1>
                  <p className="text-xs font-bold text-[#d4af37] uppercase tracking-[0.2em]">Fetal Medicine Foundation Protocol</p>
                </div>
                <div className="text-right mt-4 md:mt-0">
                   <div className="text-xs font-medium text-[#86868b]">Generated: {analysis.timestamp}</div>
                </div>
              </>
            )}
          </div>

          {/* Content Area */}
          <div className="report-content max-w-4xl mx-auto">
            {parseContent(analysis.reportMarkdown)}
            
            {/* Action Buttons Footer */}
            <div className="mt-12 pt-8 border-t border-black/5">
                <ActionButtons />
            </div>

            {/* DISCLAIMER SECTION */}
            <div className="mt-16 pt-8 border-t border-black/5">
                <div className="bg-[#f5f5f7] p-6 rounded-xl border border-black/5">
                    <h6 className="text-black font-bold uppercase tracking-widest text-xs mb-3">
                        <i className="fas fa-gavel mr-2"></i>Legal Disclaimer & Copyright
                    </h6>
                    <p className="text-[#86868b] text-xs leading-relaxed font-medium text-justify">
                        This application (OGXAI) is currently in a training phase. This AI system <strong>DOES NOT</strong> replace professional medical judgment. 
                        All findings must be independently verified by a qualified specialist. 
                        <br/><br/>
                        {!isPro && (
                          <>
                            <strong className="text-[#E6192B]">Generated by OGX AI - The Smart OBGYN Assistant</strong>
                            <br/><br/>
                          </>
                        )}
                        <strong>Copyright © 2024-2026 OBGYNX LLC USA. All Rights Reserved.</strong> 
                        No part of this app can be copied or shared without permission.
                    </p>
                </div>
            </div>
          </div>

          {/* Footer / Grounding */}
          {analysis.groundingSources && analysis.groundingSources.length > 0 && (
            <div className="mt-8 pt-8 border-t border-black/5">
              <h4 className="text-[10px] font-bold text-[#86868b] mb-4 uppercase tracking-widest">Verified References</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.groundingSources.map((source, idx) => (
                  <a 
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f5f5f7] hover:bg-[#ebebed] text-[#3A3A3C] text-[11px] font-medium rounded-md transition-all truncate max-w-[200px]"
                  >
                    <i className="fas fa-link text-[#d4af37]"></i>
                    <span className="truncate">{source.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {onReset && (
            <div className="mt-20 flex flex-col items-center border-t border-black/5 pt-10">
              <button 
                onClick={onReset}
                className="group flex items-center gap-3 px-10 py-4 rounded-full bg-[#E5E5EA] text-[#3A3A3C] hover:bg-red-50 hover:text-red-900 transition-all hover:scale-105 hover:shadow-lg"
              >
                <i className="fas fa-redo-alt text-sm"></i>
                <span className="text-sm font-bold uppercase tracking-wider">End Session & New Exam</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportDisplay;