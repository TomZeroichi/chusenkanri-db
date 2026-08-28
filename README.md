# TOM 抽選マネージャー

有料会員向けの抽選管理ツール開発リポジトリです。

## 現在の共有プレビュー

`preview-v2.24.html`

共有URL：
`https://tomzeroichi.github.io/chusenkanri-db/`

## V2.24 の主な内容

- POKÉMON / ONE PIECE / DRAGON BALL / OTHER・TOY のカテゴリ管理
- 複数カテゴリ抽選に対応
- 締切までの日数に応じた色分け
- 会員ごとの未応募 / 結果待ち / 当選 / 購入済み / 受取済み管理
- 完了・落選のアーカイブ
- 運営共通の抽選情報と会員個別進捗を分離
- Supabase Auth + Postgres + RLS を前提とした本番構成
- 商品マスタ管理
- 投稿文貼り付けから抽選情報を解析
- メール連携画面を追加
- 会員ごとのランダムなメール連携IDを表示
- 実際の転送先アドレスは `連携ID@lottery.独自ドメイン` として内部利用
- Joshinの抽選案内メールを複数商品に分割して取り込む設計
- ポケモンセンターオンラインの応募完了 / 当選 / 落選 / 注文完了メールとの自動連携を想定
- メール由来データは本人の進捗へ紐付け、他会員へ個人情報を共有しない設計

## 本番化の構成

- GitHub / GitHub Pages：アプリ本体とバージョン管理
- Supabase：認証、抽選DB、会員個別データ、メール連携ID
- Cloudflare Email Routing / Workers：会員専用転送アドレスの受信とメール解析
- Gmail等：会員が初回のみ自動転送設定

## 次の設定

1. Supabaseプロジェクト作成
2. V2.24用DBセットアップ
3. GitHub Pages版とSupabaseを接続
4. `lottery.` サブドメインをCloudflareへ設定
5. 自分のGmailでJoshin / ポケモンセンターの転送テスト

## 運営メンバー向け確認方法

GitHub Pagesの共有URLをスマホまたはPCで開くと、現在のV2.24を確認できます。
