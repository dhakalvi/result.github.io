
/*
 * USER PIN GATE + RENEWAL / EXPIRY MANAGEMENT
 * JSON FILE: user_1.json
 * LOGIN SESSION: 8 HOURS
 */

(function () {
    "use strict";

    const USER_FILE = "user_1.json";
    const AUTH_KEY = "html_user_pin_gate_auth";
    const REMINDER_CLOSED_KEY = AUTH_KEY + "_reminder_closed_for";

    const SESSION_MS = 8 * 60 * 60 * 1000;
    const WARNING_DAYS = 15;

    const WHATSAPP = "9779867026254";
    const EMAIL = "dhakalvi@gmail.com";

    let overlay;
    let messageBox;
    let contactBox;
    let submitButton;
    let usernameInput;
    let pinInput;

    // ==========================================
    // DATE FUNCTIONS
    // ==========================================

    function parseDate(value) {
        if (typeof value !== "string") return null;

        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

        if (!m) return null;

        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);

        const date = new Date(y, mo - 1, d);

        return (
            date.getFullYear() === y &&
            date.getMonth() === mo - 1 &&
            date.getDate() === d
        ) ? date : null;
    }

    function todayLocal() {
        const n = new Date();

        return new Date(
            n.getFullYear(),
            n.getMonth(),
            n.getDate()
        );
    }

    function dateISO(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function dateLabel(date) {
        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);
    }

    function dayDifference(from, to) {
        const a = Date.UTC(
            from.getFullYear(),
            from.getMonth(),
            from.getDate()
        );

        const b = Date.UTC(
            to.getFullYear(),
            to.getMonth(),
            to.getDate()
        );

        return Math.round((b - a) / 86400000);
    }

    function addMonths(date, count) {
        const first = new Date(
            date.getFullYear(),
            date.getMonth() + count,
            1
        );

        const lastDay = new Date(
            first.getFullYear(),
            first.getMonth() + 1,
            0
        ).getDate();

        return new Date(
            first.getFullYear(),
            first.getMonth(),
            Math.min(date.getDate(), lastDay)
        );
    }

    // ==========================================
    // RENEWAL PERIOD OPTIONS
    // ==========================================

    function periodInfo(value) {

        const p = String(value || "")
            .trim()
            .toLowerCase();

        const map = {

            "3 days": { days: 3 },
            "3 day": { days: 3 },
            "३ दिन": { days: 3 },

            "1 month": { months: 1 },
            "one month": { months: 1 },
            "१ महिना": { months: 1 },
            "एक महिना": { months: 1 },

            "3 months": { months: 3 },
            "three months": { months: 3 },
            "३ महिना": { months: 3 },
            "तीन महिना": { months: 3 },

            "6 months": { months: 6 },
            "six months": { months: 6 },
            "६ महिना": { months: 6 },
            "छ महिना": { months: 6 },

            "1 year": { months: 12 },
            "one year": { months: 12 },
            "१ वर्ष": { months: 12 },
            "एक वर्ष": { months: 12 },

            "5 years": { months: 60 },
            "five years": { months: 60 },
            "५ वर्ष": { months: 60 },
            "पाँच वर्ष": { months: 60 },

            "unlimited": { unlimited: true },
            "अनलिमिटेड": { unlimited: true }

        };

        return map[p] || null;
    }

    // ==========================================
    // SUBSCRIPTION CALCULATION
    // ==========================================

    function getSubscription(user) {

        const periodValue =
            user.RenewalPeriod ||
            user.RenewPeriod ||
            user.Duration ||
            "";

        const renewValue =
            user.RenewDate ||
            user.RenewedAt ||
            user.StartDate ||
            "";

        const period = periodInfo(periodValue);

        // Old JSON records without renewal information
        // will continue as Unlimited.

        if (!periodValue && !renewValue && !user.ExpiryDate) {

            return {
                unlimited: true,
                label: "Unlimited"
            };
        }

        // Manually entered expiry date

        if (!periodValue && user.ExpiryDate) {

            const manualExpiry = parseDate(
                String(user.ExpiryDate)
            );

            if (!manualExpiry) {
                return {
                    error: "ExpiryDate लाई YYYY-MM-DD ढाँचामा राख्नुहोस्।"
                };
            }

            const today = todayLocal();

            return {
                unlimited: false,
                expiry: manualExpiry,
                remaining: dayDifference(today, manualExpiry),
                expired: today.getTime() > manualExpiry.getTime(),
                label: "Custom Expiry"
            };
        }

        if (!period) {
            return {
                error: "JSON मा RenewalPeriod को मान मिलेन।"
            };
        }

        if (period.unlimited) {
            return {
                unlimited: true,
                label: "Unlimited"
            };
        }

        const renewDate = parseDate(String(renewValue));

        if (!renewDate) {
            return {
                error: "RenewDate लाई YYYY-MM-DD ढाँचामा राख्नुहोस्।"
            };
        }

        // Automatically calculate ExpiryDate.

        const expiry = period.days
            ? new Date(
                renewDate.getFullYear(),
                renewDate.getMonth(),
                renewDate.getDate() + period.days
            )
            : addMonths(renewDate, period.months);

        const today = todayLocal();

        return {

            unlimited: false,

            renewDate: renewDate,

            expiry: expiry,

            expiryISO: dateISO(expiry),

            remaining: dayDifference(today, expiry),

            expired: today.getTime() > expiry.getTime(),

            label: String(periodValue)

        };
    }

    // ==========================================
    // LOAD JSON DATABASE
    // ==========================================

    async function loadUsers() {

        if (location.protocol === "file:") {

            throw new Error(
                "HTML लाई file:// बाट होइन, local server वा hosting बाट खोल्नुहोस्।"
            );
        }

        const response = await fetch(USER_FILE, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `JSON फाइल पढ्न सकिएन: HTTP ${response.status}`
            );
        }

        const data = await response.json();

        // Supports single JSON object and JSON array.

        const users = Array.isArray(data) ? data : [data];

        if (
            !users.length ||
            users.some(u =>
                !u ||
                typeof u !== "object" ||
                Array.isArray(u)
            )
        ) {
            throw new Error("JSON संरचना मिलेन।");
        }

        return users;
    }

    function findUser(users, username, pin) {

        return users.find(u =>
            String(u.Username || "").trim() === username &&
            String(u.Pin || "").trim() === pin
        );
    }

    function findUsername(users, username) {

        return users.find(u =>
            String(u.Username || "").trim() === username
        );
    }

    // ==========================================
    // CSS DESIGN
    // ==========================================

    function addStyles() {

        const style = document.createElement("style");

        style.id = "userPinGateStyles";

        style.textContent = `

            body > * {
                visibility: hidden !important;
            }

            #userPinGate,
            #subscriptionReminder {
                visibility: visible !important;
                font-family: Arial, sans-serif;
            }

            #userPinGate {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                overflow: auto;
                background: radial-gradient(
                    circle at top left,
                    #263f70,
                    #101827 60%
                );
            }

            #userPinGate * {
                box-sizing: border-box;
                visibility: visible !important;
            }

            .gate-card {
                width: 100%;
                max-width: 410px;
                padding: 30px;
                border-radius: 18px;
                background: #fff;
                text-align: center;
                box-shadow: 0 24px 70px #0005;
            }

            .gate-logo {
                width: 54px;
                height: 54px;
                margin: 0 auto 14px;
                display: grid;
                place-items: center;
                border-radius: 16px;
                color: #fff;
                background: linear-gradient(
                    135deg,
                    #2563eb,
                    #4f46e5
                );
                font-size: 26px;
                font-weight: bold;
            }

            .gate-card h2 {
                margin: 0 0 9px;
                color: #172033;
                font-size: 23px;
            }

            .gate-intro {
                margin: 0 0 20px;
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
            }

            .gate-field {
                display: block;
                width: 100%;
                height: 49px;
                margin: 12px 0;
                padding: 0 14px;
                border: 1px solid #cbd5e1;
                border-radius: 9px;
                outline: none;
                font-size: 16px;
            }

            .gate-field:focus {
                border-color: #2563eb;
                box-shadow: 0 0 0 3px #2563eb20;
            }

            #gateSubmit {
                width: 100%;
                margin-top: 7px;
                padding: 14px;
                border: 0;
                border-radius: 9px;
                background: linear-gradient(
                    135deg,
                    #2563eb,
                    #4f46e5
                );
                color: white;
                font-size: 15px;
                font-weight: bold;
                cursor: pointer;
            }

            #gateSubmit:disabled {
                opacity: .6;
                cursor: wait;
            }

            #gateMessage {
                min-height: 22px;
                margin-top: 14px;
                font-size: 14px;
                line-height: 1.6;
            }

            #gateMessage.error {
                color: #dc2626;
            }

            #gateMessage.success {
                color: #16a34a;
            }

            #gateMessage.info {
                color: #475569;
            }

            .gate-contact {
                margin-top: 13px;
                padding: 13px;
                border: 1px solid #fecaca;
                border-radius: 10px;
                background: #fff7f7;
                color: #7f1d1d;
                font-size: 13px;
                line-height: 1.9;
                text-align: left;
            }

            .gate-contact a,
            #subscriptionReminder a {
                color: #1d4ed8;
                font-weight: bold;
                text-decoration: none;
            }

            /* RENEWAL REMINDER POPUP */

            #subscriptionReminder {
                position: fixed;
                z-index: 2147483646;
                top: 18px;
                right: 18px;
                width: min(410px, calc(100vw - 36px));
                padding: 20px 21px 18px;
                border: 1px solid #fed7aa;
                border-left: 5px solid #f59e0b;
                border-radius: 14px;
                background: #fff;
                color: #334155;
                box-shadow: 0 14px 45px #0f172a38;
                animation: renewSlide .25s ease-out;
            }

            #subscriptionReminder * {
                box-sizing: border-box;
                visibility: visible !important;
            }

            .renew-close {
                position: absolute;
                top: 7px;
                right: 9px;
                width: 30px;
                height: 30px;
                border: 0;
                border-radius: 7px;
                background: transparent;
                color: #64748b;
                font-size: 24px;
                cursor: pointer;
            }

            .renew-close:hover {
                background: #f1f5f9;
            }

            #subscriptionReminder h3 {
                margin: 0 30px 8px 0;
                color: #9a3412;
                font-size: 17px;
            }

            #subscriptionReminder p {
                margin: 7px 0;
                font-size: 13px;
                line-height: 1.6;
            }

            .renew-date {
                color: #0f172a;
                font-weight: bold;
            }

            .renew-contact {
                margin-top: 12px !important;
                padding-top: 10px;
                border-top: 1px solid #f1f5f9;
            }

            @keyframes renewSlide {
                from {
                    opacity: 0;
                    transform: translateY(-8px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @media(max-width:480px) {

                .gate-card {
                    padding: 24px 19px;
                }

                #subscriptionReminder {
                    top: 10px;
                    right: 10px;
                    width: calc(100vw - 20px);
                }
            }
        `;

        document.head.appendChild(style);
    }

    // ==========================================
    // LOGIN SCREEN
    // ==========================================

    function showGate(initialText, initialType, showContact) {

        overlay = document.createElement("div");

        overlay.id = "userPinGate";

        overlay.innerHTML = `

            <div class="gate-card">

                <div class="gate-logo">✓</div>

                <h2>User Verification</h2>

                <p class="gate-intro">
                    यो सफ्टवेयर खोल्न Username र PIN प्रविष्ट गर्नुहोस्।
                </p>

                <form id="gateForm" autocomplete="on">

                    <input
                        class="gate-field"
                        id="gateUsername"
                        type="text"
                        placeholder="Enter Username"
                        autocomplete="username"
                        required
                    >

                    <input
                        class="gate-field"
                        id="gatePin"
                        type="password"
                        placeholder="Enter PIN"
                        autocomplete="current-password"
                        required
                    >

                    <button
                        type="submit"
                        id="gateSubmit"
                    >
                        Verify &amp; Unlock
                    </button>

                </form>

                <div
                    id="gateMessage"
                    role="alert"
                    aria-live="polite"
                ></div>

                <div
                    id="gateContact"
                    class="gate-contact"
                    hidden
                >
                    <strong>
                        Renewal / नवीकरणका लागि सम्पर्क:
                    </strong>

                    <br>

                    WhatsApp:

                    <a
                        href="https://wa.me/${WHATSAPP}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        +977 9867026254
                    </a>

                    <br>

                    Email:

                    <a href="mailto:${EMAIL}">
                        ${EMAIL}
                    </a>

                </div>

            </div>
        `;

        document.documentElement.appendChild(overlay);

        usernameInput = document.getElementById("gateUsername");
        pinInput = document.getElementById("gatePin");
        submitButton = document.getElementById("gateSubmit");
        messageBox = document.getElementById("gateMessage");
        contactBox = document.getElementById("gateContact");

        if (initialText) {
            setMessage(initialText, initialType || "info", !!showContact);
        }

        usernameInput.focus();

        document.getElementById("gateForm")
            .addEventListener("submit", login);
    }

    function setMessage(text, type, showContact) {

        if (messageBox) {
            messageBox.textContent = text;
            messageBox.className = type || "";
        }

        if (contactBox) {
            contactBox.hidden = !showContact;
        }
    }

    // ==========================================
    // RENEWAL REMINDER POPUP
    // ==========================================

    function showReminder(subscription, sessionTime) {

        if (
            !subscription ||
            subscription.unlimited ||
            subscription.error ||
            subscription.expired ||
            subscription.remaining > WARNING_DAYS
        ) {
            return;
        }

        // Do not show again in the same login session
        // after the user closes the popup.

        try {
            if (
                localStorage.getItem(REMINDER_CLOSED_KEY) ===
                String(sessionTime)
            ) {
                return;
            }
        } catch (e) {}

        const popup = document.createElement("div");

        popup.id = "subscriptionReminder";

        popup.setAttribute("role", "status");

        popup.innerHTML = `

            <button
                type="button"
                class="renew-close"
                aria-label="Close reminder"
                title="Close"
            >
                ×
            </button>

            <h3>
                Subscription Renewal Reminder
            </h3>

            <p class="renew-message"></p>

            <p class="renew-date"></p>

            <p class="renew-contact">

                <strong>
                    Renewal का लागि सम्पर्क गर्नुहोस्:
                </strong>

                <br>

                WhatsApp:

                <a
                    href="https://wa.me/${WHATSAPP}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    +977 9867026254
                </a>

                <br>

                Email:

                <a href="mailto:${EMAIL}">
                    ${EMAIL}
                </a>

            </p>
        `;

        const remainingText = subscription.remaining === 0

            ? "तपाईंको सदस्यताको म्याद आज समाप्त हुँदैछ। कृपया समयमै renew गर्नुहोस्।"

            : `तपाईंको सदस्यताको म्याद सकिन अब ${subscription.remaining} दिन बाँकी छ। सेवा निरन्तर प्रयोग गर्न कृपया renew गर्नुहोस्।`;

        popup.querySelector(".renew-message").textContent =
            remainingText;

        popup.querySelector(".renew-date").textContent =
            "Expiry Date: " + dateLabel(subscription.expiry);

        // Close button

        popup.querySelector(".renew-close")
            .addEventListener("click", function () {

                try {
                    localStorage.setItem(
                        REMINDER_CLOSED_KEY,
                        String(sessionTime)
                    );
                } catch (e) {}

                popup.remove();
            });

        document.documentElement.appendChild(popup);
    }

    // ==========================================
    // LOGIN SESSION
    // ==========================================

    function saveSession(username) {

        const session = {
            username: username,
            verifiedAt: Date.now()
        };

        try {
            localStorage.setItem(
                AUTH_KEY,
                JSON.stringify(session)
            );
        } catch (e) {}

        return session;
    }

    function unlock(user, subscription, sessionTime) {

        if (overlay) {
            overlay.remove();
        }

        const style = document.getElementById("userPinGateStyles");

        if (style) {
            style.remove();
        }

        showReminder(subscription, sessionTime);

        monitorExpiry(subscription);
    }

    // ==========================================
    // AUTOMATIC EXPIRY MONITORING
    // ==========================================

    function monitorExpiry(subscription) {

        if (
            !subscription ||
            subscription.unlimited ||
            !subscription.expiry
        ) {
            return;
        }

        function check() {

            if (
                todayLocal().getTime() >
                subscription.expiry.getTime()
            ) {

                try {
                    localStorage.removeItem(AUTH_KEY);
                } catch (e) {}

                window.location.reload();

                return;
            }

            window.setTimeout(check, 60000);
        }

        window.setTimeout(check, 60000);
    }

    // ==========================================
    // USER LOGIN
    // ==========================================

    async function login(event) {

        event.preventDefault();

        const username = usernameInput.value.trim();
        const pin = pinInput.value.trim();

        if (!username || !pin) {

            setMessage(
                "कृपया Username र PIN दुवै राख्नुहोस्।",
                "error",
                false
            );

            return;
        }

        submitButton.disabled = true;

        setMessage(
            "Database जाँच हुँदैछ...",
            "info",
            false
        );

        try {

            const users = await loadUsers();

            const user = findUser(users, username, pin);

            if (!user) {

                setMessage(
                    "गलत Username वा PIN! पुनः प्रयास गर्नुहोस्।",
                    "error",
                    false
                );

                pinInput.value = "";
                pinInput.focus();

                return;
            }

            // Check subscription

            const subscription = getSubscription(user);

            if (subscription.error) {

                setMessage(
                    subscription.error,
                    "error",
                    false
                );

                return;
            }

            // Block expired users

            if (
                !subscription.unlimited &&
                subscription.expired
            ) {

                setMessage(
                    `तपाईंको सदस्यताको म्याद ${dateLabel(subscription.expiry)} मा समाप्त भएको छ। Login गर्नुअघि renewal गर्नुहोस्।`,
                    "error",
                    true
                );

                pinInput.value = "";

                return;
            }

            // Successful login

            const session = saveSession(username);

            setMessage(
                "Verification Successful!",
                "success",
                false
            );

            unlock(
                user,
                subscription,
                session.verifiedAt
            );

        } catch (error) {

            console.error("Authentication error:", error);

            setMessage(
                "Database जाँच गर्न सकिएन: " + error.message,
                "error",
                false
            );

        } finally {

            if (
                submitButton &&
                document.body.contains(submitButton)
            ) {
                submitButton.disabled = false;
            }
        }
    }

    // ==========================================
    // STARTUP
    // CHECK EXISTING 8-HOUR SESSION
    // ==========================================

    async function start() {

        addStyles();

        let session = null;

        try {

            session = JSON.parse(
                localStorage.getItem(AUTH_KEY) || "null"
            );

            if (
                !session ||
                typeof session.username !== "string" ||
                !Number.isFinite(session.verifiedAt) ||
                Date.now() < session.verifiedAt ||
                Date.now() - session.verifiedAt >= SESSION_MS
            ) {

                session = null;

                localStorage.removeItem(AUTH_KEY);
            }

        } catch (e) {

            session = null;
        }

        try {

            const users = await loadUsers();

            // Existing session

            if (session) {

                const user = findUsername(
                    users,
                    session.username
                );

                if (user) {

                    const subscription = getSubscription(user);

                    // Valid subscription

                    if (
                        !subscription.error &&
                        (
                            subscription.unlimited ||
                            !subscription.expired
                        )
                    ) {

                        unlock(
                            user,
                            subscription,
                            session.verifiedAt
                        );

                        return;
                    }

                    try {
                        localStorage.removeItem(AUTH_KEY);
                    } catch (e) {}

                    // Expired subscription

                    if (subscription.expired) {

                        showGate(
                            `तपाईंको सदस्यताको म्याद ${dateLabel(subscription.expiry)} मा समाप्त भएको छ। कृपया renewal गर्नुहोस्।`,
                            "error",
                            true
                        );

                        return;
                    }

                    if (subscription.error) {

                        showGate(
                            subscription.error,
                            "error",
                            false
                        );

                        return;
                    }
                } else {

                    try {
                        localStorage.removeItem(AUTH_KEY);
                    } catch (e) {}
                }
            }

            // Show fresh login screen

            showGate();

        } catch (error) {

            showGate(
                "Database जाँच गर्न सकिएन: " + error.message,
                "error",
                false
            );
        }
    }

    // START SYSTEM

    start();

})();
