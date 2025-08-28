import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { Article } from '@/types';

export const generateDocx = (articles: Article[]): Document => {
  const doc = new Document({
    sections: articles.flatMap(article => [
      new Paragraph({
        children: [new TextRun({ text: article.title, bold: true })],
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [new TextRun(article.content)],
      }),
      new Paragraph({ text: '', pageBreakBefore: true }),
    ]),
  });

  return doc;
};
