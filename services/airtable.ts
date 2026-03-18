// src/services/airtable.ts
// Configuration et fonctions pour se connecter à Airtable

const AIRTABLE_API_KEY = process.env.REACT_APP_AIRTABLE_API_KEY || '';
const AIRTABLE_BASE_ID = process.env.REACT_APP_AIRTABLE_BASE_ID || '';

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// Headers pour toutes les requêtes
const headers = {
  'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
};

// ============================
// PROSPECTS
// ============================

export interface AirtableProspect {
  id: string;
  fields: {
    'Nom/Prénom': string;
    'Email': string;
    'Téléphone': string;
    'SIRET/SIREN'?: string;
    'Statut': 'Nouveau' | 'Qualifié' | 'En cours' | 'Converti' | 'Perdu';
    'Source': 'SEO' | 'Apporteur' | 'Referral' | 'Fillout';
    'Date de création': string;
    'Collaborateur assigné'?: string[];
    'GES Score'?: number;
    'Adresse'?: string;
    'Code Postal'?: string;
    'Type de contrat'?: string;
    'Analyse IA effectuée'?: boolean;
    'Devis envoyé'?: boolean;
    'Signature validée'?: boolean;
    'Contrat final signé'?: boolean;
    'Compagnie sélectionnée'?: string;
    'Note expertise courtier'?: string;
  };
}

// Récupérer tous les prospects
export async function getProspects(): Promise<AirtableProspect[]> {
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/Prospects`, {
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`Erreur Airtable: ${response.status}`);
    }
    
    const data = await response.json();
    return data.records;
  } catch (error) {
    console.error('Erreur lors de la récupération des prospects:', error);
    throw error;
  }
}

// Récupérer un prospect par ID
export async function getProspectById(recordId: string): Promise<AirtableProspect> {
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/Prospects/${recordId}`, {
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`Erreur Airtable: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération du prospect:', error);
    throw error;
  }
}

// Créer un nouveau prospect
export async function createProspect(fields: AirtableProspect['fields']): Promise<AirtableProspect> {
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/Prospects`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fields }),
    });
    
    if (!response.ok) {
      throw new Error(`Erreur Airtable: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la création du prospect:', error);
    throw error;
  }
}

// Mettre à jour un prospect
export async function updateProspect(
  recordId: string,
  fields: Partial<AirtableProspect['fields']>
): Promise<AirtableProspect> {
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/Prospects/${recordId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
    });
    
    if (!response.ok) {
      throw new Error(`Erreur Airtable: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la mise à jour du prospect:', error);
    throw error;
  }
}

// ============================
// DOCUMENTS
// ============================

export interface AirtableDocument {
  id: string;
  fields: {
    'Prospect/Client lié': string[];
    'Type de document': string;
    'Fichier': Array<{
      id: string;
      url: string;
      filename: string;
      size: number;
      type: string;
    }>;
    'Date d\'upload': string;
    'Date d\'expiration'?: string;
    'Validé par IA': boolean;
    'Données extraites (OCR)'?: string;
    'Statut': 'En attente' | 'Validé' | 'Expiré' | 'Rejeté';
  };
}

// Récupérer les documents d'un prospect
export async function getProspectDocuments(prospectId: string): Promise<AirtableDocument[]> {
  try {
    const filterFormula = `FIND("${prospectId}", {Prospect/Client lié})`;
    const response = await fetch(
      `${AIRTABLE_API_URL}/Documents?filterByFormula=${encodeURIComponent(filterFormula)}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`Erreur Airtable: ${response.status}`);
    }
    
    const data = await response.json();
    return data.records;
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    throw error;
  }
}

// Upload un document (nécessite préalablement d'avoir uploadé le fichier vers un service externe)
export async function createDocument(
  prospectId: string,
  docType: string,
  fileUrl: string,
  fileName: string
): Promise<AirtableDocument> {
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/Documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          'Prospect/Client lié': [prospectId],
          'Type de document': docType,
          'Fichier': [{ url: fileUrl }],
          'Date d\'upload': new Date().toISOString(),
          'Validé par IA': false,
          'Statut': 'En attente',
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Erreur Airtable: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la création du document:', error);
    throw error;
  }
}

// ============================
// ACTIVITÉS
// ============================

export interface AirtableActivity {
  id: string;
  fields: {
    'Prospect/Client': string[];
    'Type d\'activité': 'Appel' | 'Email' | 'RDV' | 'Signature' | 'Relance';
    'Date/Heure': string;
    'Collaborateur'?: string[];
    'Notes'?: string;
    'Automatisée (IA)': boolean;
  };
}

// Créer une nouvelle activité
export async function createActivity(
  prospectId: string,
  type: AirtableActivity['fields']['Type d\'activité'],
  notes?: string,
  automated: boolean = false
): Promise<AirtableActivity> {
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/Activités`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          'Prospect/Client': [prospectId],
          'Type d\'activité': type,
          'Date/Heure': new Date().toISOString(),
          'Notes': notes,
          'Automatisée (IA)': automated,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Erreur Airtable: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la création de l\'activité:', error);
    throw error;
  }
}

// ============================
// HELPERS
// ============================

// Convertir un prospect Airtable vers le format de l'app
export function mapAirtableProspectToApp(airtableProspect: AirtableProspect) {
  return {
    id: airtableProspect.id,
    nom: airtableProspect.fields['Nom/Prénom'],
    email: airtableProspect.fields['Email'],
    telephone: airtableProspect.fields['Téléphone'],
    siret: airtableProspect.fields['SIRET/SIREN'],
    statut: mapAirtableStatusToApp(airtableProspect.fields['Statut']),
    source: airtableProspect.fields['Source']?.toLowerCase() || 'fillout',
    created_at: airtableProspect.fields['Date de création'],
    adresse: airtableProspect.fields['Adresse'],
    code_postal: airtableProspect.fields['Code Postal'],
    type_contrat_demande: airtableProspect.fields['Type de contrat'] || 'Auto',
    ia_analysis_done: airtableProspect.fields['Analyse IA effectuée'] || false,
    signature_manuelle_validee: airtableProspect.fields['Signature validée'] || false,
    contrat_definitif_signe: airtableProspect.fields['Contrat final signé'] || false,
    contrat_definitif_envoye: airtableProspect.fields['Devis envoyé'] || false,
  };
}

// Mapper le statut Airtable vers le format app
function mapAirtableStatusToApp(status: string): string {
  const mapping: Record<string, string> = {
    'Nouveau': 'nouveau',
    'Qualifié': 'en_analyse',
    'En cours': 'devis_envoye',
    'Converti': 'converti',
    'Perdu': 'perdu',
  };
  return mapping[status] || 'nouveau';
}

// Mapper le statut app vers Airtable
export function mapAppStatusToAirtable(status: string): string {
  const mapping: Record<string, string> = {
    'nouveau': 'Nouveau',
    'en_analyse': 'Qualifié',
    'devis_envoye': 'En cours',
    'converti': 'Converti',
    'perdu': 'Perdu',
  };
  return mapping[status] || 'Nouveau';
}
