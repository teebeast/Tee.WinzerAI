export interface LexiconEntry {
  term: string
  text: string
}

/** Kurz erklärt – ersetzt das Handbuch. Alphabetisch sortiert. */
export const LEXICON: LexiconEntry[] = [
  {
    term: 'Amtliche Prüfung (AP-Nummer)',
    text: 'Jeder Qualitätswein muss vor dem Verkauf eine amtliche Prüfung bestehen. Erst dann darf er seine Stufe (Kabinett, Spätlese …) tragen. Im Spiel bringt die Prüfung Siegpunkte und ist Voraussetzung für Großhandel, Export und Prämierungen. Ab 5 hl (665 Flaschen).',
  },
  {
    term: 'Auslese',
    text: 'Prädikatswein aus vollreifen Trauben ab 90 °Oechsle. Oft von Hand selektiert, edel und gesucht.',
  },
  {
    term: 'Barrique',
    text: 'Kleines Eichenfass mit 225 Litern. Wein reift darin zwölf Monate, nimmt Röstaromen auf und wird runder – besonders Rotwein profitiert (+6 Güte, Weißwein +2). Der Platz im Barrique ist teuer.',
  },
  {
    term: 'Beerenauslese (BA)',
    text: 'Edelsüßer Wein ab 110 °Oechsle, meist nur möglich, wenn Edelfäule die Beeren konzentriert hat.',
  },
  {
    term: 'Bio-Siegel',
    text: 'Nach zwei Jahren Umstellung lässt sich das Grünblatt-Siegel beantragen, danach die strengeren Verbandssiegel Terravita und Lunaris (biodynamisch). Höhere Stufen bringen bessere Preise und treue Kundschaft, kosten aber Antrags- und Jahresgebühren.',
  },
  {
    term: 'Bio-Weinbau',
    text: 'Verzicht auf synthetische Pflanzenschutzmittel. Der Schutz ist etwas schwächer und teurer. Mit dem Wechsel beginnt die zweijährige Umstellung – danach kann das erste Bio-Siegel beantragt werden.',
  },
  {
    term: 'Edelfäule (Botrytis)',
    text: 'Ein Pilz, der bei wechselhaftem Herbstwetter reife Beeren befällt. Die Beeren schrumpfen, verlieren Wasser – die Menge sinkt stark, aber Zucker und Aroma konzentrieren sich. Grundlage für Beeren- und Trockenbeerenauslesen. Bei Dauerregen wird daraus dagegen schädliche Graufäule.',
  },
  {
    term: 'Eiswein',
    text: 'Die Trauben bleiben bis zum ersten strengen Frost (−7 °C) hängen und werden gefroren gelesen. Das Wasser bleibt als Eis in der Presse zurück, übrig bleibt ein hochkonzentrierter Most. Winzige Menge, riesiger Wert – aber ohne Frost ist alles verloren.',
  },
  {
    term: 'Export',
    text: 'Importeure aus dem Ausland fragen gelegentlich feste Mengen über ein Jahr an. Sie zahlen gut, verlangen aber Liefertreue: Fehlmengen kosten Vertragsstrafe.',
  },
  {
    term: 'Fasswein',
    text: 'Unabgefüllter Wein, der direkt an Großkellereien verkauft wird. Bringt sofort Geld, aber wenig. Der klassische Rettungsanker, wenn die Kasse leer ist.',
  },
  {
    term: 'Kabinett',
    text: 'Leichtester Prädikatswein, ab 73 °Oechsle. Frisch, oft mit feiner Restsüße.',
  },
  {
    term: 'Ernteversicherung',
    text: 'Wird von Januar bis April für das laufende Jahr abgeschlossen und ersetzt 80 % des Ernteschadens durch Frost, Hagel, Dürre und Unwetter. In frostgefährdeten Gebieten ist die Prämie höher.',
  },
  {
    term: 'Frostkerzen',
    text: 'Paraffinkerzen zwischen den Rebzeilen heben in klaren Frostnächten die Temperatur um die entscheidenden Grade. Im April und Mai schützen sie die jungen Triebe vor dem Spätfrost.',
  },
  {
    term: 'Hagelnetz',
    text: 'Engmaschige Netze über den Rebzeilen fangen Hagelkörner ab. Teuer in der Anschaffung, hält aber den Großteil des Schadens ab – mit dem Klimawandel hagelt es häufiger.',
  },
  {
    term: 'Kellermeister',
    text: 'Verantwortlich für Gärung, Ausbau und Abfüllung. Je nach Talent holt er +1 bis +5 Güte aus jedem Jahrgang, mit den Dienstjahren bis zu +2 mehr. Fähigkeiten entscheiden, was im Keller möglich ist: Sekt und Barrique nur mit dem passenden Können, Spezialisten für Rot-, Weiß- oder edelsüße Weine holen zusätzlich Güte heraus.',
  },
  {
    term: 'Kirschessigfliege',
    text: 'Eingeschleppter Schädling, der im Spätsommer vor allem dünnhäutige rote Trauben ansticht. Folgen: Essigfäule und Ernteverlust.',
  },
  {
    term: 'Klimawandel',
    text: 'Es wird wärmer: Trauben reifen früher und zuckerreicher, Hitzewellen nehmen zu, strenge Dezemberfröste – und damit Eiswein – werden seltener. Rotwein gedeiht zunehmend auch in kühlen Gebieten.',
  },
  {
    term: 'Lage',
    text: 'Die genaue Fläche eines Weinbergs mit ihrem Kleinklima, Boden und Hangneigung. Spitzenlagen bringen bessere Weine und kosten bei Versteigerungen entsprechend mehr.',
  },
  {
    term: 'Markttrend',
    text: 'Wie gefragt eine Rebsorte oder Sekt gerade ist – als Preisfaktor zwischen 80 % und 130 % auf alle Verkaufspreise. Trends wandern über viele Monate; weil neue Reben erst im dritten Jahr tragen, ist jede Pflanzung eine Wette auf den Markt von übermorgen.',
  },
  {
    term: 'Oechsle (°Oe)',
    text: 'Maß für das Mostgewicht, also den Zuckergehalt der Trauben. Je mehr Sonne und Reifezeit, desto höher. Entscheidet über die Qualitätsstufe – von Deutschem Wein bis zur Trockenbeerenauslese.',
  },
  {
    term: 'Oidium (Echter Mehltau)',
    text: 'Pilzkrankheit, die bei warm-trockenem Wetter auftritt. Ein grauer Belag überzieht Blätter und Beeren, die Qualität leidet.',
  },
  {
    term: 'Panschen',
    text: 'Verbotenes Strecken oder Aufbessern von Wein – etwa mit Wasser, Zucker oder (wie beim Glykolskandal 1985) mit Frostschutzmittel. Fliegt es auf, droht ein Skandal mit Strafe, Beschlagnahme und Imageschaden.',
  },
  {
    term: 'Peronospora (Falscher Mehltau)',
    text: 'Die gefürchtetste Pilzkrankheit im Weinbau. Breitet sich bei feucht-warmem Wetter aus und kann ganze Ernten vernichten. Pflanzenschutz senkt das Risiko deutlich.',
  },
  {
    term: 'PIWI',
    text: 'Pilzwiderstandsfähige Rebsorten wie Regent oder Solaris. Sie brauchen kaum Pflanzenschutz, gelten bei Kunden aber noch als weniger edel (−10 % im Preis).',
  },
  {
    term: 'Prämierung',
    text: 'Weinwettbewerbe, bei denen Fachjurys Medaillen vergeben – regional im Juni, bundesweit im November. Medaillen bringen Siegpunkte und Bekanntheit.',
  },
  {
    term: 'Qualitätswein',
    text: 'Wein aus einem bestimmten Anbaugebiet, ab 60 °Oechsle und mit amtlicher Prüfung. Die Basis des deutschen Weinrechts.',
  },
  {
    term: 'Sekt',
    text: 'Schaumwein aus zweiter Gärung in der Flasche (traditionelle Flaschengärung). Reift neun Monate auf der Hefe, ist aufwändig – aber ein guter Winzersekt ist gefragt und bringt Punkte.',
  },
  {
    term: 'Spätlese',
    text: 'Prädikatswein aus später gelesenen, reiferen Trauben ab 80 °Oechsle. Der Klassiker unter den deutschen Prädikaten.',
  },
  {
    term: 'Spätfrost',
    text: 'Frost im April oder Mai, wenn die jungen Triebe schon ausgetrieben haben. Erfrorene Triebe tragen kaum Trauben – ein Albtraum für jeden Winzer.',
  },
  {
    term: 'Trockenbeerenauslese (TBA)',
    text: 'Die Krönung: aus edelfaulen, rosinenartig eingeschrumpften Beeren ab 150 °Oechsle. Winzige Mengen, höchste Preise.',
  },
  {
    term: 'Tröpfchenbewässerung',
    text: 'Schläuche geben jeder Rebe gezielt Wasser. Schützt vor Hitzeschäden und Dürre, die mit dem Klimawandel zunehmen.',
  },
  {
    term: 'Vinothek',
    text: 'Verkaufs- und Probierraum direkt am Weingut. Lockt Gäste an und steigert den Ab-Hof-Verkauf.',
  },
  {
    term: 'Weinbergversteigerung',
    text: 'Alle 8–16 Monate kommen Weinberge unter den Hammer, angekündigt einen Monat vorher. Geboten wird live gegen Nachbarn und auswärtige Investoren: Wer bereit ist, am meisten zu zahlen, bekommt den Zuschlag.',
  },
]
