// Owner/Admin authentication edge function.
//
// Verifies an owner secret against a server-stored hash in app_config (key:
// 'admin_owner_secret_hash'). First-run bootstrap also requires a server-provisioned token.
// can be rotated from the admin dashboard via admin_update_app_config. The raw secret
// is NEVER stored, NEVER shipped to the client, and NEVER checked in the frontend.
//
// Endpoints:
//   POST /owner-auth
//     { mode: 'signup' | 'login', email, password, ownerSecret, displayName? }
//   POST /owner-auth  { mode: 'bootstrap_set_secret', newSecret }
//     (only works if no admin exists yet AND no secret hash is set — first-run only)

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Simple hash (SHA-256) via SubtleCrypto. Not bcrypt, but combined with transport over
// HTTPS and admin-only writes this is acceptable for an owner-secret gate. The secret
// itself should be a long random string.
async function sha256(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const mode = String(body.mode ?? "");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json({ error: "Owner authentication is not configured on the server." }, 500);
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ---- Bootstrap: set the owner secret (first-run only) ----
    if (mode === "bootstrap_set_secret") {
      const newSecret = String(body.newSecret ?? "");
      const bootstrapToken = String(body.bootstrapToken ?? "");
      const configuredBootstrapToken = Deno.env.get("OWNER_BOOTSTRAP_SECRET") ?? "";
      if (configuredBootstrapToken.length < 32) {
        return json({ error: "Bootstrap is disabled. Configure OWNER_BOOTSTRAP_SECRET on the server first." }, 503);
      }
      if (!constantTimeEqual(bootstrapToken, configuredBootstrapToken)) {
        return json({ error: "Invalid bootstrap authorization." }, 401);
      }
      if (newSecret.length < 20) return json({ error: "Owner secret must be at least 20 characters." }, 400);
      const { data: existingAdmins, error: adminsError } = await admin
        .from("user_profiles")
        .select("id")
        .eq("is_admin", true)
        .limit(1);
      if (adminsError) return json({ error: adminsError.message }, 500);
      if (existingAdmins && existingAdmins.length > 0) {
        return json({ error: "Admin already exists. Bootstrap closed." }, 403);
      }
      const { data: existing, error: configError } = await admin
        .from("app_config")
        .select("key")
        .eq("key", "admin_owner_secret_hash")
        .maybeSingle();
      if (configError) return json({ error: configError.message }, 500);
      if (existing) {
        return json({ error: "Owner secret already set. Bootstrap closed." }, 403);
      }
      const hash = await sha256(newSecret);
      const { error: insertError } = await admin.from("app_config").insert({
        key: "admin_owner_secret_hash",
        value: hash,
        updated_at: new Date().toISOString(),
      });
      if (insertError) {
        if (insertError.code === "23505") {
          return json({ error: "Owner secret was initialized by another request. Log in with it." }, 409);
        }
        return json({ error: `Could not initialize owner secret: ${insertError.message}` }, 500);
      }
      return json({ ok: true }, 200);
    }

    // ---- signup / login: both require ownerSecret ----
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const ownerSecret = String(body.ownerSecret ?? "");
    const displayName = String(body.displayName ?? "").trim().slice(0, 40);

    if (!email || !password || !ownerSecret) {
      return json({ error: "Email, password, and owner secret are required." }, 400);
    }

    const { data: cfg, error: configReadError } = await admin
      .from("app_config")
      .select("value")
      .eq("key", "admin_owner_secret_hash")
      .maybeSingle();
    if (configReadError) return json({ error: configReadError.message }, 500);
    if (!cfg?.value) {
      return json(
        { error: "Owner secret not initialized. Bootstrap first." },
        500
      );
    }
    const candidateHash = await sha256(ownerSecret);
    if (!constantTimeEqual(candidateHash, cfg.value)) {
      return json({ error: "Invalid owner secret." }, 401);
    }

    if (mode === "signup") {
      const { data: existingAdmins, error: adminLookupError } = await admin
        .from("user_profiles")
        .select("id")
        .eq("is_admin", true)
        .limit(1);
      if (adminLookupError) return json({ error: adminLookupError.message }, 500);
      if (existingAdmins && existingAdmins.length > 0) {
        return json(
          { error: "An admin account already exists. Use login mode instead." },
          400
        );
      }
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
        app_metadata: { is_admin: true },
      });
      if (error) return json({ error: error.message }, 400);
      const { data: sig, error: sigErr } = await admin.auth.signInWithPassword({
        email,
        password,
      });
      if (sigErr) return json({ error: sigErr.message }, 400);
      return json({ session: sig.session, user: data.user }, 200);
    }

    if (mode === "login") {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers();
      if (listErr) return json({ error: listErr.message }, 500);
      const u = list.users.find((x) => x.email?.toLowerCase() === email);
      if (!u) return json({ error: "No admin account with that email." }, 401);
      if (!u.app_metadata?.is_admin) {
        return json({ error: "This account is not an admin." }, 403);
      }
      const { data: profile, error: profileError } = await admin
        .from("user_profiles")
        .select("account_status")
        .eq("id", u.id)
        .maybeSingle();
      if (profileError) return json({ error: profileError.message }, 500);
      if (profile?.account_status === "suspended" || profile?.account_status === "banned") {
        return json({ error: "Account suspended." }, 403);
      }
      const { data: sig, error: sigErr } = await admin.auth.signInWithPassword({
        email,
        password,
      });
      if (sigErr) return json({ error: sigErr.message }, 401);
      await admin.from("security_logs").insert({
        user_id: u.id,
        event: "admin_login",
        metadata: { via: "owner-auth" },
      });
      return json({ session: sig.session, user: sig.user }, 200);
    }

    return json({ error: "Unknown mode." }, 400);
  } catch (err) {
    return json({ error: (err as Error).message ?? "Server error" }, 500);
  }
});
