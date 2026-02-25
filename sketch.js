/**
 * Vibe Live Sequencer
 * Core Logic - sketch.js
 */

let state = 'SPLASH';
let assetsConfig = [];
let loadedAssets = [];
let endAsset = null;
let currentIndex = 0;
let canvas;

let settingsOverlay;
let settingsToggle;
let splashOverlay;
let isSettingsOpen = false;
let autoSortEnabled = false;
let userAssetOrder = []; // To store manual order

// Project info state with Defaults
const DEFAULTS = {
    appTitle: 'El caracol y la ballena',
    appSubtitle: 'Un cuentacuentos digital',
    appTitleColor: '#ffffff',
    appSubtitleColor: '#ffffff'
};

let appMainTitle = 'Cuéntame';
let appTitle = '';
let appSubtitle = '';
let appTitleColor = '';
let appSubtitleColor = '';

// Interaction feedback
let clickFeedback = 0;
let clickSide = '';

function setup() {
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('sketch-container');
    imageMode(CENTER);

    // Load persisted state
    appTitle = getItem('appTitle') || DEFAULTS.appTitle;
    appSubtitle = getItem('appSubtitle') || DEFAULTS.appSubtitle;
    appTitleColor = getItem('appTitleColor') || DEFAULTS.appTitleColor;
    appSubtitleColor = getItem('appSubtitleColor') || DEFAULTS.appSubtitleColor;
    autoSortEnabled = getItem('autoSortEnabled') === true;
    let savedOrder = getItem('userAssetOrder');
    if (savedOrder) userAssetOrder = savedOrder;

    canvas.elt.oncontextmenu = () => { if (state !== 'SPLASH') return false; };
    createUI(); // Create UI early
    createSplashScreen();
}

function createSplashScreen() {
    splashOverlay = createDiv();
    splashOverlay.id('splash-overlay');
    createDiv(appMainTitle).addClass('splash-title').parent(splashOverlay);

    let pref = getItem('appLoadMethod');
    let btnContainer = createDiv().style('display', 'flex').style('gap', '20px').parent(splashOverlay);

    if (pref === 'local') {
        let btnLoc = createButton('Cuento local').addClass('load-assets-btn').parent(btnContainer);
        btnLoc.mousePressed(() => triggerLocalLoad());
    }

    let btnDef = createButton('Cuentos de cuéntame').addClass('load-assets-btn').parent(btnContainer);
    btnDef.mousePressed(() => {
        storeItem('appLoadMethod', 'default');
        initApp('default');
    });
}

function triggerLocalLoad() {
    let input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.onchange = async e => {
        let files = Array.from(e.target.files);
        let newConfig = []; let fileMap = {};
        for (let file of files) {
            let name = file.name; let ext = name.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov'].includes(ext)) {
                newConfig.push(name); fileMap[name] = file;
            }
        }
        if (newConfig.length > 0) {
            assetsConfig = newConfig;
            storeItem('appLoadMethod', 'local');
            await initApp('local', fileMap);
        } else {
            alert("No se han encontrado archivos en esa carpeta.");
        }
    };
    input.click();
}

async function initApp(mode, fileMap = null) {
    splashOverlay.addClass('fade-out');
    requestFullscreenIfPossible();
    if (mode === 'default') {
        try {
            const response = await fetch('assets.json');
            assetsConfig = await response.json();
        } catch (e) {
            console.error("assets.json failed to load", e);
        }
    }
    try {
        endAsset = await new Promise((res, rej) => {
            loadImage('assetsDefault/theEND.gif', img => res(img), err => rej(err));
        });
    } catch (e) { }
    await loadAllAssets(fileMap);
    refreshUIContent(); // Update UI with loaded assets
    settingsToggle.style('display', 'flex'); // Show the settings gear once app starts
    currentIndex = 0;
    state = 'PLAYBACK';
    playCurrentAsset();
}

async function loadAllAssets(fileMap = null) {
    loadedAssets = [];
    let validNames = [];
    for (let filename of assetsConfig) {
        let path = 'assets/' + filename;
        let ext = filename.split('.').pop().toLowerCase();
        if (fileMap && fileMap[filename]) path = URL.createObjectURL(fileMap[filename]);

        let assetObj = { name: filename, type: '', data: null, sourceUrl: path };
        try {
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                assetObj.type = 'image';
                assetObj.data = await new Promise((res, rej) => loadImage(path, img => res(img), err => rej(err)));
            } else if (['mp4', 'webm', 'mov'].includes(ext)) {
                assetObj.type = 'video';
                assetObj.data = await new Promise((res) => {
                    let v = createVideo(path, () => res(v));
                    v.hide(); v.volume(1);
                });
            }
            if (assetObj.data) { loadedAssets.push(assetObj); validNames.push(filename); }
        } catch (err) { }
    }
    assetsConfig = validNames;

    if (autoSortEnabled) {
        performAutoSort();
    } else if (userAssetOrder && userAssetOrder.length === loadedAssets.length) {
        // Restore manual order if lengths match
        let reorderedAssets = [];
        let reorderedConfig = [];
        for (let name of userAssetOrder) {
            let idx = loadedAssets.findIndex(a => a.name === name);
            if (idx !== -1) {
                reorderedAssets.push(loadedAssets[idx]);
                reorderedConfig.push(assetsConfig[idx]);
            }
        }
        if (reorderedAssets.length === loadedAssets.length) {
            loadedAssets = reorderedAssets;
            assetsConfig = reorderedConfig;
        }
    }
}

function draw() {
    background(0);
    if (state === 'PLAYBACK') {
        if (!isSettingsOpen) cursor(HAND); else cursor(ARROW);
        renderPlayback();
        renderFeedbackOverlay();
    } else if (state === 'END') {
        renderEndScreen();
        renderFeedbackOverlay();
    } else {
        cursor(ARROW);
    }
}

function renderPlayback() {
    if (currentIndex === 0) { renderTitleSlide(); return; }
    let assetIdx = currentIndex - 1;
    if (assetIdx < 0 || assetIdx >= loadedAssets.length) { state = 'END'; return; }
    let asset = loadedAssets[assetIdx];
    if (!asset || !asset.data) return;
    let img = asset.data;
    let w = img.width; let h = img.height;
    if (w === 0 && img.elt && img.elt.videoWidth) { w = img.elt.videoWidth; h = img.elt.videoHeight; }
    if (w > 0) {
        let aspect = w / h;
        let dw, dh;
        if (width / height > aspect) { dh = height; dw = dh * aspect; }
        else { dw = width; dh = dw / aspect; }
        image(img, width / 2, height / 2, dw, dh);
    }
    if (asset.type === 'video') renderVideoBar(asset.data);
}

function renderVideoBar(v) {
    let dur = v.duration(); let cur = v.time();
    if (dur > 0) {
        let progress = cur / dur;
        fill(255, 100); noStroke(); rect(0, height - 10, width, 10);
        fill(255, 200); rect(0, height - 10, width * progress, 10);
    }
}

function renderTitleSlide() {
    push(); textAlign(CENTER, CENTER); textFont('Inter');
    fill(appTitleColor); noStroke(); textStyle(BOLD);
    let titleSize = min(width * 0.1, 120); textSize(titleSize);
    text(appTitle, width / 2, height / 2 - titleSize * 0.4);
    fill(appSubtitleColor); textStyle(NORMAL);
    let subSize = min(width * 0.04, 40); textSize(subSize);
    text(appSubtitle, width / 2, height / 2 + titleSize * 0.6);
    pop();
}

function renderFeedbackOverlay() {
    if (clickFeedback > 0) {
        noStroke(); fill(255, clickFeedback);
        if (clickSide === 'RIGHT') rect(width - 50, 0, 50, height);
        else rect(0, 0, 50, height);
        clickFeedback -= 15;
    }
}

function renderEndScreen() {
    if (endAsset) image(endAsset, width / 2, height / 2, width, height);
    else { fill(255); textAlign(CENTER, CENTER); textSize(60); text("EL FIN", width / 2, height / 2); }
}

function keyPressed() {
    if (isSettingsOpen) return;
    if (keyCode === RIGHT_ARROW) navigateNext();
    else if (keyCode === LEFT_ARROW) navigatePrev();
    else if (key === ' ') togglePlayPause();
    else if (keyCode === ENTER) restartCurrentSlide();
    else if (key === 'S' || key === 's') saveCurrentConfig();
}

function mousePressed(e) {
    // If the click is on a UI element (not the canvas), ignore it for navigation
    if (e && e.target && canvas && e.target !== canvas.elt) return;

    if (isSettingsOpen || state === 'SPLASH') return;
    clickFeedback = 150;
    if (mouseX > width / 2) { clickSide = 'RIGHT'; navigateNext(); }
    else { clickSide = 'LEFT'; navigatePrev(); }
}

function mouseWheel(event) {
    if (isSettingsOpen) return;
    let assetIdx = currentIndex - 1;
    if (assetIdx >= 0 && assetIdx < loadedAssets.length) {
        let a = loadedAssets[assetIdx];
        if (a.type === 'video') {
            let step = event.delta > 0 ? 0.5 : -0.5;
            a.data.time(constrain(a.data.time() + step, 0, a.data.duration()));
        }
    }
}

function navigateNext() {
    stopCurrentAsset();
    currentIndex++;
    if (currentIndex > loadedAssets.length) state = 'END';
    else { state = 'PLAYBACK'; playCurrentAsset(); }
}

function navigatePrev() {
    stopCurrentAsset();
    currentIndex = max(0, currentIndex - 1);
    state = 'PLAYBACK';
    playCurrentAsset();
}

function jumpToAsset(idx) {
    stopCurrentAsset();
    currentIndex = idx + 1;
    state = 'PLAYBACK';
    // Small delay to prevent the global mousePressed from catching 
    // the click and navigating again immediately
    setTimeout(() => { if (isSettingsOpen) toggleSettings(); }, 10);
    playCurrentAsset();
}

function togglePlayPause() {
    let assetIdx = currentIndex - 1;
    if (assetIdx >= 0 && assetIdx < loadedAssets.length) {
        let a = loadedAssets[assetIdx];
        if (a.type === 'video') {
            if (a.data.elt.paused) a.data.play(); else a.data.pause();
        }
    }
}

function restartCurrentSlide() {
    let assetIdx = currentIndex - 1;
    if (assetIdx >= 0 && assetIdx < loadedAssets.length) {
        let a = loadedAssets[assetIdx];
        if (a.type === 'video') { a.data.stop(); a.data.play(); }
    }
}

function playCurrentAsset() {
    let assetIdx = currentIndex - 1;
    if (assetIdx >= 0 && assetIdx < loadedAssets.length) {
        let a = loadedAssets[assetIdx];
        if (a.type === 'video') a.data.play();
    }
}

function stopCurrentAsset() {
    let assetIdx = currentIndex - 1;
    if (assetIdx >= 0 && assetIdx < loadedAssets.length) {
        let a = loadedAssets[assetIdx];
        if (a && a.type === 'video') a.data.stop();
    }
}

function requestFullscreenIfPossible() { try { if (!fullscreen()) fullscreen(true); } catch (e) { } }

function createUI() {
    console.log("Creating UI and Settings Toggle...");
    if (!settingsToggle) {
        settingsToggle = createButton('⚙️');
        settingsToggle.id('settings-toggle');
    }
    settingsToggle.mousePressed(toggleSettings);

    // Determine early visibility based on local files vs network load
    settingsToggle.hide();

    if (!settingsOverlay) settingsOverlay = createDiv().addClass('setup-ui hidden');
    refreshUIContent();
}

function refreshUIContent() {
    settingsOverlay.html('');
    let header = createDiv().addClass('ui-header').parent(settingsOverlay);
    createElement('h2', 'Asset Manager').parent(header);

    let actions = createDiv().addClass('ui-actions').parent(header);
    createButton('Reset').addClass('action-btn reset-btn').parent(actions).mousePressed(resetDefaults);

    let sortBtn = createButton('Auto Sort').addClass('action-btn').parent(actions).mousePressed(toggleAutoSort);
    if (autoSortEnabled) sortBtn.addClass('active-toggle');

    createButton('Sync Folder').addClass('action-btn').parent(actions).mousePressed(syncFolder);
    createButton('✕ Close').addClass('action-btn').parent(actions).mousePressed(toggleSettings);

    let initialItem = createDiv().addClass('initial-item').parent(settingsOverlay);

    // Title
    let tRow = createDiv().addClass('ui-row-compact').parent(initialItem);
    let tFields = createDiv().addClass('fields-stack').parent(tRow);
    createElement('label', 'Título:').parent(tFields);
    let tIn = createInput(appTitle).parent(tFields).addClass('ui-input-small');
    tIn.style('color', appTitleColor);
    tIn.input(() => { appTitle = tIn.value(); storeItem('appTitle', appTitle); });
    createCompactPicker(tRow, 'appTitleColor', tIn);

    // Subtitle
    let sRow = createDiv().addClass('ui-row-compact').parent(initialItem);
    let sFields = createDiv().addClass('fields-stack').parent(sRow);
    createElement('label', 'Subtítulo:').parent(sFields);
    let sIn = createInput(appSubtitle).parent(sFields).addClass('ui-input-small');
    sIn.style('color', appSubtitleColor);
    sIn.input(() => { appSubtitle = sIn.value(); storeItem('appSubtitle', appSubtitle); });
    createCompactPicker(sRow, 'appSubtitleColor', sIn);

    if (loadedAssets.length === 0) {
        let w = createDiv().addClass('no-assets-warning').parent(settingsOverlay);
        w.html('<b>¡No hay assets!</b> Carga en <code>/assets</code> o usa <b>Sync Folder</b>.');
        settingsToggle.style('display', 'flex');
        settingsToggle.style('opacity', '1');
        settingsToggle.style('color', '#ff5555');
    } else {
        settingsToggle.style('color', 'white');
        settingsToggle.style('opacity', '');
    }

    let list = createElement('ul').addClass('asset-list').parent(settingsOverlay);

    // PORTADA
    let itemStart = createElement('li').addClass('asset-item fixed-item').parent(list);
    let thumbStart = createDiv().addClass('asset-thumbnail-container').parent(itemStart);
    thumbStart.mousePressed(() => {
        stopCurrentAsset();
        currentIndex = 0;
        state = 'PLAYBACK';
        setTimeout(() => { if (isSettingsOpen) toggleSettings(); }, 10);
    });
    createDiv('✨').addClass('asset-thumbnail').style('background', '#442222').parent(thumbStart);
    createDiv('👁️').addClass('eye-overlay').parent(thumbStart);
    createSpan("1. PORTADA (Título)").addClass('asset-name').style('font-weight', 'bold').style('color', '#ffffff').parent(itemStart);

    loadedAssets.forEach((asset, idx) => {
        let item = createElement('li').addClass('asset-item').parent(list);
        let thumb = createDiv().addClass('asset-thumbnail-container').parent(item);
        thumb.mousePressed(() => jumpToAsset(idx));
        if (asset.type === 'image') createImg(asset.sourceUrl).addClass('asset-thumbnail').parent(thumb);
        else createDiv('🎬').addClass('asset-thumbnail').style('background', '#333').parent(thumb);
        createDiv('👁️').addClass('eye-overlay').parent(thumb);
        createSpan((idx + 2) + '. ' + asset.name).addClass('asset-name').parent(item);

        if (!autoSortEnabled) {
            let btns = createDiv().addClass('reorder-btns').parent(item);
            createButton('▲').addClass('reorder-btn').parent(btns).mousePressed(e => { e.stopPropagation(); moveAsset(idx, -1) });
            createButton('▼').addClass('reorder-btn').parent(btns).mousePressed(e => { e.stopPropagation(); moveAsset(idx, 1) });

            // Drag and drop mechanics
            item.elt.setAttribute('draggable', 'true');

            item.elt.addEventListener('dragstart', (e) => {
                window._draggedItemIndex = idx;
                setTimeout(() => item.addClass('dragging'), 0);
            });

            item.elt.addEventListener('dragend', (e) => {
                item.removeClass('dragging');
                document.querySelectorAll('.asset-item').forEach(el => {
                    el.classList.remove('drag-over-top');
                    el.classList.remove('drag-over-bottom');
                });
                window._draggedItemIndex = undefined;
            });

            item.elt.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (window._draggedItemIndex === undefined || window._draggedItemIndex === idx) return;

                let rect = item.elt.getBoundingClientRect();
                let relY = e.clientY - rect.top;
                if (relY < rect.height / 2) {
                    item.addClass('drag-over-top');
                    item.removeClass('drag-over-bottom');
                } else {
                    item.addClass('drag-over-bottom');
                    item.removeClass('drag-over-top');
                }
            });

            item.elt.addEventListener('dragleave', (e) => {
                item.removeClass('drag-over-top');
                item.removeClass('drag-over-bottom');
            });

            item.elt.addEventListener('drop', (e) => {
                e.preventDefault();
                item.removeClass('drag-over-top');
                item.removeClass('drag-over-bottom');

                let srcIdx = window._draggedItemIndex;
                if (srcIdx !== undefined && srcIdx !== idx) {
                    let targetIdx = idx;
                    let rect = item.elt.getBoundingClientRect();
                    if (e.clientY - rect.top >= rect.height / 2) targetIdx++; // drop below
                    if (targetIdx > srcIdx) targetIdx--; // adjust shift

                    let movedAsset = loadedAssets.splice(srcIdx, 1)[0];
                    loadedAssets.splice(targetIdx, 0, movedAsset);

                    let movedConf = assetsConfig.splice(srcIdx, 1)[0];
                    assetsConfig.splice(targetIdx, 0, movedConf);

                    userAssetOrder = loadedAssets.map(a => a.name);
                    storeItem('userAssetOrder', userAssetOrder);
                    refreshUIContent();
                }
            });
        }
    });

    // FIN
    let itemEnd = createElement('li').addClass('asset-item fixed-item').parent(list);
    let thumbEnd = createDiv().addClass('asset-thumbnail-container').parent(itemEnd);
    thumbEnd.mousePressed(() => {
        stopCurrentAsset();
        currentIndex = loadedAssets.length + 1;
        state = 'END';
        setTimeout(() => { if (isSettingsOpen) toggleSettings(); }, 10);
    });
    createDiv('🏁').addClass('asset-thumbnail').style('background', '#224422').parent(thumbEnd);
    createDiv('👁️').addClass('eye-overlay').parent(thumbEnd);
    createSpan((loadedAssets.length + 2) + ". FIN (Créditos)").addClass('asset-name').style('font-weight', 'bold').style('color', '#ffffff').parent(itemEnd);

    let legend = createDiv().addClass('ui-legend').parent(settingsOverlay);
    createDiv('<b>Navegación</b> Clic Mitad Derecha/Izquierda o Flechas.').parent(legend);
    createDiv('<b>Vídeo</b> Rueda para "Scratch". Espacio para Pause.').parent(legend);
}

function createCompactPicker(parent, propName, targetEl = null) {
    let colorVal = window[propName];
    colorMode(HSB, 360, 100, 100); let c = color(colorVal);
    let curH = hue(c) || 0; let curS = saturation(c) || 0; let curB = brightness(c) || 100;
    colorMode(RGB, 255);

    let container = createDiv().addClass('compact-picker-row').parent(parent);
    let sbMap = createDiv().addClass('cp-sb-map').parent(container);
    let sbCursor = createDiv().addClass('cp-cursor').parent(sbMap);
    let hStrip = createDiv().addClass('cp-hue-strip').parent(container);
    let hCursor = createDiv().addClass('cp-cursor-hue').parent(hStrip);

    const update = () => {
        sbMap.style('background-color', `hsl(${curH},100%,50%)`);
        sbCursor.style('left', curS + '%'); sbCursor.style('top', (100 - curB) + '%');
        hCursor.style('bottom', (curH / 360 * 100) + '%');
        colorMode(HSB, 360, 100, 100);
        let finalC = color(curH, curS, curB);
        window[propName] = finalC.toString('#rrggbb');
        storeItem(propName, window[propName]);
        if (targetEl) targetEl.style('color', window[propName]);
        colorMode(RGB, 255);
    };
    const handleSB = e => {
        let r = sbMap.elt.getBoundingClientRect();
        curS = constrain((e.clientX - r.left) / r.width * 100, 0, 100);
        curB = constrain(100 - (e.clientY - r.top) / r.height * 100, 0, 100);
        update();
    };
    const handleH = e => {
        let r = hStrip.elt.getBoundingClientRect();
        curH = constrain(360 - (e.clientY - r.top) / r.height * 360, 0, 360);
        update();
    };
    sbMap.elt.onmousedown = e => { window._dragSB = true; window._actSB = handleSB; handleSB(e); };
    hStrip.elt.onmousedown = e => { window._dragH = true; window._actH = handleH; handleH(e); };
    update();
}

if (!window.pickerBound) {
    window.addEventListener('mousemove', e => {
        if (window._dragSB && window._actSB) window._actSB(e);
        if (window._dragH && window._actH) window._actH(e);
    });
    window.addEventListener('mouseup', () => { window._dragSB = false; window._dragH = false; });
    window.pickerBound = true;
}

function resetDefaults() {
    if (confirm('¿Quieres borrar la memoria y restablecer los valores por defecto? Serás devuelto a la pantalla inicial.')) {
        appTitle = DEFAULTS.appTitle; appSubtitle = DEFAULTS.appSubtitle;
        appTitleColor = DEFAULTS.appTitleColor; appSubtitleColor = DEFAULTS.appSubtitleColor;
        storeItem('appTitle', appTitle); storeItem('appSubtitle', appSubtitle);
        storeItem('appTitleColor', appTitleColor); storeItem('appSubtitleColor', appSubtitleColor);
        removeItem('appLoadMethod');
        removeItem('autoSortEnabled');
        removeItem('userAssetOrder');
        location.reload();
    }
}

function toggleSettings() {
    isSettingsOpen = !isSettingsOpen;
    if (isSettingsOpen) settingsOverlay.removeClass('hidden');
    else { settingsOverlay.addClass('hidden'); requestFullscreenIfPossible(); }
}

function moveAsset(idx, dir) {
    if (autoSortEnabled) return;
    let nIdx = idx + dir;
    if (nIdx >= 0 && nIdx < loadedAssets.length) {
        [loadedAssets[idx], loadedAssets[nIdx]] = [loadedAssets[nIdx], loadedAssets[idx]];
        [assetsConfig[idx], assetsConfig[nIdx]] = [assetsConfig[nIdx], assetsConfig[idx]];
        userAssetOrder = loadedAssets.map(a => a.name);
        storeItem('userAssetOrder', userAssetOrder);
        refreshUIContent();
    }
}

function toggleAutoSort() {
    autoSortEnabled = !autoSortEnabled;
    storeItem('autoSortEnabled', autoSortEnabled);
    if (autoSortEnabled) {
        performAutoSort();
    } else {
        refreshUIContent();
    }
}

function performAutoSort() {
    loadedAssets.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    assetsConfig = loadedAssets.map(a => a.name);
    refreshUIContent();
}

async function syncFolder() {
    let input = document.createElement('input'); input.type = 'file'; input.webkitdirectory = true;
    input.onchange = async e => {
        let files = Array.from(e.target.files);
        let newConfig = []; let fileMap = {};
        for (let file of files) {
            let name = file.name; let ext = name.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov'].includes(ext)) {
                newConfig.push(name); fileMap[name] = file;
            }
        }
        if (newConfig.length > 0) {
            assetsConfig = newConfig;
            storeItem('appLoadMethod', 'local');
            await loadAllAssets(fileMap);
            refreshUIContent();
        }
    };
    input.click();
}

function saveCurrentConfig() {
    saveJSON(assetsConfig, 'assets.json');
    console.log("Assets configuration saved locally.");
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
