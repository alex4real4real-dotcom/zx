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

    // Interface text in the older account and catalog templates. User content is not scanned.
    var originalPageTitle = document.title;
    var UI_TEXT = {
        "المتجر": "Shop",
        "تغيير اللغة": "Change language",
        "التنقل الرئيسي": "Main navigation",
        "قائمة الجوال": "Mobile menu",
        "حساب Account": "Account",
        "الدخول أو إنشاء حساب": "Sign in or create account",
        "شعار Account": "Account logo",
        "Account - الصفحة الرئيسية": "Account - Home",
        "البائعون الموثّقون": "Verified sellers",
        "تسجيل الدخول وإنشاء حساب": "Sign in and create account",
        "لم ينجح اختبار إعداد قاعدة البيانات.": "The database connection test failed.",
        "نجح الاتصال بقاعدة البيانات. يمكنك الآن إنشاء حساب وتجربة السلة والطلبات التجريبية.": "Connected to the database. You can now create an account and try the cart and test orders.",
        "جارٍ تحميل المنتجات…": "Loading products…",
        "سلع البائعين الموثّقين": "Verified sellers’ listings",
        "تظهر هنا سلع البائعين الموثّقين فقط.": "Only listings from verified sellers appear here.",
        "سلة التسوق": "Shopping cart",
        "الدفع تجريبي فقط. لا تُطلب بيانات بطاقة ولا تُسحب أموال.": "Test checkout only. No card details are requested and no money is charged.",
        "الإجمالي:": "Total:",
        "إتمام طلب تجريبي": "Place test order",
        "متابعة التسوق": "Continue shopping",
        "طلباتي": "My orders",
        "هذه الطلبات تجريبية ولا تمثل مدفوعات أو أرصدة حقيقية.": "These are test orders and do not represent real payments or balances.",
        "اختبار الاتصال": "Test connection",
        "رابط المشروع:": "Project URL:",
        "يفحص هذا الزر اتصال الموقع بقاعدة البيانات بعد تشغيل ملف الإعداد.": "Test the website’s database connection after setup.",
        "تسجيل حساب": "Create account",
        "حسابك في ACCOUNT": "YOUR ACCOUNT",
        "سجّل الدخول أو أنشئ حسابك": "Sign in or create an account",
        "أنشئ حسابك ببريدك الإلكتروني ورقم جوالك وكلمة مرور، ثم أكّد بريدك برمز تحقق مكوّن من 6 أرقام. بعد ذلك سجّل الدخول في أي وقت بالبريد أو الجوال وكلمة المرور.": "Create an account with your email, phone number and password, then confirm your email with a 6-digit verification code. You can then sign in with your email or phone number and password.",
        "سجّل ببريدك الإلكتروني ورقم جوالك وكلمة مرور قوية، ثم فعّل حسابك برمز تحقق يصل إلى بريدك.": "Register with your email, phone number and a strong password, then activate your account using the code sent to your email.",
        "لا يُسمح بإنشاء أكثر من حساب بالبريد الإلكتروني أو رقم الجوال نفسه.": "Each email address and phone number can only be used for one account.",
        "كلمة المرور لا تقل عن 8 خانات وتجمع بين الحروف والأرقام.": "Your password must contain at least 8 characters, including letters and numbers.",
        "جلسة دخول آمنة تبقيك مسجّلًا حتى 30 يومًا دون تسجيل متكرر.": "Stay securely signed in for up to 30 days.",
        "تحقق بالبريد الإلكتروني": "Email verification",
        "إنشاء حساب": "Create account",
        "تسجيل الدخول": "Sign in",
        "ادخل بريدك الإلكتروني أو رقم جوالك وكلمة المرور التي اخترتها.": "Enter your email address or phone number and your password.",
        "البريد الإلكتروني أو رقم الجوال *": "Email or phone number *",
        "كلمة المرور *": "Password *",
        "نسيت كلمة المرور؟": "Forgot password?",
        "إنشاء حساب جديد": "Create a new account",
        "املأ بياناتك، وسنرسل رمز تحقق مكوّنًا من 6 أرقام إلى بريدك لتفعيل الحساب.": "Enter your details. We will email you a 6-digit verification code to activate your account.",
        "اسم المستخدم *": "Username *",
        "صورة الحساب": "Profile photo",
        "اختر صورة واضحة لحسابك (PNG أو JPG).": "Choose a clear profile photo (PNG or JPG).",
        "البريد الإلكتروني *": "Email address *",
        "رقم الجوال *": "Phone number *",
        "تأكيد كلمة المرور *": "Confirm password *",
        "إنشاء الحساب وإرسال الرمز": "Create account and send code",
        "تفعيل البريد الإلكتروني": "Verify your email",
        "أدخل رمز التحقق المكوّن من 6 أرقام الذي يصلك على": "Enter the 6-digit verification code sent to",
        "رمز التحقق *": "Verification code *",
        "تفعيل الحساب": "Activate account",
        "إعادة إرسال الرمز": "Resend code",
        "تعديل البريد": "Change email",
        "استعادة كلمة المرور": "Reset password",
        "أدخل بريد حسابك لإرسال رمز التحقق وتعيين كلمة مرور جديدة.": "Enter your account email to request a verification code and reset your password.",
        "إرسال رمز التحقق": "Send verification code",
        "العودة إلى تسجيل الدخول": "Back to sign in",
        "تعيين كلمة مرور جديدة": "Set a new password",
        "أدخل الرمز المكوّن من 6 أرقام الذي يصلك على": "Enter the 6-digit code sent to",
        "كلمة المرور الجديدة *": "New password *",
        "تأكيد كلمة المرور الجديدة *": "Confirm new password *",
        "حفظ كلمة المرور الجديدة": "Save new password",
        "الملف الشخصي": "Profile",
        "بروفايل": "Profile",
        "صورة أوضح لهويتك في السوق، مع متابعة مباشرة لمجمل مبيعاتك.": "Manage your marketplace profile and keep track of your total sales.",
        "تعديل الملف": "Edit profile",
        "مجمل المبيعات": "Total sales",
        "تسجيل الخروج": "Sign out",
        "تعديل الملف الشخصي": "Edit your profile",
        "البريد الإلكتروني": "Email address",
        "حفظ التعديلات": "Save changes",
        "إلغاء": "Cancel",
        "سجّل الدخول لعرض حسابك وتعديل بياناتك.": "Sign in to view and edit your profile.",
        "جارٍ التنفيذ…": "Working…",
        "سجّل الدخول لعرض هذه الصفحة.": "Sign in to view this page.",
        "لا توجد سلع متاحة من بائعين موثّقين حاليًا.": "No listings from verified sellers are available right now.",
        "لا توجد منتجات متاحة حاليًا.": "No products are available right now.",
        "أضف إلى السلة": "Add to cart",
        "هذا المنتج غير متاح حاليًا.": "This product is currently unavailable.",
        "حُدّثت السلة.": "Cart updated.",
        "حذف": "Remove",
        "حُذف المنتج من السلة.": "Product removed from cart.",
        "السلة فارغة.": "Your cart is empty.",
        "لا توجد طلبات بعد.": "You have no orders yet.",
        "طلب تجريبي": "Test order",
        "محاكاة فقط؛ لا يُمثّل هذا الطلب دفعة حقيقية.": "Simulation only. This order does not represent a real payment.",
        "المنتج غير متاح حاليًا": "Product currently unavailable",
        "حسابات التواصل الاجتماعي": "Social Media Accounts",
        "الخدمات الرقمية": "Digital Services",
        "الألعاب والاشتراكات": "Games & Subscriptions",
        "الخدمة غير جاهزة حاليًا؛ تواصل مع الدعم.": "This service is currently unavailable. Please contact support.",
        "كلمة المرور يجب أن تكون 8 خانات على الأقل وتجمع بين الحروف والأرقام.": "Your password must contain at least 8 characters, including letters and numbers.",
        "كلمتا المرور غير متطابقتين.": "The passwords do not match.",
        "اختر صورة PNG أو JPG أو WebP.": "Choose a PNG, JPG or WebP image.",
        "حجم الصورة الأقصى 2 ميجابايت.": "The maximum image size is 2 MB.",
        "تعذّرت قراءة الصورة.": "Could not read the image.",
        "أدخل رمز التحقق الذي يصلك على بريدك الإلكتروني.": "Enter the verification code sent to your email.",
        "أدخل بيانات الحساب أولًا.": "Enter your account details first.",
        "تم تفعيل الحساب، لكن تعذّر حفظ الصورة. يمكنك رفعها من تعديل الملف.": "Your account is active, but the photo could not be saved. You can upload it from Edit profile.",
        "إذا كان البريد مسجّلًا، ستصلك رسالة برمز التحقق.": "If the email is registered, you will receive a verification code.",
        "أدخل بريد الحساب أولًا.": "Enter your account email first.",
        "حُفظت كلمة المرور الجديدة. يمكنك تسجيل الدخول الآن.": "Your new password has been saved. You can now sign in.",
        "أدخل البريد الإلكتروني أولًا.": "Enter your email address first.",
        "طُلب إرسال رمز جديد. راجع بريدك الإلكتروني.": "A new code has been requested. Check your email.",
        "✓ موثّق": "✓ Verified",
        "غير موثّق": "Not verified",
        "حُفظت بيانات الملف الشخصي.": "Profile saved.",
        "سجّل الدخول أولًا.": "Please sign in first.",
        "هذا الحساب موقوف.": "This account is suspended.",
        "رقم الجوال مستخدم في حساب آخر.": "This phone number is already used by another account.",
        "أدخل رقم جوال صحيحًا مثل 05xxxxxxxx أو رقمًا دوليًا يبدأ بعلامة +.": "Enter a valid phone number, such as 05xxxxxxxx, or an international number beginning with +.",
        "اسم المستخدم يجب أن يكون بين حرفين و120 حرفًا.": "Your username must contain between 2 and 120 characters.",
        "الدخول بالجوال غير متاح حاليًا. يمكنك الدخول بالبريد الإلكتروني.": "Phone sign-in is unavailable. Please sign in with your email.",
        "رمز التحقق غير صحيح أو انتهت صلاحيته. اطلب رمزًا جديدًا.": "The verification code is incorrect or has expired. Request a new code.",
        "تعذّر إنشاء الحساب. تحقق من رقم الجوال، فقد يكون مستخدمًا بحساب آخر.": "Could not create your account. The phone number may already be in use.",
        "اختر كلمة مرور مختلفة عن السابقة.": "Choose a password different from your previous one.",
        "الكمية المسموحة من 1 إلى 99.": "Quantity must be between 1 and 99.",
        "أحد المنتجات غير متاح حاليًا.": "One of the products is currently unavailable.",
        "انتظر دقيقتين قبل إرسال رسالة أخرى.": "Wait two minutes before sending another message.",
        "بيانات الدخول غير صحيحة.": "The sign-in details are incorrect.",
        "فعّل حسابك من رسالة التأكيد في بريدك الإلكتروني.": "Activate your account using the confirmation email.",
        "بلغت حد المحاولات مؤقتًا؛ حاول لاحقًا.": "Too many attempts. Please try again later.",
        "تعذّر الاتصال بالخادم؛ تحقق من الإنترنت.": "Could not connect to the server. Check your internet connection.",
        "تعذّر تنفيذ الطلب.": "Could not complete your request.",
        "تعذّر تأكيد الطلب التجريبي.": "Could not confirm the test order.",
        "حُفظت بياناتك.": "Your details have been saved.",
        "كمية": "Quantity",
        "حُفظ الطلب التجريبي:": "Test order saved:",
        "لم تُسحب أي أموال.": "No money was charged."
};
    Object.keys(UI_TEXT).forEach(function (source) { DICT.ar[source] = source; DICT.en[source] = UI_TEXT[source]; });
    function text(source) { return getLang() === 'en' && UI_TEXT[source] ? UI_TEXT[source] : source; }
    function bindText(element, source) {
        if (UI_TEXT[source]) element.setAttribute('data-i18n', source);
        else element.removeAttribute('data-i18n');
        element.textContent = text(source);
        return element;
    }
    var templateText = [], templateAttributes = [], templateCaptured = false;
    function captureTemplateText() {
        if (templateCaptured || !document.createTreeWalker) return;
        templateCaptured = true;
        document.querySelectorAll('[aria-label], [placeholder], [alt], [title]').forEach(function (element) {
            ['aria-label', 'placeholder', 'alt', 'title'].forEach(function (attribute) {
                var source = element.getAttribute(attribute);
                if (UI_TEXT[source]) templateAttributes.push({ element: element, attribute: attribute, source: source, last: source });
            });
        });
        document.querySelectorAll('main.backend-shell, main.account-ui').forEach(function (root) {
            var walker = document.createTreeWalker(root, 4), node;
            while ((node = walker.nextNode())) {
                var source = node.nodeValue.trim();
                if (!UI_TEXT[source] || node.parentElement.closest('[data-i18n], script, style, textarea, #productList, #cartList, #orderList')) continue;
                templateText.push({ node: node, source: source, whitespace: node.nodeValue, last: node.nodeValue });
            }
        });
    }
    function translateTemplateText(lang) {
        templateAttributes.forEach(function (item) {
            if (!item.element.isConnected || item.element.getAttribute(item.attribute) !== item.last) return;
            item.last = lang === 'en' ? UI_TEXT[item.source] : item.source;
            item.element.setAttribute(item.attribute, item.last);
        });
        var titleLabel = originalPageTitle.replace(/ \| Account$/, '');
        if (UI_TEXT[titleLabel]) document.title = (lang === 'en' ? UI_TEXT[titleLabel] : titleLabel) + ' | Account';
        templateText.forEach(function (item) {
            if (!item.node.isConnected || item.node.nodeValue !== item.last) return;
            item.last = item.whitespace.replace(item.source, lang === 'en' ? UI_TEXT[item.source] : item.source);
            item.node.nodeValue = item.last;
        });
    }

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
        captureTemplateText();
        translateTemplateText(lang);
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

        document.querySelectorAll('[data-locale-date]').forEach(function (el) {
            el.textContent = new Date(el.getAttribute('data-locale-date')).toLocaleString(lang === 'en' ? 'en-GB' : 'ar-SA');
        });

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
        text: text,
        bindText: bindText,
        langs: LANGS
    };

    document.addEventListener('DOMContentLoaded', init);
})();