<script lang="ts">
  import { REGIONS, type RegionId } from '../engine/data/regions'

  /** Charakter eines Anbaugebiets in Kurzform */
  let { regionId }: { regionId: RegionId } = $props()

  const region = $derived(REGIONS[regionId])
  const character = $derived(region.character)
  const PRESTIGE = ['Geheimtipp', 'bekannt', 'renommiert', 'weltberühmt']
  const TOURISM = ['kaum Ausflügler', 'einige Ausflügler', 'viele Ausflügler']
  const percent = (factor: number) => `${Math.round(factor * 100)} %`
</script>

<div class="profile">
  <p class="small"><strong>{region.name}:</strong> {character.profile}</p>
  <div class="chips">
    <span class="chip" title="Steillagen: teurere Handarbeit bei Pflege und Lese, dafür mehr Güte">
      ⛰️ Steillagen {percent(character.slope)}
    </span>
    <span class="chip" class:good={character.prestige > 0} class:bad={character.prestige < 0} title="Renommee: wirkt auf die Flaschenpreise">
      👑 {PRESTIGE[character.prestige + 1]}
    </span>
    <span class="chip" class:good={character.tourism > 0} title="Weintourismus: mehr Kundschaft ab Hof">🚲 {TOURISM[character.tourism]}</span>
    <span class="chip" class:good={character.yieldFactor > 1} class:bad={character.yieldFactor < 1} title="Ertragsniveau">
      🌾 Ertrag {percent(character.yieldFactor)}
    </span>
    <span class="chip" title="Bodenpreis: Wert der Weinberge, Kreditrahmen, Versteigerungen">💶 Boden {percent(character.landPrice)}</span>
  </div>
</div>

<style>
  .profile {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .profile p {
    margin: 0;
  }
</style>
