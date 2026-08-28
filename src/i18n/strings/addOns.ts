/**
 * The copy the ADD-ON SEAM added to this app, in all eight locales.
 *
 * ── WHY EVERY KEY HERE STARTS `addon.host.` ─────────────────────────────────
 *
 * Not tidiness — it is what puts this copy on the failing side of the
 * vocabulary gate. That gate scopes itself: strings a retrofit CONTRIBUTED are
 * failed, and an app's pre-existing copy is reported as debt and passed, so
 * that a retrofit does not arrive red on day one over a sentence it did not
 * write. It tells the two apart by prefix, and `addon.` is the prefix both
 * halves of "contributed" already use — an add-on's own bundle registers
 * `addon.<key>.…`, and the copy a host writes AROUND a slot goes under
 * `addon.host.…` in both repos the seam was extracted from.
 *
 * So filing this under, say, `addons.…` would have read as pre-existing debt,
 * every one of these thirty-odd strings would have been reported and none of
 * them could ever fail, and the gate would have looked exactly as green as it
 * does now. That is the difference this prefix makes.
 *
 * ── AND WHAT THE GATE ACTUALLY BANS, FOR THE NEXT TRANSLATOR ────────────────
 *
 * A short list of commercial words, in every language, checked as BYTES rather
 * than as meaning. The list is not spelled out here on purpose: it lives in the
 * kit's own module as an executable rule rather than as a comment that drifts,
 * and `addOns.test.ts` runs it over this file.
 *
 * What a translator needs to know is the shape of the trap. Two of these
 * languages have an ordinary everyday word that happens to spell a banned
 * English run, and the check cannot tell:
 *
 *   CZECH — the preposition `pro` ("for") is one of the banned runs. The Czech
 *   below is written with `na`, `kvůli` and `jelikož` instead. `prostor`,
 *   `pochází` and `připojeno` are fine, because the rule looks for the word
 *   standing alone and not for the letters inside a longer one.
 *
 *   TRADITIONAL CHINESE — `方案`, the natural word for an option or a scheme,
 *   is banned as the spelling of "plan". The zh-TW copy uses `項目` and `設定`.
 *
 * Please keep the equivalent restraint in your own language rather than
 * reaching for the marketing word.
 */

export const addOns = {
  "en-US": {
    /* ── the screen ──────────────────────────────────────────────────────── */
    "addon.host.nav": "Add-ons",
    "addon.host.title": "Add-ons",
    "addon.host.subtitle":
      "What this workspace has connected, and what each one is allowed to do here.",
    "addon.host.empty.title": "Nothing is connected",
    "addon.host.empty.body":
      "No add-on is compiled into this build. Everything on the leave screens comes from this app's own data.",
    "addon.host.supplying.none": "No day on the calendar comes from an add-on.",
    "addon.host.supplying.days":
      "{count} day on this calendar comes from an add-on.|{count} days on this calendar come from an add-on.",
    "addon.host.state.on": "Connected",
    "addon.host.state.off": "Not connected",
    "addon.host.manage": "Manage",
    "addon.host.connect": "Connect",

    /* ── the closed category vocabulary ──────────────────────────────────── */
    "addon.host.category.data": "Data",
    "addon.host.category.artwork": "Artwork",
    "addon.host.category.delivery": "Delivery",
    "addon.host.category.payments": "Payments",
    "addon.host.category.email": "Email",

    /* ── who else is involved, and where a day came from ─────────────────── */
    "addon.host.notAffiliated": "Adminium is not affiliated with this company.",
    "addon.host.provided": "from an add-on",
    "addon.host.provided.title":
      "This day was supplied by a connected add-on, not by this workspace.",

    /* ── the manage drawer ───────────────────────────────────────────────── */
    "addon.host.manage.title": "Manage {name}",
    "addon.host.manage.what": "What it does",
    "addon.host.manage.permissions": "What it may do here",
    "addon.host.manage.noPermissions": "Nothing. It reads no record here and writes none.",
    "addon.host.manage.settings": "Settings",
    "addon.host.manage.noSettings": "This one has nothing to set here.",
    "addon.host.manage.activity": "Activity",
    "addon.host.manage.noActivity": "Nothing recorded yet.",
    "addon.host.manage.activitySeeded":
      "These lines are seeded for the demo. A real deployment reads them from the audit log.",

    /*
     * ── disconnecting (24 D16) ───────────────────────────────────────────
     *
     * THREE SENTENCES, AND THIS APP OWNS EXACTLY ONE OF THEM.
     *
     * `hostEffect` is what disconnecting does to THIS APP'S SCREENS, which is
     * the only part of the answer this app is entitled to give: the add-on
     * knows what it stored and this app does not, so what SURVIVES is the
     * add-on's sentence and it is printed out of the add-on's own bundle.
     *
     * It exists because the add-on's own line — "every day already imported
     * stays exactly where it is" — is true of the add-on's document and could
     * be read, on a leave calendar, as "stays on the calendar". It does not:
     * this app stops counting an add-on's days the moment it is switched off,
     * because an app still doing arithmetic on data from something that is off
     * is not the app that shipped before the seam (24 D6), and the one screen
     * that could show or remove those days has just been removed. Both facts
     * are true and a person is owed both.
     *
     * The `*Fallback` pair below is for an add-on that supplies neither of its
     * own sentences. It is deliberately narrower than what an add-on can say —
     * it claims only that this app deletes nothing, which is a fact about
     * `disconnectAddOn` — because a host inventing a reassurance about somebody
     * else's storage is a host making a promise it cannot keep.
     */
    "addon.host.disconnect": "Disconnect",
    "addon.host.disconnect.hostEffect":
      "In this app: its screens go, and every day it supplies comes off the calendar until it is connected again.",
    "addon.host.disconnect.confirm": "Yes, disconnect",
    "addon.host.disconnect.cancel": "Keep it connected",
    "addon.host.disconnect.goesFallback":
      "Its screens go, and any day it supplies comes off the calendar.",
    "addon.host.disconnect.staysFallback":
      "Nothing it has stored is deleted. Connect it again and everything is where it was.",
  },

  "de-DE": {
    "addon.host.nav": "Add-ons",
    "addon.host.title": "Add-ons",
    "addon.host.subtitle":
      "Was dieser Arbeitsbereich angebunden hat und was jedes davon hier darf.",
    "addon.host.empty.title": "Nichts angebunden",
    "addon.host.empty.body":
      "In diesen Build ist kein Add-on einkompiliert. Alles auf den Urlaubsseiten stammt aus den eigenen Daten dieser Anwendung.",
    "addon.host.supplying.none": "Kein Tag im Kalender stammt aus einem Add-on.",
    "addon.host.supplying.days":
      "{count} Tag in diesem Kalender stammt aus einem Add-on.|{count} Tage in diesem Kalender stammen aus einem Add-on.",
    "addon.host.state.on": "Angebunden",
    "addon.host.state.off": "Nicht angebunden",
    "addon.host.manage": "Verwalten",
    "addon.host.connect": "Anbinden",

    "addon.host.category.data": "Daten",
    "addon.host.category.artwork": "Druckvorlagen",
    "addon.host.category.delivery": "Versand",
    "addon.host.category.payments": "Zahlungen",
    "addon.host.category.email": "E-Mail",

    "addon.host.notAffiliated": "Adminium steht in keiner Verbindung zu diesem Unternehmen.",
    "addon.host.provided": "aus einem Add-on",
    "addon.host.provided.title":
      "Dieser Tag stammt aus einem angebundenen Add-on, nicht aus diesem Arbeitsbereich.",

    "addon.host.manage.title": "{name} verwalten",
    "addon.host.manage.what": "Was es tut",
    "addon.host.manage.permissions": "Was es hier darf",
    "addon.host.manage.noPermissions":
      "Nichts. Es liest hier keinen Datensatz und schreibt keinen.",
    "addon.host.manage.settings": "Einstellungen",
    "addon.host.manage.noSettings": "Hier gibt es nichts einzustellen.",
    "addon.host.manage.activity": "Verlauf",
    "addon.host.manage.noActivity": "Noch nichts aufgezeichnet.",
    "addon.host.manage.activitySeeded":
      "Diese Zeilen sind für die Demo hinterlegt. Eine echte Installation liest sie aus dem Prüfprotokoll.",

    "addon.host.disconnect": "Trennen",
    "addon.host.disconnect.hostEffect":
      "In dieser Anwendung: Seine Oberflächen verschwinden, und jeder Tag, den es liefert, fällt aus dem Kalender, bis es wieder angebunden wird.",
    "addon.host.disconnect.confirm": "Ja, trennen",
    "addon.host.disconnect.cancel": "Angebunden lassen",
    "addon.host.disconnect.goesFallback":
      "Seine Oberflächen verschwinden, und jeder Tag, den es liefert, fällt aus dem Kalender.",
    "addon.host.disconnect.staysFallback":
      "Nichts von dem, was es gespeichert hat, wird gelöscht. Beim erneuten Anbinden ist alles wieder da.",
  },

  "fr-FR": {
    "addon.host.nav": "Modules",
    "addon.host.title": "Modules",
    "addon.host.subtitle":
      "Ce que cet espace de travail a connecté, et ce que chacun a le droit de faire ici.",
    "addon.host.empty.title": "Rien n'est connecté",
    "addon.host.empty.body":
      "Aucun module n'est compilé dans cette version. Tout ce qui apparaît sur les écrans de congés vient des données propres à cette application.",
    "addon.host.supplying.none": "Aucun jour du calendrier ne vient d'un module.",
    "addon.host.supplying.days":
      "{count} jour de ce calendrier vient d'un module.|{count} jours de ce calendrier viennent d'un module.",
    "addon.host.state.on": "Connecté",
    "addon.host.state.off": "Non connecté",
    "addon.host.manage": "Gérer",
    "addon.host.connect": "Connecter",

    "addon.host.category.data": "Données",
    "addon.host.category.artwork": "Fichiers d'impression",
    "addon.host.category.delivery": "Livraison",
    "addon.host.category.payments": "Paiements",
    "addon.host.category.email": "E-mail",

    "addon.host.notAffiliated": "Adminium n'est pas affilié à cette société.",
    "addon.host.provided": "d'un module",
    "addon.host.provided.title":
      "Ce jour vient d'un module connecté, pas de cet espace de travail.",

    "addon.host.manage.title": "Gérer {name}",
    "addon.host.manage.what": "Ce qu'il fait",
    "addon.host.manage.permissions": "Ce qu'il a le droit de faire ici",
    "addon.host.manage.noPermissions":
      "Rien. Il ne lit aucun enregistrement ici et n'en écrit aucun.",
    "addon.host.manage.settings": "Réglages",
    "addon.host.manage.noSettings": "Celui-ci n'a rien à régler ici.",
    "addon.host.manage.activity": "Historique",
    "addon.host.manage.noActivity": "Rien d'enregistré pour l'instant.",
    "addon.host.manage.activitySeeded":
      "Ces lignes sont pré-remplies pour la démonstration. Une installation réelle les lit dans le journal d'audit.",

    "addon.host.disconnect": "Déconnecter",
    "addon.host.disconnect.hostEffect":
      "Dans cette application : ses écrans disparaissent, et tout jour qu'il fournit sort du calendrier jusqu'à ce qu'il soit reconnecté.",
    "addon.host.disconnect.confirm": "Oui, déconnecter",
    "addon.host.disconnect.cancel": "Garder la connexion",
    "addon.host.disconnect.goesFallback":
      "Ses écrans disparaissent, et tout jour qu'il fournit sort du calendrier.",
    "addon.host.disconnect.staysFallback":
      "Rien de ce qu'il a enregistré n'est supprimé. Reconnectez-le et tout sera là où il était.",
  },

  "cs-CZ": {
    "addon.host.nav": "Doplňky",
    "addon.host.title": "Doplňky",
    "addon.host.subtitle":
      "Co má tento pracovní prostor připojeno a co každý z nich zde smí dělat.",
    "addon.host.empty.title": "Nic není připojeno",
    "addon.host.empty.body":
      "V tomto sestavení není zabudován žádný doplněk. Vše na obrazovkách dovolené pochází z vlastních dat této aplikace.",
    "addon.host.supplying.none": "Žádný den v kalendáři nepochází z doplňku.",
    "addon.host.supplying.days":
      "{count} den v tomto kalendáři pochází z doplňku.|{count} dny v tomto kalendáři pocházejí z doplňku.|{count} dnů v tomto kalendáři pochází z doplňku.",
    "addon.host.state.on": "Připojeno",
    "addon.host.state.off": "Nepřipojeno",
    "addon.host.manage": "Spravovat",
    "addon.host.connect": "Připojit",

    "addon.host.category.data": "Data",
    "addon.host.category.artwork": "Tiskové podklady",
    "addon.host.category.delivery": "Doručení",
    "addon.host.category.payments": "Platby",
    "addon.host.category.email": "E-mail",

    "addon.host.notAffiliated": "Adminium nemá s touto společností žádné spojení.",
    "addon.host.provided": "z doplňku",
    "addon.host.provided.title":
      "Tento den dodal připojený doplněk, nikoli tento pracovní prostor.",

    "addon.host.manage.title": "Spravovat {name}",
    "addon.host.manage.what": "Co dělá",
    "addon.host.manage.permissions": "Co zde smí",
    "addon.host.manage.noPermissions":
      "Nic. Nečte zde žádný záznam ani žádný nezapisuje.",
    "addon.host.manage.settings": "Nastavení",
    "addon.host.manage.noSettings": "Tento doplněk zde nemá co nastavovat.",
    "addon.host.manage.activity": "Historie",
    "addon.host.manage.noActivity": "Zatím nic zaznamenáno.",
    "addon.host.manage.activitySeeded":
      "Tyto řádky jsou přednastavené kvůli ukázce. Skutečná instalace je čte z auditního záznamu.",

    "addon.host.disconnect": "Odpojit",
    "addon.host.disconnect.hostEffect":
      "V této aplikaci: jeho obrazovky zmizí a každý den, který dodává, zmizí z kalendáře, dokud nebude znovu připojen.",
    "addon.host.disconnect.confirm": "Ano, odpojit",
    "addon.host.disconnect.cancel": "Nechat připojené",
    "addon.host.disconnect.goesFallback":
      "Jeho obrazovky zmizí a každý den, který dodává, zmizí z kalendáře také.",
    "addon.host.disconnect.staysFallback":
      "Nic z toho, co uložil, se nesmaže. Po opětovném připojení bude vše tam, kde bylo.",
  },

  "da-DK": {
    "addon.host.nav": "Tilføjelser",
    "addon.host.title": "Tilføjelser",
    "addon.host.subtitle":
      "Hvad dette arbejdsområde har forbundet, og hvad hver enkelt må her.",
    "addon.host.empty.title": "Intet er forbundet",
    "addon.host.empty.body":
      "Der er ingen tilføjelser bygget ind i denne udgave. Alt på ferieskærmene kommer fra appens egne data.",
    "addon.host.supplying.none": "Ingen dag i kalenderen kommer fra en tilføjelse.",
    "addon.host.supplying.days":
      "{count} dag i denne kalender kommer fra en tilføjelse.|{count} dage i denne kalender kommer fra en tilføjelse.",
    "addon.host.state.on": "Forbundet",
    "addon.host.state.off": "Ikke forbundet",
    "addon.host.manage": "Administrer",
    "addon.host.connect": "Forbind",

    "addon.host.category.data": "Data",
    "addon.host.category.artwork": "Trykfiler",
    "addon.host.category.delivery": "Levering",
    "addon.host.category.payments": "Betalinger",
    "addon.host.category.email": "E-mail",

    "addon.host.notAffiliated": "Adminium er ikke tilknyttet dette firma.",
    "addon.host.provided": "fra en tilføjelse",
    "addon.host.provided.title":
      "Denne dag kommer fra en forbundet tilføjelse, ikke fra dette arbejdsområde.",

    "addon.host.manage.title": "Administrer {name}",
    "addon.host.manage.what": "Hvad den gør",
    "addon.host.manage.permissions": "Hvad den må her",
    "addon.host.manage.noPermissions":
      "Ingenting. Den læser ingen data her og skriver ingen.",
    "addon.host.manage.settings": "Indstillinger",
    "addon.host.manage.noSettings": "Denne har ikke noget at indstille her.",
    "addon.host.manage.activity": "Historik",
    "addon.host.manage.noActivity": "Intet registreret endnu.",
    "addon.host.manage.activitySeeded":
      "Disse linjer er lagt ind til demoen. En rigtig installation læser dem fra revisionssporet.",

    "addon.host.disconnect": "Afbryd",
    "addon.host.disconnect.hostEffect":
      "I denne app: Dens skærme forsvinder, og enhver dag den leverer, ryger ud af kalenderen, indtil den forbindes igen.",
    "addon.host.disconnect.confirm": "Ja, afbryd",
    "addon.host.disconnect.cancel": "Behold forbindelsen",
    "addon.host.disconnect.goesFallback":
      "Dens skærme forsvinder, og enhver dag den leverer, ryger ud af kalenderen.",
    "addon.host.disconnect.staysFallback":
      "Intet af det, den har gemt, bliver slettet. Forbind igen, og alt er, hvor det var.",
  },

  "zh-CN": {
    "addon.host.nav": "扩展",
    "addon.host.title": "扩展",
    "addon.host.subtitle": "这个工作区连接了什么，以及每一项在这里可以做什么。",
    "addon.host.empty.title": "尚未连接任何扩展",
    "addon.host.empty.body":
      "此构建中没有编入任何扩展。休假页面上的一切都来自本应用自己的数据。",
    "addon.host.supplying.none": "日历上没有任何一天来自扩展。",
    "addon.host.supplying.days": "此日历上有 {count} 天来自扩展。",
    "addon.host.state.on": "已连接",
    "addon.host.state.off": "未连接",
    "addon.host.manage": "管理",
    "addon.host.connect": "连接",

    "addon.host.category.data": "数据",
    "addon.host.category.artwork": "印刷稿",
    "addon.host.category.delivery": "配送",
    "addon.host.category.payments": "支付",
    "addon.host.category.email": "邮件",

    "addon.host.notAffiliated": "Adminium 与该公司没有任何关联。",
    "addon.host.provided": "来自扩展",
    "addon.host.provided.title": "这一天由已连接的扩展提供，不是本工作区自己的。",

    "addon.host.manage.title": "管理 {name}",
    "addon.host.manage.what": "它做什么",
    "addon.host.manage.permissions": "它在这里可以做什么",
    "addon.host.manage.noPermissions": "什么都不做。它在这里不读取任何记录，也不写入任何记录。",
    "addon.host.manage.settings": "设置",
    "addon.host.manage.noSettings": "这一项在这里没有可设置的内容。",
    "addon.host.manage.activity": "记录",
    "addon.host.manage.noActivity": "暂时没有记录。",
    "addon.host.manage.activitySeeded":
      "这些内容是为演示预置的。真实部署会从审计日志中读取。",

    "addon.host.disconnect": "断开连接",
    "addon.host.disconnect.hostEffect":
      "在本应用中：它的界面会消失，它提供的每一天也会从日历上移除，直到再次连接为止。",
    "addon.host.disconnect.confirm": "是的，断开连接",
    "addon.host.disconnect.cancel": "保持连接",
    "addon.host.disconnect.goesFallback":
      "它的界面会消失，它提供的每一天也会从日历上移除。",
    "addon.host.disconnect.staysFallback":
      "它保存的内容不会被删除。再次连接后，一切都还在原处。",
  },

  "zh-TW": {
    "addon.host.nav": "擴充",
    "addon.host.title": "擴充",
    "addon.host.subtitle": "這個工作區連接了什麼，以及每一項在這裡可以做什麼。",
    "addon.host.empty.title": "尚未連接任何擴充",
    "addon.host.empty.body":
      "此組建中沒有編入任何擴充。休假頁面上的一切都來自本應用自己的資料。",
    "addon.host.supplying.none": "行事曆上沒有任何一天來自擴充。",
    "addon.host.supplying.days": "此行事曆上有 {count} 天來自擴充。",
    "addon.host.state.on": "已連接",
    "addon.host.state.off": "未連接",
    "addon.host.manage": "管理",
    "addon.host.connect": "連接",

    "addon.host.category.data": "資料",
    "addon.host.category.artwork": "印刷稿",
    "addon.host.category.delivery": "配送",
    "addon.host.category.payments": "支付",
    "addon.host.category.email": "郵件",

    "addon.host.notAffiliated": "Adminium 與該公司沒有任何關聯。",
    "addon.host.provided": "來自擴充",
    "addon.host.provided.title": "這一天由已連接的擴充提供，不是本工作區自己的。",

    "addon.host.manage.title": "管理 {name}",
    "addon.host.manage.what": "它做什麼",
    "addon.host.manage.permissions": "它在這裡可以做什麼",
    "addon.host.manage.noPermissions": "什麼都不做。它在這裡不讀取任何記錄，也不寫入任何記錄。",
    "addon.host.manage.settings": "設定",
    "addon.host.manage.noSettings": "這一項在這裡沒有可設定的內容。",
    "addon.host.manage.activity": "記錄",
    "addon.host.manage.noActivity": "目前沒有記錄。",
    "addon.host.manage.activitySeeded":
      "這些內容是為示範預先放入的。真實部署會從稽核日誌中讀取。",

    "addon.host.disconnect": "中斷連接",
    "addon.host.disconnect.hostEffect":
      "在本應用中：它的介面會消失，它提供的每一天也會從行事曆上移除，直到再次連接為止。",
    "addon.host.disconnect.confirm": "是的，中斷連接",
    "addon.host.disconnect.cancel": "保持連接",
    "addon.host.disconnect.goesFallback":
      "它的介面會消失，它提供的每一天也會從行事曆上移除。",
    "addon.host.disconnect.staysFallback":
      "它儲存的內容不會被刪除。再次連接後，一切都還在原處。",
  },

  "ar-EG": {
    "addon.host.nav": "الإضافات",
    "addon.host.title": "الإضافات",
    "addon.host.subtitle":
      "ما الذي ربطته مساحة العمل هذه، وما الذي يُسمح لكل إضافة بفعله هنا.",
    "addon.host.empty.title": "لا شيء مرتبط",
    "addon.host.empty.body":
      "لا توجد أي إضافة مُدمجة في هذه النسخة. كل ما يظهر في شاشات الإجازات يأتي من بيانات التطبيق نفسه.",
    "addon.host.supplying.none": "لا يوجد يوم في التقويم مصدره إضافة.",
    "addon.host.supplying.days":
      "لا يوجد يوم في هذا التقويم مصدره إضافة.|يوم واحد في هذا التقويم مصدره إضافة.|يومان في هذا التقويم مصدرهما إضافة.|{count} أيام في هذا التقويم مصدرها إضافة.|{count} يومًا في هذا التقويم مصدرها إضافة.|{count} يوم في هذا التقويم مصدره إضافة.",
    "addon.host.state.on": "مرتبط",
    "addon.host.state.off": "غير مرتبط",
    "addon.host.manage": "إدارة",
    "addon.host.connect": "ربط",

    "addon.host.category.data": "بيانات",
    "addon.host.category.artwork": "ملفات الطباعة",
    "addon.host.category.delivery": "التوصيل",
    "addon.host.category.payments": "المدفوعات",
    "addon.host.category.email": "البريد",

    "addon.host.notAffiliated": "لا علاقة لـ Adminium بهذه الشركة.",
    "addon.host.provided": "من إضافة",
    "addon.host.provided.title":
      "هذا اليوم جاء من إضافة مرتبطة، وليس من مساحة العمل هذه.",

    "addon.host.manage.title": "إدارة {name}",
    "addon.host.manage.what": "ماذا تفعل",
    "addon.host.manage.permissions": "ما المسموح لها هنا",
    "addon.host.manage.noPermissions": "لا شيء. لا تقرأ أي سجل هنا ولا تكتب أي سجل.",
    "addon.host.manage.settings": "الإعدادات",
    "addon.host.manage.noSettings": "لا يوجد ما يُضبط هنا لهذه الإضافة.",
    "addon.host.manage.activity": "السجل",
    "addon.host.manage.noActivity": "لم يُسجَّل شيء بعد.",
    "addon.host.manage.activitySeeded":
      "هذه السطور موضوعة مسبقًا للعرض التوضيحي. التثبيت الحقيقي يقرأها من سجل التدقيق.",

    "addon.host.disconnect": "فصل",
    "addon.host.disconnect.hostEffect":
      "في هذا التطبيق: تختفي شاشاتها، وكل يوم توفره يخرج من التقويم حتى يُعاد ربطها.",
    "addon.host.disconnect.confirm": "نعم، افصل",
    "addon.host.disconnect.cancel": "أبقِ الارتباط",
    "addon.host.disconnect.goesFallback":
      "تختفي شاشاتها، وكل يوم توفره يخرج من التقويم.",
    "addon.host.disconnect.staysFallback":
      "لا يُحذف أي شيء حفظته. أعد ربطها وسيكون كل شيء كما كان.",
  },
};
