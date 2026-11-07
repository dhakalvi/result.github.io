
/*
 * USERNAME + PIN SECURITY GATE
 * Credential source: Database/user.json
 * Authentication duration: 8 Hours
 */

(function () {
    "use strict";

    const USER_FILE = "http://shivanp.com.np/Database/user.json";

    const AUTH_KEY = "html_user_pin_gate_auth";

    const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

    // Check existing authentication
    try {
        const saved = JSON.parse(
            localStorage.getItem(AUTH_KEY) || "null"
        );

        if (
            saved &&
            saved.verifiedAt &&
            Date.now() - saved.verifiedAt < EIGHT_HOURS_MS
        ) {
            return;
        }

        localStorage.removeItem(AUTH_KEY);

    } catch (e) {}

    // Security screen styling
    const style = document.createElement("style");

    style.textContent = `
        body > * {
            visibility: hidden !important;
        }

        #userPinGate {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: #101827;
            font-family: Arial, sans-serif;
            visibility: visible !important;
        }

        #userPinGate * {
            box-sizing: border-box;
            visibility: visible !important;
        }

        .gate-card {
            width: 100%;
            max-width: 390px;
            padding: 30px;
            background: #fff;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 40px #0005;
        }

        .gate-card h2 {
            margin: 0 0 8px;
            color: #172033;
        }

        .gate-card p {
            color: #64748b;
        }

        .gate-field {
            display: block;
            width: 100%;
            height: 48px;
            margin: 12px 0;
            padding: 0 13px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 16px;
        }

        #gateSubmit {
            width: 100%;
            padding: 13px;
            border: 0;
            border-radius: 8px;
            background: #2563eb;
            color: white;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        }

        #gateSubmit:disabled {
            opacity: .65;
            cursor: wait;
        }

        #gateMessage {
            min-height: 22px;
            margin-top: 12px;
            font-size: 14px;
        }

        #gateMessage.error {
            color: #dc2626;
        }

        #gateMessage.info {
            color: #475569;
        }
    `;

    document.head.appendChild(style);

    // Create login screen
    const overlay = document.createElement("div");

    overlay.id = "userPinGate";

    overlay.innerHTML = `
        <div class="gate-card">

            <h2>User Verification</h2>

            <p>
                यो फाइल खोल्न Username र PIN
                प्रविष्ट गर्नुहोस्।
            </p>

            <form id="gateForm" autocomplete="on">

                <input
                    class="gate-field"
                    id="gateUsername"
                    type="text"
                    placeholder="Username"
                    autocomplete="username"
                    required
                >

                <input
                    class="gate-field"
                    id="gatePin"
                    type="password"
                    placeholder="PIN"
                    inputmode="numeric"
                    autocomplete="current-password"
                    required
                >

                <button
                    id="gateSubmit"
                    type="submit"
                >
                    Verify & Unlock
                </button>

            </form>

            <div
                id="gateMessage"
                role="alert"
                aria-live="polite"
            ></div>

        </div>
    `;

    document.documentElement.appendChild(overlay);

    // Get elements
    const form = document.getElementById("gateForm");

    const usernameInput =
        document.getElementById("gateUsername");

    const pinInput =
        document.getElementById("gatePin");

    const submitButton =
        document.getElementById("gateSubmit");

    const message =
        document.getElementById("gateMessage");

    // Display messages
    function showMessage(text, type) {

        message.textContent = text;

        message.className = type || "";

    }

    usernameInput.focus();

    // Username and PIN verification
    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        const enteredUsername =
            usernameInput.value.trim();

        const enteredPin =
            pinInput.value.trim();

        if (!enteredUsername || !enteredPin) {

            showMessage(
                "कृपया Username र PIN दुवै प्रविष्ट गर्नुहोस्।",
                "error"
            );

            return;
        }

        submitButton.disabled = true;

        showMessage(
            "प्रमाणीकरण हुँदैछ...",
            "info"
        );

        try {

            // Read JSON database
            const response = await fetch(
                USER_FILE,
                { cache: "no-store" }
            );

            if (!response.ok) {

                throw new Error(
                    "Credential file could not be loaded."
                );

            }

            const userData = await response.json();

            const validUsername =
                String(userData.Username ?? "");

            const validPin =
                String(userData.Pin ?? "");

            // Verify credentials
            if (
                enteredUsername === validUsername &&
                enteredPin === validPin
            ) {

                // Save authentication for 8 hours
                try {

                    localStorage.setItem(
                        AUTH_KEY,
                        JSON.stringify({
                            verifiedAt: Date.now()
                        })
                    );

                } catch (storageError) {}

                // Unlock protected page
                overlay.remove();

                style.remove();

                return;

            } else {

                // Invalid credentials warning
                showMessage(
                    "गलत Username वा PIN! कृपया पुनः प्रयास गर्नुहोस्।",
                    "error"
                );

                pinInput.value = "";

                pinInput.focus();

            }

        } catch (error) {

            showMessage(
                "प्रमाणीकरण फाइल पढ्न सकिएन। Database/user.json को path र server जाँच गर्नुहोस्।",
                "error"
            );

        } finally {

            submitButton.disabled = false;

        }

    });

})();
