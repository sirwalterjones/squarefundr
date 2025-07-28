import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Personal PayPal accounts are always available
    // No platform-level configuration needed
    return NextResponse.json({
      configured: true,
      personal_accounts: true,
      message:
        "PayPal personal accounts are always available - no setup required",
    });
  } catch (error) {
    console.error("PayPal config check error:", error);
    return NextResponse.json(
      {
        configured: true,
        personal_accounts: true,
        message: "PayPal personal accounts available",
      },
      { status: 200 },
    );
  }
}
