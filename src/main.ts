// ========================================
// 型定義
// ========================================

type NicknameMap = Record<string, string>;

interface IconTarget {
    container: HTMLElement;
    referenceNode?: HTMLElement;
}

const STORAGE_KEY = "atcoder_nicknames";
const MAX_NICKNAME_LENGTH = 50;

const APPLIED_ATTR = "data-nicknamed-dom-applied";
const ICON_CLASS = "ac-nick-edit-icon";
const VISUAL_CLASS = "ac-custom-nick-visual";

// ========================================
// CSS
// ========================================

const style = document.createElement("style");

style.textContent = `
        .${ICON_CLASS} {
            margin-left: 5px;
            cursor: pointer;
            color: inherit !important;
            text-decoration: none !important;
            font-size: 12px;
            display: inline-block;
        }

        .${ICON_CLASS}:hover {
            opacity: 0.7;
        }

        .${VISUAL_CLASS} {
            display: inline-block;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            vertical-align: bottom;
            white-space: nowrap;
        }
    `;

document.head.appendChild(style);

// ========================================
// LocalStorage
// ========================================

function loadNicknames(): NicknameMap {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return {};
        }

        const parsed: unknown = JSON.parse(raw);

        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("保存データの形式が不正です。");
        }

        const result: NicknameMap = {};

        for (const [username, nickname] of Object.entries(parsed)) {
            if (typeof nickname === "string" && nickname.length > 0) {
                result[username] = nickname;
            }
        }

        return result;
    } catch (error: unknown) {
        console.warn("[AtCoder Nickname] 保存データを読み込めませんでした。", error);

        return {};
    }
}

let nicknames: NicknameMap = loadNicknames();

function saveNicknames(): boolean {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nicknames));

        return true;
    } catch (error: unknown) {
        console.error("[AtCoder Nickname] 保存に失敗しました。", error);

        return false;
    }
}

// ========================================
// ユーザーリンクの検証
// ========================================

function getUsername(link: HTMLAnchorElement): string | null {
    const href = link.getAttribute("href");

    if (!href || href.includes("?")) {
        return null;
    }

    const match = href.match(/^\/users\/([^/]+)\/?$/);

    return match ? match[1] : null;
}

function getOriginalSpan(link: HTMLAnchorElement): HTMLSpanElement | null {
    const spans = link.querySelectorAll<HTMLSpanElement>('span[class^="user-"]');

    for (const span of spans) {
        if (span.textContent?.trim() === getUsername(link)) {
            return span;
        }
    }

    return null;
}

// ========================================
// ニックネーム表示の更新
// ========================================

function updateUserLink(link: HTMLAnchorElement, username: string, nickname: string): void {
    const originalSpan = getOriginalSpan(link);

    const oldVisual = link.querySelector<HTMLSpanElement>(`.${VISUAL_CLASS}`);

    if (oldVisual) {
        oldVisual.remove();
    }

    if (!nickname) {
        if (originalSpan) {
            originalSpan.style.removeProperty("display");
        }

        return;
    }

    if (originalSpan) {
        originalSpan.style.setProperty("display", "none", "important");
    }

    const nickSpan = document.createElement("span");

    nickSpan.className = originalSpan?.className ?? "";
    nickSpan.classList.add(VISUAL_CLASS);
    nickSpan.textContent = nickname;
    nickSpan.setAttribute("data-nickname-username", username);

    link.appendChild(nickSpan);
}

function updateAllMatchingUsers(username: string, nickname: string): void {
    const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="/users/"]');

    links.forEach((link) => {
        if (getUsername(link) !== username) {
            return;
        }

        updateUserLink(link, username, nickname);

        // 表示処理が完了したことを記録
        link.setAttribute(APPLIED_ATTR, "true");
    });
}

// ========================================
// 鉛筆アイコンの挿入先を取得
// ========================================

function findIconTarget(link: HTMLAnchorElement): IconTarget | null {
    // 1. 順位表のボタンを優先して探す。
    //    親要素を順にたどることで、DOM構造の違いに対応する。
    let current: HTMLElement | null = link.parentElement;

    while (current && current !== document.body) {
        const standingsButton = current.querySelector<HTMLElement>(".standings-user-btn");

        if (standingsButton) {
            return {
                container: standingsButton,
            };
        }

        if (current.matches("td, h3")) {
            break;
        }

        current = current.parentElement;
    }

    // 2. ユーザーページなどの fav-btn を探す。
    const favButton =
        link.parentElement?.querySelector<HTMLElement>(".fav-btn") ??
        link.closest("h3")?.querySelector<HTMLElement>(".fav-btn");

    if (favButton?.parentElement) {
        return {
            container: favButton.parentElement,
            referenceNode: favButton,
        };
    }

    return null;
}

// ========================================
// 鉛筆アイコンの作成
// ========================================

function addEditIcon(username: string, target: IconTarget): void {
    const { container, referenceNode } = target;

    // 同じユーザーのアイコンが既にあれば追加しない
    const existingIcons = container.querySelectorAll<HTMLAnchorElement>(`.${ICON_CLASS}`);

    for (const icon of existingIcons) {
        if (icon.getAttribute("data-user") === username) {
            return;
        }
    }

    const editIcon = document.createElement("a");

    editIcon.className = `${ICON_CLASS} glyphicon glyphicon-pencil`;

    editIcon.setAttribute("data-user", username);
    editIcon.title = `${username} のニックネームを編集`;
    editIcon.href = "#";

    editIcon.addEventListener("click", (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const existingNickname = nicknames[username] ?? "";

        const input = window.prompt(
            `【${username}】のニックネームを入力してください\n` +
                "（空欄にしてOKを押すと元に戻ります）",
            existingNickname,
        );

        // キャンセル時は何も変更しない
        if (input === null) {
            return;
        }

        const trimmed = input.trim();

        if (trimmed === "") {
            delete nicknames[username];
        } else {
            nicknames[username] = trimmed.substring(0, MAX_NICKNAME_LENGTH);
        }

        // 保存に失敗しても、現在のページでは変更を反映する
        saveNicknames();

        updateAllMatchingUsers(username, nicknames[username] ?? "");
    });

    // fav-btn がある場合は直後に挿入する。
    // 順位表の場合はボタンコンテナ内に追加する。
    if (referenceNode && referenceNode.parentElement === container) {
        referenceNode.insertAdjacentElement("afterend", editIcon);
    } else {
        container.appendChild(editIcon);
    }
}

// ========================================
// ニックネームとアイコンの適用
// ========================================

function applyNicknames(): void {
    const userLinks = document.querySelectorAll<HTMLAnchorElement>('a[href^="/users/"]');

    userLinks.forEach((link) => {
        const username = getUsername(link);

        if (!username) {
            return;
        }

        const originalSpan = getOriginalSpan(link);

        // 元のユーザー名がまだ存在しない場合は、
        // 処理済みにせず、次回のDOM更新時に再試行する。
        if (!originalSpan) {
            return;
        }

        // 1. ニックネーム表示の適用
        //    アイコンの設置先がなくても独立して実行する。
        if (link.getAttribute(APPLIED_ATTR) !== "true") {
            updateUserLink(link, username, nicknames[username] ?? "");

            // 表示処理が完了した後にのみマークする。
            link.setAttribute(APPLIED_ATTR, "true");
        }

        // 2. 鉛筆アイコンの挿入
        //    表示処理済みかどうかにかかわらず毎回確認する。
        //    挿入先が後から追加された場合にも対応する。
        const target = findIconTarget(link);

        if (!target) {
            return;
        }

        addEditIcon(username, target);
    });
}

// ========================================
// MutationObserver
// ========================================

let isProcessing = false;
let pendingRun = false;

function scheduleApply(): void {
    if (isProcessing) {
        pendingRun = true;
        return;
    }

    isProcessing = true;

    queueMicrotask(() => {
        try {
            do {
                pendingRun = false;
                applyNicknames();
            } while (pendingRun);
        } catch (error: unknown) {
            console.error("[AtCoder Nickname] DOM更新処理でエラーが発生しました。", error);
        } finally {
            // 例外が発生しても必ずロックを解除する
            isProcessing = false;

            // 処理中に新しい変更が通知されていた場合は再試行
            if (pendingRun) {
                scheduleApply();
            }
        }
    });
}

// 初回実行
scheduleApply();

// ページ内の動的なDOM更新を監視
const observer = new MutationObserver(() => {
    scheduleApply();
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});
