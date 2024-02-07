オリジナルのMisskeyの変更履歴は[CHANGELOG](CHANGELOG.md)をご覧ください。

<!--
## Unlereased
### General

### Client

### Server
-->
## nade 1.4.7
### General
- 2023.12.2の適用に伴いフォークに関するコードも微修正しました

### Client
### Server

## nade 1.4.6
### General

### Client
- CWを開閉するボタンのサイズを小さくしました
  - CWは閲覧注意を意味し、コンテンツを見えなくするもので画面の占有率を下げるため。
### Server
- fix: localHomeTimeline（ローカルのフォロー中ユーザーの投稿範囲がホーム以下のノートも表示するオプション、以降ローカルホームと呼称します）にて自分の投稿が反映されない問題を修正

## nade 1.4.4 & 1.4.5
2023/10/25日時点でMisskey 2023.11.0-betaに含まれるTL系の修正、並びにアバターデコレーションをチェリーピックしました

## nade 1.4.3
### Server
- リストTLもDBへのフォールバックに対応させました

## nade 1.4.2
### Server
- DBフォールバックの方法を本家Misskeyに揃えました

## nade 1.4.0 & 1.4.1
### Server
- タイムラインがRedisにキャッシュされていない際にDBから取得します。

## nade 1.3.5 & nade 1.3.6
### NOTE
nade 1.3.5 is not working
### General
- Misskey 2023.9.1対応のための軽微な修正

## nade 1.3.3 & nade 1.3.4
### General
- Misskey 2023.9.0対応のための軽微な修正

## nade 1.3.1 & nade 1.3.2
### General
- 新着ノート通知機能
  - 取り込みが不足していたので色々追加

## nade 1.3.1
### General
- 新着ノート通知機能
	- 設定→通知にある「ノート通知」から、自分が新着ノート通知を有効にしているユーザー一覧を見ることができます。

-> 導入し忘れていたので導入
## nade 1.3.0
### General
[隠れ家様の実装を一部輸入させて頂きました(ちゃんとcherry-pick)](https://github.com/hideki0403/misskey.yukineko.me)
- feat: ファイル名をランダム化できるように
  - 設定の「ドライブ」または「プライバシー」からONにできます。
  - ONにすると、ファイルのアップロード時にファイル名がランダムな文字列になります。
- 新着ノート通知機能
  - ユーザーがノートを投稿した際に通知を受け取れる機能
	- ユーザーのプロフィールページのメニュー（･･･）にある「ノート通知を有効にする」から有効にできます。


## nade 1.2.4
### General
### Client

### Server
- Fix: ローカルタイムラインにローカルのフォロー中ユーザーの投稿範囲がホーム以下のノートも表示するオプションを有効にした際にページネーションが働かない

### General

### Client
### Server

## nade 1.2.4
### General
### Client

### Server
- Fix: ローカルタイムラインにローカルのフォロー中ユーザーの投稿範囲がホーム以下のノートも表示するオプションを有効にした際にページネーションが働かない
## nade 1.2.2
### General
- ローカルタイムラインにローカルのフォロー中ユーザーの投稿範囲がホーム以下のノートも表示するオプションを追加
### Client

### Server
- Fix: ローカルタイムラインにローカルのフォロー中ユーザーの投稿範囲がホーム以下のノートも表示するオプションを有効にした際にローカルでないユーザーも表示されてしまう （再Fix）

## nade 1.2.1
### General
- ローカルタイムラインにローカルのフォロー中ユーザーの投稿範囲がホーム以下のノートも表示するオプションを追加
### Client

### Server
- Fix: ローカルタイムラインにローカルのフォロー中ユーザーの投稿範囲がホーム以下のノートも表示するオプションを有効にした際にローカルでないユーザーも表示されてしまう

## nade 1.2.0
### General
- ローカルタイムラインにローカルのフォロー中ユーザーの投稿範囲がホーム以下のノートも表示するオプションを追加
### Client

### Server

## nade 1.1.1
### General
- Dockerイメージにてjemallocを利用するように変更
- バージョン表記をmisskey-nade1.1.1のようにハイフン形式を使うように変更

## nade 1.1.0
### General

### Client
- Enhance: ノート検索にローカルのみ検索可能なオプションの追加

### Server
- Fix: ノート検索 `notes/search` にてhostを指定した際に検索結果に反映されるように

## nade 1.0.0
- Just fork