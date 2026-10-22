// Explain: Internationalization file for managing multilingual content and language switching.
(function () {
    'use strict';

    var LANGS = [
        { code: 'ar', label: 'العربية' },
        { code: 'en', label: 'English' }
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
        window.dispatchEvent(new CustomEvent('account:languagechange', { detail: { lang: lang } }));
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