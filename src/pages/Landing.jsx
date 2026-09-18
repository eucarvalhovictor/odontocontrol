import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, Users, Pill, Package, Stethoscope,
  CheckCircle2, ArrowRight, ClipboardList, LayoutGrid, Activity, LogIn, Star, Sparkles, Menu, X,
  ShieldCheck, Lock, Headset, ChevronDown, Flame, BadgeCheck, Building2, FileCheck2,
  CalendarCheck, TrendingUp, Play,
} from 'lucide-react';

// Reveal on scroll: adiciona .in quando entra na viewport
function Rv({ children, d = 0, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`rv ${className}`} style={{ transitionDelay: `${d}ms` }}>{children}</div>;
}

// Dente institucional reutilizável (mesmo traço do logo)
function Tooth({ size = 20, className = '', opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} style={{ opacity }} aria-hidden="true">
      <path d="M64 34 C58 26 42 26 39 40 C36 52 41 62 43 74 C45 86 45 98 51 101 C57 104 58 94 58 86 C58 78 60 74 64 74 C68 74 70 78 70 86 C70 94 71 104 77 101 C83 98 83 86 85 74 C87 62 92 52 89 40 C86 26 70 26 64 34 Z" fill="currentColor" />
    </svg>
  );
}

// Preço único, sem pegadinha: urgência honesta (teste grátis que começa no cadastro).

const FEATURES = [
  { icon: CalendarDays, t: 'Agenda inteligente', d: 'Visão por dia, semana e mês com status por consulta — agendado, confirmado, concluído ou cancelado. Você no controle, sem planilha.' },
  { icon: Users, t: 'Pacientes e prontuário', d: 'Cadastro completo com foto, anamnese com salvamento automático, plano de tratamento e exames de imagem.' },
  { icon: LayoutGrid, t: 'Odontograma interativo', d: 'Mapa dental em numeração FDI: toque no dente e marque cárie, restauração, canal, coroa, implante e mais.' },
  { icon: Activity, t: 'Evolução por consulta', d: 'Registre o que foi feito em cada atendimento. Paciente novo na hora? Cadastre em segundos e vincule tudo.' },
  { icon: Pill, t: 'Receitas para imprimir', d: 'Prescrições com cabeçalho do seu consultório, pré-visualização e impressão em um clique.' },
  { icon: Package, t: 'Estoque sob controle', d: 'Controle de insumos com estoque mínimo e alertas — ideal para consultórios pequenos e médios.' },
];

const STEPS = [
  ['01', 'Crie sua conta', 'Leva menos de um minuto. Sua agenda, pacientes e estoque ficam isolados por consultório.'],
  ['02', 'Cadastre seus pacientes', 'Adicione seu logo, seus pacientes e organize a agenda do seu ritmo — autônomo ou equipe pequena.'],
  ['03', 'Atenda e evolua', 'Marque consultas, registre evoluções por atendimento e imprima receitas com seu cabeçalho.'],
];

const PLAN = {
  name: 'Plano Único',
  price: '99,90',
  desc: 'Tudo liberado para o dentista e seu consultório pequeno ou médio.',
  feats: ['Agenda dia, semana e mês', 'Pacientes e prontuário completo', 'Odontograma FDI interativo', 'Evolução por consulta', 'Receitas com seu logo', 'Controle de estoque', 'Suporte em português'],
  cta: 'Criar conta e testar grátis',
};

const FAQS = [
  { q: 'Preciso instalar alguma coisa?', a: 'Não. O OdontoControl é 100% web: funciona no computador, tablet e celular, direto no navegador. Ideal para o dentista que atende em uma ou duas cadeiras e não tem TI.' },
  { q: 'Meus dados estão seguros? E a LGPD?', a: 'Sim. Usamos criptografia, acesso isolado por conta (cada dentista só vê os próprios dados) e infraestrutura com backup. Você pode exportar e excluir seus dados quando quiser, conforme a LGPD.' },
  { q: 'Posso testar antes de pagar?', a: 'Sim. Você cria a conta, cadastra o cartão de crédito para verificação e ganha 7 dias grátis — nada é cobrado nesse período. Se não servir para sua rotina, cancele antes do fim do teste e não paga nada.' },
  { q: 'Quanto custa após o teste?', a: 'Após os 7 dias grátis, apenas R$99,90 por mês, cobrados no cartão cadastrado. Sem fidelidade, sem taxa de setup: cancele quando quiser e mantenha o acesso até o fim do ciclo pago.' },
  { q: 'Consigo levar meus pacientes de planilhas ou cadernos?', a: 'Sim. Você cadastra em minutos com nosso modelo de planilha pronto e pode importar sua carteira de pacientes.' },
  { q: 'Serve se eu atender sozinho ou com 1–2 parceiros?', a: 'Foi feito exatamente para isso: do dentista autônomo ao consultório pequeno e médio, tudo em um só painel.' },
  { q: 'Posso cancelar quando quiser?', a: 'Pode. Não há fidelidade nem taxa de cancelamento. Você mantém o acesso até o fim do ciclo pago e pode exportar tudo.' },
];

const MODULES = ['Agenda', 'Prontuário', 'Odontograma', 'Evolução', 'Receitas', 'Estoque'];

const TESTIMONIALS = [
  { name: 'Dra. Camila Rocha', meta: 'Consultório autônomo • CRO-SP', init: 'CR', photo: 'https://randomuser.me/api/portraits/women/44.jpg', quote: 'Saí do caderno em um fim de semana. Hoje abro a agenda e sei exatamente quem confirmou, quem faltou e o que fiz em cada dente.' },
  { name: 'Dr. Rafael Mendes', meta: 'Consultório com 2 cadeiras • CRO-MG', init: 'RM', photo: 'https://randomuser.me/api/portraits/men/32.jpg', quote: 'O odontograma sozinho já vale a assinatura. Mostro o plano na tela para o paciente e o aceite do orçamento subiu muito.' },
  { name: 'Dra. Juliana Paiva', meta: 'Consultório médio • CRO-RJ', init: 'JP', photo: 'https://randomuser.me/api/portraits/women/68.jpg', quote: 'Eu atendo e gerencio. Anamnese que se salva sozinha, receita com meu logo e estoque sem planilha — parece feito para a minha realidade.' },
];

const HERO_PHOTOS = [
  { src: 'https://randomuser.me/api/portraits/women/44.jpg', alt: 'Dentista usuária' },
  { src: 'https://randomuser.me/api/portraits/men/32.jpg', alt: 'Dentista usuário' },
  { src: 'https://randomuser.me/api/portraits/women/68.jpg', alt: 'Dentista usuária' },
];

function FaqItem({ q, a, open, onToggle }) {
  return (
    <div className={`lp-faq-item ${open ? 'open' : ''}`}>
      <button type="button" className="lp-faq-q" onClick={onToggle} aria-expanded={open}>
        <span className="lp-faq-qi"><Tooth size={15} /></span>
        <span>{q}</span>
        <ChevronDown size={18} className="lp-faq-chev" />
      </button>
      <div className="lp-faq-a" aria-hidden={!open}>
        <p>{a}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(1);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="lp">
      {/* Barra institucional */}
      <div className="lp-announce">
        <span className="lp-announce-pill"><Flame size={13} /> Lançamento</span>
        <p>7 dias grátis com verificação do cartão — depois só <b>R$99,90/mês</b></p>
        <a href="#planos">Ver plano <ArrowRight size={13} /></a>
      </div>

      {/* MENU full-width, compacto, itens centralizados */}
      <header className="lp-nav">
        <div className="lp-nav-in">
          <a href="#topo" className="lp-brand" onClick={closeMenu}>
            <img src="/logo.svg" alt="OdontoControl" />
            <span><b>OdontoControl</b><small>Gestão de consultório</small></span>
          </a>
          <nav className="lp-links" aria-label="Navegação principal">
            <a href="#recursos">Recursos</a>
            <a href="#prontuario">Prontuário</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#depoimentos">Depoimentos</a>
            <a href="#planos">Planos</a>
            <a href="#faq">Dúvidas</a>
          </nav>
          <div className="lp-nav-cta">
            <Link to="/app/login" className="lp-ghost lp-nav-ghost"><LogIn size={14} /> Entrar</Link>
            <Link to="/app/login?cadastro=1" className="btn-primary lp-nav-btn">Começar grátis <ArrowRight size={14} /></Link>
          </div>
          <button className="lp-burger" onClick={() => setMenuOpen(!menuOpen)} title="Menu" aria-label="Menu">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        {menuOpen && (
          <nav className="lp-menu">
            <a href="#recursos" onClick={closeMenu}>Recursos</a>
            <a href="#prontuario" onClick={closeMenu}>Prontuário</a>
            <a href="#como-funciona" onClick={closeMenu}>Como funciona</a>
            <a href="#depoimentos" onClick={closeMenu}>Depoimentos</a>
            <a href="#planos" onClick={closeMenu}>Planos</a>
            <a href="#faq" onClick={closeMenu}>Dúvidas frequentes</a>
            <Link to="/app/login" className="lp-ghost" onClick={closeMenu}><LogIn size={15} /> Entrar</Link>
          </nav>
        )}
      </header>

      <section className="lp-hero lp-hero-v2" id="topo">
        <div className="lp-hero-bg" aria-hidden="true" />
        <span className="lp-orb o1" aria-hidden="true" />
        <span className="lp-orb o2" aria-hidden="true" />
        <Tooth size={300} className="lp-tooth-ghost t1" opacity={0.07} />
        <Tooth size={150} className="lp-tooth-ghost t2" opacity={0.09} />
        <div className="lp-hero-in v2">
          <Rv className="lp-hero-copy center">
            <span className="lp-badge"><span className="lp-pulse" /> Novo • Odontograma FDI interativo</span>
            <h1>O consultório em ordem.<br /><em>Você no controle.</em></h1>
            <p>Agenda, prontuário, odontograma, receitas e estoque em um só painel — feito para o dentista dono de consultório pequeno e médio.</p>
            <div className="lp-hero-btns center">
              <Link to="/app/login?cadastro=1" className="btn-primary lp-big">Testar 7 dias grátis <ArrowRight size={17} /></Link>
              <a href="#como-funciona" className="lp-ghost lp-big lp-play"><span className="lp-play-ic"><Play size={14} /></span> Ver como funciona</a>
            </div>
            <div className="lp-proof">
              <span className="lp-avatars">{HERO_PHOTOS.map((p) => (
                <img key={p.src} src={p.src} alt={p.alt} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ))}</span>
              <span className="lp-stars"><Star size={14} /><Star size={14} /><Star size={14} /><Star size={14} /><Star size={14} /></span>
              <small><b>4,9/5</b> • 120+ dentistas</small>
            </div>
          </Rv>
          <Rv d={150} className="lp-hero-visual">
            <div className="lp-dash">
              <div className="lp-dash-bar">
                <span className="lp-dots"><i /><i /><i /></span>
                <span className="lp-url"><Lock size={11} /> app.odontocontrol • hoje</span>
              </div>
              <div className="lp-dash-body">
                <div className="lp-dash-nav">
                  <span className="on"><LayoutGrid size={15} /></span>
                  <span><CalendarDays size={15} /></span>
                  <span><Users size={15} /></span>
                  <span><Pill size={15} /></span>
                  <span><Tooth size={15} /></span>
                </div>
                <div className="lp-dash-main">
                  <div className="lp-dash-top">
                    <div><b>Bom dia, Dra. Camila</b><small>Terça • 8 consultas • 2 cadeiras</small></div>
                    <span className="lp-pill">+ Nova consulta</span>
                  </div>
                  <div className="lp-dash-kpis">
                    <div><small><CalendarCheck size={12} /> Hoje</small><b>8 <em>consultas</em></b></div>
                    <div><small><CheckCircle2 size={12} /> Confirmadas</small><b>6 <em>de 8</em></b></div>
                    <div className="grad"><small><TrendingUp size={12} /> Receita dia</small><b>R$ 2,4k</b></div>
                  </div>
                  <div className="lp-dash-appts">
                    <div><span className="lp-av">MS</span><span><b>Maria Silva • 09:00</b><small>Restauração • dente 36</small></span><em className="ok">Confirmada</em></div>
                    <div><span className="lp-av two">JO</span><span><b>João Oliveira • 10:30</b><small>Canal • dente 46</small></span><em className="wait">Aguardando</em></div>
                    <div><span className="lp-av three">AL</span><span><b>Ana Lima • 14:00</b><small>Limpeza + retorno</small></span><em className="ok">Confirmada</em></div>
                  </div>
                  <div className="lp-dash-teeth">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <span key={i} className={i === 2 || i === 5 ? 'mark' : ''}><Tooth size={17} /></span>
                    ))}
                    <small>Odontograma FDI • toque e marque</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="float-card lp-float f-top"><span className="fdot" /><div><b>Consulta confirmada</b><small>Hoje • 09:00 • Maria S.</small></div></div>
            <div className="float-card lp-float f-bot"><ClipboardList size={16} /><div><b>Evolução registrada</b><small>Canal 46 • concluído ✓</small></div></div>
            <div className="lp-glass-seal"><BadgeCheck size={16} /><div><b>7 dias grátis</b><small>Após, só R$99,90/mês</small></div></div>
          </Rv>
        </div>
        <div className="lp-hero-stats">
          <div><b>6+</b><span>módulos em um painel</span></div>
          <div><b>32</b><span>dentes no odontograma</span></div>
          <div><b>1 min</b><span>para criar sua conta</span></div>
          <div><b>LGPD</b><span>dados protegidos</span></div>
        </div>
        <div className="lp-marquee" aria-hidden="true">
          <div className="lp-track">
            {[...MODULES, ...MODULES, ...MODULES, ...MODULES].map((m, i) => (
              <span key={i}><Tooth size={13} /> {m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Faixa institucional */}
      <section className="lp-strip">
        <div className="lp-strip-in">
          <span><Building2 size={16} /> Do autônomo ao consultório médio</span>
          <span><FileCheck2 size={16} /> Prontuário organizado por paciente</span>
          <span><ShieldCheck size={16} /> Você no controle, sem depender de TI</span>
        </div>
      </section>

      <section className="lp-sec" id="recursos">
        <Rv><span className="lp-kicker"><Tooth size={13} /> Recursos</span></Rv>
        <Rv><h2>Feito para a rotina de quem<br />atende e gerencia.</h2></Rv>
        <Rv><p className="lp-sec-sub">Sem sistema complicado de hospital: o essencial para o dentista dono de consultório pequeno ou médio.</p></Rv>
        <div className="lp-grid">
          {FEATURES.map(({ icon: Icon, t, d }, i) => (
            <Rv key={t} d={(i % 3) * 90}>
              <div className="lp-feat">
                <span className="lp-feat-ic"><Icon size={21} /></span>
                <b>{t}</b>
                <p>{d}</p>
              </div>
            </Rv>
          ))}
        </div>
      </section>

      <section className="lp-sec alt" id="prontuario">
        <div className="lp-split">
          <Rv className="lp-split-copy">
            <span className="lp-kicker">Prontuário completo</span>
            <h2>Do primeiro atendimento<br />ao retorno.</h2>
            <p>Paciente novo sem cadastro? Você registra em segundos na própria agenda, vincula as evoluções e abre o prontuário direto na anamnese — sem ajuda de terceiros.</p>
            <ul className="lp-check">
              <li><CheckCircle2 size={16} /> Anamnese com salvamento automático</li>
              <li><CheckCircle2 size={16} /> Plano de tratamento com valores</li>
              <li><CheckCircle2 size={16} /> Exames de imagem anexados</li>
              <li><CheckCircle2 size={16} /> Odontograma FDI interativo</li>
              <li><CheckCircle2 size={16} /> Histórico de evolução por consulta</li>
            </ul>
            <Link to="/app/login" className="btn-primary">Testar agora <ArrowRight size={15} /></Link>
          </Rv>
          <Rv d={140}>
            <div className="lp-record">
              <div className="lp-record-head"><i><Tooth size={26} /></i><div><b>Maria Silva</b><small>Particular • 34 anos</small></div></div>
              <div className="lp-seg"><span className="on">Anamnese</span><span>Plano</span><span>Exames</span><span>Odonto</span></div>
              <div className="lp-arch">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className={i === 2 || i === 5 ? 'mark' : ''}><Tooth size={20} /></span>
                ))}
              </div>
              <div className="lp-record-body">
                <span className="ln" style={{ width: '92%' }} /><span className="ln" style={{ width: '78%' }} />
                <span className="ln short" /><span className="ln" style={{ width: '85%' }} />
                <div className="lp-pbar"><i style={{ width: '72%' }} /></div>
              </div>
              <div className="float-card lp-f3"><Stethoscope size={15} /><div><b>Dra. Camila</b><small>CRO-SP 00000</small></div></div>
            </div>
          </Rv>
        </div>
      </section>

      <section className="lp-sec" id="como-funciona">
        <Rv><span className="lp-kicker">Como funciona</span></Rv>
        <Rv><h2>Do cadastro à consulta<br />em três passos.</h2></Rv>
        <div className="lp-steps">
          {STEPS.map(([n, t, d], i) => (
            <Rv key={n} d={i * 110}>
              <div className="lp-step">
                <b className="lp-step-n">{n}</b>
                <b>{t}</b>
                <p>{d}</p>
              </div>
            </Rv>
          ))}
        </div>
      </section>

      {/* Depoimentos */}
      <section className="lp-sec lp-depo-sec" id="depoimentos">
        <div className="lp-depo-head">
          <Rv><span className="lp-kicker"><Star size={13} /> Quem usa, recomenda</span></Rv>
          <Rv><h2>Dentistas que trocaram<br />o papel pelo controle.</h2></Rv>
          <Rv><p className="lp-sec-sub">Autônomos e consultórios pequenos e médios que organizam agenda, prontuário e estoque em um só lugar.</p></Rv>
          <Rv>
            <div className="lp-depo-rating">
              <span className="lp-stars"><Star size={15} /><Star size={15} /><Star size={15} /><Star size={15} /><Star size={15} /></span>
              <b>4,9/5</b><span>nota média de quem atende todos os dias</span>
            </div>
          </Rv>
        </div>
        <div className="lp-depo-grid">
          {TESTIMONIALS.map((t, i) => (
            <Rv key={t.name} d={i * 110}>
              <figure className="lp-depo">
                <span className="lp-depo-quote">“</span>
                <span className="lp-stars"><Star size={13} /><Star size={13} /><Star size={13} /><Star size={13} /><Star size={13} /></span>
                <blockquote>{t.quote}</blockquote>
                <figcaption>
                  <span className="lp-depo-avatar">{t.init}<img src={t.photo} alt={t.name} loading="lazy" onError={(e) => { e.currentTarget.remove(); }} /></span>
                  <span><b>{t.name}</b><small>{t.meta}</small></span>
                </figcaption>
              </figure>
            </Rv>
          ))}
        </div>
      </section>

      {/* Plano único */}
      <section className="lp-sec lp-plans-sec" id="planos">
        <Rv><span className="lp-kicker"><Sparkles size={13} /> Plano único</span></Rv>
        <Rv><h2>Um plano.<br />Tudo incluído.</h2></Rv>
        <Rv><p className="lp-sec-sub">Sem tabela confusa, sem recurso bloqueado. Você cria a conta, <b>cadastra o cartão de crédito para verificação</b> e testa <b>7 dias grátis</b> — só continua se fizer sentido, por <b>R$99,90/mês</b>.</p></Rv>
        <Rv>
          <div className="lp-price-card">
            <div className="lp-price-left">
              <span className="lp-price-tag"><BadgeCheck size={13} /> Seus 7 dias grátis começam no cadastro</span>
              <small>{PLAN.name} • para o consultório inteiro</small>
              <div className="lp-price-big"><span>R$</span>{PLAN.price}<small>/mês</small></div>
              <p>Cadastre seu cartão de crédito para verificação. Nada é cobrado durante os 7 dias grátis.</p>
              <Link to="/app/login?cadastro=1" className="btn-primary lp-big">
                {PLAN.cta} <ArrowRight size={16} />
              </Link>
              <span className="lp-price-secure"><Lock size={12} /> Só cartão de crédito • cancele quando quiser</span>
            </div>
            <div className="lp-price-right">
              <b>O que está incluído</b>
              <ul>
                {PLAN.feats.map((f) => <li key={f}><CheckCircle2 size={16} /> {f}</li>)}
              </ul>
              <div className="lp-price-guar">
                <ShieldCheck size={20} />
                <div><b>Garantia de 7 dias</b><p>Não amou nos primeiros 7 dias pagos? Devolvemos 100% — sem perguntas.</p></div>
              </div>
            </div>
          </div>
        </Rv>
        <Rv>
          <div className="lp-trust-row">
            <span><CheckCircle2 size={14} /> 7 dias grátis</span>
            <span><CheckCircle2 size={14} /> Cartão para verificação</span>
            <span><CheckCircle2 size={14} /> Sem fidelidade</span>
            <span><CheckCircle2 size={14} /> Suporte em português</span>
          </div>
        </Rv>
      </section>

      {/* FAQ */}
      <section className="lp-sec lp-faq-sec" id="faq">
        <div className="lp-faq-head">
          <Rv><span className="lp-kicker">Dúvidas frequentes</span></Rv>
          <Rv><h2>Perguntas que todo<br />dentista faz.</h2></Rv>
          <Rv><p className="lp-sec-sub">Transparência de quem atende dentista de verdade: sem letrinhas miúdas.</p></Rv>
        </div>
        <div className="lp-faq">
          {FAQS.map((f, i) => (
            <Rv key={f.q} d={Math.min(i * 60, 240)}>
              <FaqItem q={f.q} a={f.a} open={faqOpen === i} onToggle={() => setFaqOpen(faqOpen === i ? -1 : i)} />
            </Rv>
          ))}
        </div>
        <Rv>
          <div className="lp-faq-foot">
            <span><Headset size={16} /> Ainda tem dúvidas? Falamos com você em minutos.</span>
            <Link to="/app/login" className="lp-ghost">Falar com especialista <ArrowRight size={14} /></Link>
          </div>
        </Rv>
      </section>

      <section className="lp-cta">
        <Tooth size={220} className="lp-tooth-ghost c1" opacity={0.1} />
        <Tooth size={130} className="lp-tooth-ghost c2" opacity={0.12} />
        <Rv>
          <span className="lp-cta-pill"><BadgeCheck size={14} /> 7 dias grátis • com verificação do cartão</span>
          <h2>Dentista, organize<br />seu consultório hoje.</h2>
          <p>Crie sua conta grátis e assuma o controle da agenda, do prontuário e do estoque — sem mensalidade de hospital grande.</p>
          <div className="lp-hero-btns center">
            <Link to="/app/login?cadastro=1" className="btn-primary lp-big">Começar grátis <ArrowRight size={17} /></Link>
            <Link to="/app/login" className="lp-ghost lp-big light">Já tenho conta</Link>
          </div>
          <div className="lp-cta-trust">
            <span><CheckCircle2 size={14} /> 7 dias grátis*</span>
            <span><CheckCircle2 size={14} /> Após, só R$99,90/mês</span>
            <span><CheckCircle2 size={14} /> Cancele quando quiser</span>
          </div>
          <small className="lp-cta-fine">*É necessário cadastrar um cartão de crédito para verificação. Nada é cobrado no período grátis.</small>
        </Rv>
      </section>

      <footer className="lp-foot">
        <a href="#topo" className="lp-brand">
          <img src="/logo.svg" alt="OdontoControl" />
          <span><b>OdontoControl</b><small>Gestão de consultório</small></span>
        </a>
        <nav className="lp-foot-links">
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <a href="#faq">Dúvidas</a>
        </nav>
        <small>Feito para dentistas autônomos e consultórios pequenos e médios — agenda, prontuário, receitas e estoque.</small>
        <Link to="/app/login" className="lp-ghost">Acessar o painel <ArrowRight size={14} /></Link>
      </footer>
    </div>
  );
}
