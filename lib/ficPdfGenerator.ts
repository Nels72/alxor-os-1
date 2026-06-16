// lib/ficPdfGenerator.ts
// Génération PDF pdfmake + preview HTML pour la Fiche d'Information et de Conseil (FIC).
// Reproduit la mise en page des FIC Assur Office existantes.

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

import {
  ECA_LEGAL,
  FIC_TITLES,
  AUTO_FORMULES,
  type FicData,
  type AutoFicData,
  type MrhFicData,
  type MrpFicData,
  type SanteFicData,
  type SanteCollectiveFicData,
  type PrevoyanceFicData,
  type VieFicData,
  type EmprunteurFicData,
} from './ficTemplates';

// Initialisation pdfmake fonts
(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs || pdfFonts;

// ============================
// HELPERS PDFMAKE
// ============================

const COLORS = {
  primary: '#1e293b',
  secondary: '#64748b',
  accent: '#ea580c',
  border: '#e2e8f0',
  bgLight: '#f8fafc',
  bgAccent: '#fff7ed',
};

function sectionTitle(text: string): object {
  return {
    text,
    style: 'sectionTitle',
    margin: [0, 14, 0, 6] as [number, number, number, number],
  };
}

function labelValue(label: string, value: string | number | undefined): object {
  return {
    columns: [
      { text: label, style: 'label', width: 180 },
      { text: value != null && value !== '' ? String(value) : '—', style: 'value', width: '*' },
    ],
    margin: [0, 2, 0, 2] as [number, number, number, number],
  };
}

function checkboxLine(label: string, checked: boolean): object {
  return {
    text: `${checked ? '☑' : '☐'} ${label}`,
    style: 'checkbox',
    margin: [0, 1, 0, 1] as [number, number, number, number],
  };
}

// ============================
// SECTIONS COMMUNES
// ============================

function buildHeader(data: FicData): object[] {
  const productTitle = FIC_TITLES[data.type] || data.type.toUpperCase();
  return [
    {
      text: `INFORMATIONS ET CONSEILS PRÉALABLES À LA CONCLUSION D'UN CONTRAT D'ASSURANCE ${productTitle}`,
      style: 'mainTitle',
      alignment: 'center' as const,
      margin: [0, 0, 0, 4] as [number, number, number, number],
    },
    {
      text: 'EN APPLICATION DU CODE DES ASSURANCES (ARTICLE L 520-1 ET R 520-1)',
      style: 'subtitle',
      alignment: 'center' as const,
      margin: [0, 0, 0, 14] as [number, number, number, number],
    },
  ];
}

function buildPresentationECA(): object[] {
  return [
    sectionTitle('PRÉSENTATION D\'EASY COURTAGE ASSURANCE'),
    { text: ECA_LEGAL.presentationText, style: 'bodySmall', margin: [0, 0, 0, 6] as [number, number, number, number] },
    { text: `Nos partenaires : ${ECA_LEGAL.partenaires.join(', ')}.`, style: 'bodySmall', margin: [0, 0, 0, 10] as [number, number, number, number] },
  ];
}

function buildSouscripteur(data: FicData): object[] {
  const s = data.souscripteur;
  return [
    sectionTitle('VOS DÉCLARATIONS'),
    { text: 'Vous nous avez contacté afin de souscrire un contrat d\'assurance. Nous vous remercions de préciser ci-après les situations, exigences et besoins du souscripteur.', style: 'body', margin: [0, 0, 0, 6] as [number, number, number, number] },
    { text: 'Identité du souscripteur :', style: 'labelBold', margin: [0, 4, 0, 4] as [number, number, number, number] },
    labelValue('Nom', `${s.prenom} ${s.nom}`),
    labelValue('Date de naissance', s.dateNaissance),
    labelValue('Adresse', s.adresse),
    labelValue('Téléphone', s.telephone),
    labelValue('Email', s.email),
  ];
}

function buildPrimeEtFrais(data: FicData): object[] {
  return [
    sectionTitle('PRIME ET FRAIS'),
    {
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            { text: 'Prime annuelle TTC', style: 'label' },
            { text: `${data.primeAnnuelleTTC} €`, style: 'valueBold', alignment: 'right' as const },
          ],
          [
            { text: 'Frais de dossier TTC', style: 'label' },
            { text: `${data.fraisDossierTTC} €`, style: 'valueBold', alignment: 'right' as const },
          ],
          [
            { text: 'TOTAL TTC', style: 'labelBold' },
            { text: `${data.primeAnnuelleTTC + data.fraisDossierTTC} €`, style: 'valueBold', alignment: 'right' as const },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => COLORS.border,
      },
      margin: [0, 4, 0, 10] as [number, number, number, number],
    },
  ];
}

function buildRecommandation(data: FicData): object[] {
  if (!data.recommandation) return [];
  return [
    sectionTitle('RECOMMANDATION DU COURTIER'),
    { text: data.recommandation, style: 'body', margin: [0, 0, 0, 10] as [number, number, number, number] },
  ];
}

function buildReclamations(): object[] {
  return [
    sectionTitle('RÉCLAMATIONS'),
    { text: ECA_LEGAL.reclamationsText, style: 'bodySmall', margin: [0, 0, 0, 10] as [number, number, number, number] },
  ];
}

function buildSignature(data: FicData): object[] {
  return [
    {
      columns: [
        {
          width: '50%',
          stack: [
            { text: `Fait à ${data.lieuSignature}, le ${data.dateSignature}`, style: 'body', margin: [0, 0, 0, 6] as [number, number, number, number] },
            { text: `${data.souscripteur.prenom} ${data.souscripteur.nom}`, style: 'labelBold' },
            { text: 'Signature précédée de la mention « Lu et approuvé »', style: 'bodySmall', margin: [0, 4, 0, 0] as [number, number, number, number] },
            { text: '', margin: [0, 40, 0, 0] as [number, number, number, number] }, // espace signature
          ],
        },
        {
          width: '50%',
          stack: [
            { text: 'Pour EASY COURTAGE ASSURANCE', style: 'body', margin: [0, 0, 0, 6] as [number, number, number, number] },
            { text: '', margin: [0, 40, 0, 0] as [number, number, number, number] },
          ],
        },
      ],
      margin: [0, 14, 0, 0] as [number, number, number, number],
    },
  ];
}

// ============================
// SECTIONS PRODUIT-SPÉCIFIQUES
// ============================

function buildAutoSection(data: AutoFicData): object[] {
  const v = data.vehicule;
  const items: object[] = [
    { text: 'Véhicule à assurer :', style: 'labelBold', margin: [0, 6, 0, 4] as [number, number, number, number] },
    labelValue('Marque', v.marque),
    labelValue('Modèle', v.modele),
    labelValue('Immatriculation', v.immatriculation),
    labelValue('Lieu de garage habituel', v.lieuGarage),
    { text: 'Vos exigences et vos besoins :', style: 'labelBold', margin: [0, 8, 0, 4] as [number, number, number, number] },
  ];

  // Tableau des formules avec checkbox
  const formulesBody = AUTO_FORMULES.map(f => {
    const isProposed = data.formuleProposee?.toUpperCase().includes(f.code);
    const isSouhaite = data.formuleSouhaitee?.toUpperCase().includes(f.code);
    return [
      { text: `${f.code} : ${f.label}`, style: 'bodySmall' },
      { text: isSouhaite ? '☑' : '☐', alignment: 'center' as const, style: 'checkbox' },
      { text: isProposed ? '☑' : '☐', alignment: 'center' as const, style: 'checkbox' },
    ];
  });

  items.push({
    table: {
      widths: ['*', 60, 60],
      headerRows: 1,
      body: [
        [
          { text: 'Garanties', style: 'labelBold' },
          { text: 'Souhaité', style: 'labelBold', alignment: 'center' as const },
          { text: 'Proposé', style: 'labelBold', alignment: 'center' as const },
        ],
        ...formulesBody,
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => COLORS.border,
      vLineColor: () => COLORS.border,
    },
    margin: [0, 4, 0, 6] as [number, number, number, number],
  });

  // Garanties extraites du devis
  if (data.garanties.length > 0) {
    items.push({ text: 'Détail des garanties extraites du devis :', style: 'labelBold', margin: [0, 6, 0, 4] as [number, number, number, number] });
    data.garanties.forEach(g => {
      const detail = g.plafond ? ` (plafond: ${g.plafond})` : '';
      items.push(checkboxLine(`${g.nom}${detail}`, g.inclus));
    });
  }

  return items;
}

function buildMrhSection(data: MrhFicData): object[] {
  const l = data.logement;
  const items: object[] = [
    { text: 'Le bien à assurer :', style: 'labelBold', margin: [0, 6, 0, 4] as [number, number, number, number] },
    labelValue('Type de logement', l.typeLogement),
    labelValue('Qualité de l\'occupant', l.qualiteOccupant),
    labelValue('Surface', l.surface ? `${l.surface} m²` : undefined),
    labelValue('Nombre de pièces', l.nbPieces),
    labelValue('Étage', l.etage),
  ];

  if (data.garanties.length > 0) {
    items.push({ text: 'Garanties incluses :', style: 'labelBold', margin: [0, 8, 0, 4] as [number, number, number, number] });
    data.garanties.forEach(g => items.push(checkboxLine(g.nom, g.inclus)));
  }

  if (data.options.length > 0) {
    items.push({ text: 'Services optionnels :', style: 'labelBold', margin: [0, 8, 0, 4] as [number, number, number, number] });
    data.options.forEach(o => items.push(checkboxLine(o.nom, o.inclus)));
  }

  return items;
}

function buildMrpSection(data: MrpFicData): object[] {
  const e = data.entreprise;
  const items: object[] = [
    { text: 'L\'entreprise à assurer :', style: 'labelBold', margin: [0, 6, 0, 4] as [number, number, number, number] },
    labelValue('Raison sociale', e.raisonSociale),
    labelValue('SIREN', e.siren),
    labelValue('Adresse siège', e.adresseSiege),
    labelValue('Activité', e.activite),
  ];

  if (data.garanties.length > 0) {
    items.push({ text: 'Garanties souscrites :', style: 'labelBold', margin: [0, 8, 0, 4] as [number, number, number, number] });
    data.garanties.forEach(g => {
      const detail = g.plafond ? ` — Plafond: ${g.plafond}` : '';
      items.push(checkboxLine(`${g.nom}${detail}`, g.inclus));
    });
  }

  if (data.options.length > 0) {
    items.push({ text: 'Options complémentaires :', style: 'labelBold', margin: [0, 8, 0, 4] as [number, number, number, number] });
    data.options.forEach(o => items.push(checkboxLine(o.nom, o.inclus)));
  }

  return items;
}

function buildSanteSection(data: SanteFicData): object[] {
  const items: object[] = [
    labelValue('Régime de Sécurité Sociale', data.regime),
    labelValue('Composition de la famille', data.compositionFamille),
  ];

  if (data.garanties.length > 0) {
    items.push({ text: 'Niveaux de couverture :', style: 'labelBold', margin: [0, 8, 0, 4] as [number, number, number, number] });
    data.garanties.forEach(g => {
      const detail = g.plafond ? ` — Niveau: ${g.plafond}` : '';
      items.push(checkboxLine(`${g.nom}${detail}`, g.inclus));
    });
  }

  if (data.options.length > 0) {
    items.push({ text: 'Options :', style: 'labelBold', margin: [0, 8, 0, 4] as [number, number, number, number] });
    data.options.forEach(o => items.push(checkboxLine(o.nom, o.inclus)));
  }

  return items;
}

function buildSanteCollectiveSection(data: SanteCollectiveFicData): object[] {
  const e = data.entreprise;
  const items: object[] = [
    { text: 'L\'entreprise souscriptrice :', style: 'labelBold', margin: [0, 6, 0, 4] as [number, number, number, number] },
    labelValue('Raison sociale', e.raisonSociale),
    labelValue('SIREN', e.siren),
    labelValue('Effectif', e.effectif),
    labelValue('Convention collective', e.ccn),
  ];

  if (data.garanties.length > 0) {
    items.push({ text: 'Niveaux de couverture :', style: 'labelBold', margin: [0, 8, 0, 4] as [number, number, number, number] });
    data.garanties.forEach(g => {
      const detail = g.plafond ? ` — Niveau: ${g.plafond}` : '';
      items.push(checkboxLine(`${g.nom}${detail}`, g.inclus));
    });
  }

  return items;
}

function buildPrevoyanceSection(data: PrevoyanceFicData): object[] {
  const items: object[] = [
    labelValue('Revenus', data.revenus),
    labelValue('Situation familiale', data.situationFamiliale),
  ];

  if (data.garanties.length > 0) {
    items.push({ text: 'Garanties souscrites :', style: 'labelBold', margin: [0, 8, 0, 4] as [number, number, number, number] });
    data.garanties.forEach(g => {
      const detail = g.plafond ? ` — Capital/Rente: ${g.plafond}` : '';
      items.push(checkboxLine(`${g.nom}${detail}`, g.inclus));
    });
  }

  return items;
}

function buildVieSection(data: VieFicData): object[] {
  const items: object[] = [
    labelValue('Objectifs patrimoniaux', data.objectifs),
    labelValue('Profil de risque', data.profilRisque),
    labelValue('Clause bénéficiaire', data.clauseBeneficiaire),
  ];

  if (data.garanties.length > 0) {
    items.push({ text: 'Supports et options :', style: 'labelBold', margin: [0, 8, 0, 4] as [number, number, number, number] });
    data.garanties.forEach(g => items.push(checkboxLine(g.nom, g.inclus)));
  }

  return items;
}

function buildEmprunteurSection(data: EmprunteurFicData): object[] {
  const p = data.pret;
  const items: object[] = [
    { text: 'Caractéristiques du prêt :', style: 'labelBold', margin: [0, 6, 0, 4] as [number, number, number, number] },
    labelValue('Banque', p.banque),
    labelValue('Montant du prêt', p.montant ? `${p.montant} €` : undefined),
    labelValue('Durée', p.duree ? `${p.duree} mois` : undefined),
    labelValue('Taux', p.taux ? `${p.taux} %` : undefined),
  ];

  if (data.garanties.length > 0) {
    items.push({ text: 'Garanties souscrites :', style: 'labelBold', margin: [0, 8, 0, 4] as [number, number, number, number] });
    data.garanties.forEach(g => {
      const detail = g.plafond ? ` — Quotité: ${g.plafond}` : '';
      items.push(checkboxLine(`${g.nom}${detail}`, g.inclus));
    });
  }

  return items;
}

function buildProductSection(data: FicData): object[] {
  switch (data.type) {
    case 'auto': return buildAutoSection(data);
    case 'mrh': return buildMrhSection(data);
    case 'mrp': return buildMrpSection(data);
    case 'sante': return buildSanteSection(data);
    case 'sante_collective': return buildSanteCollectiveSection(data);
    case 'prevoyance': return buildPrevoyanceSection(data);
    case 'vie': return buildVieSection(data);
    case 'emprunteur': return buildEmprunteurSection(data);
  }
}

// ============================
// STYLES PDFMAKE
// ============================

const styles: Record<string, object> = {
  mainTitle: { fontSize: 12, bold: true, color: COLORS.primary },
  subtitle: { fontSize: 9, color: COLORS.secondary },
  sectionTitle: { fontSize: 10, bold: true, color: COLORS.primary, decoration: 'underline' as const },
  body: { fontSize: 9, color: COLORS.primary },
  bodySmall: { fontSize: 7.5, color: COLORS.secondary, lineHeight: 1.3 },
  label: { fontSize: 8, color: COLORS.secondary },
  labelBold: { fontSize: 8.5, bold: true, color: COLORS.primary },
  value: { fontSize: 9, color: COLORS.primary },
  valueBold: { fontSize: 9, bold: true, color: COLORS.primary },
  checkbox: { fontSize: 8, color: COLORS.primary },
};

// ============================
// GÉNÉRATEUR PDF
// ============================

/**
 * Génère un Blob PDF de la FIC à partir des données structurées.
 *
 * ⚠️ pdfmake ≥ 0.3.0 : toutes les méthodes (`getBlob`, `getBuffer`, `download`...)
 * retournent une Promise — il n'y a plus de callback (breaking change du changelog
 * pdfmake). `getBlob((blob) => ...)` ne déclenche plus jamais le callback, d'où un
 * blocage infini du bouton "Générer & Archiver" (corrigé 2026-06-16).
 */
export async function generateFicPdf(data: FicData): Promise<Blob> {
  const content: object[] = [
    ...buildHeader(data),
    ...buildPresentationECA(),
    ...buildSouscripteur(data),
    ...buildProductSection(data),
    ...buildPrimeEtFrais(data),
    ...buildRecommandation(data),
    ...buildReclamations(),
    ...buildSignature(data),
  ];

  const docDefinition = {
    pageSize: 'A4' as const,
    pageMargins: [40, 40, 40, 40] as [number, number, number, number],
    content,
    styles,
    defaultStyle: { font: 'Roboto' },
    footer: (currentPage: number, pageCount: number) => ({
      text: `Page ${currentPage} sur ${pageCount}`,
      alignment: 'center' as const,
      fontSize: 7,
      color: COLORS.secondary,
      margin: [0, 10, 0, 0] as [number, number, number, number],
    }),
  };

  const pdfDoc = pdfMake.createPdf(docDefinition as any);
  return await pdfDoc.getBlob();
}

/**
 * Télécharge directement le PDF dans le navigateur.
 */
export async function downloadFicPdf(data: FicData): Promise<void> {
  const filename = `FIC_${data.type.toUpperCase()}_${data.souscripteur.nom}_${data.dateSignature.replace(/\//g, '-')}.pdf`;
  const pdfDoc = pdfMake.createPdf({
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: [
      ...buildHeader(data),
      ...buildPresentationECA(),
      ...buildSouscripteur(data),
      ...buildProductSection(data),
      ...buildPrimeEtFrais(data),
      ...buildRecommandation(data),
      ...buildReclamations(),
      ...buildSignature(data),
    ],
    styles,
    defaultStyle: { font: 'Roboto' },
    footer: (currentPage: number, pageCount: number) => ({
      text: `Page ${currentPage} sur ${pageCount}`,
      alignment: 'center' as const,
      fontSize: 7,
      color: COLORS.secondary,
      margin: [0, 10, 0, 0],
    }),
  } as any);
  await pdfDoc.download(filename);
}

// ============================
// PREVIEW HTML (window.open)
// ============================

/**
 * Génère un aperçu HTML de la FIC (pattern identique à FicheTarification).
 * Ouvre dans un nouvel onglet via window.open().
 */
export function openFicHtmlPreview(data: FicData): void {
  const productTitle = FIC_TITLES[data.type] || data.type.toUpperCase();
  const s = data.souscripteur;

  const garantiesHtml = data.garanties.length > 0
    ? `<h2>Garanties</h2>${data.garanties.map(g =>
        `<div class="row"><span class="check">${g.inclus ? '☑' : '☐'}</span><span class="label">${g.nom}</span><span class="value">${g.plafond || ''}</span></div>`
      ).join('')}`
    : '';

  const optionsHtml = data.options.length > 0
    ? `<h2>Options</h2>${data.options.map(o =>
        `<div class="row"><span class="check">${o.inclus ? '☑' : '☐'}</span><span class="label">${o.nom}</span><span class="value">${o.supplement || ''}</span></div>`
      ).join('')}`
    : '';

  const productFieldsHtml = buildProductPreviewHtml(data);

  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8">
<title>FIC ${productTitle} — ${s.prenom} ${s.nom}</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; padding: 40px 60px; color: #1e293b; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
  h1.sub { font-size: 11px; color: #64748b; text-align: center; margin-top: 0; }
  h2 { font-size: 12px; color: #64748b; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
  .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
  .value { font-size: 12px; font-weight: 700; }
  .check { width: 20px; font-size: 12px; }
  .highlight { color: #ea580c; font-weight: 700; }
  .section-legal { font-size: 9px; color: #94a3b8; line-height: 1.5; margin: 10px 0; }
  .prime-box { background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 16px; margin: 16px 0; }
  .prime-box .row { border-bottom: none; }
  .prime-box .value { color: #16a34a; font-size: 14px; }
  .reco-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin: 16px 0; }
  .signature-zone { display: flex; gap: 40px; margin-top: 30px; }
  .signature-zone > div { flex: 1; }
  .signature-line { border-bottom: 1px solid #1e293b; height: 60px; margin-top: 10px; }
  .footer { margin-top: 40px; font-size: 9px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
<h1>INFORMATIONS ET CONSEILS PRÉALABLES — ${productTitle}</h1>
<h1 class="sub">EN APPLICATION DU CODE DES ASSURANCES (ARTICLE L 520-1 ET R 520-1)</h1>

<h2>Présentation d'Easy Courtage Assurance</h2>
<div class="section-legal">${ECA_LEGAL.presentationText.replace(/\n/g, '<br>')}</div>
<div class="section-legal"><strong>Nos partenaires :</strong> ${ECA_LEGAL.partenaires.join(', ')}.</div>

<h2>Souscripteur</h2>
<div class="row"><span class="label">Nom</span><span class="value">${s.prenom} ${s.nom}</span></div>
<div class="row"><span class="label">Date de naissance</span><span class="value">${s.dateNaissance || '—'}</span></div>
<div class="row"><span class="label">Adresse</span><span class="value">${s.adresse || '—'}</span></div>
<div class="row"><span class="label">Téléphone</span><span class="value">${s.telephone || '—'}</span></div>
<div class="row"><span class="label">Email</span><span class="value">${s.email || '—'}</span></div>

${productFieldsHtml}
${garantiesHtml}
${optionsHtml}

<div class="prime-box">
  <h2 style="margin-top:0;border:none;">Prime et frais</h2>
  <div class="row"><span class="label">Compagnie</span><span class="value">${data.compagnie}</span></div>
  <div class="row"><span class="label">Formule</span><span class="value">${data.formuleProposee || '—'}</span></div>
  <div class="row"><span class="label">Prime annuelle TTC</span><span class="value">${data.primeAnnuelleTTC} €</span></div>
  <div class="row"><span class="label">Frais de dossier TTC</span><span class="value">${data.fraisDossierTTC} €</span></div>
  <div class="row"><span class="label" style="font-weight:700;color:#1e293b">TOTAL TTC</span><span class="value" style="font-size:16px">${data.primeAnnuelleTTC + data.fraisDossierTTC} €</span></div>
</div>

${data.recommandation ? `<div class="reco-box"><h2 style="margin-top:0;border:none;">Recommandation du courtier</h2><p style="font-size:11px">${data.recommandation}</p></div>` : ''}

<h2>Réclamations</h2>
<div class="section-legal">${ECA_LEGAL.reclamationsText}</div>

<div class="signature-zone">
  <div>
    <p style="font-size:11px">Fait à ${data.lieuSignature}, le ${data.dateSignature}</p>
    <p style="font-size:11px;font-weight:700">${s.prenom} ${s.nom}</p>
    <p style="font-size:9px;color:#94a3b8">Signature précédée de la mention « Lu et approuvé »</p>
    <div class="signature-line"></div>
  </div>
  <div>
    <p style="font-size:11px">Pour EASY COURTAGE ASSURANCE</p>
    <div class="signature-line"></div>
  </div>
</div>

<div class="footer">Alxor OS — FIC générée le ${data.dateSignature} à ${new Date().toLocaleTimeString('fr-FR')}</div>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

/**
 * Génère le HTML des champs produit-spécifiques pour le preview.
 */
function buildProductPreviewHtml(data: FicData): string {
  switch (data.type) {
    case 'auto': {
      const v = data.vehicule;
      return `<h2>Véhicule à assurer</h2>
        <div class="row"><span class="label">Marque</span><span class="value">${v.marque || '—'}</span></div>
        <div class="row"><span class="label">Modèle</span><span class="value">${v.modele || '—'}</span></div>
        <div class="row"><span class="label">Immatriculation</span><span class="value">${v.immatriculation || '—'}</span></div>
        <div class="row"><span class="label">Lieu de garage</span><span class="value">${v.lieuGarage || '—'}</span></div>`;
    }
    case 'mrh': {
      const l = data.logement;
      return `<h2>Bien à assurer</h2>
        <div class="row"><span class="label">Type de logement</span><span class="value">${l.typeLogement || '—'}</span></div>
        <div class="row"><span class="label">Qualité occupant</span><span class="value">${l.qualiteOccupant || '—'}</span></div>
        <div class="row"><span class="label">Surface</span><span class="value">${l.surface ? l.surface + ' m²' : '—'}</span></div>
        <div class="row"><span class="label">Nombre de pièces</span><span class="value">${l.nbPieces || '—'}</span></div>
        <div class="row"><span class="label">Étage</span><span class="value">${l.etage || '—'}</span></div>`;
    }
    case 'mrp': {
      const e = data.entreprise;
      return `<h2>Entreprise à assurer</h2>
        <div class="row"><span class="label">Raison sociale</span><span class="value">${e.raisonSociale || '—'}</span></div>
        <div class="row"><span class="label">SIREN</span><span class="value">${e.siren || '—'}</span></div>
        <div class="row"><span class="label">Adresse siège</span><span class="value">${e.adresseSiege || '—'}</span></div>
        <div class="row"><span class="label">Activité</span><span class="value">${e.activite || '—'}</span></div>`;
    }
    case 'sante':
      return `<h2>Informations santé</h2>
        <div class="row"><span class="label">Régime Sécu</span><span class="value">${data.regime || '—'}</span></div>
        <div class="row"><span class="label">Composition famille</span><span class="value">${data.compositionFamille || '—'}</span></div>`;
    case 'sante_collective': {
      const e = data.entreprise;
      return `<h2>Entreprise souscriptrice</h2>
        <div class="row"><span class="label">Raison sociale</span><span class="value">${e.raisonSociale || '—'}</span></div>
        <div class="row"><span class="label">SIREN</span><span class="value">${e.siren || '—'}</span></div>
        <div class="row"><span class="label">Effectif</span><span class="value">${e.effectif || '—'}</span></div>
        <div class="row"><span class="label">Convention collective</span><span class="value">${e.ccn || '—'}</span></div>`;
    }
    case 'prevoyance':
      return `<h2>Informations prévoyance</h2>
        <div class="row"><span class="label">Revenus</span><span class="value">${data.revenus || '—'}</span></div>
        <div class="row"><span class="label">Situation familiale</span><span class="value">${data.situationFamiliale || '—'}</span></div>`;
    case 'vie':
      return `<h2>Informations patrimoine</h2>
        <div class="row"><span class="label">Objectifs</span><span class="value">${data.objectifs || '—'}</span></div>
        <div class="row"><span class="label">Profil de risque</span><span class="value">${data.profilRisque || '—'}</span></div>
        <div class="row"><span class="label">Clause bénéficiaire</span><span class="value">${data.clauseBeneficiaire || '—'}</span></div>`;
    case 'emprunteur': {
      const p = data.pret;
      return `<h2>Caractéristiques du prêt</h2>
        <div class="row"><span class="label">Banque</span><span class="value">${p.banque || '—'}</span></div>
        <div class="row"><span class="label">Montant</span><span class="value">${p.montant ? p.montant + ' €' : '—'}</span></div>
        <div class="row"><span class="label">Durée</span><span class="value">${p.duree ? p.duree + ' mois' : '—'}</span></div>
        <div class="row"><span class="label">Taux</span><span class="value">${p.taux ? p.taux + ' %' : '—'}</span></div>`;
    }
  }
}
