import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUBFOLDER_MAP: Record<string, string> = {
  permit_copy: "Permit Copy",
  folder_copy_before: "Folder Copy - Before",
  folder_copy_complete: "Folder Copy - Complete",
  selection_sheet: "Selection Sheet",
  purchase_order: "Purchase Order",
  materials_list: "Materials List",
  additional_documents: "Additional Project Documents",
};

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN")!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get access token: " + JSON.stringify(data));
  return data.access_token;
}

async function findFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<string | null> {
  let q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) q += ` and '${parentId}' in parents`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

async function createFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) body.parents = [parentId];
  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.id) throw new Error("Failed to create folder: " + JSON.stringify(data));
  return data.id;
}

async function shareFolder(accessToken: string, folderId: string, email: string) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "writer", type: "user", emailAddress: email }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { builder_code, location_name, lot_number } = await req.json();
    if (!builder_code && !location_name && !lot_number) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken();
    const shareEmail = Deno.env.get("GOOGLE_DRIVE_SHARE_EMAIL");

    // Find or create ECFI Hub root folder
    let rootId = await findFolder(accessToken, "ECFI Hub");
    if (!rootId) {
      rootId = await createFolder(accessToken, "ECFI Hub");
      if (shareEmail) await shareFolder(accessToken, rootId, shareEmail);
    }

    // Build project folder name
    const parts = [builder_code, location_name, lot_number].filter(Boolean);
    let folderName = parts.join("_");
    if (!folderName) folderName = "Unnamed Project";

    // Check for duplicate names and append suffix
    let finalName = folderName;
    let suffix = 0;
    while (await findFolder(accessToken, finalName, rootId)) {
      suffix++;
      finalName = `${folderName} (${suffix})`;
    }

    // Create project folder
    const projectFolderId = await createFolder(accessToken, finalName, rootId);

    // Create 7 subfolders
    const subfolders: { category: string; folder_id: string; folder_name: string }[] = [];
    for (const [category, subName] of Object.entries(SUBFOLDER_MAP)) {
      const subId = await createFolder(accessToken, subName, projectFolderId);
      subfolders.push({ category, folder_id: subId, folder_name: subName });
    }

    return new Response(
      JSON.stringify({
        folder_id: projectFolderId,
        folder_url: `https://drive.google.com/drive/folders/${projectFolderId}`,
        folder_name: finalName,
        subfolders,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-drive-folders error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
