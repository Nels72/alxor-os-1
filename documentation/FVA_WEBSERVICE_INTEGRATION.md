# Intégration AGIRA FVA — enrichissement véhicule par immatriculation

> Objectif : compléter marque/modèle (et énergie / date 1ʳᵉ mise en circulation) quand le RI ne les donne pas, via le web service FVA (finalité PRODSIV).
> Source : pack `Pack_WEB-service_Production.zip` (DOCAPOST), spec `QSE_REAL_Mod_Specifications-FVA-WEBSERVICES v1.43`.
> Statut : **planifié, dev bloqué** sur le certificat client mTLS (voir Prérequis).

## Endpoint & requête
- REST, méthode **GET**.
- Production : `https://www.agira-fva.fr/api/v1/interrogation`
- Tests : Recette `fva-rct.docapost-bpo.com/api/v1/`, Pré-prod `fva-ppd.docapost-bpo.com/api/v1/`, Homologation `fva-hom.docapost-bpo.com/api/v1/`
- Appel SIV : `GET /api/v1/interrogation?FVA_NumeroImmatriculation={IMMAT}&FVA_CodeFinalite=PRODSIV`
  - Header `Accept: application/json` (ou `application/xml`).
  - `PRODSIV` = « Production sur toute immatriculation » → données SIV véhicule.
  - `FVA_CodeSociete` = n° **ORIAS** du courtier, **porté par le certificat client** (pas en query).

## Authentification — mTLS
- Handshake certificat serveur ↔ **certificat client** émis par **DOCAPOST** (basé sur l'ORIAS).
- Pack : `gen-csr-client-ws.sh` (CSR), `ca-chain-int-client-ws.cert.pem` (chaîne CA), `20180315__CERTIFICATS-WS_V01.docx` (procédure).
- Dans n8n : credential **SSL client certificate** (cert + clé privée + CA chain) attachée au nœud HTTP Request.

## Réponses
- `200` OK : structure `FVA_Reponses` ; bloc véhicule dans `FVA_ReponseSIV`.
- `400` BAD_REQUEST, `401` UNAUTHORIZED (société/finalité non habilitée), `404` NOT_FOUND (aucun résultat), `500` ERROR.
- ⚠️ Habilitation **par finalité** selon le type de société (ex. HISTORIQUE interdite aux intermédiaires) → **confirmer que l'ORIAS est habilité PRODSIV**.

### Mapping des champs SIV → product_data (confirmé via exemple JSON du pack)
Blocs `FVA_ReponseSIV.SIV_Bloc4_Origine` / `SIV_Bloc5_Origine` (préférer `_Origine` aux `_TraiteFVA` souvent partiels) :

| product_data | Champ SIV | Exemple |
|---|---|---|
| `vehicule_marque` | `SIV_Marque` | `MBK` |
| `vehicule_modele` | `SIV_DenominationCommerciale` | `BOOSSP EU2` |
| `vehicule_energie` | `SIV_TypeEnergie` | `ES`=Essence, `GO`=Gazole/Diesel, `EL`=Électrique, hybride… |
| 1ʳᵉ mise en circulation | `SIV_DatePremiereImmatriculation` | `2007-05-16` |
| catégorie / genre | `SIV_Categorie` / `SIV_Genre` | `L1e` / `CL` |
| VIN / CNIT | `SIV_CodeVIN` / `SIV_CNIT` | `VG5SA232…` / `LMP21C10P063` |

## Prérequis (Étape 0, bloquant)
1. Générer le certificat client (CSR → signature AGIRA/DOCAPOST → PFX). **ORIAS courtier = `10058195`.**
2. Confirmer habilitation **PRODSIV** (ORIAS) auprès d'AGIRA.
3. (Fait) Exemple de réponse SIV obtenu → mapping figé ci-dessus.

### Procédure certificat (ORIAS 10058195) — Git Bash / WSL
> Bug connu Git Bash : le `/` initial de `-subj` est mal interprété → préfixer par `MSYS_NO_PATHCONV=1` (inutile en WSL/Linux).

```bash
mkdir -p cert-client-ws/ORIAS_10058195/{csr,private,certs}
# Clé privée (mot de passe demandé, À CONSERVER)
openssl genrsa -aes256 -out cert-client-ws/ORIAS_10058195/private/ORIAS_10058195.key.pem 2048
# CSR (CN = ORIAS_10058195)
MSYS_NO_PATHCONV=1 openssl req -subj "/C=FR/O=Docapost/OU=Projet FVA/CN=ORIAS_10058195" \
  -key cert-client-ws/ORIAS_10058195/private/ORIAS_10058195.key.pem \
  -new -sha256 -out cert-client-ws/ORIAS_10058195/csr/ORIAS_10058195.csr.pem
# Vérif : doit afficher CN = ORIAS_10058195
openssl req -in cert-client-ws/ORIAS_10058195/csr/ORIAS_10058195.csr.pem -noout -subject
```
Puis **envoyer le `.csr.pem` à `fva@agira.asso.fr`**. À réception du certificat signé, le placer dans `certs/` (nom `certificat-ORIAS_10058195.pem`) et construire le PFX :
```bash
openssl pkcs12 -export \
  -out cert-client-ws/ORIAS_10058195/private/ORIAS_10058195.pfx \
  -inkey cert-client-ws/ORIAS_10058195/private/ORIAS_10058195.key.pem \
  -in   cert-client-ws/ORIAS_10058195/certs/certificat-ORIAS_10058195.pem \
  -certfile ca-chain-int-client-ws.cert.pem
```
Pour n8n : utiliser de préférence `key.pem` + certificat signé `.pem` + `ca-chain-int-client-ws.cert.pem` (format PEM).

## Implémentation (dès Étape 0 faite)
1. Credential SSL client dans n8n.
2. Workflow `Extraction RI Cabinet` (`IUQoM7IchXDpoaAP`) : après `Parse RI Response`, nœud HTTP GET FVA **si `vehicule_modele` absent ET `immatriculation` présente** ; `onError: continueRegularOutput` + retry léger.
3. Code node : compléter `riData.vehicule.modele` (+ marque/categorie/date) **sans écraser** le RI ; propager dans `airtableFields`/`RI_JSON` et la réponse front.
4. Front : **rien** (champs véhicule déjà câblés jusqu'à la Fiche Tarification).

## Test
- D'abord en **Recette/Homologation** avec une immat de test → 200 + champs véhicule.
- Puis prod : modèle manquant → complété ; modèle présent → pas d'appel ; FVA KO → extraction RI aboutit quand même.
