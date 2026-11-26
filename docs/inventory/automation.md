# Inbentarioaren jarraipen automatikoa

`scripts/continue-inventory.py` scriptak Codexen `account/rateLimits/read`
kontsulta egiten du. `ordinaryUsageAllowed` balioa `true` bada soilik hasten du
lana. Erantzuna ezezaguna bada, saioa amaitzen da eta ez da Git eragiketarik
egiten. Kontsulta horrek une horretako baimena adierazten du; ez du saio osoa
amaitzeko adina token egongo direla bermatzen.

Esku-hartze bakoitzean inbentarioko iturri ofizial **bakarra** aztertzen da.
Codexek aldi baterako worktree batean lan egiten du. Berrikusitako gehikuntza
osoa eta commit bakarra badaude, scriptak `main` adarrera bidaltzen du eta
tokiko checkout-a eguneratzen du. Ondoren, Podmanen `app` eta `scraper` irudiak
berreraikitzen ditu, `app`, `scraper` eta `web` edukiontziak birsortzen ditu,
eta `/health` erantzuna egiaztatzen du. Datu-basea eta bolumen iraunkorrak ez
ditu birsortzen. Scraper berriak abioan hasten du lehen bilketa; fitxak bilketa
amaitutakoan agertzen dira. Akatsa edo saio erdiko muga gertatuz gero, ez da
push egiten. `codex.sh` fitxategi lokala ukitu gabe mantentzen da.

Push egin eta hedapenak huts egiten badu, commit-a `pending-deploy` fitxategian
markatzen da. Hurrengo exekuzioan hedapena berriro saiatzen da beste iturri bat
landu aurretik. Codexen erabilera-baimenik ez badago, exekuzio horrek ere ez du
ezer egiten.

Makina honetako erabiltzailearen cron-ak orduro, `:17` minutuan, exekutatzen du:

```cron
17 * * * * PATH=/opt/node/bin:/usr/local/bin:/usr/bin:/bin /usr/bin/python3 /home/projects/oposaketia/scripts/continue-inventory.py >> /home/iban/.local/state/oposaketia/inventory.log 2>&1
```

Egoera eskuz egiaztatzeko, ezer aldatu gabe:

```sh
python3 scripts/continue-inventory.py --check-only
crontab -l
tail -n 80 ~/.local/state/oposaketia/inventory.log
```

Huts egindako hedapena eskuz errepikatzeko, Codex saioa abiatu gabe:

```sh
python3 scripts/continue-inventory.py --deploy-only
```

Cron-ak erabiltzaile beraren Codex saioa, GitHub-erako sarbidea eta
`/opt/node/bin` PATHean behar ditu. Sare-proxyaren konfigurazioa erabiltzailearen
`~/.config/oposaketia/inventory-env.json` fitxategi pribatuan dago; ez da
biltegian gordetzen. Irudiak eraikitzeko dokumentatutako `npm_ca` sekretua
erabiltzen da, CA fitxategia konfiguratuta badago.
