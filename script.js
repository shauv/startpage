document.addEventListener("DOMContentLoaded", function () {
    function updateTimeAndDate() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        let seconds = now.getSeconds();
        hours = hours < 10 ? "0" + hours : hours;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        document.querySelector(".time").textContent = `${hours}:${minutes}:${seconds}`;
        let month = now.getMonth() + 1;
        let day = now.getDate();
        const year = now.getFullYear();
        month = month < 10 ? "0" + month : month;
        day = day < 10 ? "0" + day : day;
        document.querySelector(".date").textContent = `${month}/${day}/${year}`;
    }
    updateTimeAndDate();
    setInterval(updateTimeAndDate, 1000);

    const searchInput = document.querySelector(".search-container input");
    const bookmarks = document.querySelectorAll(".bookmark-item a");

    function getDimColor(color, alpha) {
        const rgbRegex = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/;
        let result = rgbRegex.exec(color);
        if (result) {
            const [, r, g, b] = result;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        const rgbaRegex = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([.\d]+)\)/;
        result = rgbaRegex.exec(color);
        if (result) {
            const [, r, g, b] = result;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color;
    }

    bookmarks.forEach(bookmark => {
        if (!bookmark.dataset.original) {
            bookmark.dataset.original = bookmark.textContent;
        }
        if (!bookmark.dataset.fullColor) {
            bookmark.dataset.fullColor = getComputedStyle(bookmark).color;
        }
    });

    let matchCount = 0;
    let singleMatchBookmark = null;

    function updateBookmarks() {
        const query = searchInput.value.trim().toLowerCase();
        matchCount = 0;
        singleMatchBookmark = null;
        bookmarks.forEach(bookmark => {
            const originalText = bookmark.dataset.original;
            const fullColor = bookmark.dataset.fullColor;
            const dimColor = getDimColor(fullColor, 0.5);

            if (query === "") {
                bookmark.innerHTML = originalText;
                bookmark.style.color = fullColor;
            } else {
                if (originalText.toLowerCase().includes(query)) {
                    matchCount++;
                    singleMatchBookmark = bookmark;
                    const escapedQuery = query.replace(/([.*+?^${}()|[\]\\])/g, "\\$1");
                    const regex = new RegExp(`(${escapedQuery})`, "ig");
                    const highlighted = originalText.replace(regex, `<span class="match" style="color: ${fullColor};">$1</span>`);
                    bookmark.innerHTML = `<span class="non-match" style="color: ${dimColor};">${highlighted}</span>`;
                } else {
                    bookmark.innerHTML = originalText;
                    bookmark.style.color = dimColor;
                }
            }
        });
    }

    searchInput.addEventListener("input", updateBookmarks);
    searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            updateBookmarks();
            if (matchCount === 1 && singleMatchBookmark) {
                window.open(singleMatchBookmark.href, '_blank');
            } else {
                searchInput.classList.add("shake");
                searchInput.addEventListener("animationend", function handler() {
                    searchInput.classList.remove("shake");
                    searchInput.removeEventListener("animationend", handler);
                });
            }
        }
    });

    function updateContainerSize() {
        const vw = window.innerWidth;
        const constant = 500;
        const newWidth = constant / vw * 100;
        document.querySelector('.content-container').style.width = newWidth + 'vw';
    }
    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
});