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
  return 'en';
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
    'brand.sub': 'Medizinische Logistik & Probenkurier',
    'location.hq': 'Hauptstandort Wiesbaden',
    'location.hq_full': 'Landeshauptstadt Wiesbaden (Hauptstandort & Dispatch Zentrale)',
    'location.expansion': 'Startpunkt Wiesbaden • Ausbau in ganz Hessen & Deutschland',

    // Header & Navigation
    'nav.landing': 'Startseite',
    'nav.clinic_portal': 'Klinik & Labor Portal',
    'nav.driver_app': 'Fahrer App',
    'nav.dispatch': 'Leitstand & Dispatch',
    'nav.compliance': 'Recht & UN 3373',
    'nav.security': 'Sicherheits-Audit',
    'nav.schema': 'Datenbank Schema',
    'nav.login': 'Anmelden',
    'nav.logout': 'Abmelden',
    'nav.online': 'Online',
    'nav.offline': 'Offline (Warteschlange aktiv)',
    'nav.day_mode': 'Tages-Betrieb',
    'nav.night_mode': 'Nacht-Schicht',
    'nav.get_app': 'Mobile App Installieren',
    'nav.lang_switch': 'Sprache',

    // Landing Page
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
    'clinic.new_order': 'Neuer Probenauftrag',
    'clinic.pickup_dept': 'Abhol-Abteilung / Station',
    'clinic.delivery_lab': 'Ziel-Labor / Empfang',
    'clinic.specimen_type': 'Proben-Kategorie',
    'clinic.temp_range': 'Temperatur-Vorgabe',
    'clinic.box_count': 'Anzahl Schutzbehälter',
    'clinic.barcodes': 'Proben-Barcodes / Barcode-Liste',
    'clinic.notes': 'Sonderhinweise / Dringlichkeit',
    'clinic.submit_booking': 'Kostenpflichtig / Verbindlich Buchen',
    'clinic.active_orders': 'Aktive Probenaufträge',
    'clinic.order_history': 'Auftrags-Historie & Protokolle',

    // Driver App
    'driver.title': 'MediGo Kurier App (Fahrer-Cockpit)',
    'driver.duty_status': 'Dienst-Status',
    'driver.on_duty': 'Im Dienst / Fahrbereit',
    'driver.off_duty': 'Außer Dienst',
    'driver.pretrip_check': 'Vor-Fahrt Fahrzeug-Check (P650 & Desinfektion)',
    'driver.active_route': 'Aktueller Proben-Auftrag',
    'driver.scan_barcode': 'Proben-Barcode Scannen',
    'driver.confirm_pickup': 'Übernahme Bestätigen',
    'driver.confirm_delivery': 'Übergabe / Ablieferung Bestätigen',
    'driver.temp_ok': 'Temperatur im Sollbereich',
    'driver.signature': 'Digitale Unterschrift Empfänger',

    // Dispatcher
    'dispatch.title': 'MediGo Einsatzleitstand & Flotten-Monitor',
    'dispatch.hq_label': 'Zentrale: Wiesbaden (Hessen)',
    'dispatch.live_fleet': 'Aktive Kurierfahrzeuge',
    'dispatch.alerts': 'Temperatur- & Sicherheitsalarme',
    'dispatch.new_order_btn': 'Manuelle Express-Disposition',

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
  },
  en: {
    // Brand & Main Location
    'brand.name': 'MediGo',
    'brand.sub': 'Medical Logistics & Specimen Express Courier',
    'location.hq': 'Wiesbaden Headquarters',
    'location.hq_full': 'State Capital Wiesbaden (Main Starting Hub & Dispatch HQ)',
    'location.expansion': 'Starting Point Wiesbaden • Expansion Across Hesse & Germany',

    // Header & Navigation
    'nav.landing': 'Home',
    'nav.clinic_portal': 'Clinic & Lab Portal',
    'nav.driver_app': 'Driver App',
    'nav.dispatch': 'Dispatch Center',
    'nav.compliance': 'Legal & UN 3373',
    'nav.security': 'Security Audit',
    'nav.schema': 'Database Schema',
    'nav.login': 'Sign In',
    'nav.logout': 'Sign Out',
    'nav.online': 'Online',
    'nav.offline': 'Offline (Queue Active)',
    'nav.day_mode': 'Daylight Mode',
    'nav.night_mode': 'Night Shift',
    'nav.get_app': 'Install Mobile App',
    'nav.lang_switch': 'Language',

    // Landing Page
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
    'clinic.new_order': 'Book New Specimen Order',
    'clinic.pickup_dept': 'Pickup Department / Station',
    'clinic.delivery_lab': 'Destination Laboratory / Desk',
    'clinic.specimen_type': 'Specimen Category',
    'clinic.temp_range': 'Required Temperature Range',
    'clinic.box_count': 'Number of Specimen Boxes',
    'clinic.barcodes': 'Specimen Barcode Identifiers',
    'clinic.notes': 'Special Instructions / Urgency',
    'clinic.submit_booking': 'Confirm & Dispatch Booking',
    'clinic.active_orders': 'Active Specimen Orders',
    'clinic.order_history': 'Order History & Audit Logs',

    // Driver App
    'driver.title': 'MediGo Courier App (Driver Cockpit)',
    'driver.duty_status': 'Duty Status',
    'driver.on_duty': 'On Duty / Ready for Dispatch',
    'driver.off_duty': 'Off Duty',
    'driver.pretrip_check': 'Pre-Trip Vehicle Inspection (P650 & Sanitization)',
    'driver.active_route': 'Current Specimen Pickup & Route',
    'driver.scan_barcode': 'Scan Specimen Barcode',
    'driver.confirm_pickup': 'Confirm Pickup Handover',
    'driver.confirm_delivery': 'Confirm Delivery Handover',
    'driver.temp_ok': 'Temperature Within Nominal Range',
    'driver.signature': 'Digital Recipient Signature',

    // Dispatcher
    'dispatch.title': 'MediGo Operations Center & Fleet Monitor',
    'dispatch.hq_label': 'Dispatch HQ: Wiesbaden (Hessen)',
    'dispatch.live_fleet': 'Active Courier Fleet',
    'dispatch.alerts': 'Temperature & Safety Alerts',
    'dispatch.new_order_btn': 'Manual Express Dispatch',

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
  },
};

export const t = (key: string, lang: Language = 'en'): string => {
  if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
    return TRANSLATIONS[lang][key];
  }
  if (TRANSLATIONS.en[key]) {
    return TRANSLATIONS.en[key];
  }
  return key;
};
