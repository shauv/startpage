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
    let isDragging = false, offsetRight = 0, offsetY = 0, faceTimeout = null, hasBeenMaximized = false;
    let pettingHistory = [], lastPetX = null, pettingDetected = false, pettingTimeout = null;
    let tetrisMonitorTimeout = null, tetrisIsOpen = false, nullDockedToTetris = false, autonomousEnabled = true;

    setMinimized(true);

    nullHeader.addEventListener("mousedown", e => {
        if (!nullWindow.classList.contains("maximized")) return;
        isDragging = true;
        nullWindow.style.transition = "none";
        offsetRight = window.innerWidth - e.clientX - parseInt(getComputedStyle(nullWindow).right);
        offsetY = e.clientY - nullWindow.offsetTop;
        nullHeader.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", e => {
        if (isDragging && nullWindow.classList.contains("maximized")) {
            let newRight = window.innerWidth - e.clientX - offsetRight;
            let newY = e.clientY - offsetY;
            const minRight = 10, maxRight = window.innerWidth - nullWindow.offsetWidth - 10;
            const minY = 10, maxY = window.innerHeight - nullWindow.offsetHeight - 10;
            nullWindow.style.right = Math.max(minRight, Math.min(newRight, maxRight)) + "px";
            nullWindow.style.top = Math.max(minY, Math.min(newY, maxY)) + "px";
        }
        lastCursorX = e.clientX;
        updateFaceDisplay();
    });

    document.addEventListener("mouseup", () => {
        nullWindow.style.transition = "";
        isDragging = false;
        nullHeader.style.cursor = "grab";
        if (!tetrisContainer.classList.contains('closed') && nullWindow.classList.contains("maximized") && !nullWindow.classList.contains("minimized")) {
            if (window._nullDockTimeout) clearTimeout(window._nullDockTimeout);
            window._nullDockTimeout = setTimeout(() => {
                if (nullWindow.classList.contains("maximized") && !nullWindow.classList.contains("minimized") && !tetrisContainer.classList.contains('closed')) {
                    dockNullToTetris();
                }
            }, 2000);
        }
    });

    function getDirectionalFace(baseFace, cursorX, centerX) {
        if (nullDockedToTetris) {
            const start = baseFace.charAt(0), end = baseFace.charAt(baseFace.length - 1), inner = baseFace.slice(1, -1);
            return start + inner + "  " + end;
        }
        const delta = 15, start = baseFace.charAt(0), end = baseFace.charAt(baseFace.length - 1), inner = baseFace.slice(1, -1);
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
    function setMaximized() {
        nullWindow.classList.remove("minimized");
        nullWindow.classList.add("maximized");
        nullWindow.style.width = "200px";
        nullWindow.style.height = "150px";
        toggleButton.textContent = "-";
        hasBeenMaximized = true;
        showTemporaryFace(faces.shock, 2000);
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
        else setMaximized();
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

    nullBody.addEventListener("mousemove", e => {
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
    nullBody.addEventListener("mouseleave", () => {
        pettingDetected = false;
        pettingHistory = [];
        lastPetX = null;
        if (currentFace === faces.happy) {
            currentFace = nullDockedToTetris ? faces.happy : faces.neutral;
            updateFaceDisplay();
        }
    });

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
    const tetrisObserver = new MutationObserver(monitorTetrisState);
    tetrisObserver.observe(tetrisContainer, { attributes: true, attributeFilter: ['class'] });

    updateFaceDisplay();

    window.showNullShockFace = function () {
        if (faceTimeout) clearTimeout(faceTimeout);
        currentFace = faces.shock;
        updateFaceDisplay();
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