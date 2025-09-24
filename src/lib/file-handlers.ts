export async function handleFileUpload(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return handleTextFile(file);
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    return handleDocxFile(file);
  } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return handlePdfFile(file);
  } else {
    throw new Error(`نوع الملف غير مدعوم: ${fileType}`);
  }
}

async function handleTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = () => reject(new Error('فشل في قراءة الملف النصي'));
    reader.readAsText(file, 'utf-8');
  });
}

async function handleDocxFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        // Check if docx library is available
        if (typeof window !== 'undefined' && (window as any).docx) {
          const { extractRawText } = (window as any).docx;
          const text = await extractRawText({ buffer: arrayBuffer });
          resolve(text);
        } else {
          // Fallback: try to extract basic text (this is a simplified approach)
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(arrayBuffer);
          // Extract readable text from the decoded content (basic approach)
          const cleanText = text.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0020-\u007F\n\r]/g, '');
          resolve(cleanText);
        }
      } catch (error) {
        reject(new Error('فشل في قراءة ملف Word'));
      }
    };
    reader.onerror = () => reject(new Error('فشل في قراءة ملف Word'));
    reader.readAsArrayBuffer(file);
  });
}

async function handlePdfFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        // Check if PDF.js is available
        if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
          const pdfjsLib = (window as any).pdfjsLib;
          
          // Set worker source
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
          
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
          }
          
          resolve(fullText);
        } else {
          reject(new Error('مكتبة PDF.js غير متوفرة'));
        }
      } catch (error) {
        reject(new Error('فشل في قراءة ملف PDF'));
      }
    };
    reader.onerror = () => reject(new Error('فشل في قراءة ملف PDF'));
    reader.readAsArrayBuffer(file);
  });
}

export function exportToText(content: string, filename: string = 'screenplay.txt') {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToDocx(content: string, filename: string = 'screenplay.docx') {
  // This would require a more complex implementation with a library like docx
  // For now, we'll export as RTF which can be opened in Word
  const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}} \\f0\\fs24 ${content.replace(/\n/g, '\\par ')}}`;
  const blob = new Blob([rtfContent], { type: 'application/rtf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace('.docx', '.rtf');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
