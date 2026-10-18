// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App.svelte'
import { dailyChallenge, todayKey } from './engine/challenge'
import { newGame } from './engine/game'

/** Alle Spielstände im localStorage (Browser-Ablage) */
function savedGames() {
  return Object.keys(localStorage)
    .filter((k) => k.startsWith('winzer.slot.'))
    .map((k) => JSON.parse(localStorage.getItem(k)!).state)
}

/** Wartet, bis asynchron geladene Spielstände angezeigt werden */
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0))
  flushSync()
}

/** Klick-Tests im simulierten Browser: Bedienen die Knöpfe wirklich das Spiel? */
describe('Bedienung', () => {
  let app: ReturnType<typeof mount>
  let target: HTMLElement

  beforeEach(() => {
    localStorage.clear()
    history.replaceState(null, '', location.pathname) // Unterseite aus der Adresse zurücksetzen
    target = document.createElement('div')
    document.body.append(target)
    app = mount(App, { target })
  })

  afterEach(() => {
    unmount(app)
    target.remove()
  })

  function button(text: string): HTMLButtonElement {
    const found = [...target.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
    if (!found) throw new Error(`Kein Knopf „${text}“ gefunden`)
    return found
  }

  function click(text: string) {
    button(text).click()
    flushSync()
  }

  /** Wechselt auf eine Unterseite (Hof, Weinberg, Keller, Betrieb, Rangliste) */
  function tab(name: string) {
    const found = [...target.querySelectorAll('[role="tab"]')].find((t) => t.textContent?.includes(name))
    if (!found) throw new Error(`Kein Reiter „${name}“ gefunden`)
    ;(found as HTMLButtonElement).click()
    flushSync()
  }

  it('startet ein Spiel und beendet Monate per Klick', () => {
    click('Spiel starten')
    expect(target.textContent).toContain('Januar · Jahr 1')

    click('Monat beenden')
    expect(target.textContent).toContain('Februar · Jahr 1')

    click('Monat beenden')
    expect(target.textContent).toContain('März · Jahr 1')
  })

  it('Aktionen im Spiel verändern den Spielstand', () => {
    click('Spiel starten')
    tab('Betrieb')
    click('Social Media')
    tab('Hof')
    expect(target.textContent).toContain('Social Media: Bekanntheit +')
  })

  it('pflanzen und Kredit aufnehmen funktionieren', () => {
    click('Spiel starten')
    click('Monat beenden')
    click('Monat beenden') // März
    tab('Weinberg')
    click('Pflanzen')
    expect(target.textContent).toContain('Junganlage')

    tab('Betrieb')
    click('Aufnehmen')
    tab('Hof')
    expect(target.textContent).toContain('gepflanzt')
    expect(target.textContent).toContain('Kredit über')
  })

  it('gegen die KI zieht der Gegner automatisch mit', () => {
    // Standardaufstellung: Spieler 1 gegen einen KI-Traditionswinzer
    expect(target.textContent).toContain('KI: Traditionswinzer')
    click('Spiel starten')
    click('Monat beenden')
    expect(target.textContent).toContain('Februar · Jahr 1')
    expect(target.textContent).toContain('Rangliste')
  })

  it('Hot-Seat zeigt bei mehreren Menschen den Übergabebildschirm', () => {
    const kind = target.querySelectorAll<HTMLSelectElement>('select[aria-label="Gesteuert von"]')[1]
    kind.value = 'human'
    kind.dispatchEvent(new Event('change', { bubbles: true })) // wie im Browser – Svelte delegiert Events
    flushSync()
    click('Spiel starten')
    click('Zug beenden')
    expect(target.textContent).toContain('ist am Zug')
    click('Los geht')
    expect(target.textContent).toContain('Zug beenden')
  })

  it('Pflanzenschutz lässt sich umstellen', () => {
    click('Spiel starten')
    tab('Weinberg')
    click('Bio')
    expect(target.textContent).toContain('In Umstellung')
    expect(button('Bio').getAttribute('aria-pressed')).toBe('true')
  })

  it('das Lexikon lässt sich öffnen und durchsuchen', () => {
    click('Spiel starten')
    click('Lexikon')
    const dialog = target.querySelector('dialog')!
    expect(dialog.textContent).toContain('Oechsle')
    const search = dialog.querySelector('input')!
    search.value = 'Kirschessig'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    flushSync()
    expect(dialog.querySelectorAll('dt')).toHaveLength(1)
    expect(dialog.querySelector('dt')!.textContent).toBe('Kirschessigfliege')
  })

  it('Vorspulen überspringt ruhige Monate bis zur nächsten Entscheidung', () => {
    click('Spiel starten')
    click('Vorspulen')
    expect(target.textContent).not.toContain('Januar · Jahr 1')
    expect(target.textContent).toContain('Jetzt zu tun')
  })

  it('die Tages-Challenge startet mit Zeitlimit', () => {
    const { scenario } = dailyChallenge(todayKey())
    expect(target.textContent).toContain(scenario.name)
    click('Challenge starten')
    expect(target.textContent).toContain(`Jahr 1 von ${scenario.years}`)
    expect(target.textContent).toContain('Tages-Challenge')
  })

  it('der Ton lässt sich stummschalten und bleibt gemerkt', () => {
    click('Spiel starten')
    const sound = target.querySelector<HTMLButtonElement>('button[aria-label="Ton ausschalten"]')!
    sound.click()
    flushSync()
    expect(localStorage.getItem('winzer.muted')).toBe('1')
    expect(target.querySelector('button[aria-label="Ton einschalten"]')).not.toBeNull()
  })

  it('Aufgaben auf der Hof-Seite führen zur passenden Unterseite', () => {
    click('Spiel starten')
    click('Monat beenden')
    click('Monat beenden') // März: Pflanzzeit
    expect(target.textContent).toContain('Pflanzzeit')
    click('Weinberg →')
    expect(target.querySelector('[role="tab"][aria-selected="true"]')!.textContent).toContain('Weinberg')
    expect(target.textContent).toContain('Pflanzenschutz')
    expect(location.hash).toBe('#weinberg')
  })

  it('der Keller ist eine eigene Unterseite', () => {
    click('Spiel starten')
    expect(target.textContent).not.toContain('Flaschenlager')
    tab('Keller')
    expect(target.textContent).toContain('Im Tank und im Fass')
    expect(target.textContent).toContain('Flaschenlager')
    expect(target.textContent).not.toContain('Logbuch')
  })

  it('das Endlosspiel startet ohne Punkteziel', () => {
    expect(target.textContent).toContain('WinzerAI')
    const endless = target.querySelector<HTMLInputElement>('input[name="length"][value="endless"]')!
    endless.click()
    flushSync()
    click('Spiel starten')
    expect(target.textContent).toContain('∞ Endlosspiel')
    expect(target.textContent).not.toContain('/ 600')
    const [saved] = savedGames()
    expect(saved.yearLimit).toBeNull()
    expect(saved.targetPoints).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('das Endlosspiel lässt sich auf eine Anzahl Jahre begrenzen', () => {
    target.querySelector<HTMLInputElement>('input[name="length"][value="endless"]')!.click()
    flushSync()
    const slider = target.querySelector<HTMLInputElement>('input[type="range"]')!
    slider.value = '2'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    flushSync()
    expect(target.textContent).toContain('25 Jahre')
    click('Spiel starten')
    expect(target.textContent).toContain('Jahr 1 von 25')
    expect(savedGames()[0].yearLimit).toBe(25)
  })

  it('der Schwierigkeitsgrad bestimmt das Startkapital', () => {
    target.querySelector<HTMLInputElement>('input[name="difficulty"][value="leicht"]')!.click()
    flushSync()
    click('Spiel starten')
    expect(target.textContent).toContain('100.000')
    expect(savedGames()[0].difficulty).toBe('leicht')
  })

  it('die Startseite verlinkt die Lizenzhinweise', () => {
    expect(target.textContent).toContain('frei erfunden')
    click('Lizenzen')
    const dialog = [...target.querySelectorAll('dialog')].find((d) => d.textContent?.includes('Lizenzhinweise'))
    expect(dialog).toBeDefined()
  })

  it('speichert den Spielstand nach jedem Zug', () => {
    click('Spiel starten')
    click('Monat beenden')
    expect(savedGames()).toHaveLength(1)
    expect(savedGames()[0].month).toBe(2)
  })

  it('über das Hauptmenü lässt sich ein Spielstand wieder laden', async () => {
    await settle()
    expect(target.textContent).toContain('Noch keine Spielstände')
    click('Spiel starten')
    click('Monat beenden')
    click('Hauptmenü')
    await settle()
    expect(target.textContent).toContain('Februar, Jahr 1')
    click('Laden')
    expect(target.textContent).toContain('Februar · Jahr 1')
    click('Monat beenden')
    expect(savedGames()).toHaveLength(1)
    expect(savedGames()[0].month).toBe(3)
  })

  it('übernimmt den Spielstand aus älteren Versionen', async () => {
    unmount(app)
    const old = newGame({ seed: 1, players: [{ name: 'Alt', regionId: 'pfalz' }] }) as unknown as Record<string, unknown>
    old.version = 5
    delete old.difficulty
    localStorage.setItem('winzer.save.v1', JSON.stringify(old))
    app = mount(App, { target })
    await settle()
    expect(localStorage.getItem('winzer.save.v1')).toBeNull()
    expect(target.textContent).toContain('Alt')
    click('Laden')
    expect(target.textContent).toContain('Januar · Jahr 1')
    expect(savedGames()[0].difficulty).toBe('normal')
  })
})
