/*
 * OFFLINE HTML + JSON AUTHENTICATION
 *
 * JSON DATABASE: user.json (must be served over http:// or https://)
 * Authentication Validity: 8 Hours
 */

(function () {
    "use strict";

    const USER_FILE = "user_1.json";

    const AUTH_KEY = "html_user_pin_gate_auth";
    const EIGHT_HOURS = 8 * 60 * 60 * 1000;

    // =================================
    // CHECK PREVIOUS AUTHENTICATION
    // =================================

    try {
        const saved = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");

        if (saved && Number.isFinite(saved.verifiedAt)) {
            const elapsed = Date.now() - saved.verifiedAt;

            if (elapsed >= 0 && elapsed < EIGHT_HOURS) {
                return; // Already verified, do not show gate
            }
        }

        localStorage.removeItem(AUTH_KEY);
    } catch (error) {
        // Continue with fresh verification
    }

    // =================================
    // CREATE LOGIN SCREEN
    // =================================

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
            background: white;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 40px #0005;
        }

        .gate-card h2 {
            color: #172033;
            margin-top: 0;
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
            border: none;
            border-radius: 8px;
            background: #2563eb;
            color: white;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        }

        #gateSubmit:disabled {
            opacity: 0.6;
            cursor: wait;
        }

        #gateMessage {
            min-height: 22px;
            margin-top: 12px;
            font-size: 14px;
        }

        #gateMessage.error { color: #dc2626; }
        #gateMessage.success { color: #16a34a; }
        #gateMessage.info { color: #475569; }
    `;

    document.head.appendChild(style);

    // =================================
    // LOGIN FORM
    // =================================

    const overlay = document.createElement("div");
    overlay.id = "userPinGate";

    overlay.innerHTML = `
        <div class="gate-card">
            <h2>User Verification</h2>
            <p>यो फाइल खोल्न Username र PIN प्रविष्ट गर्नुहोस्।</p>
            <form id="gateForm">
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
                <button type="submit" id="gateSubmit">Verify & Unlock</button>
            </form>
            <div id="gateMessage" role="alert" aria-live="polite"></div>
        </div>
    `;

    document.documentElement.appendChild(overlay);

    // =================================
    // GET FORM ELEMENTS
    // =================================

    const form = document.getElementById("gateForm");
    const usernameInput = document.getElementById("gateUsername");
    const pinInput = document.getElementById("gatePin");
    const submitButton = document.getElementById("gateSubmit");
    const message = document.getElementById("gateMessage");

    function showMessage(text, type) {
        message.textContent = text;
        message.className = type || "";
    }

    usernameInput.focus();

    // =================================
    // USERNAME + PIN VERIFICATION
    // =================================

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const enteredUsername = usernameInput.value.trim();
        const enteredPin = pinInput.value.trim();

        if (!enteredUsername || !enteredPin) {
            showMessage("कृपया Username र PIN दुवै राख्नुहोस्।", "error");
            return;
        }

        // Browsers block fetch() on file:// pages
        if (window.location.protocol === "file:") {
            showMessage(
                "यो पेज file:// बाट खोलिएको छ। कृपया local server मार्फत खोल्नुहोस् (जस्तै: python -m http.server)।",
                "error"
            );
            return;
        }

        submitButton.disabled = true;
        showMessage("Database जाँच हुँदैछ...", "info");

        try {
            const response = await fetch(USER_FILE, { cache: "no-store" });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }

            const userArray = await response.json();

            if (!Array.isArray(userArray)) {
                throw new Error("Invalid JSON format: expected an array.");
            }

            const matchedUser = userArray.find(
                (user) =>
                    String(user.Username) === enteredUsername &&
                    String(user.Pin) === enteredPin
            );

            if (matchedUser) {
                try {
                    localStorage.setItem(
                        AUTH_KEY,
                        JSON.stringify({ verifiedAt: Date.now() })
                    );
                } catch (storageError) {
                    console.warn("LocalStorage unavailable.");
                }

                showMessage("Verification Successful!", "success");

                overlay.remove();
                style.remove();
                return;
            } else {
                showMessage("गलत Username वा PIN! पुनः प्रयास गर्नुहोस्।", "error");
                pinInput.value = "";
                pinInput.focus();
            }
        } catch (error) {
            console.error("Authentication Error:", error);
            showMessage(`जाँच गर्न सकिएन: ${error.message}`, "error");
        } finally {
            submitButton.disabled = false;
        }
    });
})();