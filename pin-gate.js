
/*
  SIX DIGIT MULTI-PIN SECURITY GATE
  Configure your PINs in ALLOWED_PINS.
*/

(function () {
    "use strict";

    // आफ्नो ६ अङ्कका PIN यहाँ राख्नुहोस्
    const ALLOWED_PINS = [
        "123456",
        "246810",
        "908172",
        "456789",
        "112233"
    ];

    const SESSION_KEY = "html_pin_gate_authorized";

    // PIN validation
    const validPins = new Set(
        ALLOWED_PINS.map(String).filter(pin => /^\d{6}$/.test(pin))
    );

    if (validPins.size === 0) {
        alert("No valid six-digit PIN configured!");
        return;
    }

    // Already verified in this browser session?
    try {
        if (sessionStorage.getItem(SESSION_KEY) === "yes") {
            return;
        }
    } catch (e) {}

    // Hide original page
    const style = document.createElement("style");
    style.textContent = `
        body > * {
            visibility: hidden !important;
        }

        #pinGateOverlay {
            position: fixed;
            inset: 0;
            z-index: 999999999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #101827;
            font-family: Arial, sans-serif;
            visibility: visible !important;
        }

        #pinGateOverlay * {
            box-sizing: border-box;
            visibility: visible !important;
        }

        .pin-card {
            width: 90%;
            max-width: 380px;
            padding: 30px;
            background: white;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 40px #0005;
        }

        .pin-card h2 {
            margin-top: 0;
            color: #172033;
        }

        .pin-card p {
            color: #64748b;
        }

        #pinInput {
            width: 100%;
            height: 52px;
            margin: 15px 0;
            text-align: center;
            font-size: 25px;
            letter-spacing: 8px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
        }

        #pinSubmit {
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

        #pinError {
            color: #dc2626;
            min-height: 20px;
            margin-top: 12px;
            font-size: 14px;
        }
    `;

    document.head.appendChild(style);

    // Create PIN screen
    const overlay = document.createElement("div");
    overlay.id = "pinGateOverlay";

    overlay.innerHTML = `
        <div class="pin-card">
            <h2>PIN Verification</h2>
            <p>यो HTML फाइल खोल्न ६ अङ्कको PIN राख्नुहोस्।</p>

            <form id="pinForm">
                <input
                    type="password"
                    id="pinInput"
                    placeholder="••••••"
                    maxlength="6"
                    inputmode="numeric"
                    autocomplete="off"
                    required
                >

                <button type="submit" id="pinSubmit">
                    Unlock
                </button>
            </form>

            <div id="pinError"></div>
        </div>
    `;

    document.documentElement.appendChild(overlay);

    const form = document.getElementById("pinForm");
    const input = document.getElementById("pinInput");
    const error = document.getElementById("pinError");

    input.focus();

    input.addEventListener("input", function () {
        this.value = this.value.replace(/\D/g, "").slice(0, 6);
        error.textContent = "";
    });

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const enteredPIN = input.value;

        if (!/^\d{6}$/.test(enteredPIN)) {
            error.textContent = "कृपया ६ अङ्कको PIN राख्नुहोस्।";
            return;
        }

        if (validPins.has(enteredPIN)) {

            // Remember successful verification for this tab session
            try {
                sessionStorage.setItem(SESSION_KEY, "yes");
            } catch (e) {}

            overlay.remove();
            style.remove();

        } else {
            error.textContent = "गलत PIN! फेरि प्रयास गर्नुहोस्।";
            input.value = "";
            input.focus();
        }
    });

})();
