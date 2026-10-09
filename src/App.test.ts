// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App.svelte'

/** Klick-Tests im simulierten Browser: Bedienen die Knöpfe wirklich das Spiel? */
describe('Bedienung', () => {
  let app: ReturnType<typeof mount>
  let target: HTMLElement

  beforeEach(() => {
    localStorage.clear()
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
    click('Social Media')
    expect(target.textContent).toContain('Social Media: Bekanntheit +')
  })

  it('pflanzen und Kredit aufnehmen funktionieren', () => {
    click('Spiel starten')
    click('Monat beenden')
    click('Monat beenden') // März
    click('Pflanzen')
    expect(target.textContent).toContain('gepflanzt')

    click('Aufnehmen')
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
    const select = [...target.querySelectorAll('select')].find((s) => s.querySelector('option[value="bio"]'))!
    select.value = 'bio'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    flushSync()
    expect(target.textContent).toContain('In Umstellung')
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
    expect(target.textContent).toContain('Diesen')
  })

  it('die Tages-Challenge startet mit Zeitlimit', () => {
    click('Challenge starten')
    expect(target.textContent).toContain('Jahr 1 von 10')
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

  it('speichert den Spielstand nach jedem Zug', () => {
    click('Spiel starten')
    click('Monat beenden')
    const saved = JSON.parse(localStorage.getItem('winzer.save.v1')!)
    expect(saved.month).toBe(2)
  })
})
