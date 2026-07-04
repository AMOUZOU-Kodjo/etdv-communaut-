# API ETDV-Communaute

**Base URL** : `http://localhost:5000/api`

## Authentification

Tous les endpoints marqués 🔒 nécessitent un token JWT dans le header :
```
Authorization: Bearer <accessToken>
```

Le `refreshToken` est stocké dans un cookie httpOnly (automatique avec les credentials).

---

## 1. Auth (`/api/auth`)

### 1.1 Envoyer un code OTP
`POST /auth/otp/send` — **Public** — Envoie un code à 6 chiffres par email.

```json
// Body
{ "email": "user@example.com" }

// Response 200
{ "success": true, "message": "Code de verification envoye par email" }
```

### 1.2 Verifier le code OTP et se connecter
`POST /auth/otp/verify` — **Public** — Si l'utilisateur n'existe pas, il est créé automatiquement.

```json
// Body (nouvel utilisateur — prenom et nom requis)
{ "email": "user@example.com", "code": "482731", "firstName": "Jean", "lastName": "Dupont", "phone": "+22800000000" }

// Body (utilisateur existant — seul email et code suffisent)
{ "email": "user@example.com", "code": "482731" }

// Response 200
{
  "success": true,
  "message": "Compte cree avec succes",
  "data": {
    "user": { "id": "uuid", "email": "...", "firstName": "Jean", "lastName": "Dupont", "phone": "...", "role": "VISITEUR", "churchId": null },
    "accessToken": "eyJ..."
  }
}
```

> Le refresh token est automatiquement stocké dans un cookie httpOnly.

### 1.3 Inscription avec mot de passe
`POST /auth/register` — **Public** — (réservé admin)

```json
{ "email": "...", "password": "123456", "firstName": "Jean", "lastName": "Dupont", "phone": "+22800000000" }
```

### 1.4 Connexion avec mot de passe
`POST /auth/login` — **Public**

```json
{ "email": "...", "password": "..." }
```

### 1.5 Rafraichir le token
`POST /auth/refresh` — **Public** — Utilise le cookie httpOnly.

### 1.6 Deconnexion
`POST /auth/logout` — **Public** — Supprime le cookie.

### 1.7 Mon profil
`GET /auth/me` — 🔒 — Retourne l'utilisateur connecté.

---

## 2. Utilisateurs (`/api/users`)

| Endpoint | Auth | Roles | Description |
|---|---|---|---|
| `GET /users` | 🔒 | ADMIN, APOTRE, PASTEUR | Liste paginée avec filtres (`role`, `search`, `isActive`, `page`, `limit`) |
| `GET /users/:id` | 🔒 | ADMIN, APOTRE, PASTEUR | Détail d'un utilisateur (inclut `_count.profileVisits`) |
| `PUT /users/:id` | 🔒 | ADMIN, APOTRE, PASTEUR | Modifier un utilisateur |
| `DELETE /users/:id` | 🔒 | ADMIN, APOTRE, PASTEUR | Supprimer un utilisateur |
| `POST /users` | 🔒 | ADMIN, APOTRE, PASTEUR | Créer un membre |
| `PUT /users/profile/me` | 🔒 | Tous | Mettre à jour son profil |
| `DELETE /users/profile/avatar` | 🔒 | Tous | Supprimer sa photo de profil |
| `PUT /users/password/me` | 🔒 | Tous | Changer son mot de passe |
| `GET /users/:id/visits` | 🔒 | ADMIN, APOTRE, PASTEUR | Statistiques de visites du profil |

**Permissions par rôle :**
- **ADMIN** : tout le monde
- **APOTRE** : tout le monde sauf ADMIN
- **PASTEUR** : uniquement les membres (FIDELES/VISITEUR) de son église

### Filtres GET /users

| Paramètre | Valeurs | Description |
|---|---|---|
| `page` | number (défaut: 1) | Pagination |
| `limit` | number (défaut: 10) | Éléments par page |
| `role` | ADMIN, PASTEUR, APOTRE, FIDELES, VISITEUR | Filtrer par rôle |
| `search` | string | Recherche par nom/email |
| `isActive` | true/false | Filtrer par statut actif/inactif |

### PUT /users/profile/me

```json
{
  "bio": "Serviteur de Dieu",
  "address": "Lomé, Togo",
  "dateOfBirth": "1990-01-01",
  "gender": "HOMME",
  "maritalStatus": "MARIE",
  "ministry": "PASTEUR_TITULAIRE",
  "baptismDate": "2010-05-15",
  "profession": "Pasteur",
  "city": "Lomé",
  "country": "Togo",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

---

## 3. Églises (`/api/churches`)

| Endpoint | Auth | Roles | Description |
|---|---|---|---|
| `GET /churches` | Public | — | Liste des églises (avec `_count.members`) |
| `GET /churches/:id` | Public | — | Détail d'une église |
| `POST /churches` | 🔒 | ADMIN, APOTRE | Créer une église |
| `PUT /churches/:id` | 🔒 | ADMIN, APOTRE | Modifier une église |
| `DELETE /churches/:id` | 🔒 | ADMIN, APOTRE | Supprimer une église |
| `GET /churches/directory/leadership` | 🔒 | Tous | Annuaire des responsables |
| `GET /churches/directory/members` | 🔒 | Tous | Annuaire des membres |
| `GET /churches/directory/visitors` | 🔒 | Tous | Annuaire des visiteurs |

### Champs d'une église

| Champ | Type | Description |
|---|---|---|
| `name` | string | Nom de l'église |
| `address` | string? | Adresse |
| `city` | string? | Ville |
| `country` | string? | Pays |
| `phone` | string? | Téléphone |
| `email` | string? | Email |
| `website` | string? | Site web |
| `logoUrl` | string? | URL du logo |
| `description` | string? | Description |
| `latitude` | number? | GPS (carte) |
| `longitude` | number? | GPS (carte) |
| `serviceHours` | string? | Horaires des cultes |
| `socialMedia` | string (JSON)? | `{"facebook":"...", "youtube":"...", "instagram":"...", "tiktok":"..."}` |

---

## 4. Messagerie / Chat (`/api/chat`)

| Endpoint | Auth | Description |
|---|---|---|
| `POST /chat` | 🔒 | Démarrer ou récupérer une conversation avec `recipientId` |
| `GET /chat` | 🔒 | Liste de mes conversations + `unreadCount` |
| `GET /chat/:roomId` | 🔒 | Messages d'une conversation (paginé) |
| `POST /chat/:roomId/messages` | 🔒 | Envoyer un message |
| `DELETE /chat/messages/:messageId` | 🔒 | Supprimer son propre message |
| `PUT /chat/:roomId/read` | 🔒 | Marquer comme lu |

### POST /chat/:roomId/messages

```json
// Message texte
{ "content": "Bonjour !", "messageType": "TEXTE" }

// Message audio
{ "messageType": "AUDIO", "mediaUrl": "https://example.com/audio.mp3" }

// Message image
{ "messageType": "IMAGE", "mediaUrl": "https://example.com/image.jpg" }

// Message video
{ "messageType": "VIDEO", "mediaUrl": "https://example.com/video.mp4" }

// Message lien
{ "messageType": "LIEN", "content": "https://example.com" }

// Repondre a un message
{ "content": "Tres bien !", "messageType": "TEXTE", "replyToId": "uuid-du-message-repondre" }
```

### Types de message

| `messageType` | Description | Champ requis |
|---|---|---|
| `TEXTE` | Texte + émojis | `content` |
| `AUDIO` | Message vocal | `mediaUrl` |
| `IMAGE` | Photo | `mediaUrl` |
| `VIDEO` | Vidéo | `mediaUrl` |
| `LIEN` | Lien | `content` ou `mediaUrl` |

### Événements Socket.io

| Événement | Sens | Données |
|---|---|---|
| `join` | client → serveur | `userId` |
| `leave` | client → serveur | `userId` |
| `chat:join` | client → serveur | `roomId` (rejoindre une salle) |
| `chat:leave` | client → serveur | `roomId` |
| `presence:online` | serveur → tous | `{ userId, online: boolean }` |
| `chat:message` | serveur → room | `{ message }` |
| `chat:read` | serveur → room | `{ userId, roomId }` |
| `chat:delete` | serveur → room | `{ id, roomId }` |

### Permissions d'envoi

Barrès vertical : émetteur → Horizontal : destinataire

| Qui \\ À qui | ADMIN | APOTRE | PASTEUR | FIDELES | VISITEUR |
|---|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| APOTRE | ✅ | ✅ | ✅ | ✅ | ✅ |
| PASTEUR | ✅ | ✅ | ✅ | ✅ | ✅ |
| FIDELES | ❌ | ✅ | ✅ | ✅ | ✅ |
| VISITEUR | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## 5. Médias (`/api/media`)

| Endpoint | Auth | Roles | Description |
|---|---|---|---|
| `GET /media` | Public | — | Médias publiés (paginé) |
| `GET /media/pending` | 🔒 | ADMIN, APOTRE | En attente d'approbation |
| `GET /media/:id` | Public | — | Détail d'un média |
| `POST /media` | 🔒 | ADMIN, APOTRE, PASTEUR | Publier un média |
| `PUT /media/approve/:id` | 🔒 | ADMIN, APOTRE | Approuver un média |
| `PUT /media/:id` | 🔒 | ADMIN, APOTRE | Modifier |
| `DELETE /media/:id` | 🔒 | ADMIN, APOTRE | Supprimer |
| `PATCH /media/:id/visibility` | 🔒 | ADMIN, APOTRE | Masquer/afficher |

---

## 6. Notifications (`/api/notifications`)

| Endpoint | Auth | Description |
|---|---|---|
| `GET /notifications` | 🔒 | Mes notifications (`unreadOnly=true` pour non lues) |
| `PUT /notifications/read-all` | 🔒 | Tout marquer comme lu |
| `PUT /notifications/:id/read` | 🔒 | Marquer une comme lue |
| `DELETE /notifications/:id` | 🔒 | Supprimer une notification |

**Types de notifications** : `MESSAGE`, `VERSE`, `EVENT`, `PROGRAM`, `MEDIA`, `PRAYER`, `LIVE`, `GENERAL`

**Socket.io** : les notifications arrivent en temps réel sur l'événement `notification`.

---

## 7. Programmes (`/api/programs`)

| Endpoint | Auth | Roles | Description |
|---|---|---|---|
| `GET /programs` | Public | — | Liste des programmes |
| `GET /programs/daily-verse` | Public | — | Verset du jour (programme JOURNALIER) |
| `GET /programs/:id` | Public | — | Détail |
| `POST /programs` | 🔒 | ADMIN, APOTRE, PASTEUR | Créer |
| `PUT /programs/:id` | 🔒 | ADMIN, APOTRE, PASTEUR | Modifier |
| `DELETE /programs/:id` | 🔒 | ADMIN, APOTRE | Supprimer |

**Types** : `ANNUEL`, `MENSUEL`, `HEBDOMADAIRE`, `JOURNALIER`

---

## 8. Événements (`/api/events`)

| Endpoint | Auth | Roles | Description |
|---|---|---|---|
| `GET /events` | Public | — | Liste (filtres `type`, `status`, `churchId`, `date`) |
| `GET /events/:id` | Public | — | Détail |
| `POST /events` | 🔒 | ADMIN, APOTRE, PASTEUR | Créer |
| `PUT /events/:id` | 🔒 | ADMIN, APOTRE, PASTEUR | Modifier |
| `DELETE /events/:id` | 🔒 | ADMIN, APOTRE | Supprimer |

**Types** : `CULTE`, `CONFERENCE`, `REUNION`, `BAPTEME`, `MARIAGE`, `JEUNE`, `FORMATION`, `AUTRE`
**Statuts** : `PLANIFIE`, `EN_COURS`, `TERMINE`, `ANNULE`

---

## 9. Publications / Posts (`/api/posts`)

| Endpoint | Auth | Roles | Description |
|---|---|---|---|
| `GET /posts` | Public | — | Liste (filtres `categoryId`, `authorId`) |
| `GET /posts/:id` | Public | — | Détail (avec `_count.reads`) |
| `POST /posts` | 🔒 | ADMIN, APOTRE, PASTEUR | Créer |
| `PUT /posts/:id` | 🔒 | ADMIN, APOTRE, PASTEUR | Modifier |
| `DELETE /posts/:id` | 🔒 | ADMIN, APOTRE, PASTEUR | Supprimer |
| `POST /posts/:id/read` | 🔒 | Tous | Marquer le post comme lu |
| `GET /posts/:id/readers` | 🔒 | ADMIN, APOTRE, PASTEUR | Voir qui a lu le post |

---

## 10. Prières Matinales (`/api/prieres-matinales`)

| Endpoint | Auth | Roles | Description |
|---|---|---|---|
| `GET /prieres-matinales` | Public | — | Liste paginée |
| `GET /prieres-matinales/:id` | Public | — | Détail |
| `POST /prieres-matinales` | 🔒 | ADMIN, APOTRE, PASTEUR | Publier une prière |
| `PUT /prieres-matinales/:id` | 🔒 | ADMIN, APOTRE, PASTEUR | Modifier |
| `DELETE /prieres-matinales/:id` | 🔒 | ADMIN, APOTRE, PASTEUR | Supprimer |

À la création, une notification **temps réel** + **email** est envoyée à **tous les utilisateurs actifs**.

---

## 11. Diffusions en direct (`/api/live`)

| Endpoint | Auth | Roles | Description |
|---|---|---|---|
| `GET /live` | Public | — | Liste des diffusions |
| `GET /live/current` | Public | — | Diffusion en cours |
| `GET /live/:id` | Public | — | Détail |
| `POST /live` | 🔒 | ADMIN, APOTRE, PASTEUR | Créer |
| `PUT /live/:id` | 🔒 | ADMIN, APOTRE, PASTEUR | Modifier / démarrer le direct |
| `DELETE /live/:id` | 🔒 | ADMIN, APOTRE, PASTEUR | Supprimer |
| `GET /live/sync/youtube` | 🔒 | ADMIN, APOTRE | Synchroniser la chaîne YouTube |
| `GET /live/youtube/:videoId` | Public | — | Infos YouTube d'une vidéo |

**Types** : `YOUTUBE` (embarqué), `INTERNE` (flux direct)
**Statuts** : `PLANIFIE`, `EN_DIRECT`, `TERMINE`

**YouTube** : `embedUrl` utilise `https://www.youtube-nocookie.com/embed/{videoId}` (faible bande passante, pas de tracking).

Quand le statut passe à `EN_DIRECT`, **tous les utilisateurs** recoivent une notification.

### POST /live

```json
{
  "title": "Culte du Dimanche",
  "description": "...",
  "type": "YOUTUBE",
  "youtubeVideoId": "dQw4w9WgXcQ",
  "thumbnailUrl": "https://...",
  "scheduledAt": "2025-01-01T10:00:00Z"
}
```

---

## 12. Inscriptions aux événements (`/api/...`)

| Endpoint | Auth | Roles | Description |
|---|---|---|---|
| `POST /events/:eventId/register` | 🔒 | Tous | S'inscrire à un événement |
| `GET /registrations/me` | 🔒 | Tous | Mes inscriptions |
| `GET /registrations/:id/receipt` | 🔒 | Tous | Reçu d'inscription (données pour impression) |
| `PUT /registrations/:id/validate` | 🔒 | ADMIN, APOTRE, PASTEUR | Valider une inscription |
| `GET /events/:id/registrations` | 🔒 | ADMIN, APOTRE, PASTEUR | Voir les inscrits |
| `DELETE /registrations/:id` | 🔒 | Tous | Annuler son inscription |

### Reçu (GET /registrations/:id/receipt)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "VALIDE",
    "receiptNumber": "REC-ABC123-DEF456",
    "user": { "firstName": "Jean", "lastName": "Dupont", "email": "..." },
    "event": {
      "title": "Conference",
      "date": "2025-06-15",
      "location": "Lomé",
      "organizer": { "firstName": "Paul", "lastName": "..." },
      "church": { "name": "ETDV Lomé", "logoUrl": "https://...", "city": "Lomé", "phone": "...", "email": "..." }
    },
    "validatedBy": { "firstName": "Admin", "lastName": "..." }
  }
}
```

---

## 13. Dons (`/api/donations`)

| Endpoint | Auth | Roles | Description |
|---|---|---|---|
| `POST /donations` | 🔒 | Tous | Faire un don |
| `GET /donations/me` | 🔒 | Tous | Mes dons |
| `GET /donations` | 🔒 | ADMIN, APOTRE | Tous les dons |
| `PUT /donations/:id/confirm` | 🔒 | ADMIN, APOTRE | Confirmer un don |

### POST /donations

```json
{
  "amount": 5000,
  "currency": "XAF",
  "type": "OFFRANDE",
  "description": "Offrande du dimanche",
  "paymentMethod": "FLOOZ",
  "phone": "+22890000000",
  "churchId": "uuid-eglise",        // null pour don communautaire
  "eventId": "uuid-evenement"        // null pour don general
}
```

**`paymentMethod`** : `FLOOZ`, `TMONEY`, `PAYPAL`, `CARTE`
**`currency`** : `XAF`, `EUR`, `USD`
**`type`** : `OFFRANDE`, `DIME`, `COTISATION`, `AUTRE`
**`status`** : `EN_ATTENTE` → `CONFIRME`

---

## 14. Contact (`/api/contact`)

| Endpoint | Auth | Roles | Description |
|---|---|---|---|
| `POST /contact` | **Public** | — | Envoyer un message à l'apôtre ou à un pasteur |
| `GET /contact` | 🔒 | ADMIN, APOTRE, PASTEUR | Messages reçus |
| `PUT /contact/:id/read` | 🔒 | ADMIN, APOTRE, PASTEUR | Marquer comme lu |
| `DELETE /contact/:id` | 🔒 | ADMIN, APOTRE | Supprimer |

### POST /contact

```json
{
  "name": "Jean",
  "email": "jean@example.com",
  "subject": "Question sur le culte",
  "message": "...",
  "recipientType": "PASTEUR",
  "recipientId": "uuid-du-pasteur"
}
```

- `recipientType: "APOTRE"` → message à l'apôtre général
- `recipientType: "PASTEUR"` + `recipientId` → message à un pasteur spécifique

---

## 15. Statistiques (`/api/stats`)

| Endpoint | Auth | Roles | Description |
|---|---|---|---|
| `GET /stats/dashboard` | 🔒 | ADMIN, APOTRE | Dashboard complet |
| `GET /stats` | 🔒 | Tous | Statistiques générales |
| `GET /stats/churches/:churchId` | 🔒 | Tous | Statistiques d'une église |
| `POST /stats/track` | **Public** | — | Enregistrer une visite de page |

### POST /stats/track

```json
{ "page": "/accueil", "referrer": "https://google.com" }
```

Le frontend appelle cet endpoint à chaque changement de page pour le tracking d'audience.

---

## 16. Abonnements newsletter (`/api/subscriptions`)

| Endpoint | Auth | Roles | Description |
|---|---|---|---|
| `POST /subscriptions` | **Public** | — | S'abonner (sans inscription) |
| `POST /subscriptions/unsubscribe` | **Public** | — | Se désabonner |
| `GET /subscriptions` | 🔒 | ADMIN, APOTRE | Liste des abonnés |

```json
// S'abonner
{ "email": "user@example.com", "name": "Jean Dupont" }

// Se désabonner
{ "email": "user@example.com" }
```

---

## Environnement & Configuration

Fichier `.env` :

```
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/etdv_communaute"
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
CLIENT_URL="http://localhost:5173"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="votre-email@gmail.com"
SMTP_PASS="votre-mot-de-passe-d-application"
EMAIL_FROM="ETDV-Communaute <noreply@etdv-communaute.com>"

YOUTUBE_API_KEY="..."
YOUTUBE_CHANNEL_ID="..."
```

---

## Codes erreur

```json
{
  "success": false,
  "message": "Description de l'erreur"
}
```

| Statut | Signification |
|---|---|
| 400 | Bad request — champs manquants ou invalides |
| 401 | Non authentifié — token manquant ou invalide |
| 403 | Interdit — rôle insuffisant |
| 404 | Ressource introuvable |
| 409 | Conflit — email déjà utilisé, déjà inscrit |
| 500 | Erreur serveur |
