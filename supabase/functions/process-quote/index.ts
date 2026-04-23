// =============================================================================
// EDGE FUNCTION: process-quote
// Handles quote requests (authenticated + anonymous).
// Sends admin notification and customer confirmation emails.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL        = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY      = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_EMAIL         = Deno.env.get("ADMIN_EMAIL") ?? "sales@fourthpyramid.com";
const FROM_EMAIL          = Deno.env.get("FROM_EMAIL")  ?? "noreply@fourthpyramid.com";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
}

function itemsTableHtml(items: any[]): string {
  if (!items?.length) return "<p>No items specified.</p>";
  const rows = items.map((item) => `
    <tr style="border-bottom: 1px solid #e0e3e6;">
      <td style="padding: 8px;">${item.name_ar || item.name_en || item.name || "N/A"}</td>
      <td style="padding: 8px; text-align:center;">${item.qty || ""}</td>
      <td style="padding: 8px;">${item.unit || ""}</td>
      <td style="padding: 8px;">${item.notes || ""}</td>
    </tr>
  `).join("");
  return `
    <table style="width:100%; border-collapse: collapse; margin-top:12px;">
      <thead style="background: #eceef1;">
        <tr>
          <th style="padding:8px; text-align:right;">المنتج</th>
          <th style="padding:8px; text-align:center;">الكمية</th>
          <th style="padding:8px; text-align:right;">الوحدة</th>
          <th style="padding:8px; text-align:right;">ملاحظات</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Extract JWT if present (authenticated user)
    const authHeader = req.headers.get("Authorization");
    let customerId: string | null = null;
    if (authHeader) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) customerId = user.id;
    }

    const body = await req.json();
    const {
      contact_name,
      contact_email,
      contact_phone,
      company_name,
      description,
      items = [],           // [{product_id?, name_ar?, name_en?, qty, unit, notes}]
    } = body;

    // Validate
    if (!description) {
      return new Response(
        JSON.stringify({ error: "description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If authenticated, pull contact info from profile
    let resolvedName  = contact_name;
    let resolvedEmail = contact_email;
    let resolvedPhone = contact_phone;
    let resolvedCompany = company_name;

    if (customerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, company_name, phone")
        .eq("id", customerId)
        .single();
      if (profile) {
        resolvedName    = resolvedName    || profile.full_name;
        resolvedPhone   = resolvedPhone   || profile.phone;
        resolvedCompany = resolvedCompany || profile.company_name;
      }
      // Get email from auth
      const { data: { user } } = await supabase.auth.admin.getUserById(customerId);
      if (user) resolvedEmail = resolvedEmail || user.email;
    }

    if (!resolvedEmail) {
      return new Response(
        JSON.stringify({ error: "contact_email is required for anonymous submissions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert quote record
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .insert({
        customer_id:   customerId,
        contact_name:  resolvedName,
        contact_email: resolvedEmail,
        contact_phone: resolvedPhone,
        company_name:  resolvedCompany,
        description,
        items,
        status: "submitted",
      })
      .select()
      .single();

    if (quoteErr) throw quoteErr;

    // Email to admin
    await sendEmail(
      ADMIN_EMAIL,
      `[طلب عرض سعر] ${quote.quote_number} — ${resolvedName || "عميل جديد"}`,
      `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #f7f9fc;">
        <div style="background: #265e97; color: white; padding: 20px; border-radius: 4px 4px 0 0;">
          <h2 style="margin:0">طلب عرض سعر جديد — ${quote.quote_number}</h2>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 4px 4px;">
          <table style="width:100%;">
            <tr><td style="font-weight:700; color:#424750; padding:6px 0;">الاسم</td><td>${resolvedName || "—"}</td></tr>
            <tr><td style="font-weight:700; color:#424750; padding:6px 0;">البريد</td><td>${resolvedEmail}</td></tr>
            <tr><td style="font-weight:700; color:#424750; padding:6px 0;">الهاتف</td><td>${resolvedPhone || "—"}</td></tr>
            <tr><td style="font-weight:700; color:#424750; padding:6px 0;">الشركة</td><td>${resolvedCompany || "—"}</td></tr>
          </table>
          <hr style="border:none; border-top:1px solid #e0e3e6; margin:16px 0;">
          <h4 style="color:#265e97; margin-top:0">وصف الطلب:</h4>
          <p>${description.replace(/\n/g, "<br>")}</p>
          <h4 style="color:#265e97;">المنتجات المطلوبة:</h4>
          ${itemsTableHtml(items)}
          <hr style="border:none; border-top:1px solid #e0e3e6; margin:16px 0;">
          <p style="color:#727781; font-size:12px;">Quote ID: ${quote.id}</p>
        </div>
      </div>
      `
    );

    // Confirmation to customer
    await sendEmail(
      resolvedEmail,
      `تأكيد استلام طلب عرض السعر — ${quote.quote_number}`,
      `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f7f9fc;">
        <div style="background: #265e97; color: white; padding: 20px; border-radius: 4px 4px 0 0;">
          <h2 style="margin:0">شركة الهرم الرابع للبلاستيك</h2>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 4px 4px;">
          <p>عزيزي ${resolvedName || "عميلنا الكريم"}،</p>
          <p>شكراً لاهتمامك بمنتجاتنا. لقد استلمنا طلب عرض السعر الخاص بك برقم <strong>${quote.quote_number}</strong>.</p>
          <p>سيتواصل معك فريق المبيعات خلال يوم عمل واحد.</p>
          <br>
          <p style="color:#265e97; font-weight:700;">فريق المبيعات — Fourth Pyramid</p>
        </div>
      </div>
      `
    );

    return new Response(
      JSON.stringify({ success: true, quote_id: quote.id, quote_number: quote.quote_number }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-quote error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
