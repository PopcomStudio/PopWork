	Checklist Technique – Facturation Électronique
(France)
A. Obligations réglementaires & planning
• Prendre en compte le calendrier de généralisation : réception obligatoire dès 01/09/2026 ;
émission obligatoire en deux vagues (grandes entreprises/ETI 01/09/2026, PME/TPE
01/09/2027).
• Identifier le périmètre fonctionnel : B2B national / export / B2C / marchés publics (Chorus
Pro).
B. Formats & sémantique
• Supporter Factur-X (PDF/A-3 + XML), UBL et CII conformes EN-16931.
• Mettre en place un mapping interne BDD → champs EN-16931.
• Implémenter validateurs (XSD, règles métier, validation sémantique).
• Générer PDF lisible en PDF/A-3 pour Factur-X.
C. Transmission & interopérabilité
• Intégrer transmission via PDP (Plateformes Partenaires).
• Implémenter client API PDP (dépôt, statut, accusés).
• Synchroniser et gérer l’annuaire des destinataires.
D. Intégrité / authenticité
• Mettre en place signature électronique qualifiée ou horodatage certifié.
• Conserver preuves : signatures, jetons, accusés PDP, logs horodatés.
E. Archivage à valeur probante
• Mettre en place un SAE conforme NF Z42-013 / ISO 14641-1.
• Durées de conservation : 6 ans (fiscal), 10 ans (commercial).
• Exporter/migrer archives avec métadonnées.
F. RGPD & sécurité
• Chiffrement TLS 1.2+ pour API.
• Chiffrement au repos des données sensibles.
• Gestion RBAC + MFA, journalisation des accès.
• Conformité RGPD (registre, DPIA si nécessaire).
G. Piste d’audit
• Journaliser événements : création, transmission, accusés, consultation.
• Conserver identifiants liés : ID interne, numéro facture, hash, horodatages, IP, utilisateur.
• Produire rapports d’audit prêts pour contrôle fiscal.
H. Tests & interopérabilité
• Développer tests unitaires, intégration et charge.
• Jeux de données avec cas limites (multi-taxe, escomptes, avoirs).
• Tests interopérabilité avec plusieurs PDP.
I. Interface & UX
• Interface admin : config PDP, suivi envoi, export archives.
• Notifications et relances automatiques.
• Mode simulation/bac à sable pour clients.
J. Documentation & conformité
• Documenter architecture, signature, archivage, conservation.
• Produire preuves de conformité (rapports, échanges PDP).
K. Exploitation
• Plan de reprise après incident (backup SAE, clés).
• Supervision (alertes sur erreurs PDP, délais).
• Plan montée en charge (batch, compression, file d’attente).




Ce qu’il faut absolument savoir (récap. essentiel)

La généralisation de la facturation électronique en France se déploie progressivement : obligation de recevoir des e-factures pour toutes les entreprises dès 1ᵉʳ septembre 2026, et obligation d’émettre par étapes (grandes entreprises/ETI d’abord, puis PME/TPE en 2027). 
Entreprendre
+1

Les formats autorisés / recommandés : Factur-X (PDF/A-3 + XML), UBL et CII (UN/CEFACT CII) — tous conformes à la norme sémantique européenne EN 16931. 
impots.gouv.fr
+1

Architecture de transmission : les factures B2B nationales devront transiter via des plateformes de dématérialisation partenaires (PDP) (ou via la plateforme publique pour le secteur public — Chorus Pro pour la sphère publique). Tu devras prévoir l’intégration avec ces PDPs / annuaire. 
impots.gouv.fr
+1

Archivage / conservation : prévoir une solution d’archivage à valeur probante (horodatage, piste d’audit, intégrité). Sur les durées : 6 ans pour la portée fiscale courante (contrôles fiscaux) et 10 ans pour les obligations comptables commerciales — en pratique il faut couvrir les deux. Normes et bonnes pratiques (ex. NF Z42-013, PDF/A-3 pour Factur-X). 
Bofip
+2
lucca.fr
+2

Liste détaillée des normes / règles / exigences à implémenter

Formats de facture & conformité sémantique

Générer / accepter : Factur-X (PDF/A-3 + xml Factur-X), UBL 2.x, CII (UN/CEFACT CII). Ces formats doivent respecter la EN-16931 (modèle sémantique). Implémenter les XSD/ schémas et vérifier la correspondance sémantique (champs obligatoires, formats date, montants, monnaies, SIREN, etc.). 
impots.gouv.fr
+1

Mentions obligatoires

Les factures électroniques doivent contenir les mêmes mentions que les factures « papier » (numéro, date, coordonnées, SIREN/SIRET, TVA, conditions de paiement, etc.) — et ces champs doivent être disponibles en champs structurés dans l’XML. (Voir spécifications EN-16931 / dossiers techniques français). 
impots.gouv.fr
+1

Transmission via PDP / raccordement

Le flux national passera par des Plateformes de Dématérialisation Partenaires (PDP). Ton appli doit pouvoir :
• déposer une facture sur une PDP (API SOAP/REST) ou recevoir via PDP ;
• suivre l’état (accusé de réception, validation, refus) ;
• gérer réacheminement vers le client final/plateforme destinataire (annuaire). 
impots.gouv.fr
+1

Intégrité / Authenticité / Lisibilité

Garantir authenticité de l’origine et intégrité du contenu : options acceptées : signature électronique qualifiée, horodatage certifié, ou mise en place d’une piste d’audit fiable (PAF) démontrant lien commande-facture-paiement. Assurer aussi la lisibilité humaine (PDF/A-3 pour Factur-X). 
Bofip
+1

Archivage à valeur probante

Mettre en place archivage conforme (NF Z42-013 ou équivalent, preuve d’intégrité, horodatage et accès contrôlé). Conserver selon obligations (fiscal 6 ans / commercial 10 ans). Penser à la séparation des rôles, journalisation, procédures de restauration. 
lucca.fr
+1

E-reporting / obligations fiscales

Le dispositif français comprend aussi de l’e-reporting : certaines données de facturation devront être remontées à l’administration (selon la réforme). Prévoir extraction et envoi distincts si nécessaire. 
European Commission
+1

Sécurité & confidentialité (RGPD)

TLS 1.2/1.3 pour APIs, chiffrement au repos si nécessaire, contrôle d’accès, pseudonymisation des données sensibles si requise, accord sur durée de conservation, mentions dans la DPIA si traitement à risque. Respecter le RGPD pour les données clients/fiscales.

Interopérabilité & validation

Intégrer des validateurs XML (XSD), contrôles métier (montants, TVA), et tests d’interopérabilité (ex. validator Factur-X / validators fournis par AFNOR / FNFE). Gérer plusieurs versions (Factur-X évolue — suivre versions). 
FNFE-MPE
+1

Architecture technique recommandée (haut niveau)

Module de génération : templates PDF/A-3 + embed XML (Factur-X) et/ou XML natif (UBL/CII).

Validateur : XSD + règles métier + schéma EN-16931 checks.

Module transmission : client PDP (APIs), gestion des états (file d’attente, relances).

Archivage : SAE (Système d’Archivage Électronique) conforme (NF Z42-013 ou prestataire agréé).

Sécurité : TLS, journalisation, HSM si signature qualifiée, gestion clés/horodatage.

Supervision/Logs : traçabilité complète (qui, quand, version, IP, status).

Interface admin : gestion des identifiants PDP, mapping des formats, historique d’envoi/accusés.

Étapes pratiques pour démarrer (priorité)

Choisir les formats cibles : Factur-X (bonne couverture), UBL et/ou CII selon clients.

Réaliser un prototype Factur-X (PDF/A-3 + XML embarqué) et valider avec un outil public/validator. 
FNFE-MPE

Implémenter validation automatique (XSD + règles métier).

Intégrer un PDP : étudier l’annuaire / API des PDPs et préparer le workflow dépôt / accusés. 
impots.gouv.fr

Mettre en place archivage légal (ou contractualiser avec prestataire SAE conforme). 
lucca.fr

Tests : interopérabilité (envoi/réception), charge, reprise après incident.

Documentation & preuves : documentation de la piste d’audit fiable, procédures d’archivage, politiques de sécurité (utile en cas de contrôle).

Sources officielles et utiles (pour aller plus loin)

Impôts / DGFIP – fiche « Facturation électronique et plateformes partenaires ». 
impots.gouv.fr

Service-public / calendrier & FAQ sur généralisation (dates 2026/2027). 
Entreprendre

Spécification Factur-X / FNFE (versions & compatibilités). 
FNFE-MPE

Dossier de spécifications externes (formats acceptés, EN-16931, UBL, CII). 
impots.gouv.fr

BOFiP / règles de conservation & piste d’audit fiable. 
Bofip