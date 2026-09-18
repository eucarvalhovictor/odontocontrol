import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, Lock, ShieldCheck, ArrowRight, LogOut, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  PLAN_PRICE, TRIAL_DAYS, billingMode, stripeConfig,
  formatCardNumber, formatExpiry, detectBrand, validateCard,
  processCardPayment, DEMO_CARDS, useSubscription,
} from '../lib/billing';

const BRL = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Checkout() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { sub, loading, load, activate, liberated } = useSubscription(user?.id);
  const mode = billingMode();

  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  if (loading) return <div className="auth-loading"><div className="spin" /></div>;
  if (liberated) return <Navigate to="/app/dashboard" replace />;

  const out = async () => { await signOut(); nav('/app/login'); };

  const pay = async (e) => {
    e?.preventDefault();
    setErr('');
    const card = { number, name, expiry, cvv };
    const v = validateCard(card);
    if (v) { setErr(v); return; }
    setBusy(true);
    try {
      const res = await processCardPayment(card);
      await activate({ last4: res.last4, brand: res.brand, gateway: 'demo' });
      nav('/app/dashboard');
    } catch (e2) {
      setErr(e2.message || 'Não foi possível verificar o cartão. Tente novamente.');
    }
    setBusy(false);
  };

  const goStripe = () => {
    const link = new URL(stripeConfig().paymentLink);
    link.searchParams.set('client_reference_id', user.id);
    link.searchParams.set('prefilled_email', user.email || '');
    window.location.href = link.toString();
  };

  const recheck = async () => {
    setChecking(true);
    await load();
    setChecking(false);
  };

  const returned = params.get('checkout'); // success | cancelled (volta do Stripe)

  return (
    <div className="co-wrap">
      <div className="co-card">
        <div className="co-sum">
          <Link to="/" className="co-brand"><img src="/logo.svg" alt="OdontoControl" /><b>OdontoControl</b></Link>
          <span className="co-kicker">Checkout seguro</span>
          <h1>Plano Único</h1>
          <div className="co-price"><span>R$</span>{PLAN_PRICE.toFixed(2).replace('.', ',')}<small>/mês</small></div>
          <ul>
            <li><CheckCircle2 size={15} /> <b>{TRIAL_DAYS} dias grátis</b>&nbsp;— nada cobrado hoje</li>
            <li><CheckCircle2 size={15} /> Após o trial, {BRL(PLAN_PRICE)}/mês no cartão</li>
            <li><CheckCircle2 size={15} /> Agenda, prontuário, odontograma e estoque</li>
            <li><CheckCircle2 size={15} /> Cancele quando quiser, sem fidelidade</li>
          </ul>
          <span className="co-secure"><Lock size={12} /> Só aceitamos cartão de crédito • dados criptografados</span>
        </div>

        <div className="co-form">
          {returned === 'success' ? (
            <div className="co-pending">
              <RefreshCw size={26} className={checking ? 'spin' : ''} />
              <b>Pagamento recebido pelo Stripe!</b>
              <p>Estamos confirmando a assinatura. Assim que o Stripe avisar nosso sistema, seu acesso é liberado automaticamente.</p>
              <button className="btn-primary" onClick={recheck} disabled={checking}>
                {checking ? 'Verificando...' : 'Já paguei — verificar acesso'}
              </button>
              <small>Pagamento não confirmado? Fale com o suporte informando seu e-mail.</small>
            </div>
          ) : mode === 'stripe-link' ? (
            <>
              <h2>Pagar com cartão</h2>
              <p className="co-sub">Você será levado ao ambiente seguro do Stripe para cadastrar o cartão e ativar os {TRIAL_DAYS} dias grátis.</p>
              {returned === 'cancelled' && (
                <div className="co-alert"><AlertTriangle size={15} /> Pagamento cancelado no Stripe. Tente novamente quando quiser.</div>
              )}
              <div className="co-steps">
                <span><b>1</b> Cadastre o cartão no Stripe</span>
                <span><b>2</b> Verificação aprovada, trial ativado</span>
                <span><b>3</b> Acesso liberado na hora</span>
              </div>
              <button className="btn-primary co-pay" onClick={goStripe}>
                <CreditCard size={17} /> Continuar para o pagamento <ArrowRight size={16} />
              </button>
              <span className="co-secure dark"><ShieldCheck size={12} /> Cobrança de {BRL(PLAN_PRICE)}/mês só após os {TRIAL_DAYS} dias grátis</span>
            </>
          ) : (
            <>
              <h2>Cartão de crédito</h2>
              <p className="co-sub">Verificação do cartão para ativar seus {TRIAL_DAYS} dias grátis. <b>Nada é cobrado hoje.</b></p>
              {err && <div className="co-alert"><AlertTriangle size={15} /> {err}</div>}
              <form onSubmit={pay}>
                <label>Número do cartão*
                  <div className="co-num">
                    <input value={number} onChange={(e) => setNumber(formatCardNumber(e.target.value))} placeholder="0000 0000 0000 0000" inputMode="numeric" autoComplete="cc-number" />
                    {number.replace(/\D/g, '').length >= 4 && <em>{detectBrand(number)}</em>}
                  </div>
                </label>
                <label>Nome impresso no cartão*
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como está no cartão" autoComplete="cc-name" />
                </label>
                <div className="co-row">
                  <label>Validade*<input value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} placeholder="MM/AA" inputMode="numeric" autoComplete="cc-exp" /></label>
                  <label>CVV*<input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" inputMode="numeric" autoComplete="cc-csc" /></label>
                </div>
                <button className="btn-primary co-pay" type="submit" disabled={busy}>
                  <Lock size={16} /> {busy ? 'Verificando com a operadora...' : `Ativar ${TRIAL_DAYS} dias grátis`}
                </button>
              </form>
              <span className="co-demo">Demonstração — use {DEMO_CARDS[0].number} ({DEMO_CARDS[0].label}) ou {DEMO_CARDS[1].number} ({DEMO_CARDS[1].label}).</span>
            </>
          )}
          <button className="co-out" onClick={out}><LogOut size={14} /> Sair da conta</button>
        </div>
      </div>
    </div>
  );
}
