import { NextResponse } from "next/server";

const WEBHOOK_URL = process.env.ACCOUNTS_REFRESH_WEBHOOK_URL;

export async function POST() {
  if (!WEBHOOK_URL) {
    console.error("ACCOUNTS_REFRESH_WEBHOOK_URL environment variable is not set");
    return NextResponse.json(
      { success: false, error: "Webhook not configured" },
      { status: 500 }
    );
  }

  try {
    // Call the webhook and wait for response
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "refresh_accounts",
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned status ${response.status}`);
    }

    const data = await response.json().catch(() => ({}));

    return NextResponse.json({
      success: true,
      message: "Accounts refresh triggered",
      webhookResponse: data,
    });
  } catch (error) {
    console.error("Error calling webhook:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to call webhook" 
      },
      { status: 500 }
    );
  }
}

