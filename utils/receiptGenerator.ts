import jsPDF from "jspdf";
import { Campaign, SelectedSquare } from "@/types";
import { formatPrice } from "./pricingUtils";

export interface ReceiptData {
  campaign: Campaign;
  squares: SelectedSquare[];
  donorName: string;
  donorEmail: string;
  paymentMethod: "paypal" | "cash";
  transactionId?: string;
  donationDate: string;
  totalAmount: number;
}

export function generatePDFReceipt(receiptData: ReceiptData): void {
  const {
    campaign,
    squares,
    donorName,
    donorEmail,
    paymentMethod,
    transactionId,
    donationDate,
    totalAmount,
  } = receiptData;

  // Create new PDF document
  const doc = new jsPDF();

  // Set up SquareFundr brand colors
  const brandBlack: [number, number, number] = [17, 24, 39]; // Gray-900 (nearly black)
  const brandAccent: [number, number, number] = [55, 65, 81]; // Gray-700  
  const textColor: [number, number, number] = [31, 41, 55]; // Gray-800
  const lightGray: [number, number, number] = [243, 244, 246]; // Gray-100

  // Professional header with gradient effect
  doc.setFillColor(...brandBlack);
  doc.rect(0, 0, 210, 50, "F");
  
  // Subtle accent stripe
  doc.setFillColor(75, 85, 99); // Gray-600
  doc.rect(0, 45, 210, 5, "F");

  // SF Logo Circle (text-based)
  doc.setFillColor(255, 255, 255);
  doc.circle(25, 25, 12, "F");
  doc.setTextColor(...brandBlack);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SF", 20, 29);

  // SquareFundr branding
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("SquareFundr", 45, 22);
  
  // Tagline
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Square-by-Square Fundraising", 45, 30);

  // Title with professional styling
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("DONATION RECEIPT", 105, 38, { align: "center" });

  // Reset text color
  doc.setTextColor(...textColor);

  // Receipt details section
  let yPos = 70;

  // Receipt header info
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Receipt Date: ${new Date(donationDate).toLocaleDateString()}`,
    20,
    yPos,
  );
  if (transactionId) {
    doc.text(`Transaction ID: ${transactionId}`, 20, yPos + 8);
    yPos += 8;
  }
  yPos += 20;

  // Campaign Information
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Campaign Information", 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  // Campaign title (wrap if too long)
  const titleLines = doc.splitTextToSize(`Campaign: ${campaign.title}`, 170);
  doc.text(titleLines, 20, yPos);
  yPos += titleLines.length * 6;

  if (campaign.description) {
    const descLines = doc.splitTextToSize(
      `Description: ${campaign.description}`,
      170,
    );
    doc.text(descLines, 20, yPos);
    yPos += descLines.length * 6;
  }

  yPos += 10;

  // Donor Information
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Donor Information", 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${donorName}`, 20, yPos);
  doc.text(`Email: ${donorEmail}`, 20, yPos + 8);
  doc.text(
    `Payment Method: ${paymentMethod === "paypal" ? "PayPal" : "Cash Payment"}`,
    20,
    yPos + 16,
  );
  yPos += 35;

  // Squares purchased section
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Squares Purchased", 20, yPos);
  yPos += 10;

  // Table header with brand styling
  doc.setFillColor(...brandAccent);
  doc.rect(20, yPos - 2, 170, 12, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Square #", 25, yPos + 6);
  doc.text("Position", 70, yPos + 6);
  doc.text("Amount", 150, yPos + 6);
  
  // Reset text color for table content
  doc.setTextColor(...textColor);
  yPos += 15;

  // Table rows
  doc.setFont("helvetica", "normal");
  squares.forEach((square, index) => {
    if (yPos > 250) {
      // Check if we need a new page
      doc.addPage();
      yPos = 30;
    }

    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252); // Very light gray
      doc.rect(20, yPos - 4, 170, 10, "F");
    }

    doc.text(`${square.number}`, 25, yPos + 2);
    doc.text(`Row ${square.row + 1}, Col ${square.col + 1}`, 70, yPos + 2);
    doc.text(formatPrice(square.value), 150, yPos + 2);
    yPos += 10;
  });

  yPos += 10;

  // Total section with brand styling
  doc.setFillColor(...brandBlack);
  doc.rect(20, yPos - 2, 170, 18, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Donation: ${formatPrice(totalAmount)}`, 25, yPos + 10);
  doc.setFontSize(12);
  doc.text(`${squares.length} Square${squares.length !== 1 ? 's' : ''} Purchased`, 120, yPos + 10);

  yPos += 28;

  // Footer
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  if (yPos > 250) {
    doc.addPage();
    yPos = 30;
  }

  // Professional footer with branding
  doc.setFillColor(...lightGray);
  doc.rect(20, yPos - 5, 170, 35, "F");
  
  doc.setTextColor(...brandBlack);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Thank you for your generous donation!", 25, yPos + 5);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const footerText = [
    "",
    "This receipt serves as confirmation of your contribution to this SquareFundr campaign.",
    paymentMethod === "cash"
      ? "Please retain this receipt for your records and arrange payment with the campaign organizer."
      : "Your payment has been processed securely through PayPal.",
    "",
    `Generated on ${new Date().toLocaleString()} | www.squarefundr.com`,
  ];

  footerText.forEach((line, index) => {
    if (line === "") {
      yPos += 4;
    } else {
      doc.text(line, 25, yPos);
      yPos += 5;
    }
  });

  // Generate filename
  const campaignSlug =
    campaign.slug || campaign.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const dateStr = new Date(donationDate).toISOString().split("T")[0];
  const filename = `receipt-${campaignSlug}-${dateStr}.pdf`;

  // Save the PDF
  doc.save(filename);
}

export function createReceiptData(
  campaign: Campaign,
  squares: SelectedSquare[],
  donorName: string,
  donorEmail: string,
  paymentMethod: "paypal" | "cash",
  transactionId?: string,
): ReceiptData {
  const totalAmount = squares.reduce((sum, square) => sum + square.value, 0);

  return {
    campaign,
    squares,
    donorName,
    donorEmail,
    paymentMethod,
    transactionId,
    donationDate: new Date().toISOString(),
    totalAmount,
  };
}
