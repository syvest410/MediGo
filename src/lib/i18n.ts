// i18n system for MediGo Hessen - Medical Logistics & Specimen Express Courier
// HQ & Main Starting City: Wiesbaden, Germany (Landeshauptstadt Wiesbaden)

export type Language = 'de' | 'en';

export const getInitialLanguage = (): Language => {
  try {
    const stored = localStorage.getItem('medigo_language');
    if (stored === 'de' || stored === 'en') {
      return stored;
    }
    const navLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
    if (navLang.toLowerCase().startsWith('de')) {
      return 'de';
    }
  } catch (e) {
    console.warn('Unable to access localStorage or navigator language:', e);
  }
  // German regulatory default under ApBetrO & Hessen Medical Transport
  return 'de';
};

export const setLanguagePreference = (lang: Language): void => {
  try {
    localStorage.setItem('medigo_language', lang);
  } catch (e) {
    console.warn('Unable to set localStorage language:', e);
  }
};

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  de: {
    // Brand & Main Location
    'brand.name': 'MediGo',
    'brand.sub': 'Medizinische Logistik & Probenkurier • Wiesbaden Hub & Hessen Express',
    'location.hq': 'Hauptstandort Wiesbaden',
    'location.hq_badge': 'Wiesbaden Zentrale • Hessen',
    'location.hq_full': 'Landeshauptstadt Wiesbaden (Hauptstandort & Dispatch Zentrale)',
    'location.expansion': 'Startpunkt Wiesbaden • Ausbau in ganz Hessen & Deutschland',

    // Header & Navigation
    'nav.landing': 'Startseite',
    'nav.clinic_portal': 'Klinik & Labor Portal',
    'nav.driver_app': 'Fahrer App',
    'nav.dispatch': 'Leitstand / Disposition',
    'nav.compliance': 'Recht & UN 3373',
    'nav.security': 'Sicherheits-Matrix',
    'nav.schema': 'Datenbank Schema',
    'nav.patient_portal': 'Patienten-Tracking',
    'nav.login': 'Anmelden',
    'nav.logout': 'Abmelden',
    'nav.online': 'Online',
    'nav.offline': 'Offline (Warteschlange aktiv)',
    'nav.day_mode': 'Tages-Betrieb',
    'nav.night_mode': 'Nacht-Schicht',
    'nav.get_app': 'Mobile App Installieren',
    'nav.lang_switch': 'Sprache',
    'nav.sensors_guide': 'Sensor-Leitfaden',
    'nav.users_contracts': 'Benutzer & Verträge',
    'nav.switch_role': 'Rolle wechseln (CEO)',
    'nav.sync_now': 'Jetzt synchronisieren',
    'nav.scope_clinic': 'Klinik-Portal Bereich',
    'nav.scope_driver': 'Fahrer-Kurier Bereich',
    'nav.breach_alert': 'Kühlketten-Alarm!',

    // Statuses
    'status.SCHEDULED': '1. Geplant',
    'status.PRE_TRIP_CHECK': '2. Vor-Fahrt Check',
    'status.PICKED_UP': '3. Übernommen',
    'status.IN_TRANSIT': '4. Unterwegs',
    'status.DELIVERED': '5. Zugestellt',
    'status.CANCELLED': 'Storniert',
    'status.QUARANTINED_UNSYNCED': 'In Quarantäne (Konflikt)',

    // Transport Types
    'transport.AMBIENT_15_25C': 'Raumtemperatur (15-25°C)',
    'transport.REFRIGERATED_2_8C': 'Gekühlt (2-8°C)',
    'transport.FROZEN_DRY_ICE': 'Gefroren / Trockeneis (-20°C / -80°C)',

    // Landing Page Hero & Showcase
    'landing.hero_badge': '🚑 Medizinischer Expresskurier UN 3373 Kategorie B • ISO 15189',
    'landing.hero_title_1': 'Höchste Präzision für',
    'landing.hero_title_highlight': 'Medizinische Logistik',
    'landing.hero_title_2': '& Laborproben',
    'landing.hero_desc': 'MediGo startet aus der Landeshauptstadt Wiesbaden und bietet zertifizierte Express-Transporte für Blut, Gewebe, Stammzellen, Apheresen und Eil-Apothekenfahrten. Temperaturüberwacht & lückenlos dokumentiert.',
    'landing.hq_badge': '📍 Zentrale & Dispatch Hub: Wiesbaden',
    'landing.hq_detail': 'Strategisch positioniert in Wiesbaden für blitzschnelle Reaktionszeiten nach Frankfurt, Mainz, Marburg, Darmstadt, Kassel und bundesweit.',
    'landing.quick_login': 'Direkt-Zugang wählen',
    'landing.btn_portal': 'Klinik / Labor Portal',
    'landing.btn_driver': 'Fahrer / Kurier App',
    'landing.btn_dispatch': 'Leitstand / Dispatcher',
    'landing.feature_1_title': 'UN 3373 Kategorie B & P650',
    'landing.feature_1_desc': 'Zertifizierter Transport von biologischen Stoffen und Laborproben gemäß ADR/P650 Bestimmungen.',
    'landing.feature_2_title': 'Echtzeit-Temperaturüberwachung',
    'landing.feature_2_desc': 'Sensorgeleitete Kühlketten-Dokumentation (2-8°C, 15-25°C, Trockeneis) mit automatischer Alarmierung.',
    'landing.feature_3_title': 'Kettennachweis & Digitale Quittung',
    'landing.feature_3_desc': 'Rechtssichere Übergabe mit Barcode-Scan, GPS-Zeitstempel und digitaler Unterschrift.',
    'landing.feature_4_title': 'Stammzellen & Eil-Apotheke',
    'landing.feature_4_desc': 'Spezialisierte Sonderfahrten für Stammzellen/Apheresen und Notfall-Zytostatika mit höchster Priorität.',
    'landing.services_title': 'Unsere Spezialisierten Logistik-Dienstleistungen',
    'landing.services_sub': 'Entwickelt für Kliniken, MVZs, Großlabore und Apotheken – gestartet in Wiesbaden, wachsend für ganz Deutschland.',
    'landing.demo_credentials_title': 'Demo-Zugangsdaten für die Testumgebung',
    'landing.demo_banner': 'Testumgebung für Zentrale Wiesbaden initialisiert. Demo-Logins kopieren:',
    'landing.night_fleet_badge': '24/7 Notfall-Nachtdienst Aktiv',
    'landing.day_fleet_badge': 'MediGo Wiesbaden Flotte & Kurier',
    'landing.switch_to_day': 'Zu Tagmodus wechseln',
    'landing.switch_to_night': 'Zu Nachtmodus wechseln',
    'landing.night_fleet_title': '24/7 Notfall-Nachtdienst für Probenlogistik',
    'landing.day_fleet_title': 'Zertifiziertes UN 3373 Proben-Transportfahrzeug (Wiesbaden)',
    'landing.night_fleet_desc': 'Aktives 20:00 - 06:00 Nachtdienst-Protokoll für Notfall-Eilproben in Kliniken in Wiesbaden und Hessen.',
    'landing.day_fleet_desc': 'Ausgestattet mit GPS-Live-Telemetrie, P650-Schutzboxen, aktiver 2-8°C / -20°C Kühlung und reflektierender Schutzkleidung.',
    
    // Login Card on Landing Page
    'login.title': 'MediGo Portal Sicherer Zugang',
    'login.subtitle': 'Wählen Sie Ihre Organisationsrolle für das entsprechende Dashboard.',
    'login.role_clinic': 'Klinik / Labor',
    'login.role_driver': 'Kurierfahrer',
    'login.role_dispatcher': 'Leitstand / CEO',
    'login.clinic_email': 'Klinik E-Mail-Adresse',
    'login.contract_number': 'Vertragsnummer',
    'login.driver_name': 'Fahrername / Fahrzeug',
    'login.driver_pin': 'Sicherheits-PIN des Fahrers',
    'login.dispatcher_email': 'Disponenten E-Mail',
    'login.password': 'Passwort',
    'login.submit_btn': 'Anmelden & Portal starten',
    'login.instant_shortcuts': 'Sofort-Zugang mit 1 Klick (Demo)',
    'login.btn_clinic_short': 'Klinik Login',
    'login.btn_driver_short': 'Fahrer Login',
    'login.btn_ceo_short': 'Leitstand Login',

    // Role Cards Section on Landing Page
    'roles.section_title': 'Drei Getrennte Rollen-Dashboards',
    'roles.section_desc': 'Strikte Sicherheits-Isolation gewährleistet, dass Kliniken, Kuriere und Geschäftsleitung nur die für sie relevanten Daten sehen.',
    'roles.clinic_title': '1. Klinik & Labor Portal',
    'roles.clinic_desc': 'Entwickelt für Klinikpersonal und Laborempfang zur Beauftragung von UN 3373 Probentransporten.',
    'roles.clinic_f1': 'Sofortige UN 3373 Buchung & Boxen-Erfassung',
    'roles.clinic_f2': 'Live Kurier-ETA Karte & Ankunftszeiten',
    'roles.clinic_f3': 'Automatische Monatsabrechnung & GDP Rechnungen',
    'roles.clinic_btn': 'Klinik Portal starten',
    'roles.driver_title': '2. Fahrer- & Kurier-App',
    'roles.driver_desc': 'Mobile PWA für Kurierfahrer zur Navigation, Probenübernahme in Klinikkellern und Übergabe.',
    'roles.driver_f1': 'Strikter Ablauf (Vor-Fahrt Check bis Zustellung)',
    'roles.driver_f2': 'Offline-Warteschlange bei Funklöchern in Kellern',
    'roles.driver_f3': 'Auftragsbörse zur Annahme verfügbarer Fahrten',
    'roles.driver_btn': 'Fahrer App starten',
    'roles.dispatch_title': '3. Leitstand & Flottensteuerung',
    'roles.dispatch_desc': 'Zentrale Flottenübersicht mit Live-Temperatur-Alarmen, Kettennachweis und Rechtsarchiv.',
    'roles.dispatch_f1': 'Live GPS Telemetriekarte & Kühlketten-Spitzen',
    'roles.dispatch_f2': 'Rechtssichere Audit-Protokolle & Signatur-PDFs',
    'roles.dispatch_f3': 'DSGVO Art. 28 AVV Vereinbarungen & ApBetrO',
    'roles.dispatch_btn': 'Leitstand starten',
    'landing.footer_copy': '© 2026 MediGo Logistics GmbH • Landeshauptstadt Wiesbaden',
    'landing.footer_cert': 'EU DSGVO Datenschutz & Transfusionsgesetz (§ 15 TFG) Zertifiziert',

    // Service Categories
    'service.stem_cells': 'Stammzellen / Apheresen',
    'service.stem_cells_desc': 'GDP-zertifizierter Transport von Stammzellen & Zellprodukten im Zeitfenster unter 4 Std.',
    'service.pharmacy_urgent': 'Apotheken-Eilfahrt',
    'service.pharmacy_urgent_desc': 'Notfall-Medikamente, Zytostatika & Kühlware direkt an Kliniken & Praxen.',
    'service.un3373_blood': 'UN 3373 Kat. B Blut & Gewebe',
    'service.un3373_blood_desc': 'Standard- und Eiltransporte von Patientenproben in P650 Schutzverpackungen.',
    'service.small_volume': 'Biostoff UN 3373 Kleinstmengen',
    'service.small_volume_desc': 'Kosteneffiziente Direktfahrten für einzelne Dringlichkeitsproben.',

    // Clinic Portal
    'clinic.title': 'Klinik & Labor Buchungsportal',
    'clinic.sub': 'Erfassen Sie Aufträge für medizinische Transporte mit automatischem Dispatch ab Wiesbaden.',
    'clinic.active_contract': 'Aktiver Rahmenvertrag:',
    'clinic.tab_new': 'Neuer Probenauftrag',
    'clinic.tab_shipments': 'Sendungen & Tracking',
    'clinic.tab_billing': 'Monatsabrechnung & GDP Rechnungen',
    'clinic.tab_pricing': 'Tarif- & Kostenrechner',
    'clinic.form_heading': 'Probenabholung erfassen (UN 3373 / ApBetrO § 17)',
    'clinic.pickup_dept': 'Abhol-Abteilung / Station',
    'clinic.pickup_phone': 'Telefon Abholstation',
    'clinic.delivery_lab': 'Ziel-Labor / Empfang',
    'clinic.delivery_addr': 'Ziel-Adresse & Gebäude',
    'clinic.specimen_type': 'Proben-Kategorie & Gefahrgut-Klasse',
    'clinic.temp_range': 'Temperatur-Vorgabe',
    'clinic.box_count': 'Anzahl Schutzbehälter (P650)',
    'clinic.barcodes': 'Proben-Barcodes (Kommagetrennt)',
    'clinic.pickup_window': 'Gewünschtes Abholfenster',
    'clinic.notes': 'Sonderhinweise / Dringlichkeit (z.B. STAT, Notfall)',
    'clinic.p650_check': 'P650 Dreifachverpackung vorschriftsmäßig verschlossen',
    'clinic.submit_booking': 'Kostenpflichtig buchen & Disponieren',
    'clinic.success_msg': 'Probenauftrag erfolgreich registriert! Kurier und Leitstand wurden verständigt.',
    'clinic.orders_heading': 'Aktuelle Probenaufträge Ihrer Einrichtung',
    'clinic.search_placeholder': 'Nach Tracking-Nr., Barcode oder Labor suchen...',
    'clinic.col_tracking': 'Tracking-Nr.',
    'clinic.col_status': 'Status',
    'clinic.col_pickup': 'Abholort',
    'clinic.col_delivery': 'Ziellabor',
    'clinic.col_temp': 'Kühlkette',
    'clinic.col_barcodes': 'Barcodes',
    'clinic.col_actions': 'Aktionen',
    'clinic.btn_qr': 'QR-Code',
    'clinic.btn_pdf': 'PDF Quittung',
    'clinic.no_orders': 'Keine Probenaufträge für diesen Filter gefunden.',
    'clinic.billing_heading': 'Monatsrechnungen & GDP Transportnachweise',
    'clinic.billing_sub': 'Rechtssichere Abrechnung nach deutschem Umsatzsteuergesetz (19% MwSt.) und GDP-Prüfbericht.',
    'clinic.invoice_gross': 'Gesamtbetrag (Brutto):',
    'clinic.invoice_net': 'Nettobetrag:',
    'clinic.invoice_vat': 'MwSt. 19%:',
    'clinic.download_invoice_pdf': 'Monatsrechnung (PDF) herunterladen',
    'clinic.pricing_heading': 'Tarifberater & Preiskalkulation',
    'clinic.pricing_sub': 'Berechnen Sie die voraussichtlichen Kosten nach Entfernung, Feiertag und Dringlichkeit.',

    // Driver App
    'driver.title': 'MediGo Kurier App (Fahrer-Cockpit)',
    'driver.duty_status': 'Dienst-Status',
    'driver.on_duty': 'Im Dienst / Fahrbereit',
    'driver.off_duty': 'Außer Dienst',
    'driver.tab_my_deliveries': 'Meine Fahrten',
    'driver.tab_marketplace': 'Auftragsbörse',
    'driver.pretrip_check': 'Vor-Fahrt Fahrzeug-Check (P650 & Desinfektion)',
    'driver.active_route': 'Aktueller Proben-Auftrag',
    'driver.scan_barcode': 'Proben-Barcode Scannen',
    'driver.confirm_pickup': 'Übernahme Bestätigen',
    'driver.confirm_delivery': 'Übergabe / Ablieferung Bestätigen',
    'driver.temp_ok': 'Temperatur im Sollbereich',
    'driver.signature': 'Digitale Unterschrift Empfänger',
    'driver.emergency_solo': 'Notfall-Einzelfahrt Modus',
    'driver.simulate_spike': 'Temperatursprung simulieren',
    'driver.cancel_order': 'Auftrag abbrechen',
    'driver.view_pdf': 'PDF Quittung ansehen',
    'driver.job_board_title': 'Verfügbare Probenaufträge im Pool',
    'driver.claim_order': 'Fahrt übernehmen',
    'driver.claimed_success': 'Fahrt erfolgreich zugewiesen!',
    'driver.no_jobs': 'Aktuell keine offenen Probenfahrten in der Börse.',

    // Dispatcher & Admin Dashboard
    'dispatch.title': 'MediGo Einsatzleitstand & Flotten-Monitor',
    'dispatch.hq_label': 'Zentrale: Wiesbaden (Hessen)',
    'dispatch.live_fleet': 'Aktive Kurierfahrzeuge',
    'dispatch.alerts': 'Temperatur- & Sicherheitsalarme',
    'dispatch.new_order_btn': 'Manuelle Express-Disposition',
    'dispatch.tab_orders': 'Aufträge & Disposition',
    'dispatch.tab_map': 'Live GPS Flottenkarte',
    'dispatch.tab_tariffs': 'Tarife & Feiertage',
    'dispatch.tab_modes': 'Betriebsmodi',
    'dispatch.tab_vacation': 'Betriebsferien',
    'dispatch.tab_telemetry': 'Temperatur & Alarme',
    'dispatch.tab_audit': 'Rechtssicheres Audit (10 J.)',
    'dispatch.tab_exports': 'Berichte & CSV',
    'dispatch.tab_forwarding': 'E-Mail-Weiterleitung',

    // Legal Compliance Center
    'legal.title': 'Recht, Regulierung & Datenschutz',
    'legal.sub': 'Umfassendes Regelwerk für den rechtskonformen Transport biologischer Proben nach deutschem und europäischem Recht.',
    'legal.tab_gdpr': 'DSGVO / GDPR Art. 9 & 28',
    'legal.tab_apbetro': 'ApBetrO § 17 (Apothekenbetriebsordnung)',
    'legal.tab_adr': 'ADR P650 Verpackungsvorschrift',
    'legal.tab_avv': 'AVV-Auftragsverarbeitungsvertrag',
    'legal.btn_download_avv': 'AVV-Vertrag (Muster PDF) generieren',

    // Common UI & Buttons
    'common.search': 'Suchen...',
    'common.filter': 'Filtern',
    'common.status': 'Status',
    'common.time': 'Uhrzeit',
    'common.date': 'Datum',
    'common.close': 'Schließen',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.copy': 'Kopieren',
    'common.copied': 'Kopiert!',
    'common.details': 'Details anzeigen',
    'common.refresh': 'Aktualisieren',
    'common.back': 'Zurück',
    'common.loading': 'Wird geladen...',
    'common.all': 'Alle',
  },
  en: {
    // Brand & Main Location
    'brand.name': 'MediGo',
    'brand.sub': 'Medical Logistics & Specimen Courier • Wiesbaden Hub & Hesse Express',
    'location.hq': 'Wiesbaden Headquarters',
    'location.hq_badge': 'Wiesbaden HQ • Hesse',
    'location.hq_full': 'State Capital Wiesbaden (Main Starting Hub & Dispatch HQ)',
    'location.expansion': 'Starting Point Wiesbaden • Expansion Across Hesse & Germany',

    // Header & Navigation
    'nav.landing': 'Home',
    'nav.clinic_portal': 'Clinic & Lab Portal',
    'nav.driver_app': 'Driver App',
    'nav.dispatch': 'Operations / Dispatch',
    'nav.compliance': 'Legal & UN 3373',
    'nav.security': 'Security Matrix',
    'nav.schema': 'Database Schema',
    'nav.patient_portal': 'Patient Tracking',
    'nav.login': 'Sign In',
    'nav.logout': 'Sign Out',
    'nav.online': 'Online',
    'nav.offline': 'Offline (Queue Active)',
    'nav.day_mode': 'Daylight Ops',
    'nav.night_mode': 'Night Shift',
    'nav.get_app': 'Install Mobile App',
    'nav.lang_switch': 'Language',
    'nav.sensors_guide': 'Sensors Guide',
    'nav.users_contracts': 'Users & Contracts',
    'nav.switch_role': 'Switch Role (CEO)',
    'nav.sync_now': 'Sync Now',
    'nav.scope_clinic': 'Clinic Portal Scope',
    'nav.scope_driver': 'Driver Courier Scope',
    'nav.breach_alert': 'Cold-Chain Breach!',

    // Statuses
    'status.SCHEDULED': '1. Scheduled',
    'status.PRE_TRIP_CHECK': '2. Pre-Trip Check',
    'status.PICKED_UP': '3. Picked Up',
    'status.IN_TRANSIT': '4. In Transit',
    'status.DELIVERED': '5. Delivered',
    'status.CANCELLED': 'Cancelled',
    'status.QUARANTINED_UNSYNCED': 'Quarantined (Conflict)',

    // Transport Types
    'transport.AMBIENT_15_25C': 'Ambient Room Temp (15-25°C)',
    'transport.REFRIGERATED_2_8C': 'Refrigerated (2-8°C)',
    'transport.FROZEN_DRY_ICE': 'Frozen / Dry Ice (-20°C / -80°C)',

    // Landing Page Hero & Showcase
    'landing.hero_badge': '🚑 Express Medical Courier UN 3373 Category B • ISO 15189',
    'landing.hero_title_1': 'Maximum Precision for',
    'landing.hero_title_highlight': 'Medical Logistics',
    'landing.hero_title_2': '& Laboratory Samples',
    'landing.hero_desc': 'MediGo launches from the state capital Wiesbaden, delivering certified express transport for blood, tissues, stem cells, apheresis products, and urgent pharmacy courier rides. Temperature-controlled and end-to-end tracked.',
    'landing.hq_badge': '📍 Main HQ & Dispatch Hub: Wiesbaden',
    'landing.hq_detail': 'Strategically situated in Wiesbaden for rapid response times to Frankfurt, Mainz, Marburg, Darmstadt, Kassel, and nationwide across Germany.',
    'landing.quick_login': 'Select Portal Access',
    'landing.btn_portal': 'Clinic / Lab Portal',
    'landing.btn_driver': 'Driver / Courier App',
    'landing.btn_dispatch': 'Control Center / Dispatch',
    'landing.feature_1_title': 'UN 3373 Category B & P650',
    'landing.feature_1_desc': 'Certified transport of biological substances and diagnostic specimens under ADR/P650 packaging standards.',
    'landing.feature_2_title': 'Real-Time Temperature Monitoring',
    'landing.feature_2_desc': 'Sensor-guided cold-chain telemetry (2-8°C, 15-25°C, dry ice) with automated threshold breach alerts.',
    'landing.feature_3_title': 'Chain of Custody & Digital Signature',
    'landing.feature_3_desc': 'Legally compliant handover with barcode verification, GPS timestamping, and digital recipient signatures.',
    'landing.feature_4_title': 'Stem Cells & Urgent Pharmacy',
    'landing.feature_4_desc': 'Dedicated urgent rides for stem cells/apheresis and emergency cytostatics with top priority.',
    'landing.services_title': 'Our Specialized Logistics Services',
    'landing.services_sub': 'Engineered for clinics, MVZs, major labs, and pharmacies – starting in Wiesbaden, growing across Germany.',
    'landing.demo_credentials_title': 'Demo Sandbox Test Credentials',
    'landing.demo_banner': 'Testing environment initialized for Wiesbaden HQ. Copy demo logins:',
    'landing.night_fleet_badge': '24/7 Emergency Night Shift Active',
    'landing.day_fleet_badge': 'MediGo Wiesbaden Fleet & Courier',
    'landing.switch_to_day': 'Switch to Day Mode',
    'landing.switch_to_night': 'Switch to Night Mode',
    'landing.night_fleet_title': '24/7 Emergency Night Shift Specimen Transport',
    'landing.day_fleet_title': 'Dedicated UN 3373 Specimen Transport Vehicle (Wiesbaden HQ)',
    'landing.night_fleet_desc': 'Active 20:00 - 06:00 Night Shift protocol for emergency STAT lab samples across Wiesbaden and Hessen clinics.',
    'landing.day_fleet_desc': 'Equipped with GPS live tracking telemetry, P650 specimen boxes, active 2-8°C / -20°C temperature regulation, and reflective courier uniforms.',
    
    // Login Card on Landing Page
    'login.title': 'MediGo Portal Secure Login',
    'login.subtitle': 'Select your assigned organization role to access your dedicated dashboard.',
    'login.role_clinic': 'Clinic / Lab',
    'login.role_driver': 'Courier Driver',
    'login.role_dispatcher': 'Dispatch / CEO',
    'login.clinic_email': 'Clinic Email Address',
    'login.contract_number': 'Contract Number',
    'login.driver_name': 'Driver Name / Vehicle',
    'login.driver_pin': 'Driver Security PIN',
    'login.dispatcher_email': 'Dispatcher Email',
    'login.password': 'Password',
    'login.submit_btn': 'Authenticate & Launch Portal',
    'login.instant_shortcuts': 'Instant 1-Click Demo Logins',
    'login.btn_clinic_short': 'Clinic Login',
    'login.btn_driver_short': 'Driver Login',
    'login.btn_ceo_short': 'CEO Login',

    // Role Cards Section on Landing Page
    'roles.section_title': 'Three Isolated Role Dashboards',
    'roles.section_desc': 'Strict security isolation ensures clients, drivers, and CEO management see only the data and functionality required for their operational scope.',
    'roles.clinic_title': '1. Clinic Client Portal',
    'roles.clinic_desc': 'Built for hospital ward staff & laboratory receptionists to request UN 3373 specimen pickups.',
    'roles.clinic_f1': 'Instant UN 3373 pickup booking & box count',
    'roles.clinic_f2': 'Live driver ETA map & arrival updates',
    'roles.clinic_f3': 'Automated monthly contract billing & invoices',
    'roles.clinic_btn': 'Launch Clinic Portal',
    'roles.driver_title': '2. Driver Courier App',
    'roles.driver_desc': 'Mobile PWA & native APK workflow for drivers navigating hospital basements and courier routes.',
    'roles.driver_f1': 'Sequential state machine (Pre-check to Delivery)',
    'roles.driver_f2': 'Offline queueing for basement signal blindspots',
    'roles.driver_f3': 'Job Marketplace for claiming available orders',
    'roles.driver_btn': 'Launch Driver App',
    'roles.dispatch_title': '3. CEO Dispatch Command',
    'roles.dispatch_desc': 'Central fleet control dashboard with live thermal sensor breach alarms & legal compliance vault.',
    'roles.dispatch_f1': 'Live GPS telemetry map & thermal breach spikes',
    'roles.dispatch_f2': 'Chain of custody audit trails & signature PDFs',
    'roles.dispatch_f3': 'GDPR Art. 28 AVV legal agreements & DSGVO data',
    'roles.dispatch_btn': 'Launch CEO Dashboard',
    'landing.footer_copy': '© 2026 MediGo Logistics GmbH • Landeshauptstadt Wiesbaden',
    'landing.footer_cert': 'EU GDPR Data Privacy & Transfusionsgesetz (§ 15 TFG) Certified',

    // Service Categories
    'service.stem_cells': 'Stammzellen / Apheresen (Stem Cells)',
    'service.stem_cells_desc': 'GDP-certified express courier for stem cells and apheresis products under strict 4-hour delivery windows.',
    'service.pharmacy_urgent': 'Apotheken-Eilfahrt (Urgent Pharmacy)',
    'service.pharmacy_urgent_desc': 'Emergency medications, cytostatics, and temperature-sensitive drugs delivered directly to clinics.',
    'service.un3373_blood': 'UN 3373 Cat. B Blood & Tissue',
    'service.un3373_blood_desc': 'Standard and express transportation of diagnostic patient specimens in compliant P650 packaging.',
    'service.small_volume': 'Biostoff UN 3373 Kleinstmengen',
    'service.small_volume_desc': 'Cost-effective direct rides for individual urgent diagnostic specimens.',

    // Clinic Portal
    'clinic.title': 'Clinic & Laboratory Booking Portal',
    'clinic.sub': 'Create and manage medical transport requests with automatic dispatch from Wiesbaden HQ.',
    'clinic.active_contract': 'Active Framework Contract:',
    'clinic.tab_new': 'New Pickup Request',
    'clinic.tab_shipments': 'Shipments & Tracking',
    'clinic.tab_billing': 'Monthly Billing & GDP Invoices',
    'clinic.tab_pricing': 'Tariff & Cost Calculator',
    'clinic.form_heading': 'Register Specimen Pickup (UN 3373 / ApBetrO § 17)',
    'clinic.pickup_dept': 'Pickup Department / Station',
    'clinic.pickup_phone': 'Pickup Station Phone',
    'clinic.delivery_lab': 'Destination Lab / Reception',
    'clinic.delivery_addr': 'Destination Address & Building',
    'clinic.specimen_type': 'Specimen Category & Danger Class',
    'clinic.temp_range': 'Temperature Specification',
    'clinic.box_count': 'Number of P650 Specimen Boxes',
    'clinic.barcodes': 'Specimen Barcodes (Comma-separated)',
    'clinic.pickup_window': 'Requested Pickup Window',
    'clinic.notes': 'Special Instructions / Urgency (e.g. STAT, Emergency)',
    'clinic.p650_check': 'P650 triple-packaging certified and securely closed',
    'clinic.submit_booking': 'Confirm & Dispatch Booking',
    'clinic.success_msg': 'Pickup request registered! Courier and dispatch have been notified.',
    'clinic.orders_heading': 'Current Specimen Orders from your Facility',
    'clinic.search_placeholder': 'Search by tracking number, barcode, or lab...',
    'clinic.col_tracking': 'Tracking No.',
    'clinic.col_status': 'Status',
    'clinic.col_pickup': 'Pickup Location',
    'clinic.col_delivery': 'Destination Lab',
    'clinic.col_temp': 'Cold-Chain',
    'clinic.col_barcodes': 'Barcodes',
    'clinic.col_actions': 'Actions',
    'clinic.btn_qr': 'QR Code',
    'clinic.btn_pdf': 'PDF Receipt',
    'clinic.no_orders': 'No specimen orders matching this filter.',
    'clinic.billing_heading': 'Monthly Invoices & GDP Proof of Transport',
    'clinic.billing_sub': 'Compliant German sales tax invoicing (19% MwSt.) and GDP chain of custody report.',
    'clinic.invoice_gross': 'Total Amount (Gross):',
    'clinic.invoice_net': 'Net Amount:',
    'clinic.invoice_vat': 'VAT 19%:',
    'clinic.download_invoice_pdf': 'Download Monthly Invoice (PDF)',
    'clinic.pricing_heading': 'Tariff Advisor & Cost Estimation',
    'clinic.pricing_sub': 'Calculate estimated costs based on distance, public holidays, and urgency.',

    // Driver App
    'driver.title': 'MediGo Courier App (Driver Cockpit)',
    'driver.duty_status': 'Duty Status',
    'driver.on_duty': 'On Duty / Ready for Dispatch',
    'driver.off_duty': 'Off Duty',
    'driver.tab_my_deliveries': 'My Deliveries',
    'driver.tab_marketplace': 'Job Marketplace',
    'driver.pretrip_check': 'Pre-Trip Vehicle Inspection (P650 & Sanitization)',
    'driver.active_route': 'Current Specimen Pickup & Route',
    'driver.scan_barcode': 'Scan Specimen Barcode',
    'driver.confirm_pickup': 'Confirm Pickup Handover',
    'driver.confirm_delivery': 'Confirm Delivery Handover',
    'driver.temp_ok': 'Temperature Within Nominal Range',
    'driver.signature': 'Digital Recipient Signature',
    'driver.emergency_solo': 'Emergency Solo Ride Mode',
    'driver.simulate_spike': 'Simulate Temp Spike',
    'driver.cancel_order': 'Cancel Order',
    'driver.view_pdf': 'View PDF Receipt',
    'driver.job_board_title': 'Available Specimen Orders in Pool',
    'driver.claim_order': 'Claim Order',
    'driver.claimed_success': 'Order successfully assigned to your vehicle!',
    'driver.no_jobs': 'Currently no open specimen orders in marketplace.',

    // Dispatcher & Admin Dashboard
    'dispatch.title': 'MediGo Operations Center & Fleet Monitor',
    'dispatch.hq_label': 'Dispatch HQ: Wiesbaden (Hessen)',
    'dispatch.live_fleet': 'Active Courier Fleet',
    'dispatch.alerts': 'Temperature & Safety Alerts',
    'dispatch.new_order_btn': 'Manual Express Dispatch',
    'dispatch.tab_orders': 'Orders & Scheduling',
    'dispatch.tab_map': 'Live GPS Dispatch Map',
    'dispatch.tab_tariffs': 'Tariffs & Feiertage',
    'dispatch.tab_modes': 'Operational Modes',
    'dispatch.tab_vacation': 'Vacation Shutdown',
    'dispatch.tab_telemetry': 'Telemetry & Breaches',
    'dispatch.tab_audit': 'Audit Trail (10-Yr Legal)',
    'dispatch.tab_exports': 'Reports & CSV',
    'dispatch.tab_forwarding': 'Email Forwarding',

    // Legal Compliance Center
    'legal.title': 'Legal, Regulatory & Data Protection Center',
    'legal.sub': 'Comprehensive regulatory compliance framework for medical specimen logistics under EU & German statutes.',
    'legal.tab_gdpr': 'GDPR / DSGVO Art. 9 & 28',
    'legal.tab_apbetro': 'ApBetrO § 17 (Pharmacy Operations Act)',
    'legal.tab_adr': 'ADR P650 Packaging Instructions',
    'legal.tab_avv': 'DPA / AVV Data Processing Agreement',
    'legal.btn_download_avv': 'Generate AVV Agreement (Sample PDF)',

    // Common UI & Buttons
    'common.search': 'Search...',
    'common.filter': 'Filter',
    'common.status': 'Status',
    'common.time': 'Time',
    'common.date': 'Date',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.copy': 'Copy',
    'common.copied': 'Copied!',
    'common.details': 'View Details',
    'common.refresh': 'Refresh',
    'common.back': 'Back',
    'common.loading': 'Loading...',
    'common.all': 'All',
  },
};

export const t = (
  key: string,
  fallback?: string | { de: string; en: string },
  lang: Language = 'de'
): string => {
  if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
    return TRANSLATIONS[lang][key];
  }
  if (fallback) {
    if (typeof fallback === 'object') {
      return fallback[lang] || fallback.de || fallback.en;
    }
    if (lang === 'en') {
      return fallback;
    }
  }
  if (TRANSLATIONS.en && TRANSLATIONS.en[key]) {
    return TRANSLATIONS.en[key];
  }
  if (typeof fallback === 'string') {
    return fallback;
  }
  return key;
};
