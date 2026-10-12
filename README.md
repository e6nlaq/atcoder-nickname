<div align="center">

# AtCoder Nickname

![](/docs/images/demo.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-fbf0df?style=flat&logo=bun)](https://bun.sh/)
![GitHub Release](https://img.shields.io/github/v/release/e6nlaq/atcoder-nickname?logo=github)
[![Greasy Fork Version](https://img.shields.io/greasyfork/v/?logo=greasyfork&color=green)](https://greasyfork.org/ja/scripts/)
![Greasy Fork Downloads](https://img.shields.io/greasyfork/dt/?label=Total%20Installs)

</div>

---

AtCoder の順位表やユーザーページなどに表示されるユーザー名に、自分だけに見えるニックネームを付けるユーザースクリプトです。

ニックネームはブラウザ内（`localStorage`）にのみ保存され、サーバーには送信されません。他の人の画面には影響しません。

## 機能

- ユーザー名の横の鉛筆アイコンから、ニックネームを設定・変更・解除できる
- ニックネームを設定したユーザーは、表示の末尾に `*` が付く
- 順位表のように動的に書き換わるページでも、ニックネームを維持する

## インストール

ユーザースクリプトを動かすには、[Tampermonkey](https://www.tampermonkey.net/) などのユーザースクリプトマネージャーが必要です。

## 使い方

1. 順位表やユーザーページを開くと、ユーザー名の横に鉛筆アイコンが表示される
2. 鉛筆アイコンをクリックすると、ニックネームの入力ダイアログが開く
3. ニックネームを入力して OK を押すと、そのユーザーの表示が置き換わる
4. キャンセルを押すと、何も変更されない
5. 空欄にして OK を押すと、ニックネームが解除され、元の表示に戻る
   ニックネームの前後の空白は削除されます。

## 設定

ソースコード先頭の定数で、動作を変更できます。

| 定数                  | 初期値                | 内容                                               |
| --------------------- | --------------------- | -------------------------------------------------- |
| `MAX_NICKNAME_LENGTH` | `50`                  | ニックネームの最大文字数。超えた分は切り捨てられる |
| `NICKNAME_MARK`       | `"*"`                 | ニックネーム設定済みユーザーの末尾に付ける印       |
| `STORAGE_KEY`         | `"atcoder_nicknames"` | `localStorage` の保存キー                          |

表示上のニックネームは、最大幅 150px で省略表示（…）されます。変更する場合は、CSS 内の `max-width` を編集してください。

## データの保存について

- ニックネームは `localStorage` に、`{ "ユーザー名": "ニックネーム" }` の JSON 形式で保存される
- ブラウザやパソコンをまたいで同期されない
- ブラウザのサイトデータを削除すると、ニックネームも消える
- 保存に失敗した場合も、開いているページでは変更が反映される。ただし、ページを再読み込みすると元に戻る
  バックアップしたい場合は、ブラウザの開発者ツールのコンソールで、次を実行すると内容を確認できます。

```js
localStorage.getItem("atcoder_nicknames");
```

## 注意点

- ページの構造が AtCoder 側で大きく変わった場合は、動作しなくなる可能性があります

## ライセンス

(C) 2026 e6nlaq

[MIT LICENSE](/LICENSE)
