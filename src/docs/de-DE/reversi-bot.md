# Entwicklung eines Misskey Reversi-Bots
Misskeyのリバーシ機能に対応したBotの開発方法をここに記します。

1. `games/reversi`ストリームに以下のパラメータを付けて接続する:
    * `i`: API-Schlüssel des Bot-Kontos

2. 対局への招待が来たら、ストリームから`invited`イベントが流れてくる
    * イベントの中身に、`parent`という名前で対局へ誘ってきたユーザーの情報が含まれている

3. `games/reversi/match`へ、`user_id`として`parent`の`id`が含まれたリクエストを送信する

4. 上手くいくとゲーム情報が返ってくるので、`games/reversi-game`ストリームへ、以下のパラメータを付けて接続する:
    * `i`: API-Schlüssel des Bot-Kontos
    * `game`: Zum `game` gehörige `id`

5. この間、相手がゲームの設定を変更するとその都度`update-settings`イベントが流れてくるので、必要であれば何かしらの処理を行う

6. 設定に満足したら、`{ type: 'accept' }`メッセージをストリームに送信する

7. ゲームが開始すると、`started`イベントが流れてくる
    * イベントの中身にはゲーム情報が含まれている

8. 石を打つには、ストリームに`{ type: 'set', pos: <位置> }`を送信する(位置の計算方法は後述)

9. Setzt der Gegner oder du einen Stein, wird das `set`-Event vom Stream gesendet
    * Die Farbe der Spielfigur ist als `color` enthalten
    * Die Position der Spielfigur ist als `pos` enthalten

## Positionsberechnungen
Im Falle eines 8x8 Spielbrettes sind die Felder wie folgt aufgestellt (jeweils mit ihrem Index versehen):
```
+--+--+--+--+--+--+--+--+
| 0| 1| 2| 3| 4| 5| 6| 7|
+--+--+--+--+--+--+--+--+
| 8| 9|10|11|12|13|14|15|
+--+--+--+--+--+--+--+--+
|16|17|18|19|20|21|22|23|
...
```

### Berechnung von Indizes durch X und Y Koordinaten
```
pos = x + (y * mapWidth)
```
Bei `mapWidth` handelt es sich um wie folgt aus `map` entnommene Spielbrettdaten:
```
mapWidth = map[0].length
```

### Berechnung der X und Y Koordinaten durch Indizes
```
x = pos % mapWidth
y = Math.floor(pos / mapWidth)
```

## Spielbrettdaten
Die Spielbrettdaten sind innerhalb vom in den Spieldaten enthaltenen `map`-Attribut gespeichert. Da das Spielbrett als Array von Zeichenketten representiert wird, steht jedes Symbol für ein Spielfeld. Basierend auf diesen Informationen lässt sich der Spielbrettzustand rekonstruieren.
* `(Leer)` ... Kein Spielfeld
* `-` ... Spielfeld
* `b` ... Spielfeld auf dem zuerst platzierter Stein schwarz war
* `w` ... Spielfeld auf dem zuerst platzierter Stein weiß war

Sei folgendes simple 4*4 Spielbrett als Beispiel gegeben:
```text
+---+---+---+---+
|   |   |   |   |
+---+---+---+---+
|   | ○ | ● |   |
+---+---+---+---+
|   | ● | ○ |   |
+---+---+---+---+
|   |   |   |   |
+---+---+---+---+
```

In diesem Fall sehen die Spielbrettdaten wie folgt aus:
```javascript
['----', '-wb-', '-bw-', '----']
```

## ユーザーにフォームを提示して対話可能Botを作成する
ユーザーとのコミュニケーションを行うため、ゲームの設定画面でユーザーにフォームを提示することができます。 例えば、Botの強さをユーザーが設定できるようにする、といったシナリオが考えられます。

フォームを提示するには、`reversi-game`ストリームに次のメッセージを送信します:
```javascript
{
  type: 'init-form',
  body: [フォームコントロールの配列]
}
```

フォームコントロールの配列については今から説明します。 フォームコントロールは、次のようなオブジェクトです:
```javascript
{
  id: 'switch1',
  type: 'switch',
  label: 'Enable hoge',
  value: false
}
```
`id` ... コントロールのID。 `type` ... コントロールの種類。後述します。 `label` ... コントロールと一緒に表記するテキスト。 `value` ... コントロールのデフォルト値。

### フォームの操作を受け取る
ユーザーがフォームを操作すると、ストリームから`update-form`イベントが流れてきます。 イベントの中身には、コントロールのIDと、ユーザーが設定した値が含まれています。 例えば、上で示したスイッチをユーザーがオンにしたとすると、次のイベントが流れてきます:
```javascript
{
  id: 'switch1',
  value: true
}
```

### フォームコントロールの種類
#### Schalter
type: `switch` Zeigt einen Schalter an.何かの機能をオン/オフさせたい場合に有用です。

##### Attribute
`label` ... Auf dem Schalter anzuzeigender Text.

#### Optionsfeld
type: `radio` Zeigt ein Optionsfeld an.選択肢を提示するのに有用です。例えば、Botの強さを設定させるなどです。

##### Attribute
`items` ... Die verfügbaren Optionen.z.B.:
```javascript
items: [{
  label: '弱',
  value: 1
}, {
  label: '中',
  value: 2
}, {
  label: '強',
  value: 3
}]
```

#### Schieberegler
type: `slider` Zeigt einen Schieberegler an.

##### Attribute
`min` ... スライダーの下限。 `max` ... スライダーの上限。 `step` ... 入力欄で刻むステップ値。

#### Textbox
type: `textbox` Zeigt eine Textbox an.ユーザーになにか入力させる一般的な用途に利用できます。

## Dem Benutzer Nachrichten zeigen
設定画面でユーザーと対話する、フォーム以外のもうひとつの方法がこれです。ユーザーになにかメッセージを表示することができます。 例えば、ユーザーがBotの対応していないモードやマップを選択したとき、警告を表示するなどです。 メッセージを表示するには、次のメッセージをストリームに送信します:
```javascript
{
  type: 'message',
  body: {
    text: 'メッセージ内容',
    type: 'メッセージの種類'
  }
}
```
Nachrichtentypen: `success`, `info`, `warning`, `error`。

## Aufgeben
Um aufzugeben, sende eine Anfrage an <a href="./api/endpoints/games/reversi/games/surrender">diesen Endpunkt</a>.
