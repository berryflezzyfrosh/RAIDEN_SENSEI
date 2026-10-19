import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function normalized(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function findReceiptAmounts(text: string): number[] {
  const values: number[] = [];
  const pattern = /(?:₦|NGN|NAIRA)\s*([0-9][0-9,]*(?:\.\d{1,2})?)|([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:NGN|NAIRA)/gi;
  for (const match of text.matchAll(pattern)) {
    const amount = Number((match[1] ?? match[2]).replace(/,/g, ""));
    if (Number.isFinite(amount)) values.push(amount);
  }
  return values;
}

function evaluateReceipt(text: string, amount: number, reference: string, accountNumber: string) {
  const flags: string[] = [];
  const compactText = normalized(text);
  const receiptAmounts = findReceiptAmounts(text);
  const expectedReference = normalized(reference);
  const expectedAccount = digits(accountNumber);

  if (text.trim().length < 24) flags.push("ocr_text_too_short");
  if (!receiptAmounts.length) flags.push("amount_not_readable");
  else if (!receiptAmounts.some((value) => Math.abs(value - amount) < 0.01)) flags.push("amount_mismatch");
  if (!expectedReference || !compactText.includes(expectedReference)) flags.push("reference_not_found");
  if (!expectedAccount || !digits(text).includes(expectedAccount)) flags.push("beneficiary_not_found");

  const weights: Record<string, number> = {
    ocr_text_too_short: 35,
    amount_not_readable: 20,
    amount_mismatch: 45,
    reference_not_found: 25,
    beneficiary_not_found: 40,
  };
  const riskScore = Math.min(100, flags.reduce((score, flag) => score + weights[flag], 0));
  return { flags, riskScore };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Receipt review is not configured." }, 503);

  const authorization = request.headers.get("Authorization") ?? "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  if (!accessToken) return json({ error: "Authentication required." }, 401);

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
    if (userError || !userData.user) return json({ error: "Session is invalid or expired." }, 401);

    const body = await request.json();
    const paymentId = body.paymentId;
    if (typeof paymentId !== "string" || !paymentId) return json({ error: "A payment ID is required." }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("account_status")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profileError || profile?.account_status !== "active") {
      return json({ error: "An active account is required to screen a receipt." }, 403);
    }
    const [{ data: payment, error: paymentError }, { data: receipt, error: receiptError }] = await Promise.all([
      admin.from("payments").select("id, user_id, amount, transaction_reference, status").eq("id", paymentId).maybeSingle(),
      admin.from("payment_receipts").select("id, user_id, storage_path, mime_type, file_size").eq("payment_id", paymentId).maybeSingle(),
    ]);
    if (paymentError || receiptError) return json({ error: "Could not load payment and receipt." }, 500);
    if (!payment || !receipt || payment.user_id !== userData.user.id || receipt.user_id !== userData.user.id) {
      return json({ error: "Payment or receipt not found for this account." }, 404);
    }
    if (payment.status !== "pending") return json({ error: "Only pending payments can be screened." }, 409);

    const visionKey = Deno.env.get("GOOGLE_VISION_API_KEY") ?? "";
    if (!visionKey) {
      await admin.from("payment_receipts").update({
        fraud_flags: ["scan_unavailable"],
        fraud_risk_score: 0,
      }).eq("id", receipt.id);
      return json({ status: "unavailable", flags: ["scan_unavailable"], riskScore: 0 });
    }

    if (receipt.mime_type === "application/pdf") {
      await admin.from("payment_receipts").update({
        fraud_flags: ["pdf_requires_manual_review"],
        fraud_risk_score: 0,
      }).eq("id", receipt.id);
      return json({ status: "manual_review", flags: ["pdf_requires_manual_review"], riskScore: 0 });
    }
    if (!receipt.mime_type?.startsWith("image/") || receipt.file_size > 5 * 1024 * 1024) {
      return json({ error: "Unsupported receipt format or size." }, 400);
    }

    const { data: file, error: downloadError } = await admin.storage.from("receipts").download(receipt.storage_path);
    if (downloadError || !file) return json({ error: "Could not download receipt for screening." }, 500);

    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(visionKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: btoa(binary) },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        }],
      }),
    });
    const visionResult = await visionResponse.json();
    if (!visionResponse.ok || visionResult.responses?.[0]?.error) {
      const message = visionResult.responses?.[0]?.error?.message ?? "OCR provider request failed.";
      await admin.from("payment_receipts").update({
        fraud_flags: ["scan_unavailable"],
        fraud_risk_score: 0,
      }).eq("id", receipt.id);
      return json({ status: "unavailable", error: message, flags: ["scan_unavailable"], riskScore: 0 });
    }

    const visionData = visionResult.responses[0];
    const text = String(visionData.fullTextAnnotation?.text ?? "").slice(0, 20000);
    const confidences = (visionData.fullTextAnnotation?.pages ?? [])
      .map((page: { confidence?: number }) => page.confidence)
      .filter((confidence: number | undefined): confidence is number => typeof confidence === "number");
    const confidence = confidences.length
      ? confidences.reduce((sum: number, value: number) => sum + value, 0) / confidences.length
      : 0;

    const { data: accountConfig } = await admin.from("app_config").select("value").eq("key", "opay_account_number").maybeSingle();
    const review = evaluateReceipt(text, Number(payment.amount), payment.transaction_reference, accountConfig?.value ?? "");
    const { error: updateError } = await admin.from("payment_receipts").update({
      ocr_text: text,
      ocr_confidence: confidence,
      fraud_risk_score: review.riskScore,
      fraud_flags: review.flags,
    }).eq("id", receipt.id);
    if (updateError) return json({ error: "OCR completed but screening results could not be saved." }, 500);

    return json({ status: "screened", flags: review.flags, riskScore: review.riskScore, confidence });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Receipt screening failed." }, 500);
  }
});