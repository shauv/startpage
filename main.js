document.addEventListener("DOMContentLoaded", function () {
    function pad(n) { return n < 10 ? "0" + n : n; }
    function updateTimeAndDate() {
        const now = new Date();
        document.querySelector(".time").textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        document.querySelector(".date").textContent = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()}`;
    }
    updateTimeAndDate();
    setInterval(updateTimeAndDate, 1000);

    const searchInput = document.querySelector(".search-container input");
    const bookmarks = document.querySelectorAll(".bookmark-item a");

    function getDimColor(color, alpha) {
        let rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return rgb ? `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})` : color;
    }

    bookmarks.forEach(b => {
        if (!b.dataset.original) b.dataset.original = b.textContent;
        if (!b.dataset.fullColor) b.dataset.fullColor = getComputedStyle(b).color;
    });

    let matchCount = 0, singleMatchBookmark = null, exactMatchBookmark = null;
    function updateBookmarks() {
        const query = searchInput.value.trim().toLowerCase();
        matchCount = 0; singleMatchBookmark = null; exactMatchBookmark = null;
        bookmarks.forEach(b => {
            const original = b.dataset.original, fullColor = b.dataset.fullColor, dimColor = getDimColor(fullColor, 0.5);
            if (!query) {
                b.innerHTML = original; b.style.color = fullColor;
            } else if (original.toLowerCase().includes(query)) {
                matchCount++; singleMatchBookmark = b;
                if (original.toLowerCase() === query) exactMatchBookmark = b;
                const regex = new RegExp(`(${query.replace(/([.*+?^${}()|[\]\\])/g, "\\$1")})`, "ig");
                b.innerHTML = `<span class="non-match" style="color: ${dimColor};">${original.replace(regex, `<span class="match" style="color: ${fullColor};">$1</span>`)}</span>`;
            } else {
                b.innerHTML = original; b.style.color = dimColor;
            }
        });
    }

    searchInput.addEventListener("input", updateBookmarks);
    searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            updateBookmarks();
            if (exactMatchBookmark) window.open(exactMatchBookmark.href, '_blank');
            else if (matchCount === 1 && singleMatchBookmark) window.open(singleMatchBookmark.href, '_blank');
            else {
                searchInput.classList.add("shake");
                searchInput.addEventListener("animationend", function handler() {
                    searchInput.classList.remove("shake");
                    searchInput.removeEventListener("animationend", handler);
                });
            }
        }
    });

    function updateContainerSize() {
        const vw = window.innerWidth, constant = 500;
        document.querySelector('.main-container').style.width = (constant / vw * 100) + 'vw';
    }
    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
});