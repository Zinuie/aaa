# Creating plugins
Misskey Webクライアントのプラグイン機能を使うと、クライアントを拡張し、様々な機能を追加できます。 ここではプラグインの作成にあたってのメタデータ定義や、AiScript APIリファレンスを掲載します。

## Metadata
プラグインは、AiScriptのメタデータ埋め込み機能を使って、デフォルトとしてプラグインのメタデータを定義する必要があります。 メタデータは次のプロパティを含むオブジェクトです。

### name
Plugin name

### author
Plugin author

### version
Plugin version.Please enter a number.

### description
Plugin description

### permissions
Permissions required by the plugin.Used when making requests to the Misskey API.

### config
An object representing the plugin's settings. Set the keys to setting names and the values to one of the below properties.

#### type
A string representing the setting's value type.Selected from one of the below types. string number boolean

#### label
Setting name to do display to the user

#### description
Description of the setting

#### default
Default value of the setting

## API Reference
AiScript標準で組み込まれているAPIは掲載しません。

### Mk:dialog(title text type)
ダイアログを表示します。typeには以下の値が設定できます。 info success warn error question 省略すると info になります。

### Mk:confirm(title text type)
確認ダイアログを表示します。typeには以下の値が設定できます。 info success warn error question 省略すると question になります。 ユーザーが"OK"を選択した場合は true を、"キャンセル"を選択した場合は false が返ります。

### Mk:api(endpoint params)
Misskey APIにリクエストします。第一引数にエンドポイント名、第二引数にパラメータオブジェクトを渡します。

### Mk:save(key value)
Persistently save any value under a given key.永続化した値は、AiScriptコンテキストが終了しても残り、Mk:loadで読み取ることができます。

### Mk:load(key)
Reads the value of the given key that was previously saved with Mk:save.

### Plugin:register_post_form_action(title fn)
投稿フォームにアクションを追加します。第一引数にアクション名、第二引数にアクションが選択された際のコールバック関数を渡します。 コールバック関数には、第一引数に投稿フォームオブジェクトが渡されます。

### Plugin:register_note_action(title fn)
ノートメニューに項目を追加します。第一引数に項目名、第二引数に項目が選択された際のコールバック関数を渡します。 コールバック関数には、第一引数に対象のノートオブジェクトが渡されます。

### Plugin:register_user_action(title fn)
ユーザーメニューに項目を追加します。第一引数に項目名、第二引数に項目が選択された際のコールバック関数を渡します。 コールバック関数には、第一引数に対象のユーザーオブジェクトが渡されます。

### Plugin:register_note_view_interruptor(fn)
UIに表示されるノート情報を書き換えます。 コールバック関数には、第一引数に対象のノートオブジェクトが渡されます。 コールバック関数の返り値でノートが書き換えられます。

### Plugin:register_note_post_interruptor(fn)
ノート投稿時にノート情報を書き換えます。 コールバック関数には、第一引数に対象のノートオブジェクトが渡されます。 コールバック関数の返り値でノートが書き換えられます。

### Plugin:open_url(url)
Opens the URL given as first argument in a new browser tab.

### Plugin:config
An object containing the plugin settings.The values entered in the plugin definition are saved under the setting keys.
