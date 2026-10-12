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

const ICON_CLASS = "ac-nick-edit-icon";
const VISUAL_CLASS = "ac-custom-nick-visual";
const MARK_CLASS = "ac-custom-nick-mark";

// ニックネーム設定済みユーザーの末尾に付ける印
const NICKNAME_MARK = "*";

// 元の名前要素を非表示にしたことを示す印
const HIDDEN_ATTR = "data-nick-hidden";
// 素のテキストノードを包んだ span の印
const TEXT_WRAP_ATTR = "data-nick-text-wrap";

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
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .${MARK_CLASS} {
            display: inline-block;
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

// ========================================
// 元のユーザー名ノードの取得
// ========================================

function isVisual(node: Node): boolean {
    return (
        node instanceof HTMLElement &&
        (node.classList.contains(VISUAL_CLASS) || node.classList.contains(MARK_CLASS))
    );
}

function normalizedText(nodes: Node[]): string {
    return nodes
        .map((node) => node.textContent ?? "")
        .join("")
        .replace(/\s+/g, "");
}

/**
 * リンク内の「ユーザー名を表示している部分」を返す。
 * - 単一 span / 文字ごとに分割された span / 素のテキストノード に対応
 * - 王冠画像など、テキストを持たない要素は対象外
 * - 自作のニックネーム要素は除外
 * - ラッパー要素が1つだけの場合は、その中を探す
 */
function getNameNodes(root: HTMLElement, username: string): Node[] | null {
    const candidates = Array.from(root.childNodes).filter((node) => {
        if (isVisual(node)) {
            return false;
        }

        return (node.textContent ?? "").trim() !== "";
    });

    if (candidates.length === 0) {
        return null;
    }

    if (normalizedText(candidates) === username) {
        return candidates;
    }

    if (candidates.length === 1 && candidates[0] instanceof HTMLElement) {
        return getNameNodes(candidates[0], username);
    }

    return null;
}

/** テキストノードは style を当てられないので、span で包んで要素にする */
function toElements(nodes: Node[]): HTMLElement[] {
    return nodes.map((node) => {
        if (node instanceof HTMLElement) {
            return node;
        }

        const wrapper = document.createElement("span");

        wrapper.setAttribute(TEXT_WRAP_ATTR, "true");
        node.parentNode?.replaceChild(wrapper, node);
        wrapper.appendChild(node);

        return wrapper;
    });
}

// ========================================
// ニックネーム表示の更新(冪等)
// ========================================

function copyAppearance(from: HTMLElement, to: HTMLElement): void {
    to.className = from.className;

    // インライン style(自由色の color / background-clip: text など)を引き継ぐ
    const inline = from.getAttribute("style");

    if (inline) {
        to.setAttribute("style", inline);
    }

    // 元要素の display 指定(自分で付けた none など)は引き継がない
    to.style.removeProperty("display");
}

function updateUserLink(link: HTMLAnchorElement, username: string, nickname: string): void {
    const nameNodes = getNameNodes(link, username);

    if (!nameNodes) {
        return;
    }

    const nameElements = toElements(nameNodes);
    const parent = nameElements[0]?.parentElement;

    if (!parent) {
        return;
    }

    const oldVisual = parent.querySelector<HTMLSpanElement>(`:scope > .${VISUAL_CLASS}`);
    const oldMark = parent.querySelector<HTMLSpanElement>(`:scope > .${MARK_CLASS}`);

    // ニックネーム解除: 元の表示に戻す
    if (!nickname) {
        oldVisual?.remove();
        oldMark?.remove();

        for (const element of nameElements) {
            if (element.hasAttribute(HIDDEN_ATTR)) {
                element.style.removeProperty("display");
                element.removeAttribute(HIDDEN_ATTR);
            }
        }

        return;
    }

    const allHidden = nameElements.every((element) => element.hasAttribute(HIDDEN_ATTR));

    // 既に正しい状態なら何もしない(MutationObserver の無限ループ防止)
    if (
        oldVisual &&
        oldMark &&
        allHidden &&
        oldVisual.textContent === nickname &&
        oldVisual.getAttribute("data-nickname-username") === username &&
        oldVisual.nextElementSibling === oldMark
    ) {
        return;
    }

    oldVisual?.remove();
    oldMark?.remove();

    // 非表示にする前に、先頭の名前要素の見た目を取得してコピーする
    const nickSpan = document.createElement("span");

    copyAppearance(nameElements[0], nickSpan);
    nickSpan.classList.add(VISUAL_CLASS);
    nickSpan.textContent = nickname;
    nickSpan.setAttribute("data-nickname-username", username);

    // 「*」は長いニックネームの省略表示(…)で隠れないよう、別要素にする
    const markSpan = document.createElement("span");

    copyAppearance(nameElements[0], markSpan);
    markSpan.classList.add(MARK_CLASS);
    markSpan.textContent = NICKNAME_MARK;

    for (const element of nameElements) {
        element.style.setProperty("display", "none", "important");
        element.setAttribute(HIDDEN_ATTR, "true");
    }

    // 最後の名前要素の直後に「ニックネーム → *」の順で置く
    const lastName = nameElements[nameElements.length - 1];

    lastName.insertAdjacentElement("afterend", nickSpan);
    nickSpan.insertAdjacentElement("afterend", markSpan);
}

function updateAllMatchingUsers(username: string, nickname: string): void {
    const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="/users/"]');

    links.forEach((link) => {
        if (getUsername(link) !== username) {
            return;
        }

        updateUserLink(link, username, nickname);
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

        // 名前がまだ描画されていないリンクは、次回のDOM更新時に再試行する
        if (!getNameNodes(link, username)) {
            return;
        }

        // 1. ニックネーム表示
        //    冪等なので毎回呼んでよい。再描画で元に戻った場合も復元される。
        updateUserLink(link, username, nicknames[username] ?? "");

        // 2. 鉛筆アイコンの挿入
        //    挿入先が後から追加された場合にも対応するため、毎回確認する。
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
