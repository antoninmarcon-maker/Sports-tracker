import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TUTORIAL_MESSAGES: Record<number, { title: string; body: string }> = {
  0: {
    title: "Prêt à jouer ? 🏐",
    body: "Étape 1 : Créez votre premier match sur My Volley pour commencer le suivi.",
  },
  1: {
    title: "Sauvegardez vos stats ! 💾",
    body: "Étape 2 : Créez un compte gratuitement pour ne jamais perdre l'historique de vos matchs.",
  },
  2: {
    title: "Passez au niveau supérieur 🚀",
    body: "Étape 3 : Lancez l'analyse IA sur votre dernier match pour obtenir des conseils tactiques personnalisés.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization - only accept service role key (cron/server-to-server)
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const token = authHeader?.replace("Bearer ", "") || "";
    if (token !== serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey!);

    // Import VAPID keys
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize VAPID keys
    const vapidKeys = await webpush.importVapidKeys({
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    }, { extractable: false });

    const appServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:antonin.marcon@gmail.com",
      vapidKeys,
    });

    // Fetch all subscriptions with tutorial_step < 3
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .lt("tutorial_step", 3);

    if (error) {
      throw new Error(`DB query error: ${error.message}`);
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const sub of subscriptions || []) {
      const message = TUTORIAL_MESSAGES[sub.tutorial_step];
      if (!message) continue;

      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth_key,
            p256dh: sub.p256dh_key,
          },
        };

        const subscriber = await appServer.subscribe(pushSubscription);
        
        const payload = JSON.stringify({
          title: message.title,
          body: message.body,
          tag: `tutorial-step-${sub.tutorial_step}`,
          data: { step: sub.tutorial_step },
        });

        await subscriber.pushTextMessage(payload, {});
        sent++;
      } catch (pushErr: any) {
        failed++;
        const errMsg = pushErr?.message || String(pushErr);
        errors.push(`${sub.endpoint.slice(-20)}: ${errMsg}`);

        // If push service returns 410 Gone, subscription is invalid — delete it
        if (errMsg.includes("410") || errMsg.includes("Gone")) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: subscriptions?.length || 0,
        sent,
        failed,
        errors: errors.slice(0, 5),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
