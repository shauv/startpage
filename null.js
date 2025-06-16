(function () {
    const nullWindow = document.getElementById("nullWindow");
    const nullHeader = document.getElementById("nullHeader");
    const nullBody = document.getElementById("nullBody");
    const toggleButton = document.getElementById("toggleNull");
    const tetrisContainer = document.querySelector('.tetris-container');
    const playfield = document.querySelector('.playfield-container');

    const faces = {
        neutral: "[• - •]",
        happy: "[• v •]",
        shock: "[• o •]",
        sad: "[• ʌ •]"
    };
    let currentFace = faces.neutral, lastCursorX = window.innerWidth / 2;
    let isDragging = false, offsetRight = 0, offsetY = 0;
    let faceTimeout = null, hasBeenMaximized = false;
    let pettingHistory = [], lastPetX = null, pettingDetected = false, pettingTimeout = null;
    let tetrisMonitorTimeout = null, nullDockedToTetris = false, autonomousEnabled = true;
    let isMouseDown = false;

    setMinimized(true);

    const CORNER_THRESHOLD = 10;

    document.addEventListener("mousedown", () => { isMouseDown = true; });
    document.addEventListener("mouseup", () => { isMouseDown = false; });

    nullHeader.addEventListener("mousedown", e => {
        if (!nullWindow.classList.contains("maximized") && !nullWindow.classList.contains("minimized")) return;
        isDragging = true;
        nullWindow.style.transition = "right 0s, top 0s, width 0.5s, height 0.5s, opacity 0.5s";
        offsetRight = window.innerWidth - e.clientX - parseInt(getComputedStyle(nullWindow).right);
        offsetY = e.clientY - nullWindow.offsetTop;
        nullHeader.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", e => {
        if (!isDragging) return;
        let newRight = window.innerWidth - e.clientX - offsetRight;
        let newY = e.clientY - offsetY;
        const minRight = 10, maxRight = window.innerWidth - nullWindow.offsetWidth - 10;
        const minY = 10, maxY = window.innerHeight - nullWindow.offsetHeight - 10;
        const right = Math.max(minRight, Math.min(newRight, maxRight));
        const top = Math.max(minY, Math.min(newY, maxY));

        if (nullWindow.classList.contains("maximized") && right === CORNER_THRESHOLD && top === CORNER_THRESHOLD) {
            setMinimized(false);
            nullWindow.style.right = "10px";
            nullWindow.style.top = "10px";
            return;
        }
        if (nullWindow.classList.contains("minimized") && (right > CORNER_THRESHOLD || top > CORNER_THRESHOLD)) {
            setMaximized();
        }
        nullWindow.style.right = right + "px";
        nullWindow.style.top = top + "px";
        lastCursorX = e.clientX;
        updateFaceDisplay();
    });

    document.addEventListener("mouseup", () => {
        nullWindow.style.transition = "right 1s, top 1s, width 0.5s, height 0.5s, opacity 0.5s";
        isDragging = false;
        nullHeader.style.cursor = "grab";
        const right = parseInt(nullWindow.style.right, 10) || 0;
        const top = parseInt(nullWindow.style.top, 10) || 0;
        if (nullWindow.classList.contains("maximized") && right === CORNER_THRESHOLD && top === CORNER_THRESHOLD) {
            setMinimized(false);
            nullWindow.style.right = "10px";
            nullWindow.style.top = "10px";
            return;
        }
        if (nullWindow.classList.contains("minimized") && (right > CORNER_THRESHOLD || top > CORNER_THRESHOLD)) {
            setMaximized();
        }
        if (!tetrisContainer.classList.contains('closed') && nullWindow.classList.contains("maximized")) {
            if (window._nullDockTimeout) clearTimeout(window._nullDockTimeout);
            window._nullDockTimeout = setTimeout(() => {
                if (nullWindow.classList.contains("maximized") && !tetrisContainer.classList.contains('closed')) {
                    dockNullToTetris();
                }
            }, 2000);
        }
    });

    document.addEventListener("mousemove", e => {
        lastCursorX = e.clientX;
        updateFaceDisplay();
    });

    nullWindow.addEventListener("mouseleave", () => {
        pettingDetected = false;
        pettingHistory = [];
        lastPetX = null;
        if (currentFace === faces.happy) {
            currentFace = nullDockedToTetris ? faces.happy : faces.neutral;
            updateFaceDisplay();
        }
    });

    nullWindow.addEventListener("mousemove", e => {
        if (!isMouseDown) return;
        const now = Date.now(), x = e.clientX;
        if (lastPetX !== null) {
            pettingHistory.push({ x, time: now });
            pettingHistory = pettingHistory.filter(p => now - p.time < 500);
            let changes = 0;
            for (let i = 2; i < pettingHistory.length; i++) {
                const dx1 = pettingHistory[i - 2].x - pettingHistory[i - 1].x;
                const dx2 = pettingHistory[i - 1].x - pettingHistory[i].x;
                if (dx1 * dx2 < 0) changes++;
            }
            if (changes >= 3 && !pettingDetected) {
                pettingDetected = true;
                if (faceTimeout) clearTimeout(faceTimeout);
                currentFace = faces.happy;
                updateFaceDisplay();
            }
        }
        lastPetX = x;
        if (pettingTimeout) clearTimeout(pettingTimeout);
        pettingTimeout = setTimeout(() => {
            pettingDetected = false;
            pettingHistory = [];
            lastPetX = null;
            if (currentFace === faces.happy) {
                currentFace = nullDockedToTetris ? faces.happy : faces.neutral;
                updateFaceDisplay();
            }
        }, 500);
    });

    nullWindow.addEventListener("mousedown", e => {
        nullWindow.classList.remove("bounce");
        void nullWindow.offsetWidth;
        nullWindow.classList.add("bounce");
    });

    function getDirectionalFace(baseFace, cursorX, centerX) {
        if (nullDockedToTetris) {
            const start = baseFace[0], end = baseFace.at(-1), inner = baseFace.slice(1, -1);
            return start + inner + "  " + end;
        }
        const delta = 15, start = baseFace[0], end = baseFace.at(-1), inner = baseFace.slice(1, -1);
        if (cursorX < centerX - delta) return start + inner + "  " + end;
        if (cursorX > centerX + delta) return start + "  " + inner + end;
        return baseFace;
    }
    function updateFaceDisplay() {
        const rect = nullWindow.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        nullBody.textContent = getDirectionalFace(currentFace, lastCursorX, centerX);
    }

    function setMinimized(isInitial = false) {
        nullWindow.classList.remove("maximized");
        nullWindow.classList.add("minimized");
        nullWindow.style.right = "10px";
        nullWindow.style.top = "10px";
        nullWindow.style.width = "110px";
        nullWindow.style.height = "83px";
        toggleButton.textContent = "+";
        if (!isInitial && hasBeenMaximized) showTemporaryFace(faces.sad, 2000);
        if (nullDockedToTetris) undockNullFromTetris();
    }
    function setMaximized(isFromButton = false) {
        nullWindow.classList.remove("minimized");
        nullWindow.classList.add("maximized");
        nullWindow.style.width = "200px";
        nullWindow.style.height = "150px";
        toggleButton.textContent = "-";
        hasBeenMaximized = true;
        showTemporaryFace(faces.shock, 2000);
        if (isFromButton) {
            const right = parseInt(nullWindow.style.right, 10) || 0;
            const top = parseInt(nullWindow.style.top, 10) || 0;
            if (right <= CORNER_THRESHOLD && top <= CORNER_THRESHOLD) {
                nullWindow.style.right = (CORNER_THRESHOLD + 10) + "px";
                nullWindow.style.top = (CORNER_THRESHOLD + 10) + "px";
            }
        }
        if (!tetrisContainer.classList.contains('closed')) {
            if (window._nullDockTimeout) clearTimeout(window._nullDockTimeout);
            window._nullDockTimeout = setTimeout(() => {
                if (nullWindow.classList.contains("maximized") && !tetrisContainer.classList.contains('closed')) {
                    dockNullToTetris();
                }
            }, 2000);
        }
    }
    toggleButton.addEventListener("click", e => {
        e.stopPropagation();
        toggleButton.blur();
        if (nullWindow.classList.contains("maximized")) setMinimized(false);
        else setMaximized(true);
    });

    function showTemporaryFace(face, duration) {
        if (faceTimeout) clearTimeout(faceTimeout);
        currentFace = face;
        updateFaceDisplay();
        faceTimeout = setTimeout(() => {
            currentFace = nullDockedToTetris ? faces.happy : faces.neutral;
            updateFaceDisplay();
            faceTimeout = null;
        }, duration);
    }

    function isOverlapping(rect1, rect2) {
        return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
    }
    function getOtherRects() {
        const rects = [];
        const main = document.querySelector('.main-container');
        const tetris = document.querySelector('.tetris-container');
        const github = document.querySelector('.github-container');
        if (main) rects.push(main.getBoundingClientRect());
        if (tetris) rects.push(tetris.getBoundingClientRect());
        if (github) rects.push(github.getBoundingClientRect());
        return rects;
    }

    let moveNullTimeout = null;
    function moveNull() {
        if (!autonomousEnabled) return;
        if (!isDragging && nullWindow.classList.contains("maximized")) {
            const minRight = 10, minY = 10, maxRight = window.innerWidth - nullWindow.offsetWidth - 10, maxY = window.innerHeight - nullWindow.offsetHeight - 10;
            let tries = 0, found = false, newRight, newY, otherRects = getOtherRects();
            while (!found && tries < 30) {
                newRight = Math.random() * (maxRight - minRight) + minRight;
                newY = Math.random() * (maxY - minY) + minY;
                const nullRect = {
                    left: window.innerWidth - newRight - nullWindow.offsetWidth,
                    right: window.innerWidth - newRight,
                    top: newY,
                    bottom: newY + nullWindow.offsetHeight
                };
                found = !otherRects.some(rect => isOverlapping(nullRect, rect));
                tries++;
            }
            nullWindow.style.right = newRight + "px";
            nullWindow.style.top = newY + "px";
        }
        moveNullTimeout = setTimeout(moveNull, 5000 + Math.random() * 5000);
    }
    moveNull();

    function enableAutonomous() {
        if (!autonomousEnabled) { autonomousEnabled = true; moveNull(); }
    }
    function disableAutonomous() {
        autonomousEnabled = false;
        if (moveNullTimeout) clearTimeout(moveNullTimeout);
    }

    function dockNullToTetris() {
        if (nullWindow.classList.contains("minimized") || !tetrisContainer || !playfield) return;
        const playfieldRect = playfield.getBoundingClientRect();
        const nullWidth = nullWindow.offsetWidth, nullHeight = nullWindow.offsetHeight;
        const left = playfieldRect.right + 20, top = playfieldRect.bottom - nullHeight;
        nullWindow.style.transition = "right 0.5s, top 0.5s, width 0.5s, height 0.5s, opacity 0.5s";
        nullWindow.style.right = (window.innerWidth - left - nullWidth) + "px";
        nullWindow.style.top = Math.max(10, top) + "px";
        nullDockedToTetris = true;
        disableAutonomous();
        if (!faceTimeout) { currentFace = faces.happy; updateFaceDisplay(); }
    }
    function undockNullFromTetris() {
        nullDockedToTetris = false;
        enableAutonomous();
        if (!faceTimeout) { currentFace = faces.neutral; updateFaceDisplay(); }
    }

    function monitorTetrisState() {
        const isOpen = !tetrisContainer.classList.contains('closed');
        if (isOpen !== tetrisIsOpen) {
            tetrisIsOpen = isOpen;
            if (tetrisMonitorTimeout) clearTimeout(tetrisMonitorTimeout);
            tetrisMonitorTimeout = setTimeout(() => {
                const stillOpen = !tetrisContainer.classList.contains('closed');
                if (tetrisIsOpen && stillOpen && nullWindow.classList.contains("maximized")) dockNullToTetris();
                else if (!tetrisIsOpen && tetrisContainer.classList.contains('closed')) if (nullDockedToTetris) undockNullFromTetris();
            }, 2000);
        }
    }
    let tetrisIsOpen = false;
    const tetrisObserver = new MutationObserver(monitorTetrisState);
    tetrisObserver.observe(tetrisContainer, { attributes: true, attributeFilter: ['class'] });

    updateFaceDisplay();

    window.showNullShockFace = function () {
        if (faceTimeout) clearTimeout(faceTimeout);
        currentFace = faces.shock;
        updateFaceDisplay();
        nullWindow.classList.remove("bounce");
        nullWindow.classList.remove("shake");
        void nullWindow.offsetWidth;
        nullWindow.classList.add("shake");
        setTimeout(() => { nullWindow.classList.remove("shake"); }, 300);
        faceTimeout = setTimeout(() => {
            currentFace = nullDockedToTetris ? faces.happy : faces.neutral;
            updateFaceDisplay();
            faceTimeout = null;
        }, 2000);
    };
})();