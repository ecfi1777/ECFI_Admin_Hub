const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Fix #2: Validate that the caller is using the service role key.
  // This function is invoked by a database trigger via pg_net, which sends
  // the service_role key as a Bearer token. Reject all other callers.
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!authHeader || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  if (token !== serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { owner_email, new_member_email, org_name, member_role, joined_at } =
      await req.json();

    if (!owner_email || !new_member_email || !org_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured — skipping email.");
      return new Response(
        JSON.stringify({ success: false, reason: "No RESEND_API_KEY" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = "https://ecfiadmin.lovable.app/settings";
    const formattedDate = joined_at
      ? new Date(joined_at).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : new Date().toLocaleDateString("en-US");

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e;">New member joined ${org_name}</h2>
        <p>A new member has joined your organization.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px 0; color: #666;">Organization:</td><td style="padding: 8px 0; font-weight: 600;">${org_name}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">New Member:</td><td style="padding: 8px 0; font-weight: 600;">${new_member_email}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Role:</td><td style="padding: 8px 0; font-weight: 600;">${member_role || "viewer"}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Joined:</td><td style="padding: 8px 0; font-weight: 600;">${formattedDate}</td></tr>
        </table>
        <p>Log in to ECFI Hub to manage your team:</p>
        <a href="${appUrl}" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Manage Team</a>
      </div>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ECFI Hub <onboarding@resend.dev>",
        to: [owner_email],
        subject: `New member joined ${org_name}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      return new Response(
        JSON.stringify({ success: false, error: emailResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailResult);
    return new Response(
      JSON.stringify({ success: true, id: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-owner-new-member:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
