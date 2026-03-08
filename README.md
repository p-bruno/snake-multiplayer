# 🐍 Snake Multijoueur — Firebase + GitHub Pages

Jeu Snake en temps réel, hébergé sur GitHub Pages, synchronisé via Firebase Realtime Database.

---

## 🚀 Installation & Déploiement

### Étape 1 — Cloner et installer

```bash
git clone https://github.com/TON_USERNAME/snake-multiplayer.git
cd snake-multiplayer
npm install
```

---

### Étape 2 — Créer un projet Firebase

1. Va sur [https://console.firebase.google.com](https://console.firebase.google.com)
2. **Créer un projet** (nom libre, désactiver Analytics c'est plus simple)
3. Dans le projet → **"Ajouter une application"** → icône `</>` (Web)
4. Donne un nom → **Enregistrer**
5. Copie le bloc `firebaseConfig` qui s'affiche

---

### Étape 3 — Configurer Firebase dans le code

Ouvre `src/firebase-config.ts` et remplace les valeurs :

```typescript
export const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "mon-snake.firebaseapp.com",
  databaseURL: "https://mon-snake-default-rtdb.firebaseio.com",
  projectId: "mon-snake",
  storageBucket: "mon-snake.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

---

### Étape 4 — Activer Realtime Database

1. Dans Firebase Console → **Build** → **Realtime Database**
2. **Créer une base de données** → choisir une région (europe-west1 recommandé)
3. Démarrer en **mode test**
4. Aller dans l'onglet **Règles** et mettre :

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> ⚠️ Ces règles sont ouvertes pour le dev. Pour la prod, ajoute l'authentification Firebase.

---

### Étape 5 — Configurer vite.config.ts

Dans `vite.config.ts`, remplace `snake-multiplayer` par le nom exact de ton repo GitHub :

```typescript
base: '/NOM_DE_TON_REPO/',
```

---

### Étape 6 — Tester en local

```bash
npm run dev
```

Ouvre [http://localhost:5173/snake-multiplayer/](http://localhost:5173/snake-multiplayer/)

---

### Étape 7 — Déployer sur GitHub Pages

```bash
# Initialiser le repo si pas encore fait
git init
git add .
git commit -m "🐍 Initial commit"
git remote add origin https://github.com/TON_USERNAME/snake-multiplayer.git
git push -u origin main

# Déployer
npm run deploy
```

Ensuite dans ton repo GitHub :
- **Settings** → **Pages** → Source : `gh-pages` branch → `/root`

Ton jeu sera dispo sur :
**`https://TON_USERNAME.github.io/snake-multiplayer/`**

---

## 🎮 Comment jouer

- **Clavier** : Flèches directionnelles ou WASD
- **Mobile** : Swipe dans la direction souhaitée
- Mange les 🔴 pommes pour grandir et marquer des points
- Évite les murs et les autres serpents
- Tu respawnes automatiquement après 3 secondes

---

## ⚙️ Architecture

```
src/
├── main.ts          # Point d'entrée, UI, Firebase sync, input
├── game.ts          # Logique pure du jeu (tick, collision, etc.)
├── renderer.ts      # Rendu Canvas 2D
├── types.ts         # Types TypeScript + constantes
└── firebase-config.ts  # ← À CONFIGURER avec tes clés
```

**Système "host"** : Le joueur avec le plus petit ID devient l'hôte et tourne le tick du jeu. Si l'hôte se déconnecte, le suivant prend le relai automatiquement.

---

## 🔧 Personnalisation

Dans `src/types.ts` :
```typescript
export const GRID_SIZE = 20   // Taille de la grille
export const CELL_SIZE = 24   // Pixels par case
export const TICK_MS = 120    // Vitesse (ms) — moins = plus rapide
```
