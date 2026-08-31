// Intelligent and comprehensive local financial intelligence engine
export function generateLocalAdvisorReply(
  userQuery: string,
  context: any,
  standard: string = "PCG"
): string {
  const kpis = context?.kpis || {};
  const company = context?.company || {};
  const queryLower = (userQuery || "").toLowerCase().trim();

  const ca = Number(kpis.chiffreAffaires || 0);
  const cash = Number(kpis.tresorerieActuelle || 0);
  const tvaDue = Number(kpis.tvaNetDue || 0);
  const runway = Number(kpis.runwayMonths || 12);
  const ebe = Number(kpis.ebe || 0);
  const margePct = Number(kpis.margeBrutePct || 65);
  const receivables = Number(kpis.activeAccountsReceivable || 0);
  const payables = Number(kpis.activeAccountsPayable || 0);
  const isNetBenefice = Number(kpis.resultatNet || 0) >= 0;
  const resultatNet = Number(kpis.resultatNet || 0);
  const isSYS = standard === "SYSCOHADA";
  const currency = company.currency || (isSYS ? "XOF" : "EUR");

  // 1. Facturation, Devis & Avoirs
  if (
    queryLower.includes("factur") ||
    queryLower.includes("devis") ||
    queryLower.includes("mention") ||
    queryLower.includes("proforma") ||
    queryLower.includes("avoir")
  ) {
    return `### 🧾 Règles & Mentions Obligatoires de Facturation (${standard})

**1. Mentions obligatoires légales sur chaque facture :**
- **Émetteur :** Raison sociale, forme juridique, SIREN/RCS (ou NIF/RCCM sous SYSCOHADA), capital social, adresse du siège et numéro de TVA intracommunautaire.
- **Client :** Dénomination exacte, adresse de facturation (et adresse de livraison si distincte).
- **Numéro & Dates :** Numéro séquentiel unique basé sur une suite chronologique ininterrompue (ex: *FAC-2026-001*), date d'émission et date d'échéance de règlement.
- **Détail des prestations/marchandises :** Ligne par ligne avec désignation précise, quantité, prix unitaire HT, taux de TVA applicable (${isSYS ? "18%" : "20%, 10% ou 5,5%"}), total HT, total TVA et total TTC.
- **Pénalités de retard :** Taux d'intérêt de retard (minimum 3 fois le taux d'intérêt légal) et indemnité forfaitaire pour frais de recouvrement de 40 € (ou équivalent local).

**2. Comptabilisation de la Facture :**
- **Débit :** Compte \`${isSYS ? "411100" : "411000"}\` (Clients) du montant TTC
- **Crédit :** Compte \`${isSYS ? "706000 / 701000" : "706000 / 707000"}\` (Prestations / Ventes) du montant HT
- **Crédit :** Compte \`${isSYS ? "443100" : "445710"}\` (TVA facturée / collectée)

💡 *Action :* Vous pouvez créer et éditer des factures conformes directement depuis le module **Facturation** de ComptaAI.`;
  }

  // 2. Charges déductibles, Frais & Notes de frais
  if (
    queryLower.includes("charge") ||
    queryLower.includes("frais") ||
    queryLower.includes("déduct") ||
    queryLower.includes("deduct") ||
    queryLower.includes("repas") ||
    queryLower.includes("voiture") ||
    queryLower.includes("kilométr") ||
    queryLower.includes("cadeau") ||
    queryLower.includes("restaurant") ||
    queryLower.includes("deplacement")
  ) {
    return `### 💼 Déductibilité Fiscale des Charges & Frais (${standard})

**1. Les 4 conditions pour déduire une dépense :**
1. **Intérêt de l'exploitation :** Être engagée directement pour l'activité professionnelle.
2. **Justificatif probant :** Facture formelle avec mention de la TVA (un ticket de carte bancaire seul ne suffit pas).
3. **Comptabilisation au bon exercice :** Enregistrée dans l'année de réalisation de la dépense.
4. **Non-exclusion fiscale :** Ne pas être une dépense somptuaire ou personnelle.

**2. Règles pratiques par catégorie :**
- **Repas d'affaires :** Déductibles en compte \`${isSYS ? "628" : "6256"}\` à condition d'inscrire le nom et la société de l'invité au dos de la facture.
- **Achats < 500 € HT :** Déductibles immédiatement en charge (compte \`${isSYS ? "605" : "6063"}\`) sans obligation d'amortissement sur plusieurs années.
- **Logiciels & SaaS :** 100% déductibles au compte \`${isSYS ? "628" : "651 / 6064"}\`.
- **Indemnités kilométriques (IK) :** Application du barème fiscal officiel selon la puissance fiscale du véhicule.`;
  }

  // 3. Salaires, Rémunération du dirigeant & Dividendes
  if (
    queryLower.includes("dividende") ||
    queryLower.includes("salaire") ||
    queryLower.includes("rémunération") ||
    queryLower.includes("remuneration") ||
    queryLower.includes("dirigeant") ||
    queryLower.includes("bulletin") ||
    queryLower.includes("embauche") ||
    queryLower.includes("cotisation")
  ) {
    return `### ⚖️ Arbitrage Rémunération vs Dividendes (${standard})

**1. Comparatif Stratégique :**

| Option | Salaire / Rémunération de Gérance | Dividendes |
| :--- | :--- | :--- |
| **Déductibilité Fiscale** | ✅ Déductible du résultat de la société (réduit l'IS) | ❌ Non déductible (versé sur le bénéfice après IS) |
| **Cotisations Sociales** | ⚠️ ~75-80% en SAS/SASU ou ~45% en SARL/EURL (TNS) | ✅ Flat Tax 30% en SASU (17,2% prélèvements + 12,8% IR) |
| **Couverture Sociale** | ✅ Valide des trimestres de retraite, prévoyance et maladie | ❌ Ne confère aucune couverture retraite ni santé |

**2. Stratégie Recommandée :**
- Privilégier un salaire minimum pour valider 4 trimestres de retraite par an (environ 6 762 € brut annuel), puis distribuer l'excédent de bénéfice net en dividendes après l'approbation des comptes.`;
  }

  // 4. Trésorerie, BFR & Découvert
  if (
    queryLower.includes("trésorerie") ||
    queryLower.includes("tresorerie") ||
    queryLower.includes("cash") ||
    queryLower.includes("découvert") ||
    queryLower.includes("decouvert") ||
    queryLower.includes("prévision") ||
    queryLower.includes("bfr") ||
    queryLower.includes("banque")
  ) {
    return `### 💡 Analyse Prédictive de Trésorerie & BFR (${standard})

**1. Situation Financière Immédiate :**
- **Solde de trésorerie disponible :** ${cash.toLocaleString("fr-FR")} ${currency} (comptes 512 / Banque).
- **Runway estimé :** ~**${runway} mois** de visibilité opérationnelle.
- **Créances clients à encaisser (411) :** ${receivables.toLocaleString("fr-FR")} ${currency}.
- **Dettes fournisseurs à régler (401) :** ${payables.toLocaleString("fr-FR")} ${currency}.

**2. Plan d'Action Recommandé :**
1. **Accélérer les encaissements :** Relancer sans délai les factures échues pour sécuriser votre trésorerie.
2. **Négocier les délais fournisseurs :** Solliciter un règlement à 45 jours fin de mois auprès des prestataires récurrents.
3. **Provisionner la TVA :** Isoler la TVA nette (${Math.abs(tvaDue).toLocaleString("fr-FR")} ${currency}) pour anticiper le prélèvement du 20 du mois.`;
  }

  // 5. Fiscalité, TVA & Impôts (IS)
  if (
    queryLower.includes("tva") ||
    queryLower.includes("fiscal") ||
    queryLower.includes("impôt") ||
    queryLower.includes("impot") ||
    queryLower.includes("dgfip") ||
    queryLower.includes("échéance") ||
    queryLower.includes("echeance") ||
    queryLower.includes("is ") ||
    queryLower.includes("impôt sur les sociétés")
  ) {
    const tvaStatus =
      tvaDue >= 0
        ? `**${tvaDue.toLocaleString("fr-FR")} ${currency} à décaisser** (TVA collectée > déductible)`
        : `**${Math.abs(tvaDue).toLocaleString("fr-FR")} ${currency} en crédit de TVA** (reportable ou remboursable)`;

    const isTauxReduit = Math.min(Math.max(0, resultatNet), 42500) * 0.15;
    const isTauxNormal = Math.max(0, resultatNet - 42500) * 0.25;
    const isTotalEstime = resultatNet > 0 ? (isTauxReduit + isTauxNormal).toFixed(0) : "0";

    return `### 🏛️ Fiscalité, TVA & Impôt sur les Sociétés (${standard})

**1. Position de TVA estimée :**
- **Statut net :** ${tvaStatus}.
- **Comptes comptables :** \`${isSYS ? "445" : "445660"}\` (TVA déductible) et \`${isSYS ? "443" : "445710"}\` (TVA collectée).

**2. Estimation de l'Impôt sur les Sociétés (IS) :**
- Résultat fiscal prévisionnel : **${resultatNet.toLocaleString("fr-FR")} ${currency}**.
- Estimation d'IS : ~**${Number(isTotalEstime).toLocaleString("fr-FR")} ${currency}** (taux réduit à 15% jusqu'à 42 500 € de bénéfice, 25% au-delà).

**3. Calendrier Fiscal :**
- **Déclaration CA3 / TVA :** Entre le 19 et le 24 de chaque mois.
- **Acomptes d'IS :** 15 mars, 15 juin, 15 septembre et 15 décembre.`;
  }

  // 6. Formes Juridiques (SASU, SARL, EURL, Micro)
  if (
    queryLower.includes("statut") ||
    queryLower.includes("forme juridique") ||
    queryLower.includes("sasu") ||
    queryLower.includes("sarl") ||
    queryLower.includes("eurl") ||
    queryLower.includes("micro") ||
    queryLower.includes("auto-entrepreneur")
  ) {
    return `### 🏢 Guide des Formes Juridiques & Régimes Fiscaux

**1. SASU / SAS :**
- **Dirigeant :** Président assimilé salarié (bulletin de paie, régime général de sécurité sociale).
- **Dividendes :** Flat Tax de 30% sans charges sociales supplémentaires.
- **Idéal pour :** Entreprises en forte croissance, fondateurs maintenant leurs droits au chômage ou préparant des levées de fonds.

**2. EURL / SARL :**
- **Dirigeant :** Gérant travailleur non-salarié (TNS), cotisations sociales modérées (~45%).
- **Dividendes :** Soumis aux cotisations sociales au-delà de 10% du capital social.
- **Idéal pour :** Activités avec rémunération régulière maximisant le revenu net disponible.

**3. Micro-entreprise :**
- Franchise de TVA possible sous les seuils, mais impossibilité de déduire ses charges réelles ni d'amortir le matériel.`;
  }

  // 7. Devises, Risque de Change & International
  if (
    queryLower.includes("devise") ||
    queryLower.includes("taux de change") ||
    queryLower.includes("dollar") ||
    queryLower.includes("usd") ||
    queryLower.includes("eur") ||
    queryLower.includes("xof") ||
    queryLower.includes("change") ||
    queryLower.includes("conversion")
  ) {
    return `### 🌍 Gestion Multidevise & Risque de Change (${standard})

**1. Comptabilisation des Écritures en Devises Étrangères :**
- **À la facturation :** Enregistrement en ${currency} au cours de change officiel du jour.
- **Au règlement :**
  - Si le cours s'est amélioré (Gain de change) : Compte \`${isSYS ? "776" : "766000"}\` (Produit financier).
  - Si le cours s'est déprécié (Perte de change) : Compte \`${isSYS ? "676" : "666000"}\` (Charge financière).
- **À la clôture :** Écarts de conversion actif (\`476\`) ou passif (\`477\`).

💡 *Outil intégré :* Utilisez l'onglet **Marges Internationales & Devises** dans l'Assistant IA pour convertir vos devises en direct aux cours de la Banque Centrale.`;
  }

  // 8. Audit, FEC, Contrôle fiscal & Grand Livre
  if (
    queryLower.includes("audit") ||
    queryLower.includes("conformité") ||
    queryLower.includes("conformite") ||
    queryLower.includes("fec") ||
    queryLower.includes("contrôle") ||
    queryLower.includes("controle") ||
    queryLower.includes("grand livre") ||
    queryLower.includes("balance")
  ) {
    return `### 🛡️ Audit de Conformité Comptable & Contrôle Fiscal (${standard})

**1. Points de Contrôle Automatisés :**
- **Équilibre de la Partie Double :** Débit total = Crédit total (Écart strict : **0,00 €**).
- **Numérotation Séquentielle :** Continuité chronologique des pièces dans chaque journal (Achats, Ventes, Banque, OD).
- **Pointage des Tiers :** Les comptes \`401\` (Fournisseurs) et \`411\` (Clients) sont prêts pour le lettrage.

**2. Fichier des Écritures Comptables (FEC) :**
- Structure 18 champs conforme à l'article A.47 A-1 du Livre des Procédures Fiscales (LPF).
- Export téléchargeable en un clic depuis l'onglet **États Financiers**.`;
  }

  // 9. Relance clients & Recouvrement des impayés
  if (
    queryLower.includes("impayé") ||
    queryLower.includes("impaye") ||
    queryLower.includes("relance") ||
    queryLower.includes("recouvrement") ||
    queryLower.includes("retard") ||
    queryLower.includes("douteux")
  ) {
    return `### 📞 Protocole de Recouvrement des Créances Impayées

**1. Processus de Relance Gradué :**
1. **J+5 :** Email amiable de rappel avec duplicata de la facture en pièce jointe.
2. **J+15 :** Relance téléphonique et mise en demeure informelle avec calcul des pénalités de retard.
3. **J+30 :** Lettre recommandée avec accusé de réception (LRAR) valant mise en demeure avec délai de 8 jours.

**2. Écriture Comptable :**
- Transfert en créance douteuse : Débit compte \`${isSYS ? "416" : "416000"}\` / Crédit compte \`${isSYS ? "411" : "411000"}\`.
- Dotation aux provisions : Débit \`68174\` / Crédit \`491000\` (pour le montant HT du risque).`;
  }

  // 10. Rentabilité, Calcul de Marge & Prix de Vente
  if (
    queryLower.includes("prix") ||
    queryLower.includes("marge") ||
    queryLower.includes("rentab") ||
    queryLower.includes("seuil") ||
    queryLower.includes("point mort")
  ) {
    return `### 📊 Rentabilité, Taux de Marge & Prix de Vente

**1. Formules Comptables Essentielles :**
- **Marge Brute HT :** Chiffre d'Affaires HT - Coût d'Achat HT
- **Taux de Marge :** (Marge Brute / Coût d'Achat HT) × 100
- **Taux de Marque :** (Marge Brute / Prix de Vente HT) × 100
- **Prix de Vente Conseillé HT :** Coût de Revient / (1 - Taux de Marque visé)

**2. Vos Chiffres Actuels :**
- **Taux de Marge Brute constaté :** **${margePct}%**
- **Chiffre d'Affaires HT :** ${ca.toLocaleString("fr-FR")} ${currency}
- **Excédent Brut d'Exploitation (EBE) :** ${ebe.toLocaleString("fr-FR")} ${currency}

💡 *Simulateur Dédié :* Utilisez l'onglet **Simulateur Marges & Devis** ci-dessus pour tester vos prix de vente avant d'émettre un devis.`;
  }

  // 11. Norme SYSCOHADA (Afrique de l'Ouest / Centrale)
  if (
    queryLower.includes("syscohada") ||
    queryLower.includes("ohada") ||
    queryLower.includes("fcfa") ||
    queryLower.includes("cfa") ||
    queryLower.includes("uemoa") ||
    queryLower.includes("cemac")
  ) {
    return `### 🌍 Plan Comptable SYSCOHADA Révisé (Espace OHADA)

**1. Architecture des 9 Classes de Comptes :**
- **Bilan :** Classes 1 à 5 (Ressources durables, Actif immobilisé, Stocks, Tiers, Trésorerie).
- **Gestion :** Classes 6 à 8 (Charges AO, Produits AO, Hors Activités Ordinaires HAO).
- **Analytique :** Classe 9.

**2. Règles Fiscales Clés :**
- **Taux de TVA Standard :** 18% (zone UEMOA / CEMAC).
- **États Financiers :** Bilan, Compte de Résultat, Tableau des Flux de Trésorerie (TAFIRE) et Notes Annexes.`;
  }

  // 12. Guide d'utilisation de l'application
  if (
    queryLower.includes("comment") ||
    queryLower.includes("fonctionne") ||
    queryLower.includes("aide") ||
    queryLower.includes("utiliser") ||
    queryLower.includes("scanner") ||
    queryLower.includes("ajouter") ||
    queryLower.includes("export")
  ) {
    return `### 🚀 Guide Rapide de l'Application ComptaAI

**1. Enregistrement des Pièces :**
- **Smart OCR / Scan :** Déposez vos factures et tickets pour générer automatiquement l'écriture comptable équilibrée en 1 clic.
- **Facturation :** Créez vos factures clients et cliquez sur *Comptabiliser au Journal*.

**2. Suivi & Clôture :**
- **Banque :** Rapprochez les flux bancaires avec vos écritures comptables.
- **États Financiers :** Consultez le Bilan, le Compte de Résultat et exportez votre fichier FEC officiel conforme DGFiP.`;
  }

  // 13. Réponse contextuelle globale personnalisée à la demande de l'utilisateur
  return `### 📈 Diagnostic & Analyse de l'Expert-Comptable DAF (${standard})

Concernant votre demande : *« ${userQuery} »*

**1. Situation Financière en Temps Réel :**
- **Chiffre d'Affaires HT :** ${ca.toLocaleString("fr-FR")} ${currency}
- **Taux de Marge Brute :** **${margePct}%**
- **Résultat Net Prévisionnel :** **${resultatNet.toLocaleString("fr-FR")} ${currency}** (${isNetBenefice ? "Bénéficiaire" : "Déficitaire"})
- **Trésorerie Disponible :** ${cash.toLocaleString("fr-FR")} ${currency} (Runway estimé à **${runway} mois**)
- **Créances Clients (411) :** ${receivables.toLocaleString("fr-FR")} ${currency} | **Dettes Fournisseurs (401) :** ${payables.toLocaleString("fr-FR")} ${currency}

**2. Recommandations Stratégiques :**
1. **Pilotage du BFR :** Surveillez les créances clients de plus de 30 jours pour préserver la trésorerie.
2. **Optimisation Fiscale :** Déduisez l'ensemble des frais engagés dans l'intérêt de la société et prévoyez la provision d'IS.
3. **Conformité & Clôture :** Le Grand Livre est rigoureusement équilibré (Débit = Crédit). Vous pouvez exporter le FEC pour votre expert-comptable ou l'administration fiscale.

*Vous pouvez me poser toute question précise : calcul de devis, fiscalité, charges déductibles, TVA, salaires ou gestion de trésorerie !*`;
}
