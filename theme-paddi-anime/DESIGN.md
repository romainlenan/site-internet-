# DESIGN.md — Paddi · Nouvelle DA animée

Contrat de design du thème « Paddi · Nouvelle DA animée » (copie du thème Dawn personnalisé « Paddi (hero accueil) »).
Toute modification de styles globaux doit être reportée ici.

## Brand overview

- **Ce qu'on vend :** Paddi, le lanceur de balles automatique pour chien (3, 6 ou 9 m, 6 balles de 5 cm, batterie rechargeable, programme d'apprentissage de 7 jours). Une seule fiche produit, en français, marque française qui porte le nom du chien du fondateur.
- **Pour qui :** propriétaires de petits et moyens chiens joueurs (télétravailleurs en appartement, familles avec jardin, seniors dont l'épaule ne suit plus).
- **Ce qu'on doit ressentir :** chaleur d'un cabinet vétérinaire de quartier, sans rien de clinique : joie, complicité, confiance. Et du mouvement partout, parce que le produit, c'est une balle qui vole.

## Design thesis

**« Une balle orange qui traverse un magazine pastel » :** une mise en page éditoriale calme et douce (aplats pastel, grands titres condensés), traversée en permanence par le mouvement du jeu (arcs de trajectoire, rebonds, défilements).

## Colors

| Name | Value | Token | Role |
|---|---|---|---|
| Midnight Ink | `#161345` | `--pf-ink` | Couleur de marque : tous les boutons pleins, sections sombres, nav active, logo |
| Cocoa Bean | `#321004` | `--pf-cocoa` | Couleur de TOUT le texte (corps, titres, prix, nav). Jamais de #000 |
| Ember Orange | `#ff7f00` | `--pf-ember` | La balle. Ponctuation uniquement : balle, arcs, soulignés, bordures de badge. Jamais en texte sur clair (contraste 2,6:1), jamais en aplat de section |
| Blush Petal | `#ffcfdb` | `--pf-blush` | Héros, ambiance émotionnelle |
| Sky Powder | `#d7ecff` | `--pf-sky` | Bandeaux alternés, bandeau défilant, comparatif |
| Mint Tide | `#60c4bf` | `--pf-mint` | 3e aplat : appel à l'action final, apprentissage / bien-être |
| Cloud White | `#ffffff` | `--pf-white` | Canevas, texte sur fond sombre |
| Fog Gray | `#f9f9f9` | `--pf-fog` | Cartes, tuiles produit |
| Ash Border | `#ebebeb` | `--pf-line` | Filets 1px, contours de champs. Remplace l'ombre |
| Stone Mute | `#767676` | `--pf-mute` | Texte d'aide (la référence #999 échoue au contraste 4,5:1 ; assombri à #767676 = 4,54:1). #999 réservé aux états désactivés |
| Check Green | `#3aaf3a` | `--pf-check` | Uniquement l'icône coche des listes de bénéfices |

Schémas de couleurs Dawn (config/settings_data.json) :

| Schéma | Fond | Texte | Bouton | Libellé bouton | Libellé secondaire | Usage |
|---|---|---|---|---|---|---|
| scheme-1 | #ffffff | #321004 | #161345 | #ffffff | #161345 | Canevas blanc |
| scheme-2 | #f9f9f9 | #321004 | #161345 | #ffffff | #161345 | Cartes, tiroir panier |
| scheme-3 | #161345 | #ffffff | #ffffff | #161345 | #ffffff | Sections sombres (vidéo, avis, comparatif sombre) |
| scheme-4 | #ffcfdb | #321004 | #161345 | #ffffff | #161345 | Héros, aplat blush |
| scheme-5 | #d7ecff | #321004 | #161345 | #ffffff | #161345 | Aplat bleu ciel |
| scheme-6 | #161345 | #ffffff | #ffffff | #161345 | #ffffff | Pied de page, barre d'annonce |
| scheme-7 | #60c4bf | #321004 | #161345 | #ffffff | #161345 | Aplat menthe, badge promo |

Dans les sections, ne jamais coder une couleur de fond en dur : utiliser `color-{{ section.settings.color_scheme }}` (classes Dawn) et les variables `rgb(var(--color-foreground))`, `rgb(var(--color-background))`, `rgb(var(--color-button))`, `rgb(var(--color-button-text))`. Les tokens `--pf-*` servent à la ponctuation (balle, arcs, coches, filets).

## Typography

| Rôle | Famille (CSS) | Fichier | Poids | Tailles | Interligne | Interlettrage |
|---|---|---|---|---|---|---|
| Display (substitut d'Athletics) | `'Paddi Condensed', 'Antonio', 'Arial Narrow', sans-serif` → `var(--pf-font-display)` | assets/paddi-antonio-latin-wght.woff2 + latin-ext (variable 400–700, OFL) | 500 (titres), 600 (héros) | 36 / 64 / 96 / 133 px desktop ; mobile ≈ 60 % | 0.86–1.04 (0.9 par défaut sur ≥64px) | 0.05em (64px), 0.06–0.1em (96–133px) |
| Texte (substitut de Larsseit) | `'Paddi Text'` (Inter variable déjà hébergée) → `var(--pf-font-text)` | assets/paddi-inter-*.woff2 | 400 / 500 / 600 (boutons) | 14 / 15 / 18 / 24 / 26 / 30 px | 1.4–1.67 | +0.025em (15px), +0.035em (18px), +0.06em (24px+) |
| Micro (substitut de Monosten) | `'Paddi Mono', 'JetBrains Mono', ui-monospace, monospace` → `var(--pf-font-mono)` | assets/paddi-mono-latin.woff2 (400, OFL) | 400 | 12–13 px, MAJUSCULES | 1.4 | 0.3em |

- Titres display en MAJUSCULES (`text-transform: uppercase`), `text-wrap: balance`. Corps `text-wrap: pretty`, mesure 55–70 caractères.
- Le mot mis en valeur (`<em>` dans les titres saisis par le marchand, ex. « Il joue. <em>Vous soufflez.</em> ») : non italique, couleur `--pf-ink` sur fond clair, surligné par un trait orange `--pf-ember` dessiné à l'apparition (`.pf-mark`).
- Échelle : `--pf-text-display-2xl: clamp(64px, 10.4vw, 133px)`, `--pf-text-display-xl: clamp(52px, 7.5vw, 96px)`, `--pf-text-display-lg: clamp(40px, 5vw, 64px)`, `--pf-text-display: clamp(28px, 2.8vw, 36px)`, `--pf-text-heading: clamp(22px, 2vw, 26px)`, `--pf-text-body-lg: 18px`, `--pf-text-body: 15px`, `--pf-text-caption: 13px`.

## Spacing and composition

- Unité 4 px. Échelle : 8, 12, 16, 20, 24, 36, 40, 60, 80, 100, 140 (`--pf-space-8` … `--pf-space-140`).
- Largeur max 1280 px (`--pf-page`), gouttière latérale 20 px mobile / 40 px desktop.
- Sections : padding vertical piloté par les réglages `padding_top` / `padding_bottom` existants (multipliés par 0.75 sous 750px, comme Dawn).
- Rayons : cartes et médias 20 px (`--pf-radius-card`), tout ce qui est cliquable = pilule 60 px (`--pf-radius-pill`), pastilles/avatars 9999px.
- **Pas d'ombre (box-shadow) nulle part.** Séparation par aplats pastel, surfaces Fog Gray, filets 1px Ash Border. Pas de dégradés.
- Grilles 2 colonnes (texte + image) ou 3 colonnes (cartes). Jamais de maçonnerie.

## Components

- **Bouton plein** `.pf-btn` : pilule 60px, fond `rgb(var(--color-button))`, texte `rgb(var(--color-button-text))`, Inter 600 15–16px, +0.03em, padding 16px 28px, hauteur min 52px, flèche `<span class="pf-btn__arrow" aria-hidden="true">→</span>` obligatoire (glisse de 4px au survol). Pas d'ombre, pas de soulèvement au survol : au survol le fond s'éclaircit (`filter: brightness(1.25)` sur ink) ; `:active` → `scale(0.97)`.
- **Bouton contour** `.pf-btn.pf-btn--outline` : 1px `currentColor`, fond transparent, même flèche. Au survol : se remplit.
- **Bouton fantôme** `.pf-btn.pf-btn--ghost` : sans bordure, texte + flèche, souligné animé.
- Les boutons Dawn `.button`, `.shopify-payment-button__button--unbranded` reçoivent le même traitement pilule.
- **Nav active** : pilule pleine ink, texte blanc 14px Inter 500.
- **Barre d'annonce** : fond ink, texte blanc 14px, +0.025em, défilement continu (marquee) des messages.
- **En-tête** : 3 zones (menu à gauche, logo centré, compte/panier à droite), 64–72px, collant, fond blanc, filet 1px en bas ; se compacte au défilement (`.pf-header--scrolled`).
- **Carte produit / tuile** `.pf-card` : fond Fog Gray, rayon 20px, padding 24px, sans bordure ni ombre.
- **Ligne de bénéfice** `.pf-check-list > li` : coche verte 18px `--pf-check` + Inter 400 15–18px.
- **Section sombre de témoignages** : fond scheme-3, titre display 96–133px blanc, avatars ronds, citation Inter 22px, signature 12px majuscules mono 0.3em.
- **Champ** : pilule 60px, 1px Ash Border, placeholder `--pf-mute`, focus 1.5px ink.
- **Micro-étiquette** `.pf-label` : mono 12–13px majuscules 0.3em, remplace les « eyebrow » (à utiliser avec parcimonie : seulement si le marchand a saisi un texte).
- **Balle** `.pf-ball` : disque `--pf-ember` (peut porter une couture blanche en SVG). Elle apparaît dans les arcs, le curseur de distance, les puces.
- **Arc** `.pf-arc` : SVG en pointillés (stroke-dasharray) qui se dessine au défilement, la balle parcourt le chemin.

## Motion philosophy

« Ultra animé », mais jamais au détriment de la lisibilité, du prix et du bouton d'achat.

- Moteur unique `assets/paddi-motion.js` + API par attributs (voir ci-dessous). Pas de bibliothèque externe.
- Courbes : `--pf-ease-ui: cubic-bezier(0.16, 1, 0.3, 1)` (boutons, apparitions) ; `--pf-ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` (grandes surfaces) ; `--pf-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)` (rebond de balle uniquement). Jamais `ease` nu ni `transition: all`.
- Durées : micro 120–150 ms, états 150–250 ms, surfaces 250–350 ms, révélations 500–800 ms, stagger 60 ms (max 8 éléments).
- Sorties plus rapides que les entrées.
- **`prefers-reduced-motion: reduce` → aucune animation** : tout est visible immédiatement, aucun défilement automatique, aucune parallaxe.
- **Sans JavaScript, tout reste visible** : le masquage initial ne s'applique que sous `html.pf-js` (classe posée par un script inline dans le head) et jamais sous reduced-motion.
- Seules `transform` et `opacity` (et `stroke-dashoffset` pour les arcs) sont animées.

### API d'animation (attributs `data-*`)

| Attribut | Effet |
|---|---|
| `data-pf-reveal` (valeurs : `up` défaut, `fade`, `scale`, `left`, `right`) | Apparition à l'entrée dans l'écran (opacity 0→1, translate 32px→0 ou scale .94→1), 700ms ease-ui |
| `data-pf-delay="120"` | Délai en ms avant la révélation |
| `data-pf-stagger` (sur un parent) | Les enfants directs se révèlent l'un après l'autre (60ms, max 8) |
| `data-pf-split` (sur un titre) | Le titre est découpé en mots (`.pf-word > .pf-word__inner`) qui montent derrière un masque, 40ms entre les mots. Préserve `<em>`, `<br>`, `<strong>` |
| `data-pf-parallax="0.12"` | Translation verticale proportionnelle au défilement (desktop seulement, ±80px max) |
| `data-pf-marquee` (+ `data-pf-speed="40"` px/s, `data-pf-direction="left|right"`) | Bande défilante infinie ; contenu dupliqué automatiquement (`aria-hidden` sur la copie) ; pause au survol ; bouton pause accessible si `data-pf-marquee-pause` |
| `data-pf-magnetic` | Le bouton suit légèrement le pointeur (≤ 8px), pointeur fin uniquement |
| `data-pf-count="9"` (+ `data-pf-decimals`, `data-pf-suffix`) | Compteur animé de 0 à la valeur à l'apparition |
| `data-pf-arc` | Contient un `<path class="pf-arc__path">` et un élément `.pf-arc__ball` : le chemin se dessine et la balle le parcourt à l'apparition (ou au défilement si `data-pf-arc="scroll"`) |
| `data-pf-hscroll` | Galerie à défilement horizontal piloté par le défilement vertical (desktop ≥ 990px, section collante), simple défilement tactile sur mobile |
| `data-pf-progress` | Expose `--pf-progress` (0→1) selon la position de l'élément dans l'écran, pour des effets CSS pilotés par le défilement |
| `.pf-bounce` (classe) | Rebond en boucle d'une balle (keyframes, ease-in-out autorisé car boucle) |

Classes d'état posées par le moteur : `.is-inview` (révélé), `.pf-header--scrolled`, `html.pf-js`, `html.pf-ready` (fin de l'intro de page).

Le moteur réagit aussi aux sections chargées dans l'éditeur de thème (`shopify:section:load`) pour ré-initialiser les animations.

## Dos and Don'ts

**À faire**
- Rayon 60px sur chaque bouton, champ, pastille. 20px sur cartes et médias.
- Une flèche → dans chaque bouton plein ou contour.
- #321004 pour tout le texte sur clair ; blanc sur ink.
- Titres display Antonio en majuscules, interlettrage large, interligne serré.
- Alterner les aplats : blanc → blush → blanc → ink → sky → blanc → mint.
- Toute copie reste éditable dans l'éditeur (réglages et blocs existants conservés).
- La balle orange est le fil conducteur de toutes les animations.

**À ne pas faire**
- Aucune ombre, aucun dégradé, aucun noir pur.
- Pas de vert ailleurs que sur les coches.
- Pas de nouvelle teinte d'accent.
- Pas d'orange en texte sur fond clair (contraste insuffisant).
- Pas de texte codé en dur dans le Liquid : tout passe par les réglages de section/bloc.
- Pas d'animation qui cache le prix, le bouton d'achat ou qui bloque le défilement.
- Pas de badges décoratifs, d'images inclinées, de numérotation de sections décorative, de formes flottantes.
