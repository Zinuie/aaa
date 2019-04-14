Guide d'installation et de configuration de Misskey
================================================================

Nous vous remerçions de l'intrêt que vous manifestez pour l'installation de votre propre instance Misskey !
Ce guide décrit les étapes à suivre afin d'installer et de configurer une instance Misskey.

[La version en japonnais est également disponible sur - 日本語版もあります](./setup.ja.md)

----------------------------------------------------------------

*1.* Création de l'utilisateur Misskey
----------------------------------------------------------------
Executer misskey en tant que super-utilisateur étant une mauvaise idée, nous allons créer un utilisateur dédié.
Sous Debian, par exemple :

```
adduser --disabled-password --disabled-login misskey
```

*2.* Installation des dépendances
----------------------------------------------------------------
Installez les paquets suivants :

#### Dépendences :package:
* **[Node.js](https://nodejs.org/en/)** >= 10.0.0
* **[MongoDB](https://www.mongodb.com/)** >= 3.6

##### Optionnels
* [Redis](https://redis.io/)
  * Redis est optionnel mais nous vous recommandons vivement de l'installer
* [Elasticsearch](https://www.elastic.co/) - requis pour pouvoir activer la fonctionnalité de recherche
* [FFmpeg](https://www.ffmpeg.org/)

*3.* Paramètrage de MongoDB
----------------------------------------------------------------
En root :
1. `mongo` Ouvrez le shell mongo
2. `use misskey` Utilisez la base de données misskey
3. `db.createUser( { user: "misskey", pwd: "<password>", roles: [ { role: "readWrite", db: "misskey" } ] } )` Créez l'utilisateur misskey.
4. `exit` Vous avez terminé !

*4.* Installation de Misskey
----------------------------------------------------------------
1. Basculez vers l'utilisateur misskey.

	`su - misskey`

2. Clonez la branche master du dépôt misskey.

	`git clone -b master git://github.com/syuilo/misskey.git`

3. Accédez au dossier misskey.

	`cd misskey`

4. Checkout sur le tag de la [version la plus récente](https://github.com/syuilo/misskey/releases/latest)

	```bash
	git tag | grep '^10\.' | sort -V --reverse | \
	while read tag_name; do \
	if ! curl -s "https://api.github.com/repos/syuilo/misskey/releases/tags/$tag_name" \
	| grep -qE '"(draft|prerelease)": true'; \
	then git checkout $tag_name; break; fi ; done
	```
 
5. Installez les dépendances de misskey.

	`npm install`

*5.* Création du fichier de configuration
----------------------------------------------------------------
1. Copiez le fichier `.config/example.yml` et renommez-le`default.yml`.

	`cp .config/example.yml .config/default.yml`

2. Editez le fichier `default.yml`

*6.* Construction de Misskey
----------------------------------------------------------------

Construisez Misskey comme ceci :

`NODE_ENV=production npm run build`

Si vous êtes sous Debian, vous serez amené à installer les paquets `build-essential` et `python`.

Si vous rencontrez des erreurs concernant certains modules, utilisez node-gyp:

1. `npm install -g node-gyp`
2. `node-gyp configure`
3. `node-gyp build`
4. `NODE_ENV=production npm run build`

*7.* C'est tout.
----------------------------------------------------------------
Excellent ! Maintenant, vous avez un environnement prêt pour lancer Misskey

### Lancement conventionnel
Lancez tout simplement `NODE_ENV=production npm start`. Bonne chance et amusez-vous bien !

### Démarrage avec systemd

1. Créez un service systemd sur

	`/etc/systemd/system/misskey.service`

2. Editez-le puis copiez et coller ceci dans le fichier :

	```
	[Unit]
	Description=Misskey daemon

	[Service]
	Type=simple
	User=misskey
	ExecStart=/usr/bin/npm start
	WorkingDirectory=/home/misskey/misskey
	Environment="NODE_ENV=production"
	TimeoutSec=60
	StandardOutput=syslog
	StandardError=syslog
	SyslogIdentifier=misskey
	Restart=always

	[Install]
	WantedBy=multi-user.target
	```

3. Redémarre systemd et active le service misskey.

	`systemctl daemon-reload ; systemctl enable misskey`

4. Démarre le service misskey.

	`systemctl start misskey`

Vous pouvez vérifier si le service a démarré en utilisant la commande `systemctl status misskey`.

### Méthode de mise à jour vers la plus récente version de Misskey
1. `git fetch`
2. 　

	```bash
	git tag | grep '^10\.' | sort -V --reverse | \
	while read tag_name; do \
	if ! curl -s "https://api.github.com/repos/syuilo/misskey/releases/tags/$tag_name" \
	| grep -qE '"(draft|prerelease)": true'; \
	then git checkout $tag_name; break; fi ; done
	```
3. `npm install`
4. `NODE_ENV=production npm run build`
5. Consultez [ChangeLog](../CHANGELOG.md) pour les information de migration.

----------------------------------------------------------------

Si vous rencontrez des difficultés ou avez d'autres questions, n'hésitez pas à nous contacter !
