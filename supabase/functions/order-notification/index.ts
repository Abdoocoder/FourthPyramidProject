// =============================================================================
// EDGE FUNCTION: order-notification
// Called by admin to update order status and notify the customer via email.
// Also supports triggering the daily analytics refresh.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL        = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY   = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY      = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL          = Deno.env.get("FROM_EMAIL") ?? "noreply@fourthpyramid.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Arabic labels for order statuses
const STATUS_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  pending:       { ar: "قيد الانتظار",     en: "Pending",       color: "#f59e0b" },
  confirmed:     { ar: "تم التأكيد",        en: "Confirmed",     color: "#3b82f6" },
  in_production: { ar: "قيد التصنيع",      en: "In Production", color: "#8b5cf6" },
  quality_check: { ar: "فحص الجودة",       en: "Quality Check", color: "#6366f1" },
  shipped:       { ar: "تم الشحن",          en: "Shipped",       color: "#0ea5e9" },
  delivered:     { ar: "تم التسليم",        en: "Delivered",     color: "#22c55e" },
  cancelled:     { ar: "ملغي",              en: "Cancelled",     color: "#ef4444" },
  on_hold:       { ar: "محتجز مؤقتاً",     en: "On Hold",       color: "#f97316" },
};

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    console.error("Email send failed:", await res.text());
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify requester is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Use service client to check admin role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { action } = body;

    // ── Action: update_order_status ──────────────────────────────────────────
    if (action === "update_order_status") {
      const { order_id, new_status, admin_note, tracking_code, delivery_date_est } = body;

      if (!order_id || !new_status) {
        return new Response(
          JSON.stringify({ error: "order_id and new_status are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch current order with customer info
      const { data: order, error: orderErr } = await supabase
        .from("orders_with_customer")
        .select("*")
        .eq("id", order_id)
        .single();

      if (orderErr || !order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build update payload
      const updatePayload: Record<string, any> = { status: new_status };
      if (admin_note)       updatePayload.admin_notes     = admin_note;
      if (tracking_code)    updatePayload.tracking_code   = tracking_code;
      if (delivery_date_est) updatePayload.delivery_date_est = delivery_date_est;
      if (new_status === "delivered") updatePayload.delivered_at = new Date().toISOString();

      const { error: updateErr } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", order_id);

      if (updateErr) throw updateErr;

      // Notify customer by email
      const statusInfo = STATUS_LABELS[new_status] || { ar: new_status, en: new_status, color: "#265e97" };
      const customerEmail = order.customer_email;

      if (customerEmail) {
        await sendEmail(
          customerEmail,
          `تحديث طلبك ${order.order_number} — ${statusInfo.ar}`,
          `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto; padding:24px; background:#f7f9fc;">
            <div style="background:#265e97; color:white; padding:20px; border-radius:4px 4px 0 0;">
              <h2 style="margin:0">تحديث حالة طلبك</h2>
            </div>
            <div style="background:white; padding:24px; border-radius:0 0 4px 4px;">
              <p>عزيزي ${order.customer_name || "عميلنا الكريم"}،</p>
              <p>نود إعلامك بأن طلبك رقم <strong>${order.order_number}</strong> قد تم تحديث حالته إلى:</p>
              <div style="background:${statusInfo.color}20; border-right:4px solid ${statusInfo.color}; padding:12px 16px; border-radius:4px; margin:16px 0;">
                <strong style="color:${statusInfo.color}; font-size:18px;">${statusInfo.ar}</strong>
                <span style="color:#727781; margin-right:8px;">(${statusInfo.en})</span>
              </div>
              ${tracking_code ? `<p><strong>رقم التتبع:</strong> ${tracking_code}</p>` : ""}
              ${delivery_date_est ? `<p><strong>التسليم المتوقع:</strong> ${delivery_date_est}</p>` : ""}
              ${admin_note ? `<p><strong>ملاحظة:</strong> ${admin_note}</p>` : ""}
              <hr style="border:none; border-top:1px solid #e0e3e6; margin:16px 0;">
              <p>يمكنك متابعة طلبك من خلال حسابك على موقعنا.</p>
              <p style="color:#265e97; font-weight:700;">فريق Fourth Pyramid</p>
            </div>
          </div>
          `
        );
      }

      return new Response(
        JSON.stringify({ success: true, order_number: order.order_number, new_status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: refresh_analytics ────────────────────────────────────────────
    if (action === "refresh_analytics") {
      const { date } = body; // optional: YYYY-MM-DD, defaults to yesterday
      const { error: analyticsErr } = await supabase.rpc("refresh_daily_analytics", {
        p_date: date || new Date(Date.now() - 86400000).toISOString().split("T")[0],
      });
      if (analyticsErr) throw analyticsErr;
      return new Response(
        JSON.stringify({ success: true, message: "Analytics snapshot refreshed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: convert_quote ────────────────────────────────────────────────
    if (action === "convert_quote") {
      const { quote_id } = body;
      if (!quote_id) {
        return new Response(
          JSON.stringify({ error: "quote_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: orderId, error: convertErr } = await supabase.rpc("convert_quote_to_order", {
        p_quote_id: quote_id,
        p_admin_id: user.id,
      });
      if (convertErr) throw convertErr;
      return new Response(
        JSON.stringify({ success: true, order_id: orderId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("order-notification error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
