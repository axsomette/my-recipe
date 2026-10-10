import { useState } from 'preact/hooks';
import { AvecCatalogue, type Monde } from '../components/AvecCatalogue';
import { Icone } from '../components/Icone';
import { Frise } from '../components/Saison';
import { Vignette } from '../components/Vignette';
import { INITIALES_MOIS, NOMS_MOIS, majuscule, moisCourant } from '../lib/calendrier';
import { deSaison } from '../lib/catalogue';
import { NOMS_CATEGORIES, NOMS_COURTS_CATEGORIES, ORDRE_CATEGORIES, estDuGardeManger } from '../lib/categories';
import { plagesDeMois } from '../lib/saison';
import type { CategorieId, Legume } from '../lib/types';
import { useLarge } from '../lib/useLarge';


const moisSuivant = (m: number) => (m === 12 ? 1 : m + 1);
const moisPrecedent = (m: number) => (m === 1 ? 12 : m - 1);
const valeursBinaires = (l: Legume) => Array.from({ length: 12 }, (_, i) => (l.mois.includes(i + 1) ? 1 : 0));
const decrireMois = (l: Legume) =>
  plagesDeMois(l.mois)
    .map(([a, b]) => (a === b ? NOMS_MOIS[a - 1] : `${NOMS_MOIS[a - 1]} à ${NOMS_MOIS[b - 1]}`))
    .join(', ');

function Legende({ mois }: { mois: number }) {
  return (
    <p class="flex flex-wrap gap-3.5 text-sm text-encre-2">
      <span class="inline-flex items-center gap-1.5">
        <i class="inline-block size-3 rounded-[3px] bg-saison" aria-hidden="true" />
        de saison
      </span>
      <span class="inline-flex items-center gap-1.5">
        <i class="inline-block size-3 rounded-[3px] bg-creux" aria-hidden="true" />
        hors saison
      </span>
      <span class="inline-flex items-center gap-1.5">
        <i class="inline-block size-3 rounded-[3px] shadow-[inset_0_0_0_2px_var(--encre)]" aria-hidden="true" />
        {NOMS_MOIS[mois - 1]}
      </span>
    </p>
  );
}

function Filtres({ choix, onChoisir, compte }: { choix: CategorieId | 'tout'; onChoisir: (c: CategorieId | 'tout') => void; compte: (c: CategorieId) => number }) {
  return (
    <div class="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" role="group" aria-label="Catégorie">
      <button type="button" class="filtre" aria-pressed={choix === 'tout'} onClick={() => onChoisir('tout')}>
        Tout
      </button>
      {ORDRE_CATEGORIES.filter((c) => compte(c) > 0).map((c) => (
        <button key={c} type="button" class="filtre" aria-pressed={choix === c} onClick={() => onChoisir(c)}>
          {NOMS_COURTS_CATEGORIES[c]} · {compte(c)}
        </button>
      ))}
    </div>
  );
}

/** Téléphone et tablette portrait : les produits de saison d'un mois, mois par mois. */
function ParMois({ monde }: { monde: Monde }) {
  const [mois, setMois] = useState(moisCourant);
  const [categorie, setCategorie] = useState<CategorieId | 'tout'>('tout');
  const saisonniers = monde.legumes.filter((l) => !l.touteLannee);
  const duMois = deSaison(monde.legumes, mois);
  const parMois = Array.from({ length: 12 }, (_, i) => saisonniers.filter((l) => l.mois.includes(i + 1)).length);
  const maximum = Math.max(...parMois, 1);
  const categories = ORDRE_CATEGORIES.filter((c) => (categorie === 'tout' || c === categorie) && duMois.some((l) => l.categorie === c));
  const toutelannee = monde.legumes.filter((l) => l.touteLannee && (categorie === 'tout' || l.categorie === categorie));

  return (
    <div class="flex flex-col gap-5">
      <h1 tabIndex={-1} class="display pt-2 text-[30px] outline-none">
        Calendrier des saisons
      </h1>

      <div class="bloc flex flex-col gap-3.5 px-2.5 pt-3.5 pb-4">
        <div class="flex items-center justify-between">
          <button type="button" class="ico" aria-label={`Mois précédent : ${NOMS_MOIS[moisPrecedent(mois) - 1]}`} onClick={() => setMois(moisPrecedent)}>
            <Icone nom="retour" />
          </button>
          <div class="text-center" aria-live="polite">
            <div key={mois} class="glisse">
              <p class="display text-[26px]">{majuscule(NOMS_MOIS[mois - 1] ?? '')}</p>
              <p class="text-sm text-encre-2">{duMois.length} produits de saison</p>
            </div>
          </div>
          <button type="button" class="ico rotate-180" aria-label={`Mois suivant : ${NOMS_MOIS[moisSuivant(mois) - 1]}`} onClick={() => setMois(moisSuivant)}>
            <Icone nom="retour" />
          </button>
        </div>
        <div
          class="flex flex-col gap-1.5 px-1.5"
          role="img"
          aria-label={`Nombre de produits de saison par mois : ${parMois.map((n, i) => `${NOMS_MOIS[i]} ${n}`).join(', ')}`}
        >
          <div class="grid h-16 grid-cols-12 items-end gap-1">
            {parMois.map((n, i) => (
              <span key={i} class={`block rounded-t-[3px] ${i + 1 === mois ? 'bg-saison' : 'bg-trait'}`} style={{ height: `${(n / maximum) * 100}%` }} />
            ))}
          </div>
          <div class="grid grid-cols-12 gap-1 text-center font-etiq text-[11px] font-bold text-encre-2" aria-hidden="true">
            {INITIALES_MOIS.map((l, i) => (
              <span key={i} class={i + 1 === mois ? 'text-encre' : ''}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Filtres choix={categorie} onChoisir={setCategorie} compte={(c) => duMois.filter((l) => l.categorie === c).length} />
      <Legende mois={mois} />

      {categories.length === 0 && <p class="text-encre-2">Aucun produit de cette catégorie n’est de saison en {NOMS_MOIS[mois - 1]}.</p>}
      <div key={`${mois}-${categorie}`} class="cascade flex flex-col gap-5 empty:hidden">
        {categories.map((c) => {
          const produits = duMois.filter((l) => l.categorie === c);
          return (
            <section key={c} aria-labelledby={`cat-${c}`} class="flex flex-col">
              <div class="flex min-h-7 items-center justify-between border-b border-trait pb-1.5">
                <h2 id={`cat-${c}`} class="etiq">
                  {NOMS_CATEGORIES[c]} · {produits.length}
                </h2>
                <div class="grid w-[132px] grid-cols-12 gap-0.5 text-center font-etiq text-[11px] font-bold text-encre-2" aria-hidden="true">
                  {INITIALES_MOIS.map((l, i) => (
                    <span key={i} class={i + 1 === mois ? 'text-encre underline underline-offset-3' : ''}>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <ul>
                {produits.map((l) => (
                  <li key={l.id} class="flex min-h-12 items-center justify-between gap-3 border-b border-trait">
                    <span class="flex min-w-0 items-center gap-2.5">
                      <Vignette icone={l.icone} />
                      <span>
                        {l.nom}
                        {!l.mois.includes(moisSuivant(mois)) && (
                          <span class="ml-2 font-etiq text-xs font-bold tracking-[0.06em] whitespace-nowrap text-saison-texte uppercase">dernier mois</span>
                        )}
                      </span>
                    </span>
                    <Frise class="w-[132px] shrink-0" variante="mini" valeurs={valeursBinaires(l)} mois={mois} description={`De saison : ${decrireMois(l)}`} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {toutelannee.length > 0 && (
        <section aria-labelledby="toute-annee" class="flex flex-col gap-2.5 pt-2">
          <h2 id="toute-annee" class="etiq">
            Toute l’année · {toutelannee.length}
          </h2>
          <p class="text-sm text-encre-2">Importés ou cultivés toute l’année, ils ne comptent pas dans la saison des recettes.</p>
          <ul class="flex flex-wrap gap-2">
            {toutelannee.map((l) => (
              <li key={l.id} class="chip chip-lecture">
                <Vignette icone={l.icone} taille={28} />
                {l.nom}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Tablette paysage : tableau des 12 mois, tous les produits d'une catégorie. */
function Tableau({ monde }: { monde: Monde }) {
  const mois = moisCourant();
  const [categorie, setCategorie] = useState<CategorieId | 'tout'>('legumes');
  const produits = monde.legumes.filter((l) => categorie === 'tout' || l.categorie === categorie);
  const duMois = deSaison(monde.legumes, mois);

  return (
    <div class="flex flex-col gap-4.5">
      <header class="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <h1 tabIndex={-1} class="display text-[30px] outline-none">
            Calendrier des saisons
          </h1>
          <p class="mt-1.5 text-encre-2">
            En {NOMS_MOIS[mois - 1]} : {duMois.length} produits de saison, dont {duMois.filter((l) => l.categorie === 'legumes').length} légumes.
          </p>
        </div>
        <Filtres choix={categorie} onChoisir={setCategorie} compte={(c) => monde.legumes.filter((l) => l.categorie === c).length} />
      </header>
      <Legende mois={mois} />
      <table class="w-full border-separate border-spacing-0">
        <caption class="sr-only">
          Mois de saison de chaque produit. Le mois en cours est {NOMS_MOIS[mois - 1]}.
        </caption>
        <thead>
          <tr>
            <th scope="col" class="etiq h-9 w-[220px] border-b border-trait text-left">
              Produit
            </th>
            {INITIALES_MOIS.map((l, i) => (
              <th key={i} scope="col" class={`etiq h-9 border-b border-trait text-center ${i + 1 === mois ? 'bg-saison-pale text-encre' : ''}`}>
                <abbr title={NOMS_MOIS[i]} class="no-underline">
                  {l}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {produits.map((l) => (
            <tr key={l.id}>
              <th scope="row" class="h-11 border-b border-trait pr-3 text-left font-medium whitespace-nowrap">
                <span class="inline-flex items-center gap-2">
                  <Vignette icone={l.icone} taille={28} />
                  {l.nom}
                </span>
              </th>
              {l.touteLannee ? (
                <td colSpan={12} class="border-b border-trait px-1">
                  <span class="block h-[22px] rounded-[5px] bg-creux text-center text-[13px] leading-[22px] font-semibold text-encre-2">toute l’année</span>
                </td>
              ) : (
                Array.from({ length: 12 }, (_, i) => (
                  <td key={i} class={`border-b border-trait px-1 ${i + 1 === mois ? 'bg-saison-pale' : ''}`}>
                    {l.mois.includes(i + 1) ? (
                      <span class="block h-[22px] rounded-[5px] bg-saison" />
                    ) : (
                      <span class="sr-only">hors saison</span>
                    )}
                    {l.mois.includes(i + 1) && <span class="sr-only">de saison</span>}
                  </td>
                ))
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Saisons() {
  const large = useLarge();
  return (
    <AvecCatalogue titre="Calendrier des saisons">
      {(tout) => {
        // Garde-manger disponible toute l'année (viandes, crèmerie, poissons sans saison…) : hors du calendrier.
        // Les poissons de saison, eux, y ont leur place.
        const monde = { ...tout, legumes: tout.legumes.filter((l) => !estDuGardeManger(l.categorie) || !l.touteLannee) };
        return large ? <Tableau monde={monde} /> : <ParMois monde={monde} />;
      }}
    </AvecCatalogue>
  );
}
