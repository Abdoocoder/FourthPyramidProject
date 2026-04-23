// =============================================================================
// EDGE FUNCTION: send-contact-email
// Triggered when a contact form is submitted. Sends notification email to admin
// and an acknowledgement email to the customer.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL       = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY     = Deno.env.get("RESEND_API_KEY")!;    // set in Supabase secrets
const ADMIN_EMAIL        = Deno.env.get("ADMIN_EMAIL") ?? "info@fourthpyramid.com";
const FROM_EMAIL         = Deno.env.get("FROM_EMAIL")  ?? "noreply@fourthpyramid.com";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error: ${err}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const body = await req.json();
    const {
      full_name,
      email,
      phone,
      company,
      subject,
      message,
      customer_id = null,
    } = body;

    // Validate required fields
    if (!full_name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: full_name, email, subject, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store in Supabase (bypass RLS via service_role)
    const { data: contactRecord, error: dbError } = await supabase
      .from("contact_messages")
      .insert({
        full_name,
        email,
        phone:       phone   ?? null,
        company:     company ?? null,
        subject,
        message,
        customer_id,
        status: "new",
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Send notification to admin
    await sendEmail(
      ADMIN_EMAIL,
      `[رسالة جديدة] ${subject} — ${full_name}`,
      `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f7f9fc;">
        <div style="background: #265e97; color: white; padding: 20px; border-radius: 4px 4px 0 0;">
          <h2 style="margin:0">رسالة تواصل جديدة — Fourth Pyramid</h2>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 4px 4px;">
          <table style="width:100%; border-collapse: collapse;">
            <tr><td style="padding:8px 0; color:#424750; font-weight:700;">الاسم</td><td>${full_name}</td></tr>
            <tr><td style="padding:8px 0; color:#424750; font-weight:700;">البريد</td><td>${email}</td></tr>
            ${phone ? `<tr><td style="padding:8px 0; color:#424750; font-weight:700;">الهاتف</td><td>${phone}</td></tr>` : ""}
            ${company ? `<tr><td style="padding:8px 0; color:#424750; font-weight:700;">الشركة</td><td>${company}</td></tr>` : ""}
            <tr><td style="padding:8px 0; color:#424750; font-weight:700;">الموضوع</td><td>${subject}</td></tr>
          </table>
          <hr style="border:none; border-top:1px solid #e0e3e6; margin: 16px 0;">
          <h4 style="color:#265e97; margin-top:0">نص الرسالة:</h4>
          <p style="color:#191c1e; line-height:1.7">${message.replace(/\n/g, "<br>")}</p>
          <hr style="border:none; border-top:1px solid #e0e3e6; margin: 16px 0;">
          <p style="color:#727781; font-size:12px;">Message ID: ${contactRecord.id}</p>
        </div>
      </div>
      `
    );

    // Send acknowledgement to customer
    await sendEmail(
      email,
      `شكراً لتواصلك معنا — Fourth Pyramid`,
      `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f7f9fc;">
        <div style="background: #265e97; color: white; padding: 20px; border-radius: 4px 4px 0 0;">
          <h2 style="margin:0">شركة الهرم الرابع للبلاستيك</h2>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 4px 4px;">
          <p>عزيزي ${full_name}،</p>
          <p>شكراً لتواصلك معنا. لقد استلمنا رسالتك بخصوص "<strong>${subject}</strong>" وسيتواصل معك فريقنا في أقرب وقت ممكن.</p>
          <p style="color:#727781; font-size:13px;">رقم مرجع الرسالة: <strong>${contactRecord.id}</strong></p>
          <br>
          <p style="color:#265e97; font-weight:700;">فريق Fourth Pyramid</p>
        </div>
      </div>
      `
    );

    return new Response(
      JSON.stringify({ success: true, id: contactRecord.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-contact-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
