// Supabase Edge Function: stripe-webhook
// Ativa a assinatura quando o Stripe confirma o pagamento do Payment Link.
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Segredos: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
// Webhook no Stripe: https://SEU-PROJETO.supabase.co/functions/v1/stripe-webhook
// Eventos: checkout.session.completed, customer.subscription.created,
//          customer.subscription.updated, customer.subscription.deleted
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Valida assinatura Stripe (tolerance 5 min)
async function verifyStripe(req, raw) {
  const sig = req.headers.get('stripe-signature') ?? '';
  const m = sig.match(/t=(\d+),.*v1=([a-f0-9]+)/);
  if (!m) return false;
  const [_, ts, v1] = m;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${raw}`));
  return hex(digest) === v1;
}

serve(async (req) => {
  const raw = await req.text();
  if (WEBHOOK_SECRET && !(await verifyStripe(req, raw))) {
    return new Response('bad signature', { status: 400 });
  }
  const event = JSON.parse(raw);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  );

  async function upsertByUser(userId, patch) {
    if (!userId) return;
    await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        status: 'active',
        plan: 'unico',
        gateway: 'stripe',
        updated_at: new Date().toISOString(),
        ...patch,
      },
      { onConflict: 'user_id' },
    );
  }

  const type = event.type;
  const obj = event.data?.object ?? {};

  if (type === 'checkout.session.completed') {
    // client_reference_id = user.id (enviado pelo Checkout.jsx) ou metadata.user_id
    const userId = obj.client_reference_id || obj.metadata?.user_id || null;
    await upsertByUser(userId, {
      gateway_customer_id: obj.customer ?? null,
      gateway_subscription_id: obj.subscription ?? null,
    });
  } else if (
    type === 'customer.subscription.created' ||
    type === 'customer.subscription.updated'
  ) {
    const map = { trialing: 'trialing', active: 'active', past_due: 'past_due', canceled: 'canceled', unpaid: 'past_due' };
    const status = map[obj.status] ?? 'past_due';
    // Localiza o user pelo customer id ou subscription id já gravados
    const { data } = await supabase.from('subscriptions').select('user_id')
      .or(`gateway_customer_id.eq.${obj.customer},gateway_subscription_id.eq.${obj.id}`)
      .maybeSingle();
    if (data?.user_id) {
      await upsertByUser(data.user_id, {
        status,
        trial_ends_at: obj.trial_end ? new Date(obj.trial_end * 1000).toISOString() : null,
        current_period_end: obj.current_period_end
          ? new Date(obj.current_period_end * 1000).toISOString()
          : null,
      });
    }
  } else if (type === 'customer.subscription.deleted') {
    const { data } = await supabase.from('subscriptions').select('user_id')
      .or(`gateway_customer_id.eq.${obj.customer},gateway_subscription_id.eq.${obj.id}`)
      .maybeSingle();
    if (data?.user_id) await upsertByUser(data.user_id, { status: 'canceled' });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
