import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface ReportData {
  childName: string;
  childAge: number;
  childGender: string | null;
  riskLevel: string;
  riskScore: number;
  mchatScore: number;
  shapValues: Array<{ label: string; value: number; direction: string }>;
  gameStats: { totalSessions: number; accuracy: number; avgResponseTimeMs: number; streak: number };
  reportDate: string;
}

export async function generatePDFReport(data: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // Letter size
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  let y = height - 50;

  // Helper: strip non-Latin1 chars that Helvetica can't encode
  const safe = (s: string) => s.replace(/[^\x00-\xFF]/g, '?');

  const drawText = (text: string, x: number, yPos: number, size: number, f = font, color = rgb(0.05, 0.12, 0.10)) => {
    page.drawText(safe(text), { x, y: yPos, size, font: f, color });
  };

  // Header bar
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0, 0.27, 0.19) });
  drawText('SpectrumCare', 40, height - 45, 22, fontBold, rgb(1, 1, 1));
  drawText('Developmental Screening Report', 40, height - 65, 11, font, rgb(0.7, 0.9, 0.8));
  drawText(data.reportDate, width - 180, height - 45, 10, font, rgb(0.7, 0.9, 0.8));

  y = height - 110;

  // Child info section
  drawText('CHILD INFORMATION', 40, y, 10, fontBold, rgb(0, 0.27, 0.19));
  y -= 25;
  drawText(`Name: ${data.childName}`, 40, y, 11, font);
  drawText(`Age: ${data.childAge} months`, 250, y, 11, font);
  drawText(`Gender: ${data.childGender || 'Not specified'}`, 430, y, 11, font);

  // Divider
  y -= 20;
  page.drawRectangle({ x: 40, y, width: width - 80, height: 1, color: rgb(0.85, 0.88, 0.86) });

  // Risk Score
  y -= 35;
  drawText('SCREENING RESULTS', 40, y, 10, fontBold, rgb(0, 0.27, 0.19));
  y -= 30;

  // Risk badge
  const riskColors: Record<string, [number, number, number]> = {
    LOW: [0.06, 0.73, 0.48], MEDIUM: [0.96, 0.62, 0], HIGH: [0.93, 0.26, 0.26]
  };
  const rc = riskColors[data.riskLevel] || riskColors.LOW;
  page.drawRectangle({ x: 40, y: y - 5, width: 120, height: 30, color: rgb(rc[0], rc[1], rc[2]) });
  drawText(`${data.riskLevel} RISK`, 55, y + 2, 13, fontBold, rgb(1, 1, 1));
  drawText(`M-CHAT-R Score: ${data.mchatScore}/20`, 180, y + 2, 12, font);
  drawText(`Risk Score: ${data.riskScore}%`, 370, y + 2, 12, font);

  // SHAP Factors
  y -= 50;
  drawText('KEY DEVELOPMENTAL FACTORS (SHAP Analysis)', 40, y, 10, fontBold, rgb(0, 0.27, 0.19));
  y -= 20;

  const topShap = data.shapValues.slice(0, 8);
  for (const sv of topShap) {
    const barWidth = Math.abs(sv.value) * 200;
    const barColor = sv.direction === 'risk' ? rgb(0.93, 0.36, 0.28) : rgb(0.06, 0.68, 0.45);
    drawText(sv.label, 40, y, 9, font);
    page.drawRectangle({ x: 220, y: y - 2, width: barWidth, height: 12, color: barColor });
    const dir = sv.direction === 'risk' ? '^ Risk' : 'v Protective';
    drawText(dir, 430, y, 8, font, barColor);
    y -= 22;
  }

  // Game Performance
  y -= 15;
  page.drawRectangle({ x: 40, y, width: width - 80, height: 1, color: rgb(0.85, 0.88, 0.86) });
  y -= 25;
  drawText('GAME PERFORMANCE SUMMARY', 40, y, 10, fontBold, rgb(0, 0.27, 0.19));
  y -= 25;
  drawText(`Total Sessions: ${data.gameStats.totalSessions}`, 40, y, 11, font);
  drawText(`Accuracy: ${data.gameStats.accuracy}%`, 220, y, 11, font);
  drawText(`Avg Response: ${(data.gameStats.avgResponseTimeMs / 1000).toFixed(1)}s`, 380, y, 11, font);
  y -= 18;
  drawText(`Current Streak: ${data.gameStats.streak} days`, 40, y, 11, font);

  // Recommendations
  y -= 40;
  page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 1, color: rgb(0.85, 0.88, 0.86) });
  y -= 25;
  drawText('RECOMMENDATIONS', 40, y, 10, fontBold, rgb(0, 0.27, 0.19));
  y -= 22;

  const recs: Record<string, string[]> = {
    LOW: ['Continue regular developmental check-ups.', 'Encourage play-based learning activities.', 'Monitor milestones at routine visits.'],
    MEDIUM: ['Schedule a follow-up with your pediatrician.', 'Consider a developmental evaluation.', 'Continue therapy games daily.', 'Track progress over the next 30 days.'],
    HIGH: ['Seek a comprehensive developmental evaluation promptly.', 'Contact your pediatrician to discuss referral options.', 'Explore early intervention services in your area.', 'Use therapy games daily to support development.'],
  };

  for (const rec of (recs[data.riskLevel] || recs.LOW)) {
    drawText(`- ${rec}`, 50, y, 10, font);
    y -= 18;
  }

  // Disclaimer
  y -= 20;
  page.drawRectangle({ x: 40, y: y - 40, width: width - 80, height: 50, color: rgb(0.96, 0.96, 0.94) });
  drawText('DISCLAIMER', 50, y - 5, 8, fontBold, rgb(0.5, 0.5, 0.5));
  drawText('This report is for screening purposes only and is not a clinical diagnosis.', 50, y - 18, 8, font, rgb(0.5, 0.5, 0.5));
  drawText('Please consult a qualified healthcare professional for any concerns.', 50, y - 30, 8, font, rgb(0.5, 0.5, 0.5));

  // Footer
  page.drawRectangle({ x: 0, y: 0, width, height: 30, color: rgb(0, 0.27, 0.19) });
  drawText('Generated by SpectrumCare | spectrumcare.app', 40, 10, 8, font, rgb(0.7, 0.9, 0.8));

  return await doc.save();
}
