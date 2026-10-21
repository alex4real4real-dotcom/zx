// Explain: Internationalization file for managing multilingual content and language switching.
(function () {
    'use strict';

    var LANGS = [
        { code: 'ar', label: 'العربية' },
        { code: 'en', label: 'English' },
        { code: 'fr', label: 'Français' },
        { code: 'tr', label: 'Türkçe' },
        { code: 'zh', label: '中文' },
        { code: 'es', label: 'Español' },
        { code: 'ru', label: 'Русский' }
    ];
    var RTL_LANGS = ['ar'];
    var STORAGE_KEY = 'app_lang';

    var DICT = {
        ar: {
            nav_home: 'الرئيسية', nav_help: 'مركز المساعدة', nav_shop: 'المتجر', nav_sellers: 'البائعون', nav_dashboard: 'لوحة البائع',
            nav_start_selling: 'ابدأ البيع', nav_browse_products: 'بيع', nav_account: 'حسابي', nav_cart: 'سلة التسوق', nav_contact: 'تواصل معنا',
            nav_menu: 'القائمة', nav_subtitle: 'سوق موثوق', open_menu: 'فتح القائمة', close_menu: 'إغلاق القائمة',
            nav_categories: 'الفئات', nav_more: 'المزيد', nav_orders: 'طلباتي', nav_withdraw: 'السحب', nav_verify: 'توثيق الحساب', footer_orders: 'طلباتي', nav_seller_disputes: 'نزاعات المتجر', nav_settings: 'الإعدادات',
            cat_kicker: 'تسوّق حسب الفئة', cat_title: 'اختر نوع المنتج الرقمي الذي تريده',
            cat_desc: 'قسّمنا السوق إلى ثلاث فئات رئيسية لتصل إلى ما تحتاجه بسرعة: حسابات التواصل، الخدمات الرقمية، والألعاب.',
            cat_browse: 'استعرض القائمة',
            cat_social_name: 'حسابات التواصل الاجتماعي', cat_social_desc: 'حسابات موثّقة وجاهزة لمنصات التواصل والتراسل.',
            cat_services_name: 'الخدمات الرقمية', cat_services_desc: 'تصميم، مونتاج، برمجة وإدارة حسابات من مستقلين موثوقين.',
            cat_games_name: 'الألعاب والاشتراكات', cat_games_desc: 'ألعاب، شدّات داخل اللعبة واشتراكات بأسعار تنافسية.',
            hero_kicker: 'سوق Account الموثوق', hero_title: 'بيع واشترِ بثقة… بائعون موثّقون بالهوية الوطنية',
            hero_desc: 'في Account يوثّق كل بائع هويته الوطنية قبل عرض منتجاته، لتتسوّق من متاجر حقيقية ومعتمدة. أنشئ متجرك خلال دقائق وابدأ البيع، أو تصفّح المنتجات من بائعين موثوقين.',
            hero_browse: 'تصفّح المنتجات', hero_start: 'ابدأ البيع الآن', hero_trust: 'كل متجر يعرض هنا تم التحقق من هوية صاحبه.',
            stat_verified: 'بائعون موثّقون', stat_products: 'منتج متنوع', stat_shipping: 'شحن سريع',
            stat_verified_value: '100%', stat_products_value: '+500', stat_shipping_value: '24 ساعة',
            footer_about: 'سوق إلكتروني موثوق يجمع بائعين تم التحقق من هويتهم الوطنية، لعرض منتجاتهم وبيعها بأمان ضمن تجربة تسوق سهلة وموثوقة.',
            footer_shop: 'تسوّق', footer_contact: 'تواصل', footer_home: 'الرئيسية', footer_all_products: 'كل المنتجات',
            footer_verified_sellers: 'البائعون الموثّقون', footer_cart: 'سلة التسوق', footer_start_selling: 'ابدأ البيع',
            footer_contact_us: 'تواصل معنا', footer_verified_note: 'كل بائع على المنصة موثّق بالهوية الوطنية.',
            footer_copyright: '© 2026 Account. جميع الحقوق محفوظة.', footer_secure: 'تجربة تسوق آمنة وموثوقة.'
        },
        en: {
            nav_home: 'Home', nav_help: 'Help Center', nav_shop: 'Shop', nav_sellers: 'Sellers', nav_dashboard: 'Seller Dashboard',
            nav_start_selling: 'Start Selling', nav_browse_products: 'Sell', nav_account: 'My Account', nav_cart: 'Cart', nav_contact: 'Contact Us',
            nav_menu: 'Menu', nav_subtitle: 'TRUSTED MARKET', open_menu: 'Open menu', close_menu: 'Close menu',
            nav_categories: 'Categories', nav_more: 'More', nav_orders: 'My Orders', nav_withdraw: 'Withdraw', nav_verify: 'Verify Account', footer_orders: 'My Orders', nav_seller_disputes: 'Store Disputes', nav_settings: 'Settings',
            cat_kicker: 'Shop by category', cat_title: 'Choose the digital product you need',
            cat_desc: 'We organised the market into three main categories to get you there fast: social accounts, digital services, and games.',
            cat_browse: 'Browse list',
            cat_social_name: 'Social Media Accounts', cat_social_desc: 'Verified, ready-made accounts for social and messaging platforms.',
            cat_services_name: 'Digital Services', cat_services_desc: 'Design, editing, development and account management from trusted freelancers.',
            cat_games_name: 'Games & Subscriptions', cat_games_desc: 'Games, in-game top-ups and subscriptions at competitive prices.',
            hero_kicker: 'The Trusted Account Market', hero_title: 'Buy and sell with confidence… sellers verified by national ID',
            hero_desc: 'On Account every seller verifies their national ID before listing products, so you shop from real, certified stores. Create your store in minutes and start selling, or browse products from trusted sellers.',
            hero_browse: 'Browse Products', hero_start: 'Start Selling Now', hero_trust: 'Every store listed here has a verified owner.',
            stat_verified: 'Verified Sellers', stat_products: 'Products', stat_shipping: 'Fast Shipping',
            stat_verified_value: '100%', stat_products_value: '500+', stat_shipping_value: '24h',
            footer_about: 'A trusted marketplace bringing together sellers verified by national ID to showcase and sell their products safely, in an easy and reliable shopping experience.',
            footer_shop: 'Shop', footer_contact: 'Contact', footer_home: 'Home', footer_all_products: 'All Products',
            footer_verified_sellers: 'Verified Sellers', footer_cart: 'Cart', footer_start_selling: 'Start Selling',
            footer_contact_us: 'Contact Us', footer_verified_note: 'Every seller on the platform is verified by national ID.',
            footer_copyright: '© 2026 Account. All rights reserved.', footer_secure: 'A safe and trusted shopping experience.'
        },
        fr: {
            nav_home: 'Accueil', nav_help: 'Centre d\u2019aide', nav_shop: 'Boutique', nav_sellers: 'Vendeurs', nav_dashboard: 'Espace vendeur',
            nav_start_selling: 'Devenir vendeur', nav_browse_products: 'Vendre', nav_account: 'Mon compte', nav_cart: 'Panier', nav_contact: 'Contact',
            nav_menu: 'Menu', nav_subtitle: 'MARCHÉ DE CONFIANCE', open_menu: 'Ouvrir le menu', close_menu: 'Fermer le menu',
            nav_categories: 'Catégories', nav_orders: 'Mes commandes', nav_withdraw: 'Retrait', nav_more: 'Plus', nav_verify: 'Vérifier le compte', nav_seller_disputes: 'Litiges de la boutique', nav_settings: 'Paramètres',
            cat_kicker: 'Achetez par catégorie', cat_title: 'Choisissez le produit numérique qu\u2019il vous faut',
            cat_desc: 'Nous avons organisé le marché en trois catégories principales pour arriver rapidement : comptes sociaux, services numériques et jeux.',
            cat_browse: 'Voir la liste',
            cat_social_name: 'Comptes de réseaux sociaux', cat_social_desc: 'Comptes vérifiés et prêts à l\u2019emploi pour les plateformes sociales et de messagerie.',
            cat_services_name: 'Services numériques', cat_services_desc: 'Design, montage, développement et gestion de comptes par des freelances de confiance.',
            cat_games_name: 'Jeux et abonnements', cat_games_desc: 'Jeux, recharges in-game et abonnements à des prix compétitifs.',
            hero_kicker: 'Le marché Account de confiance', hero_title: 'Achetez et vendez en confiance… vendeurs vérifiés par carte d\u2019identité',
            hero_desc: 'Sur Account, chaque vendeur vérifie son identité nationale avant de publier ses produits, pour acheter auprès de boutiques réelles et certifiées. Créez votre boutique en quelques minutes et commencez à vendre, ou parcourez les produits de vendeurs de confiance.',
            hero_browse: 'Parcourir les produits', hero_start: 'Commencer à vendre', hero_trust: 'Chaque boutique présentée ici a un propriétaire vérifié.',
            stat_verified: 'Vendeurs vérifiés', stat_products: 'Produits', stat_shipping: 'Livraison rapide',
            stat_verified_value: '100 %', stat_products_value: '500+', stat_shipping_value: '24 h',
            footer_about: 'Un marché de confiance réunissant des vendeurs vérifiés par carte d\u2019identité pour présenter et vendre leurs produits en toute sécurité, dans une expérience d\u2019achat simple et fiable.',
            footer_shop: 'Boutique', footer_contact: 'Contact', footer_home: 'Accueil', footer_all_products: 'Tous les produits',
            footer_verified_sellers: 'Vendeurs vérifiés', footer_cart: 'Panier', footer_start_selling: 'Devenir vendeur',
            footer_contact_us: 'Nous contacter', footer_verified_note: 'Chaque vendeur de la plateforme est vérifié par carte d\u2019identité.',
            footer_copyright: '© 2026 Account. Tous droits réservés.', footer_secure: 'Une expérience d\u2019achat sûre et fiable.'
        },
        tr: {
            nav_home: 'Ana Sayfa', nav_help: 'Yardım Merkezi', nav_shop: 'Mağaza', nav_sellers: 'Satıcılar', nav_dashboard: 'Satıcı Paneli',
            nav_start_selling: 'Satışa Başla', nav_browse_products: 'Sat', nav_account: 'Hesabım', nav_cart: 'Sepet', nav_contact: 'İletişim',
            nav_menu: 'Menü', nav_subtitle: 'GÜVENİLİR PAZAR', open_menu: 'Menüyü aç', close_menu: 'Menüyü kapat',
            nav_categories: 'Kategoriler', nav_orders: 'Siparişlerim', nav_withdraw: 'Para Çekme', nav_more: 'Daha fazla', nav_verify: 'Hesabı doğrula', nav_seller_disputes: 'Mağaza anlaşmazlıkları', nav_settings: 'Ayarlar',
            cat_kicker: 'Kategoriye göre alışveriş', cat_title: 'İhtiyacın olan dijital ürünü seç',
            cat_desc: 'Sana hızlı ulaşman için pazarı üç ana kategoriye ayırdık: sosyal hesaplar, dijital hizmetler ve oyunlar.',
            cat_browse: 'Listeyi gör',
            cat_social_name: 'Sosyal Medya Hesapları', cat_social_desc: 'Sosyal ve mesajlaşma platformları için doğrulanmış, hazır hesaplar.',
            cat_services_name: 'Dijital Hizmetler', cat_services_desc: 'Güvenilir freelancerlardan tasarım, kurgu, geliştirme ve hesap yönetimi.',
            cat_games_name: 'Oyunlar ve Abonelikler', cat_games_desc: 'Rekabetçi fiyatlarla oyunlar, oyun içi yüklemeler ve abonelikler.',
            hero_kicker: 'Güvenilir Account Pazarı', hero_title: 'Güvenle al ve sat… kimlikle doğrulanmış satıcılar',
            hero_desc: 'Account’ta her satıcı ürünlerini yayınlamadan önce ulusal kimliğini doğrular, böylece gerçek ve onaylı mağazalardan alışveriş yaparsınız. Mağazanı dakikalar içinde oluştur ve satışa başla ya da güvenilir satıcıların ürünlerine göz at.',
            hero_browse: 'Ürünlere Göz At', hero_start: 'Hemen Satmaya Başla', hero_trust: 'Burada listelenen her mağazanın sahibi doğrulanmıştır.',
            stat_verified: 'Doğrulanmış Satıcılar', stat_products: 'Ürün', stat_shipping: 'Hızlı Kargo',
            stat_verified_value: '100%', stat_products_value: '500+', stat_shipping_value: '24 saat',
            footer_about: 'Ulusal kimlikle doğrulanmış satıcıları bir araya getirerek ürünlerini güvenle sergileyip satmalarını sağlayan, kolay ve güvenilir bir alışveriş deneyimi sunan güvenilir bir pazar.',
            footer_shop: 'Mağaza', footer_contact: 'İletişim', footer_home: 'Ana Sayfa', footer_all_products: 'Tüm Ürünler',
            footer_verified_sellers: 'Doğrulanmış Satıcılar', footer_cart: 'Sepet', footer_start_selling: 'Satışa Başla',
            footer_contact_us: 'İletişim', footer_verified_note: 'Platformdaki her satıcı ulusal kimlikle doğrulanmıştır.',
            footer_copyright: '© 2026 Account. Tüm hakları saklıdır.', footer_secure: 'Güvenli ve emniyetli alışveriş deneyimi.'
        },
        zh: {
            nav_home: '首页', nav_help: '帮助中心', nav_shop: '商城', nav_sellers: '卖家', nav_dashboard: '卖家面板',
            nav_start_selling: '开始销售', nav_browse_products: '出售', nav_account: '我的账户', nav_cart: '购物车', nav_contact: '联系我们',
            nav_menu: '菜单', nav_subtitle: '值得信赖的市场', open_menu: '打开菜单', close_menu: '关闭菜单',
            nav_categories: '分类', nav_orders: '我的订单', nav_withdraw: '提现', nav_more: '更多', nav_verify: '验证账户', nav_seller_disputes: '店铺纠纷', nav_settings: '设置',
            cat_kicker: '按分类购物', cat_title: '选择你需要的数字产品',
            cat_desc: '我们将市场分为三大类，让你快速找到所需：社交账号、数字服务和游戏。',
            cat_browse: '浏览列表',
            cat_social_name: '社交媒体账号', cat_social_desc: '适用于社交和通讯平台的已验证、即用账号。',
            cat_services_name: '数字服务', cat_services_desc: '来自可信自由职业者的设计、剪辑、开发和账号管理。',
            cat_games_name: '游戏与订阅', cat_games_desc: '以具竞争力的价格提供游戏、游戏内充值和订阅。',
            hero_kicker: '值得信赖的 Account 市场', hero_title: '放心买卖… 卖家已通过身份证验证',
            hero_desc: '在 Account，每位卖家在发布商品前都会验证其身份证，让您从真实、经过认证的店铺购物。几分钟内创建您的店铺并开始销售，或浏览来自可信卖家的商品。',
            hero_browse: '浏览商品', hero_start: '立即开始销售', hero_trust: '此处展示的每家店铺的店主都已通过验证。',
            stat_verified: '已验证卖家', stat_products: '商品', stat_shipping: '快速配送',
            stat_verified_value: '100%', stat_products_value: '500+', stat_shipping_value: '24 小时',
            footer_about: '一个值得信赖的市场，汇聚通过身份证验证的卖家，让他们安全地展示和销售商品，带来简单可靠的购物体验。',
            footer_shop: '商城', footer_contact: '联系', footer_home: '首页', footer_all_products: '全部商品',
            footer_verified_sellers: '已验证卖家', footer_cart: '购物车', footer_start_selling: '开始销售',
            footer_contact_us: '联系我们', footer_verified_note: '平台上的每位卖家都通过身份证验证。',
            footer_copyright: '© 2026 Account。保留所有权利。', footer_secure: '安全可靠的购物体验。'
        },
        es: {
            nav_home: 'Inicio', nav_help: 'Centro de ayuda', nav_shop: 'Tienda', nav_sellers: 'Vendedores', nav_dashboard: 'Panel del vendedor',
            nav_start_selling: 'Empezar a vender', nav_browse_products: 'Vender', nav_account: 'Mi cuenta', nav_cart: 'Carrito', nav_contact: 'Contacto',
            nav_menu: 'Menú', nav_subtitle: 'MERCADO DE CONFIANZA', open_menu: 'Abrir menú', close_menu: 'Cerrar menú',
            nav_categories: 'Categorías', nav_orders: 'Mis pedidos', nav_withdraw: 'Retirar', nav_more: 'Más', nav_verify: 'Verificar cuenta', nav_seller_disputes: 'Disputas de la tienda', nav_settings: 'Ajustes',
            cat_kicker: 'Compra por categoría', cat_title: 'Elige el producto digital que necesitas',
            cat_desc: 'Organizamos el mercado en tres categorías principales para que llegues rápido: cuentas sociales, servicios digitales y juegos.',
            cat_browse: 'Ver lista',
            cat_social_name: 'Cuentas de redes sociales', cat_social_desc: 'Cuentas verificadas y listas para plataformas sociales y de mensajería.',
            cat_services_name: 'Servicios digitales', cat_services_desc: 'Diseño, edición, desarrollo y gestión de cuentas de freelancers de confianza.',
            cat_games_name: 'Juegos y suscripciones', cat_games_desc: 'Juegos, recargas dentro del juego y suscripciones a precios competitivos.',
            hero_kicker: 'El mercado Account de confianza', hero_title: 'Compra y vende con confianza… vendedores verificados con identidad nacional',
            hero_desc: 'En Account, cada vendedor verifica su identidad nacional antes de publicar sus productos, para que compres en tiendas reales y certificadas. Crea tu tienda en minutos y empieza a vender, o explora productos de vendedores de confianza.',
            hero_browse: 'Explorar productos', hero_start: 'Empezar a vender', hero_trust: 'Cada tienda mostrada aquí tiene un propietario verificado.',
            stat_verified: 'Vendedores verificados', stat_products: 'Productos', stat_shipping: 'Envío rápido',
            stat_verified_value: '100 %', stat_products_value: '500+', stat_shipping_value: '24 h',
            footer_about: 'Un mercado de confianza que reúne a vendedores verificados con identidad nacional para mostrar y vender sus productos de forma segura, en una experiencia de compra fácil y fiable.',
            footer_shop: 'Tienda', footer_contact: 'Contacto', footer_home: 'Inicio', footer_all_products: 'Todos los productos',
            footer_verified_sellers: 'Vendedores verificados', footer_cart: 'Carrito', footer_start_selling: 'Empezar a vender',
            footer_contact_us: 'Contáctanos', footer_verified_note: 'Cada vendedor de la plataforma está verificado con identidad nacional.',
            footer_copyright: '© 2026 Account. Todos los derechos reservados.', footer_secure: 'Una experiencia de compra segura y fiable.'
        },
        ru: {
            nav_home: 'Главная', nav_help: 'Центр помощи', nav_shop: 'Магазин', nav_sellers: 'Продавцы', nav_dashboard: 'Панель продавца',
            nav_start_selling: 'Начать продавать', nav_browse_products: 'Продать', nav_account: 'Мой аккаунт', nav_cart: 'Корзина', nav_contact: 'Связаться с нами',
            nav_menu: 'Меню', nav_subtitle: 'НАДЁЖНЫЙ РЫНОК', open_menu: 'Открыть меню', close_menu: 'Закрыть меню',
            nav_categories: 'Категории', nav_orders: 'Мои заказы', nav_withdraw: 'Вывод средств', nav_more: 'Ещё', nav_verify: 'Подтвердить аккаунт', nav_seller_disputes: 'Споры магазина', nav_settings: 'Настройки',
            cat_kicker: 'Покупки по категориям', cat_title: 'Выберите нужный цифровой продукт',
            cat_desc: 'Мы разделили рынок на три основные категории, чтобы вы быстро нашли нужное: аккаунты соцсетей, цифровые услуги и игры.',
            cat_browse: 'Смотреть список',
            cat_social_name: 'Аккаунты соцсетей', cat_social_desc: 'Проверенные готовые аккаунты для социальных платформ и мессенджеров.',
            cat_services_name: 'Цифровые услуги', cat_services_desc: 'Дизайн, монтаж, разработка и ведение аккаунтов от проверенных фрилансеров.',
            cat_games_name: 'Игры и подписки', cat_games_desc: 'Игры, внутриигровые пополнения и подписки по конкурентным ценам.',
            hero_kicker: 'Надёжный рынок Account', hero_title: 'Покупайте и продавайте с уверенностью… продавцы подтверждены удостоверением личности',
            hero_desc: 'В Account каждый продавец подтверждает своё удостоверение личности перед публикацией товаров, чтобы вы покупали в настоящих, проверенных магазинах. Создайте свой магазин за минуты и начните продавать или просматривайте товары от надёжных продавцов.',
            hero_browse: 'Просмотреть товары', hero_start: 'Начать продавать', hero_trust: 'У каждого магазина здесь подтверждённый владелец.',
            stat_verified: 'Проверенные продавцы', stat_products: 'Товары', stat_shipping: 'Быстрая доставка',
            stat_verified_value: '100%', stat_products_value: '500+', stat_shipping_value: '24 ч',
            footer_about: 'Надёжный рынок, объединяющий продавцов, подтверждённых удостоверением личности, для безопасного показа и продажи своих товаров в простом и надёжном процессе покупки.',
            footer_shop: 'Магазин', footer_contact: 'Контакты', footer_home: 'Главная', footer_all_products: 'Все товары',
            footer_verified_sellers: 'Проверенные продавцы', footer_cart: 'Корзина', footer_start_selling: 'Начать продавать',
            footer_contact_us: 'Связаться с нами', footer_verified_note: 'Каждый продавец на платформе подтверждён удостоверением личности.',
            footer_copyright: '© 2026 Account. Все права защищены.', footer_secure: 'Безопасный и надёжный опыт покупок.'
        }
    };

    Object.assign(DICT.ar, {
        nav_admin: 'لوحة الإدارة', nav_logout: 'تسجيل الخروج',
        how_kicker: 'كيف تبدأ البيع؟', how_title: 'ثلاث خطوات لفتح متجرك الموثّق',
        how_desc: 'نحافظ على ثقة المتسوقين عبر التحقق من هوية كل بائع قبل نشر منتجاته على المنصة.',
        how_signup_title: 'أنشئ حسابك', how_signup_desc: 'سجّل بالبريد الإلكتروني وأكّد الدخول برمز التحقق في ثوانٍ.',
        how_verify_title: 'وثّق هويتك', how_verify_desc: 'أكّد بريدك وجوالك، ارفع صورة الهوية الوطنية، ثم بانتظار موافقة الإدارة.',
        how_list_title: 'اعرض منتجاتك', how_list_desc: 'بعد التوثيق أضف منتجاتك بصور وأسعار، وستظهر في متجرك وفي كتالوج السوق.',
        how_start: 'ابدأ الآن مجانًا', featured_kicker: 'الأكثر طلبًا', featured_title: 'حسابات وعروض رقمية مختارة', featured_all: 'عرض كل العروض',
        sellers_kicker: 'بائعون موثّقون', sellers_title: 'تسوّق من متاجر تم التحقق من أصحابها', sellers_all: 'كل البائعين',
        sellers_account: 'زيارة الحساب', sellers_account_desc: 'انتقل إلى حسابك لمتابعة طلباتك ومبيعاتك ورصيدك وإدارة بياناتك الشخصية.',
        cat_social_count: '+150 حسابًا', cat_services_count: '+80 خدمة', cat_games_count: '+120 منتجًا',
        newsletter_kicker: 'عروض حصرية', newsletter_title: 'اشترك ليصلك كل جديد من بائعي السوق',
        newsletter_desc: 'سجّل بريدك الإلكتروني لتصلك أحدث المنتجات والخصومات من المتاجر الموثّقة قبل الجميع، دون أي رسائل مزعجة.',
        newsletter_email: 'البريد الإلكتروني', newsletter_subscribe: 'اشترك الآن',
        logo_alt: 'شعار Account', avatar_alt: 'صورة الحساب', hero_image_alt: 'واجهات تطبيقات رقمية على هاتف ذكي',
        product_cart_aria: 'أضف 1191 إلى السلة', product_contact_aria: 'تواصل بخصوص 1191'
    });
    Object.assign(DICT.en, {
        nav_admin: 'Admin Dashboard', nav_logout: 'Sign Out',
        how_kicker: 'How to start selling', how_title: 'Three steps to open your verified store',
        how_desc: 'We protect shoppers’ trust by verifying every seller’s identity before they list products on the platform.',
        how_signup_title: 'Create your account', how_signup_desc: 'Register with your email and confirm your sign-in with a verification code in seconds.',
        how_verify_title: 'Verify your identity', how_verify_desc: 'Confirm your email and phone number, upload your national ID, then wait for approval from the team.',
        how_list_title: 'List your products', how_list_desc: 'After verification, add your products with photos and prices. They will appear in your store and the marketplace catalog.',
        how_start: 'Get started for free', featured_kicker: 'Most popular', featured_title: 'Selected accounts and digital offers', featured_all: 'View all offers',
        sellers_kicker: 'Verified sellers', sellers_title: 'Shop from stores with verified owners', sellers_all: 'All sellers',
        sellers_account: 'Visit your account', sellers_account_desc: 'Go to your account to track your orders, sales and balance, and manage your personal details.',
        cat_social_count: '150+ accounts', cat_services_count: '80+ services', cat_games_count: '120+ products',
        newsletter_kicker: 'Exclusive offers', newsletter_title: 'Get the latest updates from marketplace sellers',
        newsletter_desc: 'Enter your email to receive the latest products and discounts from verified stores before everyone else, without spam.',
        newsletter_email: 'Email address', newsletter_subscribe: 'Subscribe now',
        logo_alt: 'Account logo', avatar_alt: 'Account photo', hero_image_alt: 'Digital app interfaces on a smartphone',
        product_cart_aria: 'Add 1191 to cart', product_contact_aria: 'Contact us about 1191'
    });

    var menuEl = null;
    var buttonEl = null;

    function getLang() {
        try {
            var saved = window.localStorage.getItem(STORAGE_KEY);
            if (saved && DICT[saved]) {
                return saved;
            }
        } catch (e) { /* ignore */ }
        return 'ar';
    }

    function setLang(lang) {
        try {
            window.localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) { /* ignore */ }
    }

    function apply(lang) {
        if (!DICT[lang]) {
            lang = 'ar';
        }
        var dict = DICT[lang];
        var isRtl = RTL_LANGS.indexOf(lang) !== -1;
        var root = document.documentElement;
        root.setAttribute('lang', lang);
        root.setAttribute('dir', isRtl ? 'rtl' : 'ltr');

        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (dict[key]) {
                el.textContent = dict[key];
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-placeholder');
            if (dict[key]) {
                el.setAttribute('placeholder', dict[key]);
            }
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-aria');
            if (dict[key]) {
                el.setAttribute('aria-label', dict[key]);
            }
        });
        document.querySelectorAll('[data-i18n-text]').forEach(function (el) {
            var text = dict[el.getAttribute('data-i18n-text')];
            if (!text) return;
            Array.prototype.some.call(el.childNodes, function (node) {
                if (node.nodeType !== 3 || !node.nodeValue.trim()) return false;
                node.nodeValue = node.nodeValue.replace(node.nodeValue.trim(), text);
                return true;
            });
        });
        document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
            var text = dict[el.getAttribute('data-i18n-alt')];
            if (text) el.setAttribute('alt', text);
        });
        if (window.CurrencySystem && typeof window.CurrencySystem.format === 'function') {
            document.querySelectorAll('[data-currency-amount]').forEach(function (el) {
                el.textContent = window.CurrencySystem.format(el.getAttribute('data-currency-amount'));
            });
        }

        var current = document.getElementById('langCurrent');
        if (current) {
            var active = null;
            LANGS.forEach(function (l) {
                if (l.code === lang) {
                    active = l;
                }
            });
            current.textContent = active ? active.label : lang;
        }
        document.querySelectorAll('.lang-option').forEach(function (btn) {
            if (btn.getAttribute('data-lang') === lang) {
                btn.classList.add('is-active');
                btn.setAttribute('aria-current', 'true');
            } else {
                btn.classList.remove('is-active');
                btn.removeAttribute('aria-current');
            }
        });
    }

    function buildMenu() {
        if (!menuEl) {
            return;
        }
        menuEl.innerHTML = '';
        LANGS.forEach(function (l) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'lang-option flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text-color)] transition-colors duration-200 hover:bg-[var(--surface-color)]';
            btn.setAttribute('data-lang', l.code);
            btn.setAttribute('role', 'menuitem');
            btn.textContent = l.label;
            btn.addEventListener('click', function () {
                setLang(l.code);
                apply(l.code);
                closeMenu();
            });
            menuEl.appendChild(btn);
        });
    }

    function openMenu() {
        if (!menuEl) {
            return;
        }
        menuEl.classList.remove('hidden');
        if (buttonEl) {
            buttonEl.setAttribute('aria-expanded', 'true');
        }
    }

    function closeMenu() {
        if (!menuEl) {
            return;
        }
        menuEl.classList.add('hidden');
        if (buttonEl) {
            buttonEl.setAttribute('aria-expanded', 'false');
        }
    }

    function init() {
        menuEl = document.getElementById('langMenu');
        buttonEl = document.getElementById('langButton');
        buildMenu();
        apply(getLang());

        if (buttonEl) {
            buttonEl.addEventListener('click', function (event) {
                event.stopPropagation();
                if (menuEl && menuEl.classList.contains('hidden')) {
                    openMenu();
                } else {
                    closeMenu();
                }
            });
        }
        document.addEventListener('click', function (event) {
            if (!menuEl || menuEl.classList.contains('hidden')) {
                return;
            }
            var target = event.target;
            if (target && target.closest && target.closest('#langSwitch')) {
                return;
            }
            closeMenu();
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });
    }

    window.AppI18N = {
        apply: apply,
        getLang: getLang,
        setLang: setLang,
        langs: LANGS
    };

    document.addEventListener('DOMContentLoaded', init);
})();