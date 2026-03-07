export type WebsiteLang = 'en' | 'ru' | 'es' | 'it';

const w = (en: string, ru: string, es: string, it: string) => ({ en, ru, es, it });

export const websiteTranslations = {
  // Nav
  'nav.home': w('Home', 'Главная', 'Inicio', 'Home'),
  'nav.about': w('About', 'О нас', 'Nosotros', 'Chi siamo'),
  'nav.services': w('Services', 'Услуги', 'Servicios', 'Servizi'),
  'nav.caseStudies': w('Case Studies', 'Кейсы', 'Casos de éxito', 'Casi studio'),
  'nav.contact': w('Contact', 'Контакт', 'Contacto', 'Contatti'),
  'nav.clientPortal': w('Client Portal', 'Кабинет', 'Portal', 'Portale'),

  // Hero
  'hero.badge': w('Authorized Partners of Meta, Google & TikTok', 'Авторизованные партнёры Meta, Google и TikTok', 'Socios autorizados de Meta, Google y TikTok', 'Partner autorizzati di Meta, Google e TikTok'),
  'hero.title1': w('Welcome to the', 'Добро пожаловать в', 'Bienvenido a la', 'Benvenuto nella'),
  'hero.title2': w('New Era', 'Новую Эру', 'Nueva Era', 'Nuova Era'),
  'hero.title3': w('of Paid Advertising', 'платной рекламы', 'de la publicidad de pago', 'della pubblicità a pagamento'),
  'hero.desc': w(
    'We operate through exclusive whitelisted agency ad accounts — giving our clients privileges unavailable to regular advertisers',
    'Мы работаем через эксклюзивные вайтлист аккаунты агентства — давая нашим клиентам привилегии, недоступные обычным рекламодателям',
    'Operamos a través de cuentas publicitarias exclusivas de agencia en lista blanca, brindando a nuestros clientes privilegios no disponibles para anunciantes regulares',
    'Operiamo tramite account pubblicitari esclusivi di agenzia in whitelist — offrendo ai nostri clienti privilegi non disponibili per gli inserzionisti comuni'
  ),
  'hero.cta': w('Book a Free Ads Audit', 'Бесплатный аудит рекламы', 'Auditoría gratuita de anuncios', 'Audit gratuito degli annunci'),

  // Stats
  'stats.revenue': w('Client Revenue Generated', 'Доход клиентов', 'Ingresos generados', 'Entrate clienti generate'),
  'stats.spend': w('Ad Spend Managed', 'Управляемый бюджет', 'Inversión gestionada', 'Budget gestito'),
  'stats.projects': w('Growth Projects', 'Проектов роста', 'Proyectos de crecimiento', 'Progetti di crescita'),

  // Platform Partners
  'partners.title1': w('Partnered With', 'Партнёрство с', 'Asociados con las', 'In partnership con le'),
  'partners.title2': w('Top Ad Platforms', 'Топ платформами', 'principales plataformas', 'migliori piattaforme'),
  'partners.desc': w(
    'Meta, TikTok & Google trust us with exclusive whitelisted accounts — giving you stability, scale, and direct support',
    'Meta, TikTok и Google доверяют нам эксклюзивные вайтлист аккаунты — обеспечивая стабильность, масштаб и прямую поддержку',
    'Meta, TikTok y Google nos confían cuentas exclusivas — brindándote estabilidad, escala y soporte directo',
    'Meta, TikTok e Google ci affidano account esclusivi — offrendoti stabilità, scala e supporto diretto'
  ),
  'benefit.noBans': w('No More Bans', 'Без банов', 'Sin bloqueos', 'Niente più ban'),
  'benefit.features': w('Access to New Features', 'Доступ к новым функциям', 'Acceso a nuevas funciones', 'Accesso a nuove funzionalità'),
  'benefit.support': w('Private Support', 'Приватная поддержка', 'Soporte privado', 'Supporto privato'),
  'benefit.moderation': w('Fastest Moderation', 'Быстрая модерация', 'Moderación rápida', 'Moderazione rapida'),
  'benefit.security': w('High Security', 'Высокая безопасность', 'Alta seguridad', 'Alta sicurezza'),
  'benefit.noLimits': w('No Spending Limits', 'Без лимитов', 'Sin límites de gasto', 'Nessun limite di spesa'),

  // Calculator
  'calc.badge': w('ROI Calculator', 'Калькулятор ROI', 'Calculadora de ROI', 'Calcolatore ROI'),
  'calc.title1': w('See Your', 'Узнайте свой', 'Vea su', 'Scopri il tuo'),
  'calc.title2': w('Potential Returns', 'потенциальный доход', 'retorno potencial', 'rendimento potenziale'),
  'calc.desc': w(
    'Estimate what you could earn working with AFM Digital. Based on our average client performance of 400%+ ROAS.',
    'Оцените потенциальный доход с AFM Digital. На основе среднего ROAS наших клиентов 400%+.',
    'Estime lo que podría ganar con AFM Digital. Basado en el rendimiento promedio de 400%+ ROAS.',
    'Stima quanto potresti guadagnare con AFM Digital. Basato sulle performance medie dei clienti con 400%+ ROAS.'
  ),
  'calc.params': w('Your Parameters', 'Ваши параметры', 'Sus parámetros', 'I tuoi parametri'),
  'calc.spend': w('Monthly Ad Spend', 'Месячный бюджет', 'Inversión mensual', 'Budget mensile'),
  'calc.aov': w('Average Order Value', 'Средний чек', 'Valor medio del pedido', 'Valore medio ordine'),
  'calc.convRate': w('Conversion Rate', 'Конверсия', 'Tasa de conversión', 'Tasso di conversione'),
  'calc.results': w('Estimated Results', 'Ожидаемые результаты', 'Resultados estimados', 'Risultati stimati'),
  'calc.estRevenue': w('Est. Revenue', 'Доход', 'Ingresos est.', 'Entrate stimate'),
  'calc.estProfit': w('Est. Profit', 'Прибыль', 'Beneficio est.', 'Profitto stimato'),
  'calc.estLeads': w('Est. Leads', 'Лиды', 'Leads est.', 'Lead stimati'),
  'calc.disclaimer': w(
    'These projections are based on our average client performance across Meta, Google & TikTok campaigns. Actual results may vary. Book a free audit for a personalized estimate.',
    'Прогнозы основаны на среднем результате наших клиентов по кампаниям Meta, Google и TikTok. Результаты могут отличаться. Закажите бесплатный аудит для персонального расчёта.',
    'Estas proyecciones se basan en el rendimiento promedio de nuestros clientes. Los resultados reales pueden variar. Reserve una auditoría gratuita para un presupuesto personalizado.',
    'Queste proiezioni si basano sulle performance medie dei nostri clienti. I risultati effettivi possono variare. Prenota un audit gratuito per una stima personalizzata.'
  ),

  // Verticals
  'verticals.title1': w('Profitable Paid Ads', 'Прибыльная реклама', 'Anuncios rentables', 'Pubblicità redditizia'),
  'verticals.title2': w('For', 'Для', 'Para', 'Per'),
  'vert.coaches': w('Coaches & Info Products', 'Коучи и инфопродукты', 'Coaches e infoproductos', 'Coach e infoprodotti'),
  'vert.coachesDesc': w(
    'Paid ads optimized for lower CPL and higher quality. We analyze your funnel performance to improve conversion at every stage.',
    'Реклама, оптимизированная для снижения CPL и повышения качества. Анализируем воронку для улучшения конверсии на каждом этапе.',
    'Anuncios optimizados para menor CPL y mayor calidad. Analizamos su embudo para mejorar la conversión en cada etapa.',
    'Annunci ottimizzati per CPL più basso e qualità più alta. Analizziamo il tuo funnel per migliorare la conversione in ogni fase.'
  ),
  'vert.ecom': w('E-commerce', 'E-commerce', 'E-commerce', 'E-commerce'),
  'vert.ecomDesc': w(
    'Performance-driven ad campaigns focused on ROAS, AOV growth, and consistent scaling across the entire customer journey.',
    'Кампании, ориентированные на ROAS, рост среднего чека и стабильный масштаб по всей воронке клиента.',
    'Campañas enfocadas en ROAS, crecimiento de AOV y escalamiento constante en todo el recorrido del cliente.',
    'Campagne focalizzate su ROAS, crescita AOV e scaling costante lungo tutto il percorso del cliente.'
  ),
  'vert.local': w('Local Business', 'Локальный бизнес', 'Negocio local', 'Business locale'),
  'vert.localDesc': w(
    'Hyper-targeted campaigns to lower CPA and generate steady appointment flow with predictable ROI.',
    'Гипертаргетированные кампании для снижения CPA и стабильного потока заявок с предсказуемым ROI.',
    'Campañas hiperdirigidas para reducir CPA y generar un flujo constante de citas con ROI predecible.',
    'Campagne iper-targettizzate per abbassare il CPA e generare un flusso costante di appuntamenti con ROI prevedibile.'
  ),

  // Case Studies
  'cases.badge': w('Results', 'Результаты', 'Resultados', 'Risultati'),
  'cases.title1': w('Paid Ads', 'Кейсы', 'Casos de éxito', 'Casi studio'),
  'cases.title2': w('Case Studies', 'платной рекламы', 'publicidad de pago', 'pubblicità a pagamento'),
  'cases.viewAll': w('View All Case Studies', 'Все кейсы', 'Ver todos los casos', 'Vedi tutti i casi'),
  'cases.wantResults': w('Want Results Like These?', 'Хотите таких результатов?', '¿Quieres resultados así?', 'Vuoi risultati come questi?'),
  'cases.wantResultsDesc': w(
    'Book a free ads audit and discover untapped growth opportunities in your traffic.',
    'Закажите бесплатный аудит и откройте скрытые возможности для роста вашего трафика.',
    'Reserve una auditoría gratuita y descubra oportunidades de crecimiento en su tráfico.',
    'Prenota un audit gratuito e scopri le opportunità di crescita nel tuo traffico.'
  ),
  'cases.bookAudit': w('Book a Free Audit', 'Бесплатный аудит', 'Auditoría gratuita', 'Audit gratuito'),

  // Trust
  'trust.title1': w('Why Clients', 'Почему клиенты', 'Por qué los clientes', 'Perché i clienti'),
  'trust.title2': w('Trust Us', 'доверяют нам', 'confían en nosotros', 'si fidano di noi'),
  'trust.desc': w(
    "We don't just run ads — we build growth systems backed by data, partnerships, and years of expertise.",
    'Мы не просто запускаем рекламу — мы строим системы роста на основе данных, партнёрств и многолетнего опыта.',
    'No solo ejecutamos anuncios — construimos sistemas de crecimiento respaldados por datos, alianzas y años de experiencia.',
    'Non gestiamo solo annunci — costruiamo sistemi di crescita supportati da dati, partnership e anni di esperienza.'
  ),
  'trust.partners': w('Official Platform Partners', 'Официальные партнёры платформ', 'Socios oficiales de plataformas', 'Partner ufficiali delle piattaforme'),
  'trust.partnersDesc': w('Authorized agency partners of Meta, Google & TikTok with whitelisted ad accounts', 'Авторизованные партнёры Meta, Google и TikTok с вайтлист аккаунтами', 'Socios autorizados de Meta, Google y TikTok con cuentas en lista blanca', 'Partner autorizzati di Meta, Google e TikTok con account in whitelist'),
  'trust.experience': w('11+ Years of Experience', '11+ лет опыта', '11+ años de experiencia', '11+ anni di esperienza'),
  'trust.experienceDesc': w('Combined founder expertise in paid traffic, funnels, and performance marketing', 'Совокупный опыт основателей в платном трафике, воронках и performance-маркетинге', 'Experiencia combinada de los fundadores en tráfico de pago, embudos y marketing de rendimiento', 'Esperienza combinata dei fondatori in traffico a pagamento, funnel e performance marketing'),
  'trust.revenue': w('$42M+ Revenue Generated', '$42M+ сгенерированного дохода', '$42M+ en ingresos generados', '$42M+ di entrate generate'),
  'trust.revenueDesc': w('Proven track record of generating measurable results for clients worldwide', 'Подтверждённый опыт генерации измеримых результатов для клиентов по всему миру', 'Historial comprobado de generar resultados medibles para clientes en todo el mundo', 'Track record comprovato di generare risultati misurabili per clienti in tutto il mondo'),
  'trust.growthProjects': w('80+ Growth Projects', '80+ проектов роста', '80+ proyectos de crecimiento', '80+ progetti di crescita'),
  'trust.growthProjectsDesc': w('Successful campaigns across e-commerce, info products, and local businesses', 'Успешные кампании в e-commerce, инфопродуктах и локальном бизнесе', 'Campañas exitosas en e-commerce, infoproductos y negocios locales', 'Campagne di successo in e-commerce, infoprodotti e business locali'),
  'trust.reporting': w('Real-Time Reporting', 'Отчётность в реальном времени', 'Informes en tiempo real', 'Report in tempo reale'),
  'trust.reportingDesc': w('Proprietary client portal with live dashboards, CRM, and automated reports', 'Собственный клиентский портал с дашбордами, CRM и автоматическими отчётами', 'Portal propio con dashboards en vivo, CRM e informes automatizados', 'Portale clienti proprietario con dashboard live, CRM e report automatizzati'),
  'trust.team': w('Dedicated Team', 'Выделенная команда', 'Equipo dedicado', 'Team dedicato'),
  'trust.teamDesc': w('Small client roster ensures every account gets elite-level strategic attention', 'Небольшой список клиентов гарантирует элитный уровень внимания к каждому аккаунту', 'Lista reducida de clientes asegura atención estratégica de élite para cada cuenta', 'Lista clienti ridotta garantisce attenzione strategica di livello élite per ogni account'),
  'trust.testimonials': w('Client Testimonials', 'Отзывы клиентов', 'Testimonios de clientes', 'Testimonianze clienti'),

  // Founders
  'founders.title1': w('A Message From Our', 'Обращение от наших', 'Un mensaje de nuestros', 'Un messaggio dai nostri'),
  'founders.title2': w('Founders', 'основателей', 'Fundadores', 'Fondatori'),
  'founders.p1': w(
    "After 11 years in marketing, paid traffic, and funnel optimization, we've seen how most agencies really operate. They scale their client list, not their clients' results — and everyone gets the same copy-paste strategy.",
    'За 11 лет в маркетинге, платном трафике и оптимизации воронок мы увидели, как работает большинство агентств. Они масштабируют список клиентов, а не их результаты — и все получают одну и ту же шаблонную стратегию.',
    'Después de 11 años en marketing, tráfico de pago y optimización de embudos, hemos visto cómo operan la mayoría de las agencias. Escalan su lista de clientes, no los resultados — y todos reciben la misma estrategia genérica.',
    'Dopo 11 anni nel marketing, traffico a pagamento e ottimizzazione dei funnel, abbiamo visto come operano la maggior parte delle agenzie. Scalano la lista clienti, non i risultati — e tutti ricevono la stessa strategia copia-incolla.'
  ),
  'founders.p2': w(
    "That's why we built a different model. We create custom, tailored systems instead of \"cookie-cutter\" approaches. Every decision is driven by data — CPL, CPA, ROAS, and the full customer journey.",
    'Поэтому мы создали другую модель. Мы строим индивидуальные системы вместо «шаблонных» подходов. Каждое решение основано на данных — CPL, CPA, ROAS и полный путь клиента.',
    'Por eso construimos un modelo diferente. Creamos sistemas personalizados en lugar de enfoques genéricos. Cada decisión se basa en datos — CPL, CPA, ROAS y todo el recorrido del cliente.',
    'Per questo abbiamo costruito un modello diverso. Creiamo sistemi personalizzati invece di approcci "copia-incolla". Ogni decisione è guidata dai dati — CPL, CPA, ROAS e l\'intero percorso del cliente.'
  ),
  'founders.p3': w(
    'What truly sets us apart is our direct partnership with Meta, Google, and TikTok. These relationships give our clients advantages that 99% of agencies simply can\'t offer.',
    'Что действительно выделяет нас — это прямое партнёрство с Meta, Google и TikTok. Эти отношения дают нашим клиентам преимущества, которые 99% агентств просто не могут предложить.',
    'Lo que realmente nos diferencia es nuestra alianza directa con Meta, Google y TikTok. Estas relaciones dan a nuestros clientes ventajas que el 99% de las agencias no pueden ofrecer.',
    'Ciò che ci distingue davvero è la nostra partnership diretta con Meta, Google e TikTok. Queste relazioni danno ai nostri clienti vantaggi che il 99% delle agenzie non può offrire.'
  ),
  'founders.p4': w(
    'This is how we work. Focused. Precise. Quality over quantity. We win only when you do.',
    'Так мы работаем. Фокус. Точность. Качество важнее количества. Мы побеждаем только тогда, когда побеждаете вы.',
    'Así trabajamos. Enfocados. Precisos. Calidad sobre cantidad. Ganamos solo cuando tú ganas.',
    'Così lavoriamo. Focalizzati. Precisi. Qualità prima della quantità. Vinciamo solo quando vinci tu.'
  ),

  // Final CTA
  'cta.title1': w('Ready to', 'Готовы к', '¿Listo para', 'Pronto a'),
  'cta.title2': w('Scale?', 'росту?', 'crecer?', 'crescere?'),
  'cta.desc': w(
    'Unlock hidden profits in your traffic. Get a 100% free diagnostic from our team of growth experts.',
    'Раскройте скрытую прибыль в вашем трафике. Получите 100% бесплатную диагностику от нашей команды экспертов по росту.',
    'Desbloquee ganancias ocultas en su tráfico. Obtenga un diagnóstico 100% gratuito de nuestro equipo de expertos.',
    'Sblocca profitti nascosti nel tuo traffico. Ottieni una diagnostica 100% gratuita dal nostro team di esperti della crescita.'
  ),

  // About page
  'about.badge': w('About Us', 'О нас', 'Nosotros', 'Chi siamo'),
  'about.title1': w('We Built a', 'Мы создали', 'Construimos un', 'Abbiamo costruito un'),
  'about.title2': w('Different Model', 'другую модель', 'modelo diferente', 'modello diverso'),
  'about.desc': w(
    "After 11 years in marketing, paid traffic, and funnel optimization, we've seen how most agencies really operate. That's why AFM Digital exists.",
    'За 11 лет в маркетинге, платном трафике и оптимизации воронок мы увидели, как работают большинство агентств. Именно поэтому существует AFM Digital.',
    'Después de 11 años en marketing, tráfico de pago y optimización de embudos, hemos visto cómo operan la mayoría de las agencias. Por eso existe AFM Digital.',
    'Dopo 11 anni nel marketing, traffico a pagamento e ottimizzazione dei funnel, abbiamo visto come operano la maggior parte delle agenzie. Ecco perché esiste AFM Digital.'
  ),
  'about.ourFounders': w('Our Founders', 'Наши основатели', 'Nuestros fundadores', 'I nostri fondatori'),
  'about.workWithUs': w('Work With Us', 'Работайте с нами', 'Trabaja con nosotros', 'Lavora con noi'),
  'about.dataDriven': w('Data-Driven', 'На основе данных', 'Basado en datos', 'Basato sui dati'),
  'about.dataDrivenDesc': w('Every decision backed by CPL, CPA, ROAS and full customer journey analysis.', 'Каждое решение подкреплено анализом CPL, CPA, ROAS и полного пути клиента.', 'Cada decisión respaldada por análisis de CPL, CPA, ROAS y recorrido completo del cliente.', 'Ogni decisione supportata da analisi CPL, CPA, ROAS e percorso completo del cliente.'),
  'about.quality': w('Quality Over Quantity', 'Качество важнее количества', 'Calidad sobre cantidad', 'Qualità prima della quantità'),
  'about.qualityDesc': w('We keep our client list small so every account gets elite-level attention.', 'Мы держим список клиентов небольшим, чтобы каждый аккаунт получал элитное внимание.', 'Mantenemos nuestra lista de clientes pequeña para que cada cuenta reciba atención de élite.', 'Manteniamo la lista clienti piccola affinché ogni account riceva attenzione di livello élite.'),
  'about.customSystems': w('Custom Systems', 'Индивидуальные системы', 'Sistemas personalizados', 'Sistemi personalizzati'),
  'about.customSystemsDesc': w('No cookie-cutter strategies. Tailored systems built for your specific goals.', 'Никаких шаблонных стратегий. Системы, созданные под ваши конкретные цели.', 'Sin estrategias genéricas. Sistemas diseñados para tus objetivos específicos.', 'Nessuna strategia standardizzata. Sistemi costruiti per i tuoi obiettivi specifici.'),
  'about.platformPartners': w('Platform Partners', 'Партнёры платформ', 'Socios de plataformas', 'Partner delle piattaforme'),
  'about.platformPartnersDesc': w('Direct partnerships with Meta, Google & TikTok give our clients unfair advantages.', 'Прямое партнёрство с Meta, Google и TikTok даёт нашим клиентам нечестное преимущество.', 'Las alianzas directas con Meta, Google y TikTok dan a nuestros clientes ventajas injustas.', 'Le partnership dirette con Meta, Google e TikTok danno ai nostri clienti vantaggi sleali.'),

  // Services page
  'services.badge': w('Our Services', 'Наши услуги', 'Nuestros servicios', 'I nostri servizi'),
  'services.title1': w('Unlock a Profitable', 'Откройте прибыльный', 'Desbloquea un', 'Sblocca un flusso'),
  'services.title2': w('Traffic Flow', 'поток трафика', 'flujo de tráfico rentable', 'di traffico redditizio'),
  'services.desc': w('Aligned with your KPIs and high ROI — powered by exclusive platform partnerships', 'В соответствии с вашими KPI и высоким ROI — на основе эксклюзивных партнёрств', 'Alineado con sus KPIs y alto ROI — impulsado por alianzas exclusivas', 'Allineato con i tuoi KPI e alto ROI — alimentato da partnership esclusive'),
  'services.approach': w('Our Approach', 'Наш подход', 'Nuestro enfoque', 'Il nostro approccio'),
  'services.audit': w('Strategic Audit', 'Стратегический аудит', 'Auditoría estratégica', 'Audit strategico'),
  'services.auditDesc': w('Deep-dive analysis of your current ad performance, funnel, and competitive landscape.', 'Глубокий анализ текущей эффективности рекламы, воронки и конкурентной среды.', 'Análisis profundo del rendimiento actual de sus anuncios, embudo y panorama competitivo.', 'Analisi approfondita delle performance attuali degli annunci, del funnel e del panorama competitivo.'),
  'services.build': w('Custom System Build', 'Создание системы', 'Construcción personalizada', 'Costruzione sistema personalizzato'),
  'services.buildDesc': w('Tailored campaign architecture designed specifically for your business goals and KPIs.', 'Индивидуальная архитектура кампаний под ваши бизнес-цели и KPI.', 'Arquitectura de campaña diseñada específicamente para sus objetivos de negocio y KPIs.', 'Architettura delle campagne progettata specificamente per i tuoi obiettivi di business e KPI.'),
  'services.scale': w('Scale & Optimize', 'Масштабирование', 'Escalar y optimizar', 'Scala e ottimizza'),
  'services.scaleDesc': w('Data-driven optimization cycles to maximize ROAS while scaling spend profitably.', 'Циклы оптимизации на основе данных для максимизации ROAS при прибыльном масштабировании.', 'Ciclos de optimización basados en datos para maximizar ROAS mientras se escala la inversión de manera rentable.', "Cicli di ottimizzazione basati sui dati per massimizzare il ROAS scalando la spesa in modo profittevole."),
  'services.getCta': w('Get a Free Ads Audit', 'Бесплатный аудит рекламы', 'Auditoría gratuita de anuncios', 'Audit gratuito degli annunci'),

  // Contact page
  'contact.badge': w('Get Started', 'Начните сейчас', 'Empiece ahora', 'Inizia ora'),
  'contact.title1': w('Book a', 'Закажите', 'Reserve una', 'Prenota un'),
  'contact.title2': w('Free Audit', 'бесплатный аудит', 'auditoría gratuita', 'audit gratuito'),
  'contact.desc': w('Fill out the form below and our team will get in touch to discuss how we can scale your business.', 'Заполните форму и наша команда свяжется с вами, чтобы обсудить масштабирование вашего бизнеса.', 'Complete el formulario y nuestro equipo se pondrá en contacto para discutir cómo escalar su negocio.', 'Compila il modulo e il nostro team ti contatterà per discutere come scalare il tuo business.'),
  'contact.name': w('Name *', 'Имя *', 'Nombre *', 'Nome *'),
  'contact.namePh': w('Your name', 'Ваше имя', 'Su nombre', 'Il tuo nome'),
  'contact.email': w('Email *', 'Email *', 'Email *', 'Email *'),
  'contact.company': w('Company', 'Компания', 'Empresa', 'Azienda'),
  'contact.companyPh': w('Company name', 'Название компании', 'Nombre de la empresa', "Nome dell'azienda"),
  'contact.website': w('Website', 'Сайт', 'Sitio web', 'Sito web'),
  'contact.budget': w('Monthly Ad Budget', 'Месячный бюджет рекламы', 'Presupuesto mensual de anuncios', 'Budget mensile per annunci'),
  'contact.budgetPh': w('Select a range', 'Выберите диапазон', 'Seleccione un rango', 'Seleziona un range'),
  'contact.message': w('Message *', 'Сообщение *', 'Mensaje *', 'Messaggio *'),
  'contact.messagePh': w('Tell us about your business and goals...', 'Расскажите о вашем бизнесе и целях...', 'Cuéntenos sobre su negocio y objetivos...', 'Raccontaci del tuo business e dei tuoi obiettivi...'),
  'contact.submit': w('Submit Application', 'Отправить заявку', 'Enviar solicitud', 'Invia candidatura'),
  'contact.submitting': w('Submitting...', 'Отправка...', 'Enviando...', 'Invio...'),
  'contact.thankYou': w('Thank You!', 'Спасибо!', '¡Gracias!', 'Grazie!'),
  'contact.thankYouDesc': w("We've received your application. Our team will review it and get back to you within 24-48 hours.", 'Мы получили вашу заявку. Наша команда рассмотрит её и свяжется с вами в течение 24-48 часов.', 'Hemos recibido su solicitud. Nuestro equipo la revisará y se pondrá en contacto en 24-48 horas.', 'Abbiamo ricevuto la tua candidatura. Il nostro team la esaminerà e ti ricontatterà entro 24-48 ore.'),

  // Footer
  'footer.desc': w(
    'Authorized partners of Meta, Google, and TikTok. We operate through exclusive whitelisted agency ad accounts — giving our clients privileges unavailable to regular advertisers.',
    'Авторизованные партнёры Meta, Google и TikTok. Мы работаем через эксклюзивные вайтлист аккаунты — давая клиентам привилегии, недоступные обычным рекламодателям.',
    'Socios autorizados de Meta, Google y TikTok. Operamos a través de cuentas publicitarias exclusivas — brindando privilegios no disponibles para anunciantes regulares.',
    'Partner autorizzati di Meta, Google e TikTok. Operiamo tramite account pubblicitari esclusivi — offrendo privilegi non disponibili per gli inserzionisti comuni.'
  ),
  'footer.navigation': w('Navigation', 'Навигация', 'Navegación', 'Navigazione'),
  'footer.legal': w('Legal', 'Правовая информация', 'Legal', 'Legale'),
  'footer.privacy': w('Privacy Policy', 'Политика конфиденциальности', 'Política de privacidad', 'Informativa privacy'),
  'footer.terms': w('Terms of Service', 'Условия использования', 'Términos de servicio', 'Termini di servizio'),
  'footer.cookies': w('Cookie Policy', 'Политика cookies', 'Política de cookies', 'Politica cookie'),
  'footer.platform': w('Platform', 'Платформа', 'Plataforma', 'Piattaforma'),
  'footer.contactInfo': w('Contact', 'Контакты', 'Contacto', 'Contatti'),
  'footer.rights': w('All rights reserved.', 'Все права защищены.', 'Todos los derechos reservados.', 'Tutti i diritti riservati.'),
  'footer.contactUs': w('Contact Us', 'Связаться', 'Contáctenos', 'Contattaci'),
} as const;

export type WebsiteTranslationKey = keyof typeof websiteTranslations;
