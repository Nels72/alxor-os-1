# Deploiement Alex Chatbot — Prompts Cursor

> Prompts a executer dans Cursor sur le repo `easycourtageassurance-master`
> (React 19 + Vite + Tailwind) pour integrer le chatbot Alex dans la modale existante.

---

## Contexte Cursor

Copier ce bloc dans `.cursorrules` ou le system prompt du projet :

```
Tu travailles sur le repo easycourtageassurance-master (React 19, Vite, Tailwind CSS).
Toute l'app est dans src/App.tsx (single-file ~1500 lignes).

Le composant AlexModal (lignes ~1323-1448) est un placeholder "Alex arrive tres bientot".
Trois boutons CTA appellent deja onOpenAlex() pour ouvrir cette modale.
L'objectif est de remplacer le contenu placeholder par un iframe
vers le chatbot Alex (fichier HTML autonome).

Fichiers Alex a deployer dans public/alex/ :
- chatbot_eca_v11_final.html (chatbot complet, single-file HTML/JS/CSS)
- alex-lottie.json (animation avatar Lottie, meme dossier que le HTML)

Le chatbot est 100% autonome : il embarque son propre CSS, JS, animations, et
communique avec ses propres webhooks (Make.com + n8n). Il ne depend de rien
dans le projet React.

NE MODIFIE JAMAIS le contenu de chatbot_eca_v11_final.html ni alex-lottie.json.
```

---

## Prompt 1 — Copier les fichiers Alex dans public/

```
Copie ces deux fichiers dans le dossier public/alex/ du projet
(cree le sous-dossier alex/ s'il n'existe pas) :

Source : D:\NELS\AlxorFiles052026\alex\chatbot\chatbot_eca_v11_final.html
  → public/alex/chatbot_eca_v11_final.html

Source : D:\NELS\AlxorFiles052026\alex\chatbot\alex-lottie.json
  → public/alex/alex-lottie.json

Ne renomme pas les fichiers. Le chatbot charge alex-lottie.json
via fetch('./alex-lottie.json'), ils doivent etre dans le meme dossier.

Verifie que les deux fichiers sont bien presents apres copie.
```

---

## Prompt 2 — Remplacer le contenu AlexModal par l'iframe

```
Dans src/App.tsx, modifie le composant AlexModal (lignes ~1323-1448).

Remplace tout le contenu interieur du phone shell (status bar, chat header,
messages placeholder, input bar, home indicator) par un unique iframe
pointant vers le chatbot Alex.

Le composant doit devenir :

const AlexModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        className="relative z-10 w-full sm:w-auto"
        style={{ maxWidth: 480 }}
      >
        <div
          className="w-full bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden relative"
          style={{ height: 'min(780px, 92vh)' }}
        >
          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Chatbot Alex */}
          <iframe
            src="/alex/chatbot_eca_v11_final.html"
            title="Alex - Demande de devis assurance"
            className="w-full h-full border-0"
            loading="lazy"
            allow="clipboard-write"
          />
        </div>
      </motion.div>
    </div>
  );
};

Points importants :
- maxWidth passe de 390 a 480 (le chatbot est optimise pour 480px)
- Le shell iPhone (status bar, dynamic island, home indicator) est supprime :
  le chatbot Alex a deja son propre header et style
- Le bg passe de #0d1117 a white (le chatbot gere son propre fond)
- Le border-radius passe a 32px (plus cohérent avec le style du chatbot)
- L'iframe prend 100% de width et height du conteneur
- Le bouton X fermer est en overlay au-dessus de l'iframe
- L'import Send de lucide-react peut etre retire s'il n'est plus utilise ailleurs
```

---

## Prompt 3 — Nettoyage des imports inutilises

```
Dans src/App.tsx, verifie si l'icone Send de lucide-react est encore utilisee
ailleurs que dans l'ancien AlexModal.

Si elle n'est plus utilisee nulle part, retire-la de la ligne d'import lucide-react.

Ne touche a rien d'autre.
```

---

## Prompt 4 — Test et verification

```
Demarre le dev server (npm run dev) et verifie :

1. CHARGEMENT
   - Ouvre la landing page
   - Clique sur "Obtenir un devis" (hero) → la modale s'ouvre
   - Le chatbot Alex se charge dans l'iframe sans erreur console
   - L'animation Lottie s'affiche (avatar anime dans le header du chatbot)

2. INTERACTION
   - Clique "C'est parti !" dans le chatbot
   - Tape un prenom → il s'auto-capitalise
   - Le message de politesse s'affiche
   - Le flux conversationnel continue normalement

3. FERMETURE
   - Le bouton X ferme la modale
   - La touche Escape ferme la modale
   - Cliquer sur l'overlay (fond noir) ferme la modale
   - Reouvrir la modale → le chatbot se recharge proprement

4. RESPONSIVE
   - Desktop (> 640px) : modale centree, 480px max, coins arrondis
   - Mobile (< 640px) : modale en bas, pleine largeur, coins arrondis en haut

5. AUTRES CTA
   - "Demander une etude gratuite" (section cyber) → meme modale
   - "C'est parti !" (section contact) → meme modale

Si l'iframe ne charge pas :
   - Verifier que public/alex/chatbot_eca_v11_final.html existe
   - Verifier que public/alex/alex-lottie.json existe
   - Verifier la console pour des erreurs CORS ou 404
```

---

## Prompt 5 — Correctif v11 : logique client existant

```
CORRECTIF A APPLIQUER — Ne concerne que le fichier public/alex/chatbot_eca_v11_final.html

Remplace le fichier public/alex/chatbot_eca_v11_final.html par la version
corrigee situee dans :
D:\NELS\AlxorFiles052026\alex\chatbot\chatbot_eca_v11_final.html

Ce correctif contient 3 fixes sur la logique "client existant" :

1. LOOKUP : le profil est maintenant lu depuis le champ Airtable "Type_Client"
   (via le workflow n8n mis a jour). Le chatbot recoit desormais
   { found: true, profil: "Particulier", ... } au lieu de profil vide.

2. BRANCHEMENT PROFIL : si le lookup retrouve le contact MAIS que le profil
   est vide, le chatbot demande quand meme le profil (etape 5) au lieu de
   sauter directement au produit avec les mauvaises options.
   Avant : next_found: () => 6 (toujours)
   Apres : next_found: d => d.profil ? 6 : 5

3. DATE DE NAISSANCE :
   a) Conversion ISO → jj/mm/aaaa : les dates Airtable au format "1960-06-05"
      sont converties en "05/06/1960" au pre-remplissage.
   b) Skip DDN si deja connue : pour un client existant dont la date de
      naissance est renvoyee par le lookup, l'etape DDN est sautee.
      Le flux apres "situation" devient :
      - Client existant + DDN connue → contact_pref (step 25)
      - Client existant + DDN vide  → demande DDN (step 22) → contact_pref
      - Nouveau client              → coordonnees completes (step 15)

Apres copie, verifie que le fichier alex-lottie.json est toujours present
dans le meme dossier public/alex/.

Ne modifie rien dans src/App.tsx pour ce correctif.
```

---

## Architecture finale

```
easycourtageassurance-master/
├── public/
│   ├── alex/
│   │   ├── chatbot_eca_v11_final.html    ← chatbot autonome
│   │   └── alex-lottie.json              ← animation avatar
│   └── ...
├── src/
│   └── App.tsx
│       ├── AlexModal (iframe → /alex/chatbot_eca_v11_final.html)
│       ├── CTA Hero      → onOpenAlex()
│       ├── CTA Cyber      → onOpenAlex()
│       └── CTA Contact    → onOpenAlex()
└── ...

Flux reseau :
  iframe chatbot
    ├── Lookup client → n8n /webhook/alex-lookup
    └── Soumission    → Make.com webhook (scenario 6-2 inchange)
```
