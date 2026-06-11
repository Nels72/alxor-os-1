# Presidio Alxor - Guide de deploiement

## Pre-requis serveur

- Ubuntu 22.04+ (meme serveur que n8n2.reaktimo.com)
- Python 3.10+
- ~2 GB RAM supplementaire pour les modeles spaCy
- ~1.5 GB espace disque

## Installation rapide

```bash
cd /path/to/presidio
chmod +x install.sh
./install.sh
```

## Verification

```bash
# Health check
curl http://127.0.0.1:5080/health

# Test complet
cd /opt/presidio-alxor
./venv/bin/python test_presidio.py
```

## Configuration

Variables d'environnement (dans le service systemd) :

| Variable | Default | Description |
|----------|---------|-------------|
| PRESIDIO_PORT | 5080 | Port de l'API |
| PRESIDIO_HOST | 127.0.0.1 | Bind address (localhost = securise) |
| PRESIDIO_LOG_LEVEL | INFO | DEBUG, INFO, WARNING |
| PRESIDIO_SCORE_THRESHOLD | 0.4 | Seuil de confiance (0.0-1.0) |

## Securite

- L'API ecoute sur **127.0.0.1 uniquement** (pas accessible depuis l'exterieur)
- Seul n8n (sur le meme serveur) peut y acceder
- Pas de secrets dans l'API (pas de cles API, pas de tokens)
- Les mappings sont en memoire (pas de persistance)

## Entites anonymisees vs conservees

### Anonymisees (remplacees par [TYPE_N])
- PERSON (noms, prenoms)
- LOCATION (adresses)
- PHONE_NUMBER (telephones)
- EMAIL_ADDRESS (emails)
- DATE_OF_BIRTH (dates de naissance)
- FR_DRIVER_LICENSE (numeros de permis)
- FR_NATIONAL_ID (carte d'identite)
- FR_SIRET (SIRET/SIREN)
- IBAN_CODE (RIB)
- CREDIT_CARD (cartes bancaires)

### Conservees intactes (donnees metier assurance)
- FR_LICENSE_PLATE (immatriculations)
- Bonus/malus, sinistres, dates de contrat
- Noms de compagnie, modeles vehicule

## Workflows n8n concernes

1. **Extraction RI Cabinet** (IUQoM7IchXDpoaAP) - prioritaire
2. **2- Extraction RI** (823xFRdz4SJSfv0R)
3. **Extraction Devis** (b2J65p6kFx2uVyzP)

## Maintenance

```bash
# Redemarrer
sudo systemctl restart presidio-alxor

# Logs temps reel
sudo journalctl -u presidio-alxor -f

# Mettre a jour
cd /opt/presidio-alxor
source venv/bin/activate
pip install --upgrade presidio-analyzer presidio-anonymizer
sudo systemctl restart presidio-alxor
```
