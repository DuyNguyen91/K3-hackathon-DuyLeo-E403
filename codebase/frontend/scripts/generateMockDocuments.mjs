import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(scriptDirectory, '..');
const publicDirectory = path.join(frontendDirectory, 'public');
const outputPath = path.join(frontendDirectory, 'src', 'data', 'mockDocuments.ts');

const documentDefinitions = [
  {
    id: 'doc-1',
    title: 'AI & LLM Foundation — Ngày 1',
    fileName: '1-AICB_Ngày_1.pdf',
    lastModified: '2 ngày trước',
    department: 'AICB-P1 • Phase 1',
    contentTitle: 'AI & LLM Foundation',
    subtitle: 'AICB-P1 • Ngày 1 • Nền tảng — Huỳnh Thành Trung',
  },
  {
    id: 'doc-2',
    title: 'Xác định bài toán cho AI — Day 02',
    fileName: '5-day02-lecture-slides-v2.pdf',
    lastModified: 'Hôm qua',
    department: 'AI IN ACTION • Day 02',
    contentTitle: 'Xác định bài toán cho AI',
    subtitle: 'Từ yêu cầu mơ hồ đến Problem Statement rõ ràng — AI IN ACTION • DAY 02',
  },
  {
    id: 'doc-3',
    title: 'Từ Chatbot Đến Agentic Agent — Ngày 3',
    fileName: 'day03-tu-chatbot-den-agentic-agent-react-v7.pdf',
    lastModified: '3 ngày trước',
    department: 'AICB-P1 • Phase 1',
    contentTitle: 'Từ Chatbot Đến Agentic Agent',
    subtitle: 'AICB-P1 • Ngày 3 • Design Pattern ReAct',
  },
  {
    id: 'doc-4',
    title: 'Prompt Engineering & Tool Calling — Ngày 4',
    fileName: 'day04-prompt-engineering-tool-calling.pdf',
    lastModified: '4 ngày trước',
    department: 'AICB-P1 • Phase 1',
    contentTitle: 'Prompt Engineering & Tool Calling',
    subtitle: 'AICB-P1 • Ngày 4 • Làm sao nói để AI hiểu đúng ý?',
  },
];

const relatedDocuments = [
  {
    id: 'rel-1',
    title: 'AI Agent Architecture Patterns',
    fileName: 'Agent_Patterns_2026.pdf',
    department: 'Research & Development',
    fileType: 'PDF',
    matchPercentage: 92,
    snippet:
      'A comprehensive overview of modern agent architectures including ReAct, Plan-and-Execute, and Multi-Agent systems...',
  },
  {
    id: 'rel-2',
    title: 'LLM Evaluation Benchmark Q1 2026',
    fileName: 'LLM_Benchmark_Q1_2026.pdf',
    department: 'AI Research Lab',
    fileType: 'PDF',
    matchPercentage: 78,
    snippet:
      'Latest benchmark results comparing GPT-4o, Claude 4, Gemini 2.5, and open-source models on reasoning, coding, and tool-use tasks...',
  },
  {
    id: 'rel-3',
    title: 'Tool Calling Best Practices',
    fileName: 'Tool_Calling_Guide_v2.pdf',
    department: 'Engineering',
    fileType: 'Word',
    matchPercentage: 85,
    snippet:
      'Engineering guide for implementing reliable tool calling in production AI agents, covering error handling, retry logic, and schema design...',
  },
  {
    id: 'rel-4',
    title: 'Prompt Engineering Cheat Sheet',
    fileName: 'prompt-cheat-sheet-2026.pdf',
    department: 'Knowledge Base',
    fileType: 'PDF',
    matchPercentage: 88,
    snippet:
      'Quick reference for prompt patterns: Chain-of-Thought, Few-Shot, Structured Outputs, System Prompt Design...',
  },
];

function normalizeText(items) {
  let text = '';

  for (const item of items) {
    if (!('str' in item)) continue;

    text += item.str;
    text += item.hasEOL ? '\n' : ' ';
  }

  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function createHeading(text, pageNumber) {
  const firstLine = text.split('\n').find(Boolean);
  if (!firstLine) return `Trang ${pageNumber}`;

  const shortened =
    firstLine.length > 120 ? `${firstLine.slice(0, 117).trimEnd()}...` : firstLine;
  return `Trang ${pageNumber} — ${shortened}`;
}

async function extractDocument(definition) {
  const filePath = path.join(publicDirectory, definition.fileName);
  const bytes = new Uint8Array(await fs.readFile(filePath));
  const pdf = await getDocument({ data: bytes, disableWorker: true }).promise;
  const sections = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = normalizeText(textContent.items);

    sections.push({
      id: `${definition.id}-page-${pageNumber}`,
      heading: createHeading(text, pageNumber),
      pageNumber,
      paragraphs: [
        {
          id: `${definition.id}-page-${pageNumber}-content`,
          text,
        },
      ],
    });
  }

  return {
    id: definition.id,
    title: definition.title,
    fileName: definition.fileName,
    fileUrl: `/${definition.fileName}`,
    pageCount: pdf.numPages,
    currentPage: 1,
    zoom: 100,
    lastModified: definition.lastModified,
    department: definition.department,
    fileType: 'PDF',
    content: {
      title: definition.contentTitle,
      subtitle: definition.subtitle,
      sections,
    },
  };
}

const documents = [];
for (const definition of documentDefinitions) {
  documents.push(await extractDocument(definition));
}

const generatedSource = `import { DocumentItem, RelatedDocument } from '../types';

// Generated from the complete text of every PDF in public/.
// Run "node scripts/generateMockDocuments.mjs" after replacing a sample PDF.
export const INITIAL_DOCUMENTS: DocumentItem[] = ${JSON.stringify(documents, null, 2)};

export const MOCK_RELATED_DOCUMENTS: RelatedDocument[] = ${JSON.stringify(relatedDocuments, null, 2)};
`;

await fs.writeFile(outputPath, generatedSource, 'utf8');
console.log(
  `Generated ${path.relative(frontendDirectory, outputPath)} with ${documents.reduce(
    (total, document) => total + document.pageCount,
    0,
  )} pages.`,
);
