// ========================================================
// data_cars_helpers.js — УТИЛИТЫ ВЫБОРА ФОТО АВТО (v1.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Каскадный фолбек: gazel_6.jpg → gazel.jpg → images[0]
//                   → fallback категории → хардкод дефолт.
// ========================================================

/**
 * Возвращает массив картинок машины (уникальный, main-img первым).
 * Работает и с template из CAR_DATABASE, и с car-object из гаража/P2P.
 */
function getCarImageList(carOrTemplate) {
    if (!carOrTemplate) return [];

    let list = [];

    if (Array.isArray(carOrTemplate.images) && carOrTemplate.images.length > 0) {
        list = carOrTemplate.images.filter(Boolean);
    }

    if (carOrTemplate.img) {
        if (list.includes(carOrTemplate.img)) {
            list = [carOrTemplate.img, ...list.filter(x => x !== carOrTemplate.img)];
        } else {
            list.unshift(carOrTemplate.img);
        }
    }

    return list;
}

/**
 * Случайная картинка из галереи.
 * Используется для генерации объявлений (лента маркета, порт, сараи).
 */
function getRandomCarImage(carOrTemplate) {
    const list = getCarImageList(carOrTemplate);

    if (list.length === 0) {
        const cat = carOrTemplate?.type || carOrTemplate?.category || 'economy';
        return getCategoryFallback(cat);
    }

    return list[Math.floor(Math.random() * list.length)];
}

/**
 * Главная картинка (первая).
 */
function getCarMainImage(carOrTemplate) {
    const list = getCarImageList(carOrTemplate);

    if (list.length === 0) {
        const cat = carOrTemplate?.type || carOrTemplate?.category || 'economy';
        return getCategoryFallback(cat);
    }

    return list[0];
}

/**
 * Детерминированная картинка по seed.
 */
function getCarImageBySeed(carOrTemplate, seed) {
    const list = getCarImageList(carOrTemplate);

    if (list.length === 0) {
        const cat = carOrTemplate?.type || carOrTemplate?.category || 'economy';
        return getCategoryFallback(cat);
    }

    const numericSeed = typeof seed === 'number'
        ? seed
        : String(seed || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    return list[numericSeed % list.length];
}

/**
 * Вся галерея с прогонкой через resolveCarAssetUrl (GitHub raw).
 */
function getCarGallery(carOrTemplate) {
    const list = getCarImageList(carOrTemplate);

    const resolver = (typeof resolveCarAssetUrl === 'function')
        ? resolveCarAssetUrl
        : (p) => p;

    return list.map(p => resolver(p));
}

/**
 * Резолвинг одной картинки с фолбеком.
 */
function resolveCarImageUrl(path, fallback) {
    const resolver = (typeof resolveCarAssetUrl === 'function')
        ? resolveCarAssetUrl
        : (p) => p;

    if (!path && !fallback) return '';

    return resolver(path || fallback || '');
}

/**
 * Ищет шаблон машины в CAR_DATABASE по имени.
 * Порядок: точное → частичное → по ключевым словам.
 */
function findCarTemplateByName(name) {
    if (!name || typeof CAR_DATABASE === 'undefined') return null;

    const cleanName = String(name).trim().toLowerCase();
    if (!cleanName) return null;

    // 1. Точное совпадение
    for (const cat in CAR_DATABASE) {
        const list = CAR_DATABASE[cat];
        if (!Array.isArray(list)) continue;
        for (const item of list) {
            if (item && item.name && item.name.toLowerCase() === cleanName) {
                return item;
            }
        }
    }

    // 2. Частичное (в обе стороны)
    for (const cat in CAR_DATABASE) {
        const list = CAR_DATABASE[cat];
        if (!Array.isArray(list)) continue;
        for (const item of list) {
            if (!item || !item.name) continue;
            const itemName = item.name.toLowerCase();
            if (itemName.includes(cleanName) || cleanName.includes(itemName)) {
                return item;
            }
        }
    }

    // 3. По ключевым словам
    const keyWords = cleanName
        .replace(/[()«»"',.\/]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3);

    if (keyWords.length === 0) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const cat in CAR_DATABASE) {
        const list = CAR_DATABASE[cat];
        if (!Array.isArray(list)) continue;
        for (const item of list) {
            if (!item || !item.name) continue;
            const itemName = item.name.toLowerCase();
            let score = 0;
            for (const w of keyWords) {
                if (itemName.includes(w)) score++;
            }
            if (score > bestScore) {
                bestScore = score;
                bestMatch = item;
            }
        }
    }

    if (bestScore >= Math.min(2, keyWords.length)) return bestMatch;
    return null;
}

/**
 * Универсальный payload для карточки ленты маркета.
 */
function buildCarImagePayload(carOrTemplate, categoryFallback) {
    const list = getCarImageList(carOrTemplate);
    const randomImg = getRandomCarImage(carOrTemplate);

    const fallbackImg = carOrTemplate?.fallback
        || categoryFallback
        || getCategoryFallback(carOrTemplate?.type || 'economy');

    return {
        img: randomImg,
        fallback: fallbackImg,
        images: list.length > 0 ? list : [randomImg]
    };
}

// ========================================================
// ⭐ КАСКАДНЫЙ ФОЛБЕК ДЛЯ <img onerror>
// ========================================================

/**
 * Убирает суффикс _N у имени файла.
 *
 * Примеры:
 *   "assets/cars/truck/gazel/gazel_6.jpg"            → "assets/cars/truck/gazel/gazel.jpg"
 *   "assets/cars/premium/bmw_m340i/bmw_m_340i_3.jpg" → "assets/cars/premium/bmw_m340i/bmw_m_340i.jpg"
 *   "gazel.jpg"                                      → "gazel.jpg" (без изменений)
 */
function stripImageNumberSuffix(path) {
    if (!path || typeof path !== 'string') return path;
    return path.replace(/_\d+\.(jpg|jpeg|png|webp|gif)$/i, '.$1');
}

/**
 * Строит цепочку фолбеков для картинки.
 *
 * Порядок:
 *   1. Основная картинка (imgPath)
 *   2. Та же картинка без суффикса _N (gazel_6.jpg → gazel.jpg)
 *   3. images[0] (главная модели)
 *   4. img (главная модели, если отличается)
 *   5. car.fallback (категория)
 *   6. Хардкод дефолт (ВАЗ-2101)
 *
 * @returns {Array<string>} — массив URL (уже резолвленных через resolveCarAssetUrl)
 */
function buildCarImageFallbackChain(imgPath, carOrTemplate) {
    const chain = [];
    const resolver = (typeof resolveCarAssetUrl === 'function')
        ? resolveCarAssetUrl
        : (p) => p;

    function push(p) {
        if (!p || typeof p !== 'string') return;
        let url;
        try {
            url = resolver(p);
        } catch (e) {
            url = p;
        }
        if (url && !chain.includes(url)) chain.push(url);
    }

    // 1. Основная картинка
    push(imgPath);

    // 2. Та же картинка без суффикса _N
    if (imgPath && typeof imgPath === 'string') {
        const stripped = stripImageNumberSuffix(imgPath);
        if (stripped && stripped !== imgPath) push(stripped);
    }

    // 3-4. images[0] и img из шаблона
    if (carOrTemplate) {
        if (Array.isArray(carOrTemplate.images) && carOrTemplate.images.length > 0) {
            push(carOrTemplate.images[0]);
        }
        if (carOrTemplate.img) push(carOrTemplate.img);

        // 5. fallback категории
        if (carOrTemplate.fallback) push(carOrTemplate.fallback);
    }

    // 6. Хардкод дефолт
    push("assets/cars/economy/2101/vaz-2101.jpg");

    return chain;
}

/**
 * Глобальный обработчик onerror для каскадного перебора.
 * Ставится на <img> автоматически через buildCarImageAttrs().
 */
window.__carImgFallback = function(imgEl) {
    if (!imgEl || !imgEl.dataset) return;

    let chain = [];
    try {
        chain = JSON.parse(imgEl.dataset.fbChain || "[]");
    } catch (e) {
        chain = [];
    }

    let idx = parseInt(imgEl.dataset.fbIdx || "0", 10);

    if (idx >= chain.length) {
        imgEl.onerror = null;
        return;
    }

    imgEl.dataset.fbIdx = String(idx + 1);
    imgEl.src = chain[idx];
};

/**
 * Возвращает готовые HTML-атрибуты для <img> с каскадным onerror.
 *
 * Использование в шаблоне:
 *   `<img ${buildCarImageAttrs(rawImg, car)} class="car-img">`
 *
 * @returns {string} — "src=... data-fb-chain=... data-fb-idx=0 onerror=..."
 */
function buildCarImageAttrs(imgPath, carOrTemplate) {
    const chain = buildCarImageFallbackChain(imgPath, carOrTemplate);

    if (chain.length === 0) {
        return `src=""`;
    }

    const mainSrc = chain[0];
    const restChain = chain.slice(1);

    if (restChain.length === 0) {
        return `src="${mainSrc}"`;
    }

    const chainJson = JSON.stringify(restChain).replace(/"/g, '&quot;');
    return `src="${mainSrc}" data-fb-chain="${chainJson}" data-fb-idx="0" onerror="window.__carImgFallback(this)"`;
}

// --------------------------------------------------------
// ЭКСПОРТ В ГЛОБАЛЬНЫЙ КОНТЕКСТ WINDOW
// --------------------------------------------------------
window.getCarImageList = getCarImageList;
window.getRandomCarImage = getRandomCarImage;
window.getCarMainImage = getCarMainImage;
window.getCarImageBySeed = getCarImageBySeed;
window.getCarGallery = getCarGallery;
window.resolveCarImageUrl = resolveCarImageUrl;
window.findCarTemplateByName = findCarTemplateByName;
window.buildCarImagePayload = buildCarImagePayload;
window.stripImageNumberSuffix = stripImageNumberSuffix;
window.buildCarImageFallbackChain = buildCarImageFallbackChain;
window.buildCarImageAttrs = buildCarImageAttrs;

console.log('[🚗 data_cars_helpers v1.1.0] Утилиты + каскадный фолбек загружены ✓');