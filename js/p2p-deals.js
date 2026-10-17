/* ========================================================
   css/p2p-deals.css — СТИЛИ ДКП МЕЖДУ ИГРОКАМИ (v1.0.0)
   Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
   ⭐ v1.0.0 (SPRINT 1):
   - Стили для модалки #modalP2PDKP
   - Двойные подписи с анимацией появления
   - Редактируемое поле цены
   - Печать МРЭО с анимацией approve
   - Цветной статус-баннер (drafting / buyer_signed / seller_signed / completed)
   - Таймер обратного отсчёта
   - Адаптив для маленьких экранов
   ======================================================== */

/* ========================================================
   1. КОНТЕЙНЕР МОДАЛКИ
   ======================================================== */
#modalP2PDKP.modal-overlay {
    z-index: 5600 !important;
}

#modalP2PDKP .modal-box.dkp-official-blank {
    background:
        repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.008) 0px, rgba(255, 255, 255, 0.008) 1px, transparent 1px, transparent 3px),
        linear-gradient(145deg, #0e1729 0%, #05080f 100%) !important;
    border: 2px solid rgba(0, 242, 254, 0.5) !important;
    box-shadow:
        0 25px 60px rgba(0, 0, 0, 0.95),
        0 0 25px rgba(0, 242, 254, 0.2),
        inset 0 0 30px rgba(0, 242, 254, 0.03) !important;
    padding: 12px !important;
    max-width: 440px !important;
    position: relative;
    overflow: hidden;
}

/* Водяной знак в фоне */
#modalP2PDKP .modal-box.dkp-official-blank::before {
    content: 'ДКП P2P';
    position: absolute;
    font-size: 72px;
    font-weight: 900;
    color: rgba(0, 242, 254, 0.025);
    transform: rotate(-28deg);
    top: 35%;
    left: -15%;
    pointer-events: none;
    letter-spacing: 6px;
    z-index: 0;
    font-family: 'Courier New', monospace;
}

/* ========================================================
   2. ШАПКА МОДАЛКИ
   ======================================================== */
#modalP2PDKP .dkp-header {
    position: relative;
    z-index: 2;
    padding-bottom: 10px;
    border-bottom: 2px double rgba(0, 242, 254, 0.5);
    margin-bottom: 12px;
}

#modalP2PDKP .dkp-title-small {
    font-size: 8px;
    font-weight: 800;
    color: #94a3b8;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    line-height: 1.2;
}

#modalP2PDKP .dkp-title-main {
    font-size: 14px;
    font-weight: 900;
    color: #fff;
    letter-spacing: 1.4px;
    text-shadow: 0 0 12px rgba(0, 242, 254, 0.5);
    margin: 4px 0;
}

#modalP2PDKP .dkp-contract-num {
    display: inline-block;
    font-size: 9.5px;
    font-family: 'Courier New', monospace;
    color: #cbd5e1;
    background: rgba(0, 242, 254, 0.1);
    border: 1px solid rgba(0, 242, 254, 0.35);
    padding: 3px 10px;
    border-radius: 5px;
    letter-spacing: 0.7px;
    margin-top: 2px;
}

#modalP2PDKP .dkp-contract-num b {
    color: #00f2fe;
    text-shadow: 0 0 6px rgba(0, 242, 254, 0.6);
}

#modalP2PDKP .dkp-flag-row {
    display: flex;
    justify-content: center;
    gap: 8px;
    font-size: 20px;
    margin-bottom: 6px;
}

#modalP2PDKP .dkp-flag-icon {
    filter: drop-shadow(0 0 8px rgba(0, 242, 254, 0.5));
    animation: dkpFlagWave 3s infinite ease-in-out;
}

@keyframes dkpFlagWave {
    0%, 100% { transform: rotate(0deg); }
    25%      { transform: rotate(-3deg); }
    75%      { transform: rotate(3deg); }
}

/* ========================================================
   3. СТАТУС-БАННЕР
   ======================================================== */
#p2pDkpStatusBadge {
    position: relative;
    z-index: 2;
    padding: 10px 12px;
    background: rgba(0, 242, 254, 0.08);
    border: 1.5px solid rgba(0, 242, 254, 0.35);
    border-radius: 10px;
    text-align: center;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 0 14px rgba(0, 242, 254, 0.1);
}

#p2pDkpStatusBadge.status-buyer-signed {
    background: rgba(255, 179, 0, 0.1);
    border-color: rgba(255, 179, 0, 0.5);
    box-shadow: 0 0 18px rgba(255, 179, 0, 0.25);
    animation: statusPulseAmber 2s infinite alternate ease-in-out;
}

#p2pDkpStatusBadge.status-seller-signed {
    background: rgba(255, 179, 0, 0.1);
    border-color: rgba(255, 179, 0, 0.5);
    box-shadow: 0 0 18px rgba(255, 179, 0, 0.25);
    animation: statusPulseAmber 2s infinite alternate ease-in-out;
}

#p2pDkpStatusBadge.status-completed {
    background: rgba(0, 230, 118, 0.14);
    border-color: rgba(0, 230, 118, 0.6);
    box-shadow: 0 0 22px rgba(0, 230, 118, 0.4);
    animation: statusPulseGreen 1.4s infinite alternate ease-in-out;
}

#p2pDkpStatusBadge.status-cancelled,
#p2pDkpStatusBadge.status-expired {
    background: rgba(255, 51, 102, 0.1);
    border-color: rgba(255, 51, 102, 0.5);
    box-shadow: 0 0 14px rgba(255, 51, 102, 0.25);
}

@keyframes statusPulseAmber {
    0%   { box-shadow: 0 0 12px rgba(255, 179, 0, 0.15); }
    100% { box-shadow: 0 0 22px rgba(255, 179, 0, 0.45); }
}

@keyframes statusPulseGreen {
    0%   { box-shadow: 0 0 14px rgba(0, 230, 118, 0.25); }
    100% { box-shadow: 0 0 26px rgba(0, 230, 118, 0.6); }
}

#p2pDkpStatusText {
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.3px;
    display: block;
    line-height: 1.2;
    transition: color 0.3s ease;
}

#p2pDkpTimer {
    color: #ffb300;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1px;
    text-shadow: 0 0 8px rgba(255, 179, 0, 0.5);
}

/* ========================================================
   4. СЕКЦИИ ДКП
   ======================================================== */
#modalP2PDKP .dkp-section-compact {
    position: relative;
    z-index: 2;
    margin-bottom: 8px;
    padding: 8px 10px;
    background: rgba(0, 242, 254, 0.025);
    border-left: 2px solid rgba(0, 242, 254, 0.5);
    border-radius: 6px;
    transition: background 0.25s ease;
}

#modalP2PDKP .dkp-section-compact:hover {
    background: rgba(0, 242, 254, 0.05);
}

#modalP2PDKP .dkp-section-title {
    font-size: 8.5px;
    font-weight: 900;
    color: #00f2fe;
    letter-spacing: 1px;
    margin-bottom: 5px;
    text-transform: uppercase;
    text-shadow: 0 0 5px rgba(0, 242, 254, 0.4);
}

#modalP2PDKP .dkp-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
}

#modalP2PDKP .dkp-row-compact {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 9.5px;
    padding: 2px 0;
    gap: 6px;
}

#modalP2PDKP .dkp-label {
    font-size: 8.5px;
    color: #94a3b8;
    flex-shrink: 0;
}

#modalP2PDKP .dkp-value {
    font-size: 10px;
    color: #f1f5f9;
    font-weight: 700;
    text-align: right;
    word-break: break-word;
    line-height: 1.25;
}

#modalP2PDKP .dkp-value-mono {
    font-family: 'Courier New', monospace;
    font-size: 9px;
    color: #67e8f9;
    letter-spacing: 0.4px;
    font-weight: 800;
}

#modalP2PDKP .dkp-car-info-box {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 6px;
    padding: 8px 10px;
    border: 1px solid rgba(0, 242, 254, 0.15);
}

/* ========================================================
   5. РЕДАКТИРУЕМОЕ ПОЛЕ ЦЕНЫ
   ======================================================== */
#p2pDkpPriceEditWrap {
    position: relative;
    z-index: 2;
}

#p2pDkpPriceInput {
    background: #050914 !important;
    border: 1.5px solid rgba(0, 230, 118, 0.4) !important;
    color: #00e676 !important;
    font-family: 'Courier New', monospace !important;
    font-weight: 900 !important;
    letter-spacing: 0.5px;
    transition: all 0.25s ease !important;
    -webkit-text-fill-color: #00e676 !important;
    caret-color: #00e676 !important;
    text-shadow: 0 0 8px rgba(0, 230, 118, 0.4);
}

#p2pDkpPriceInput:focus {
    border-color: #00e676 !important;
    background: #071510 !important;
    box-shadow:
        0 0 0 2px rgba(0, 230, 118, 0.2),
        0 0 18px rgba(0, 230, 118, 0.5) !important;
    transform: scale(1.01);
}

#p2pDkpPriceInput::-webkit-outer-spin-button,
#p2pDkpPriceInput::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

#p2pDkpPriceInput {
    -moz-appearance: textfield;
    appearance: textfield;
}

#p2pDkpPriceRange {
    color: #86efac;
    font-family: 'Courier New', monospace;
}

/* Заблокированная цена */
#p2pDkpPriceLockedWrap {
    position: relative;
    z-index: 2;
}

#p2pDkpPriceLockedWrap .dkp-price-line-highlight {
    background: linear-gradient(135deg, rgba(0, 230, 118, 0.15), rgba(0, 230, 118, 0.05));
    border: 1.5px solid rgba(0, 230, 118, 0.5);
    border-left: 4px solid #00e676;
    border-radius: 10px;
    padding: 10px 14px;
    box-shadow: 0 0 16px rgba(0, 230, 118, 0.2);
    animation: priceLockedGlow 3s infinite alternate ease-in-out;
}

@keyframes priceLockedGlow {
    0%   { box-shadow: 0 0 12px rgba(0, 230, 118, 0.15); }
    100% { box-shadow: 0 0 22px rgba(0, 230, 118, 0.4); }
}

#p2pDkpPriceLocked {
    font-size: 15px;
    text-shadow: 0 0 10px rgba(0, 230, 118, 0.6);
}

/* ========================================================
   6. БЛОК КОМИССИИ
   ======================================================== */
#modalP2PDKP .dkp-section-compact[style*="rgba(255,179,0,0.5)"] {
    background: rgba(255, 179, 0, 0.04);
    border-left-color: rgba(255, 179, 0, 0.6) !important;
}

#p2pDkpFee {
    color: #ffb300;
    font-family: 'Courier New', monospace;
    font-weight: 900;
    text-shadow: 0 0 6px rgba(255, 179, 0, 0.4);
}

#p2pDkpPayout {
    color: #00e676;
    font-family: 'Courier New', monospace;
    font-weight: 900;
    text-shadow: 0 0 8px rgba(0, 230, 118, 0.4);
}

/* ========================================================
   7. БЛОК ПОДПИСЕЙ
   ======================================================== */
#modalP2PDKP .dkp-signatures-area {
    position: relative;
    z-index: 2;
    display: flex !important;
    justify-content: space-between !important;
    padding: 10px 12px !important;
    background: rgba(0, 0, 0, 0.45) !important;
    border-radius: 10px !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    min-height: 76px !important;
    margin: 10px 0 !important;
    overflow: hidden !important;
    gap: 8px;
}

#modalP2PDKP .dkp-compact-sigs {
    min-height: 76px !important;
    padding: 10px 12px !important;
}

#modalP2PDKP .dkp-sig-col {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 2;
    min-width: 90px;
    flex: 1;
}

#modalP2PDKP .dkp-sig-label {
    font-size: 8px;
    font-weight: 800;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 3px;
}

#modalP2PDKP .dkp-handwrite {
    font-family: 'Brush Script MT', 'Segoe Script', cursive, sans-serif;
    font-size: 15px;
    color: #00f2fe;
    margin-top: 2px;
    transform: rotate(-2deg);
    text-shadow: 0 0 8px rgba(0, 242, 254, 0.5);
    letter-spacing: 0.4px;
    transition: color 0.4s ease, text-shadow 0.4s ease, transform 0.3s ease;
    display: inline-block;
}

#modalP2PDKP .dkp-handwrite.sig-placed {
    color: #00e676;
    text-shadow: 0 0 12px rgba(0, 230, 118, 0.7);
    animation: sigAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform: rotate(-2deg) scale(1.05);
}

@keyframes sigAppear {
    0% {
        transform: rotate(-10deg) scale(0.6);
        opacity: 0;
        filter: blur(4px);
    }
    50% {
        transform: rotate(3deg) scale(1.15);
        opacity: 1;
        filter: blur(0);
    }
    100% {
        transform: rotate(-2deg) scale(1.05);
    }
}

#modalP2PDKP .dkp-sig-date {
    font-family: 'Courier New', monospace;
    font-size: 8px;
    color: #64748b;
    margin-top: 3px;
}

/* ========================================================
   8. ПЕЧАТЬ МРЭО (анимация approve)
   ======================================================== */
#p2pDkpStamp {
    position: absolute !important;
    right: 12px !important;
    bottom: 6px !important;
    width: 76px !important;
    height: 76px !important;
    border-radius: 50% !important;
    border: 3px double #2563eb !important;
    color: #3b82f6 !important;
    background: rgba(37, 99, 235, 0.08) !important;
    box-shadow:
        0 0 18px rgba(37, 99, 235, 0.4),
        inset 0 0 14px rgba(37, 99, 235, 0.1) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    opacity: 0;
    transform: rotate(-14deg) scale(0);
    pointer-events: none;
    transition:
        transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275),
        opacity 0.4s ease;
    z-index: 5;
}

#p2pDkpStamp.stamp-approved {
    opacity: 0.95;
    transform: rotate(-14deg) scale(1);
    animation: stampPress 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes stampPress {
    0% {
        transform: rotate(-30deg) scale(2.2);
        opacity: 0;
        filter: blur(4px);
    }
    40% {
        transform: rotate(-16deg) scale(0.92);
        opacity: 1;
        filter: blur(0);
    }
    70% {
        transform: rotate(-13deg) scale(1.06);
    }
    100% {
        transform: rotate(-14deg) scale(1);
    }
}

#p2pDkpStamp .stamp-inner {
    display: flex;
    flex-direction: column;
    font-size: 6.5px;
    line-height: 1.15;
    font-weight: 900;
    text-transform: uppercase;
    padding: 4px;
    letter-spacing: 0.4px;
}

/* ========================================================
   9. КНОПКИ ДЕЙСТВИЙ
   ======================================================== */
#p2pDkpSignBtn {
    position: relative;
    z-index: 2;
    min-height: 46px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.5px;
    transition: all 0.25s ease;
    box-shadow: 0 0 16px rgba(0, 230, 118, 0.4);
}

#p2pDkpSignBtn:not(:disabled):hover {
    box-shadow: 0 0 24px rgba(0, 230, 118, 0.65);
    transform: translateY(-2px);
}

#p2pDkpSignBtn:not(:disabled):active {
    transform: scale(0.97);
}

#p2pDkpSignBtn:disabled {
    box-shadow: none;
    cursor: not-allowed;
}

#p2pDkpCancelBtn {
    position: relative;
    z-index: 2;
    opacity: 0.75;
    transition: opacity 0.25s ease;
}

#p2pDkpCancelBtn:hover {
    opacity: 1;
}

#p2pDkpCloseBtn {
    position: relative;
    z-index: 2;
    min-height: 44px;
    font-size: 12px;
    font-weight: 900;
}

/* ========================================================
   10. АНИМАЦИЯ ПРИ ПОДПИСИ (вспышка)
   ======================================================== */
#modalP2PDKP .signing-flash {
    animation: signingFlash 0.7s ease-out;
}

@keyframes signingFlash {
    0%   { background: rgba(0, 230, 118, 0.4); }
    100% { background: rgba(0, 0, 0, 0.45); }
}

/* ========================================================
   11. АДАПТИВ
   ======================================================== */
@media (max-width: 380px) {
    #modalP2PDKP .modal-box.dkp-official-blank {
        padding: 10px !important;
        max-width: 100% !important;
    }

    #modalP2PDKP .dkp-title-main {
        font-size: 12.5px;
        letter-spacing: 1px;
    }

    #modalP2PDKP .dkp-title-small {
        font-size: 7px;
    }

    #p2pDkpStatusText {
        font-size: 10.5px;
    }

    #modalP2PDKP .dkp-two-col {
        gap: 6px;
    }

    #modalP2PDKP .dkp-value {
        font-size: 9.5px;
    }

    #p2pDkpPriceInput {
        font-size: 14px !important;
        padding: 7px 10px !important;
    }

    #p2pDkpPriceLocked {
        font-size: 13px;
    }

    #modalP2PDKP .dkp-handwrite {
        font-size: 13px;
    }

    #modalP2PDKP .dkp-signatures-area {
        min-height: 70px !important;
        padding: 8px 10px !important;
    }

    #p2pDkpStamp {
        width: 64px !important;
        height: 64px !important;
        right: 8px !important;
        bottom: 4px !important;
    }

    #p2pDkpStamp .stamp-inner {
        font-size: 5.5px;
    }

    #p2pDkpSignBtn {
        min-height: 42px;
        font-size: 11px;
    }
}

/* ========================================================
   12. PREFERS-REDUCED-MOTION
   ======================================================== */
@media (prefers-reduced-motion: reduce) {
    #modalP2PDKP .dkp-flag-icon,
    #p2pDkpStamp,
    #p2pDkpStatusBadge,
    #p2pDkpPriceLockedWrap .dkp-price-line-highlight,
    #modalP2PDKP .dkp-handwrite.sig-placed {
        animation: none !important;
        transition: none !important;
    }
}