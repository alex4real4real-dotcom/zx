// Explain: Handles navigation, cart, user authentication, and admin link visibility.
(function () {
    document.querySelectorAll('footer a').forEach(function (link) {
        var icon = link.querySelector('.fa-instagram, .fa-facebook-f, .fa-whatsapp, .fa-tiktok');
        if (!icon) return;
        if (!icon.classList.contains('fa-tiktok')) { link.remove(); return; }
        link.href = 'https://www.tiktok.com/@t0ex';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', 'TikTok @t0ex');
    });
})();
(function (initialize) {
    var domReady = document.readyState === 'loading' ? new Promise(function (resolve) {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
    }) : Promise.resolve();
    Promise.all([domReady, window.accountBackendReady || Promise.resolve()]).then(initialize);
})(function () {
    // Keep the guest sign-in link immediately to the left of Sell in both languages.
    var headerSell = document.querySelector('a[data-i18n="nav_browse_products"][href$="sell.html"]');
    if (headerSell) {
        var guestActions = document.createElement('div');
        guestActions.style.cssText = 'display:inline-flex;align-items:center;gap:12px;direction:rtl;flex-shrink:0';
        headerSell.parentNode.insertBefore(guestActions, headerSell);
        guestActions.appendChild(headerSell);
        var guestLogin = document.createElement('a');
        guestLogin.href = './account.html';
        guestLogin.id = 'guestLoginLink';
        guestLogin.hidden = true;
        guestLogin.style.cssText = 'color:var(--text-color);font-size:14px;font-weight:600;white-space:nowrap;min-height:44px;align-content:center;text-decoration:none';
        guestActions.appendChild(guestLogin);
        function updateGuestLogin() {
            guestLogin.textContent = document.documentElement.lang === 'en' ? 'Sign in' : 'تسجيل الدخول';
            guestLogin.hidden = !!(window.accountBackend && window.accountBackend.currentUser());
        }
        updateGuestLogin();
        window.addEventListener('account:languagechange', updateGuestLogin);
        window.addEventListener('account:signed-out', updateGuestLogin);
    }

    var withdrawalLinks = document.querySelectorAll('a[href$="withdraw.html"]');
    function hideWithdrawals() {
        withdrawalLinks.forEach(function (link) { link.style.display = 'none'; });
    }
    hideWithdrawals();
    if (window.accountBackend && window.accountBackend.currentUser()) {
        var withdrawalUser = window.accountBackend.currentUser().id;
        window.accountBackend.profile().then(function (profile) {
            if (!window.accountBackend.currentUser() || window.accountBackend.currentUser().id !== withdrawalUser) return;
            if (profile && profile.is_verified === true && !profile.banned) {
                withdrawalLinks.forEach(function (link) { link.style.removeProperty('display'); });
            }
        }).catch(hideWithdrawals);
    }
    window.addEventListener('account:signed-out', hideWithdrawals);

    var navOpenButton = document.getElementById('navOpenButton');
    var navCloseButton = document.getElementById('navCloseButton');
    var navOverlay = document.getElementById('navOverlay');
    var navCloseLinks = document.querySelectorAll('.nav-close-link');

    function openNav() {
        if (!navOverlay) {
            return;
        }
        navOverlay.classList.remove('hidden');
        navOverlay.classList.add('flex');
        navOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        if (!navOverlay) {
            return;
        }
        navOverlay.classList.add('hidden');
        navOverlay.classList.remove('flex');
        navOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    if (navOpenButton) {
        navOpenButton.addEventListener('click', openNav);
    }
    if (navCloseButton) {
        navCloseButton.addEventListener('click', closeNav);
    }
    navCloseLinks.forEach(function (link) {
        link.addEventListener('click', closeNav);
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeNav();
        }
    });

    function showToast(text, isError) {
        var toast = document.getElementById('appToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'appToast';
            toast.className = 'app-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        toast.textContent = text;
        if (isError) {
            toast.classList.add('is-error');
        } else {
            toast.classList.remove('is-error');
        }
        toast.classList.add('is-visible');
        window.clearTimeout(toast._hideTimer);
        toast._hideTimer = window.setTimeout(function () {
            toast.classList.remove('is-visible');
        }, 2600);
    }
    window.showToast = showToast;

    function setCartBadge(count) {
        var badge = document.getElementById('cartCount');
        if (!badge) {
            return;
        }
        if (count > 0) {
            badge.textContent = String(count);
            badge.classList.remove('hidden');
        } else {
            badge.textContent = '0';
            badge.classList.add('hidden');
        }
    }

    function updateCartBadge() {
        if (!window.OrderSystem || typeof window.OrderSystem.getCart !== 'function') {
            return;
        }
        window.OrderSystem.getCart().then(function (response) {
            if (!response || !response.success || !Array.isArray(response.cart)) {
                return;
            }
            var total = response.cart.reduce(function (sum, item) {
                return sum + (Number(item.count) || 0);
            }, 0);
            setCartBadge(total);
        }).catch(function () {
            setCartBadge(0);
        });
    }
    window.updateCartBadge = updateCartBadge;
    updateCartBadge();

    document.addEventListener('click', function (event) {
        var button = event.target.closest ? event.target.closest('.js-add-to-cart') : null;
        if (!button) {
            return;
        }
        event.preventDefault();
        var uid = button.getAttribute('data-uid');
        if (!uid || !window.OrderSystem) {
            return;
        }
        if (!window.getSessionToken || !window.getSessionToken()) {
            showToast('سجّل الدخول أولًا لإتمام الشراء', true);
            window.setTimeout(function () { window.location.href = 'account.html'; }, 900);
            return;
        }

        function addToCart() {
            button.disabled = true;
            window.OrderSystem.addToCart({ unique_id_txt: uid }, 1).then(function (response) {
                button.disabled = false;
                if (response && response.success) {
                    showToast('تمت إضافة المنتج إلى السلة');
                    updateCartBadge();
                } else {
                    showToast(response && response.error ? response.error : 'تعذّر إضافة المنتج، حاول مرة أخرى.', true);
                }
            }).catch(function () {
                button.disabled = false;
                showToast('تعذّر الاتصال بالخدمة، حاول مرة أخرى.', true);
            });
        }

        var buyerEmail = window.currentUserEmail ? window.currentUserEmail() : '';
        if (buyerEmail && window.findBanByEmail) {
            button.disabled = true;
            window.findBanByEmail(buyerEmail).then(function (ban) {
                if (ban) {
                    showToast('حسابك محظور من إدارة المنصة.', true);
                    window.setTimeout(function () {
                        window.location.href = 'ban.html?app_ref=' + encodeURIComponent(buyerEmail);
                    }, 900);
                    return;
                }
                addToCart();
            }).catch(function () {
                button.disabled = false;
                addToCart();
            });
            return;
        }

        addToCart();
    });

    function bindMessageForm(formEl, statusKey, buildFields) {
        if (!formEl) {
            return;
        }
        formEl.addEventListener('submit', function (event) {
            event.preventDefault();
            if (!formEl.checkValidity()) {
                formEl.reportValidity();
                return;
            }
            var status = formEl.querySelector('[data-form-status="' + statusKey + '"]');
            var button = formEl.querySelector('button[type="submit"]');
            var originalText = button ? button.innerHTML : '';

            if (!window.MessagesSystem || typeof window.MessagesSystem.submit !== 'function') {
                if (status) {
                    status.textContent = 'الخدمة غير متاحة حاليًا، حاول لاحقًا.';
                    status.className = 'form-status error';
                }
                return;
            }

            if (button) {
                button.disabled = true;
                button.textContent = 'جارٍ الإرسال…';
            }
            if (status) {
                status.textContent = '';
                status.className = 'form-status';
            }

            window.MessagesSystem.submit(buildFields(formEl), formEl).then(function (response) {
                if (response && response.success) {
                    formEl.reset();
                    if (status) {
                        status.textContent = 'تم استلام رسالتك بنجاح، شكرًا لتواصلك معنا.';
                        status.className = 'form-status success';
                    }
                } else if (status) {
                    status.textContent = response && response.error ? response.error : 'تعذّر إرسال الرسالة، حاول مرة أخرى.';
                    status.className = 'form-status error';
                }
            }).catch(function () {
                if (status) {
                    status.textContent = 'تعذّر الاتصال بالخدمة، حاول مرة أخرى.';
                    status.className = 'form-status error';
                }
            }).finally(function () {
                if (button) {
                    button.disabled = false;
                    button.innerHTML = originalText;
                }
            });
        });
    }

    bindMessageForm(document.getElementById('contactForm'), 'contact', function (formEl) {
        return [
            { label: 'الاسم الكامل', value: formEl.elements.namedItem('name').value, type: 'text' },
            { label: 'البريد الإلكتروني', value: formEl.elements.namedItem('email').value, type: 'email' },
            { label: 'رقم الجوال', value: formEl.elements.namedItem('phone').value, type: 'tel' },
            { label: 'الموضوع', value: formEl.elements.namedItem('subject').value, type: 'text' },
            { label: 'الرسالة', value: formEl.elements.namedItem('message').value, type: 'textarea' }
        ];
    });

    bindMessageForm(document.getElementById('newsletterForm'), 'newsletter', function (formEl) {
        return [
            { label: 'البريد الإلكتروني', value: formEl.elements.namedItem('email').value, type: 'email' },
            { label: 'نوع الطلب', value: 'اشتراك في القائمة البريدية', type: 'text' }
        ];
    });

    window.getSessionToken = function () {
        try {
            return window.localStorage.getItem('app_session_token') || '';
        } catch (e) {
            return '';
        }
    };

    window.setSessionToken = function (token) {
        try {
            window.localStorage.setItem('app_session_token', token || '');
        } catch (e) {
            return;
        }
    };

    window.getUserEmail = function () {
        try {
            return window.localStorage.getItem('app_user_email') || '';
        } catch (e) {
            return '';
        }
    };

    window.setUserEmail = function (email) {
        try {
            window.localStorage.setItem('app_user_email', email || '');
        } catch (e) {
            return;
        }
    };

    window.clearSessionToken = function () {
        try {
            window.localStorage.removeItem('app_session_token');
            window.localStorage.removeItem('app_user_email');
        } catch (e) {
            return;
        }
    };

    window.getCurrentUser = function () {
        var token = window.getSessionToken();
        if (!token) {
            return Promise.resolve(null);
        }
        var account = null;
        try {
            account = JSON.parse(window.localStorage.getItem('app_account') || 'null');
        } catch (e) {
            account = null;
        }
        if (account && account.email) {
            return Promise.resolve(account);
        }
        return Promise.resolve({ email: window.getUserEmail() });
    };

    window.listAllRows = function (namespace) {
        var all = [];
        function loadPage(pageNumber) {
            return window.DataSystem.list(namespace, { page: pageNumber, limit: 50 }).then(function (response) {
                if (!response || !response.success || !Array.isArray(response.keys)) {
                    return all;
                }
                response.keys.forEach(function (row) {
                    var data = {};
                    try {
                        data = JSON.parse(row.data_json);
                    } catch (e) {
                        data = {};
                    }
                    all.push(Object.assign({}, data, {
                        key: row.key_txt,
                        unique_id_txt: row.unique_id_txt,
                        page_url_txt: row.page_url_txt,
                        created_at: row.created_at,
                        updated_at: row.updated_at
                    }));
                });
                if (response.pagination && response.pagination.pagesLeft > 0) {
                    return loadPage(pageNumber + 1);
                }
                return all;
            });
        }
        return loadPage(1);
    };

    window.findSellerByEmail = function (email) {
        return window.listAllRows('sellers').then(function (rows) {
            var target = String(email || '').toLowerCase();
            var found = null;
            rows.forEach(function (row) {
                if (String(row.email || '').toLowerCase() === target) {
                    found = row;
                }
            });
            return found;
        });
    };

    window.getUserBalance = function (email) {
        var target = String(email || '').toLowerCase();
        if (!target) {
            return Promise.resolve(0);
        }
        return Promise.all([
            window.findSellerByEmail(target),
            window.listAllRows('products'),
            window.listAllRows('withdrawals')
        ]).then(function (results) {
            var seller = results[0];
            var products = results[1] || [];
            var withdrawals = results[2] || [];
            var storeName = seller ? String(seller.store_name || '') : '';
            var mine = products.filter(function (p) {
                var sameEmail = String(p.seller_email || '').toLowerCase() === target;
                var sameStore = storeName !== '' && String(p.seller_name || '') === storeName;
                return sameEmail || sameStore;
            });
            var uids = mine.map(function (p) { return p.unique_id_txt; }).filter(function (u) { return !!u; });

            var salesPromise;
            if (!uids.length || !window.ServerFunction || typeof window.ServerFunction.call !== 'function') {
                salesPromise = Promise.resolve(0);
            } else {
                salesPromise = window.ServerFunction.call('seller_sales', { product_uids: uids }).then(function (r) {
                    return r && typeof r.totalSales !== 'undefined' ? Number(r.totalSales) : 0;
                }).catch(function () {
                    return 0;
                });
            }

            return salesPromise.then(function (totalSales) {
                var withdrawn = withdrawals.filter(function (w) {
                    return String(w.seller_email || '').toLowerCase() === target && String(w.status || '') !== 'مرفوض';
                }).reduce(function (sum, w) {
                    return sum + (Number(w.amount) || 0);
                }, 0);
                return Math.max(0, totalSales - withdrawn);
            });
        });
    };

    window.makeKey = function (prefix) {
        var chars = '0123456789abcdef';
        var suffix = '';
        for (var i = 0; i < 10; i += 1) {
            suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return prefix + '-' + suffix;
    };

    window.uploadToStorage = function (file, formEl) {
        if (!file || !window.PluginsSystem || typeof window.PluginsSystem.sendRequest !== 'function') {
            return Promise.resolve('');
        }
        return window.PluginsSystem.sendRequest('upload_file', { file: file }, formEl).then(function (response) {
            if (!response) {
                return '';
            }
            if (response.file_url) {
                return response.file_url;
            }
            if (response.url) {
                return response.url;
            }
            if (response.data && response.data.file_url) {
                return response.data.file_url;
            }
            if (response.data && response.data.url) {
                return response.data.url;
            }
            return '';
        }).catch(function () {
            return '';
        });
    };

    function initAccountWidget() {
        var widget = document.getElementById('accountWidget');
        var button = document.getElementById('accountWidgetButton');
        var menu = document.getElementById('accountWidgetMenu');
        if (!widget) {
            return;
        }

        var account = null;
        try {
            account = JSON.parse(window.localStorage.getItem('app_account') || 'null');
        } catch (e) {
            account = null;
        }
        if ((!account || !account.email) && typeof window.getUserEmail === 'function' && window.getUserEmail()) {
            account = { email: window.getUserEmail(), name: '', phone: '' };
        }

        if (!account || !account.email) {
            widget.classList.add('hidden');
            return;
        }

        widget.classList.remove('hidden');

        var email = String(account.email);
        var name = account.name || email.split('@')[0];

        var nameEl = document.getElementById('accountWidgetName');
        if (nameEl) {
            nameEl.textContent = name;
        }

        var balanceEl = document.getElementById('accountWidgetBalance');
        if (balanceEl) {
            balanceEl.setAttribute('data-currency-amount', '0');
            if (window.CurrencySystem && typeof window.CurrencySystem.format === 'function') {
                balanceEl.textContent = window.CurrencySystem.format(0);
            } else {
                balanceEl.textContent = '0.00';
            }
            if (typeof window.getUserBalance === 'function') {
                window.getUserBalance(email).then(function (balance) {
                    balanceEl.setAttribute('data-currency-amount', String(Number(balance) || 0));
                    if (window.CurrencySystem && typeof window.CurrencySystem.format === 'function') {
                        balanceEl.textContent = window.CurrencySystem.format(balance);
                    } else {
                        balanceEl.textContent = Number(balance || 0).toFixed(2);
                    }
                }).catch(function () { /* ignore */ });
            }
        }

        var badgeEl = document.getElementById('accountWidgetBadge');
        if (badgeEl) {
            badgeEl.textContent = '0';
        }

        var widgetAvatar = document.getElementById('accountWidgetAvatar');
        if (widgetAvatar && account.avatar) {
            widgetAvatar.src = account.avatar;
        }
        if (typeof window.findSellerByEmail === 'function') {
            window.findSellerByEmail(email).then(function (seller) {
                if (widgetAvatar && !account.avatar && seller && seller.logo) {
                    widgetAvatar.src = seller.logo;
                }
            }).catch(function () { /* ignore */ });
        }

        function setExpanded(isOpen) {
            if (!button) {
                return;
            }
            button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        function closeMenu() {
            if (!menu) {
                return;
            }
            menu.classList.add('hidden');
            setExpanded(false);
        }

        function openMenu() {
            if (!menu) {
                return;
            }
            menu.classList.remove('hidden');
            setExpanded(true);
        }

        if (button && menu) {
            button.addEventListener('click', function (event) {
                event.stopPropagation();
                if (menu.classList.contains('hidden')) {
                    openMenu();
                } else {
                    closeMenu();
                }
            });
        }

        document.addEventListener('click', function (event) {
            if (!menu || menu.classList.contains('hidden')) {
                return;
            }
            var target = event.target;
            if (target && target.closest && target.closest('#accountWidget')) {
                return;
            }
            closeMenu();
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });

        var logoutButton = document.getElementById('accountWidgetLogout');
        if (logoutButton) {
            logoutButton.addEventListener('click', function () {
                logoutButton.disabled = true;
                var token = typeof window.getSessionToken === 'function' ? window.getSessionToken() : '';
                var jobs = [];
                if (token && window.LoginSystem && typeof window.LoginSystem.logout === 'function') {
                    jobs.push(window.LoginSystem.logout(token).catch(function () { /* ignore */ }));
                }
                Promise.all(jobs).then(function () {
                    if (typeof window.clearSessionToken === 'function') {
                        window.clearSessionToken();
                    }
                    try {
                        window.localStorage.removeItem('app_account');
                    } catch (e) { /* ignore */ }
                    window.location.href = 'account.html';
                });
            });
        }
    }

    initAccountWidget();

    window.currentUserEmail = function () {
        var account = null;
        try {
            account = JSON.parse(window.localStorage.getItem('app_account') || 'null');
        } catch (e) {
            account = null;
        }
        if (account && account.email) {
            return String(account.email);
        }
        try {
            return window.localStorage.getItem('app_user_email') || '';
        } catch (e) {
            return '';
        }
    };

    window.findAdminByEmail = function (email) {
        var target = String(email || '').toLowerCase();
        if (!target) {
            return Promise.resolve(null);
        }
        return window.listAllRows('admins').then(function (rows) {
            var found = null;
            rows.forEach(function (row) {
                if (row.active === false) {
                    return;
                }
                if (String(row.email || '').toLowerCase() === target) {
                    found = row;
                }
            });
            return found;
        });
    };

    window.findBanByEmail = function (email) {
        var target = String(email || '').toLowerCase();
        if (!target) {
            return Promise.resolve(null);
        }
        return Promise.all([
            window.listAllRows('accounts'),
            window.listAllRows('sellers')
        ]).then(function (results) {
            var found = null;
            (results[0] || []).forEach(function (row) {
                if (String(row.email || '').toLowerCase() === target && row.banned === true) {
                    found = { role: 'buyer', reason: row.ban_reason || '' };
                }
            });
            (results[1] || []).forEach(function (row) {
                if (String(row.email || '').toLowerCase() === target && row.banned === true) {
                    found = { role: 'seller', reason: row.ban_reason || '' };
                }
            });
            return found;
        });
    };

    function initAdminLinks() {
        var links = document.querySelectorAll('.nav-admin-link');
        if (!links.length) {
            return;
        }
        var email = window.currentUserEmail();
        if (!email) {
            return;
        }
        window.findAdminByEmail(email).then(function (admin) {
            if (!admin) {
                return;
            }
            links.forEach(function (link) {
                link.classList.remove('hidden');
                if (link.classList.contains('nav-admin-link-mobile')) {
                    link.classList.add('flex');
                }
            });
        }).catch(function () { /* ignore */ });
    }

    initAdminLinks();
});
