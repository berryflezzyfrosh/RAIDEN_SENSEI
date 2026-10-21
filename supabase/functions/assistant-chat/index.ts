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

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const aiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Assistant service is not configured." }, 503);

  const authorization = request.headers.get("Authorization") ?? "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  if (!accessToken) return json({ error: "Sign in to use the AI Assistant." }, 401);

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
    if (userError || !userData.user) return json({ error: "Your session has expired. Please sign in again." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("account_status, display_name")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profileError || profile?.account_status !== "active") return json({ error: "An active account is required." }, 403);
    if (!aiKey) return json({ error: "AI Assistant is not configured yet. Please try again later." }, 503);

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const requestedConversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    if (!message || message.length > 4000) return json({ error: "Write a message of up to 4,000 characters." }, 400);

    let conversationId = requestedConversationId;
    if (conversationId) {
      const { data: conversation, error: conversationError } = await admin
        .from("ai_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (conversationError) return json({ error: "Could not load this conversation." }, 500);
      if (!conversation) return json({ error: "Conversation not found." }, 404);
    } else {
      const title = message.replace(/\s+/g, " ").slice(0, 72) || "New conversation";
      const { data: conversation, error: createError } = await admin
        .from("ai_conversations")
        .insert({ user_id: userData.user.id, title })
        .select("id")
        .single();
      if (createError || !conversation) return json({ error: "Could not start a conversation." }, 500);
      conversationId = conversation.id;
    }

    const { data: history, error: historyError } = await admin
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(15);
    if (historyError) return json({ error: "Could not load conversation context." }, 500);

    const chatHistory = (history ?? []).reverse().map((item) => ({
      role: item.role as "user" | "assistant",
      content: item.content,
    }));
    chatHistory.push({ role: "user", content: message });
    const assistantName = profile.display_name || "player";
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are the RAIDEN SENSEI AI Assistant. Help ${assistantName} with the website, Free Fire practice, sensitivity, HUD layouts, and gaming advice. Premium plans are Weekly ₦2,500, Monthly ₦7,000, and Yearly ₦50,000. Give practical, concise, original advice. Do not claim to access account data, make purchases, or send messages for the user. Do not encourage cheats, account theft, or sharing passwords. If asked to navigate the site, name the relevant destination clearly (Messages, Marketplace, Premium, Dashboard, Sensitivity, or Device Analysis). Free Fire is a Garena trademark; you are not official support.` ,
          },
          ...chatHistory,
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const result = await aiResponse.json().catch(() => ({} as Record<string, unknown>));
    if (!aiResponse.ok) {
      console.error("AI provider request failed", aiResponse.status);
      return json({ conversationId, error: "The AI Assistant is temporarily unavailable. Your message is ready to retry." }, 502);
    }
    const choices = result.choices as { message?: { content?: string } }[] | undefined;
    const reply = choices?.[0]?.message?.content?.trim();
    if (!reply) return json({ conversationId, error: "The AI Assistant returned an empty response. Please try again." }, 502);

    const { error: saveMessagesError } = await admin.from("ai_messages").insert([
      { conversation_id: conversationId, role: "user", content: message },
      { conversation_id: conversationId, role: "assistant", content: reply },
    ]);
    if (saveMessagesError) return json({ conversationId, error: "The response was generated but could not be saved." }, 500);

    await admin.from("ai_conversations").update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId).eq("user_id", userData.user.id);

    return json({ conversationId, reply });
  } catch (error) {
    console.error("Assistant request failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "The AI Assistant is temporarily unavailable. Please try again." }, 500);
  }
});