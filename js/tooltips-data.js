/**
 * KickForge 303 - Dizionario Completo Spiegazioni e Consigli per Controlli Audio (Cassa & Basso)
 * Utilizzato per il modale informativo che appare al passaggio del mouse (hover di 2 secondi)
 */

export const CONTROL_TOOLTIPS = {
  // ==========================================
  // MACRO SUPER BOTTA
  // ==========================================
  super_botta: {
    title: "💥 POTENZA DELLA BOTTA (IMPACT MAXIMIZER)",
    what: "È il controllo principale della forza d'impatto: agisce simultaneamente su punch, sub-bassi, compressione e presenza fisica.",
    ifHigh: "La cassa diventa devastante, guadagna una pressione enorme che fa tremare il petto e distrugge il mixer.",
    ifLow: "La cassa suona più leggera, morbida, pulita e dinamica.",
    tip: "💡 Tienilo a 1.5x-1.8x per Techno/Acid, sopra 2.2x per Hardcore, Frenchcore e Uptempo."
  },
  extreme_mode: {
    title: "⚡ MODO ULTRA DEVASTANTE",
    what: "Interruttore che moltiplica il guadagno e attiva uno stadio di clipping violento.",
    ifHigh: "Suono iper-distrutto, aggressivo e schiacciato, ideale per generi estremi.",
    ifLow: "Suono più bilanciato e controllato senza distorsione esasperata.",
    tip: "💡 Perfetto se cerchi la tipica cassa distorta Gabber o Uptempo."
  },

  // ==========================================
  // MODULO 5: SCREECH / LASER (PIEP)
  // ==========================================
  screech_pitchStart: {
    title: "🔫 PITCH INIZIALE LASER",
    what: "Frequenza da cui parte lo sweep del laser/piep.",
    ifHigh: "Il laser parte acutissimo, tipo sirena o zap elettronico.",
    ifLow: "Parte più grave e corposo, meno stridulo.",
    tip: "💡 Per il classico laser discendente tienilo più ALTO del Pitch Finale (es. 2500Hz → 200Hz)."
  },
  screech_pitchEnd: {
    title: "🔫 PITCH FINALE LASER",
    what: "Frequenza su cui arriva lo sweep. Decide la direzione del laser.",
    ifHigh: "Se più alto del pitch iniziale ottieni un 'piep' ascendente (in salita).",
    ifLow: "Se più basso del pitch iniziale ottieni il classico laser discendente uptempo.",
    tip: "💡 Invertendo iniziale/finale cambi completamente il carattere: zap in giù o piep in su."
  },
  screech_decay: {
    title: "⏱️ DURATA LASER",
    what: "Per quanto tempo resta udibile lo screech dopo il colpo.",
    ifHigh: "Il laser suona più a lungo, diventa una coda tonale evidente e cantante.",
    ifLow: "Diventa un click/zap brevissimo, quasi solo transiente.",
    tip: "💡 0.10-0.20s per un laser ben udibile; sotto 0.05s per un semplice tic acido."
  },
  screech_cutoff: {
    title: "🎚️ TIMBRO LASER (Bandpass)",
    what: "Centro del filtro passa-banda che dà il carattere 'screechy' al laser.",
    ifHigh: "Timbro più sottile, sibilante e tagliente.",
    ifLow: "Timbro più pieno e ronzante.",
    tip: "💡 Alzalo verso 3000-4000Hz per far bucare il laser sopra la cassa."
  },
  screech_resonance: {
    title: "🌀 ACIDITÀ LASER (Q)",
    what: "Risonanza del filtro del laser: enfatizza una banda stretta rendendolo più squelchy.",
    ifHigh: "Laser più risonante, acido e fischiante.",
    ifLow: "Laser più neutro e largo di banda.",
    tip: "💡 Sopra 8Q per un carattere marcatamente acido/303."
  },
  screech_drive: {
    title: "🔥 DISTORSIONE LASER",
    what: "Quantità di saturazione hard-clip applicata al laser.",
    ifHigh: "Laser sporco, ricco di armonici, molto aggressivo (uptempo/frenchcore).",
    ifLow: "Laser più pulito e tonale.",
    tip: "💡 6-9x per il tipico screech distorto che urla nel mix."
  },
  screech_volume: {
    title: "🔊 VOLUME LASER",
    what: "Livello del layer laser nel mix della cassa.",
    ifHigh: "Il laser domina, in primo piano.",
    ifLow: "Il laser resta un dettaglio in sottofondo.",
    tip: "💡 0.6-0.9 se vuoi che il laser sia la firma del suono."
  },

  // ==========================================
  // MODULO 6: PUNCH & TRANSIENT DESIGNER
  // ==========================================
  punch_amount: {
    title: "🥊 QUANTITÀ PUNCH",
    what: "Forza del 'beater', un click tonale d'attacco dedicato che aggiunge lo schiaffo fisico iniziale.",
    ifHigh: "Cassa molto più punchy e in faccia, con attacco netto e percussivo.",
    ifLow: "Attacco più morbido, senza click aggiuntivo (a 0 è disattivato).",
    tip: "💡 0.5-0.85 per un punch deciso da uptempo/hardcore."
  },
  punch_tone: {
    title: "🎯 TONO BEATER",
    what: "Frequenza del click d'attacco del punch.",
    ifHigh: "Attacco più acuto, 'ticky', tipo battente duro.",
    ifLow: "Attacco più cupo e legnoso.",
    tip: "💡 3000-4500Hz per un click che buca; più basso per un thump morbido."
  },
  punch_decay: {
    title: "⏱️ DURATA BEATER",
    what: "Quanto dura il click d'attacco del punch.",
    ifHigh: "Attacco più lungo e presente, quasi un piccolo tono.",
    ifLow: "Click ultra-secco e istantaneo.",
    tip: "💡 Tienilo corto (0.004-0.008s) per mantenere il punch pulito."
  },
  comp_attack: {
    title: "🛡️ TRASPARENZA PUNCH (Attacco Comp.)",
    what: "Tempo d'attacco del compressore. Regola quanto transiente passa PRIMA che la compressione intervenga.",
    ifHigh: "Lascia passare più transiente: la cassa diventa più punchy e schioccante.",
    ifLow: "La compressione afferra subito: suono più incollato e schiacciato, meno punch.",
    tip: "💡 Alzalo verso 6-10ms se senti la cassa 'smorzata' e vuoi più botta secca."
  },
  comp_ratio: {
    title: "🗜️ COMPRESSIONE (Ratio)",
    what: "Rapporto di compressione applicato alla cassa.",
    ifHigh: "Suono più denso, controllato e aggressivo.",
    ifLow: "Dinamica più aperta e naturale.",
    tip: "💡 8-12:1 per casse hardcore compatte; sotto 4:1 per techno più dinamica."
  },

  // ==========================================
  // MODULO 1: ATTACCO 303 & FISCHIO ACIDO (CASSA)
  // ==========================================
  attack303_cutoff: {
    title: "APERTURA 303 (Cutoff Filtro Cassa)",
    what: "Regola l'apertura del filtro risonante 303, determinando la luminosità e la frequenza massima dell'attacco acido.",
    ifHigh: "Il transiente acido diventa apertissimo, brillante, tagliente e molto evidente nel mix.",
    ifLow: "L'attacco si chiude, diventando cupo, ovattato e meno percepibile.",
    tip: "💡 Impostalo tra 2500Hz e 4000Hz per il classico timbro Acidcore."
  },
  attack303_resonance: {
    title: "ACIDITÀ & FISCHIO (Resonance 303 Cassa)",
    what: "Aumenta la risonanza del filtro stile Roland TB-303, creando il caratteristico squelch liquido e acido.",
    ifHigh: "Il filtro va in auto-oscillazione generando un fischio acido tagliente e urlante.",
    ifLow: "L'attacco suona piatto e standard, senza il tipico carattere acido della 303.",
    tip: "💡 Alzalo sopra 14Q se vuoi che la cassa abbia un fischio acido riconoscibile."
  },
  attack303_envMod: {
    title: "TAGLIO ACUTO (Inviluppo Filtro Cassa)",
    what: "Quantità di escursione verso il basso che il filtro compie durante i primi millisecondi del colpo.",
    ifHigh: "Il filtro spazza rapidamente dall'acutissimo al grave, creando un colpo secco e laser.",
    ifLow: "Il filtro rimane statico senza compiere discese rapide di frequenza.",
    tip: "💡 Tienilo sopra 0.80 per un colpo penetrante."
  },
  attack303_decay: {
    title: "DURATA FISCHIO (Attack Decay Cassa)",
    what: "Determina quanto dura nel tempo il transiente 303 prima di spegnersi.",
    ifHigh: "Il fischio acido rimane udibile più a lungo, lasciando una scia sonora caratteristica.",
    ifLow: "Il transiente dura pochissimi millisecondi, diventando un click ultra-secco e rapido.",
    tip: "💡 Per tracce veloci a 200+ BPM tienilo basso (0.02s-0.04s) per non sovrapporre i colpi."
  },
  attack303_pitch: {
    title: "ALTEZZA NOTA 303 (Attack Pitch Cassa)",
    what: "Imposta la frequenza di partenza della nota dell'attacco 303.",
    ifHigh: "Il colpo parte da frequenze altissime producendo un suono tipo laser/piep kick.",
    ifLow: "L'attacco è più grave, scuro e concentrato sulle frequenze medio-basse.",
    tip: "💡 Se lo alzi oltre 600Hz ottieni il tipico suono piep/screech Uptempo."
  },
  attack303_drive: {
    title: "CATTIVERIA GRANA (Pre-Drive Diodo Cassa)",
    what: "Saturazione a diodi applicata all'oscillatore prima di entrare nel filtro acido.",
    ifHigh: "Aggiunge sporcizia analogica, mordente ruvido e una grana acida aggressiva.",
    ifLow: "Il transiente 303 suona pulito, morbido e puramente sinusoidale/saw.",
    tip: "💡 Aumentalo se il tuo fischio 303 fatica a farsi sentire nel mix."
  },
  click_volume: {
    title: "SCHIOCCO CLICK (Snap Transient)",
    what: "Generatore di click ad altissima frequenza allineato al microsecondo iniziale del colpo.",
    ifHigh: "Aggiunge uno schiocco netto che permette alla cassa di bucare qualsiasi impianto, anche casse piccole o smartphone.",
    ifLow: "Il colpo parte senza schiocco, con un attacco più morbido e felpato.",
    tip: "💡 Fondamentale per far sentire il ritmo con precisione chirurgica."
  },
  attack303_volume: {
    title: "VOLUME 303 (Livello Attacco)",
    what: "Regola il bilanciamento del solo layer acido 303 rispetto al corpo della cassa.",
    ifHigh: "L'attacco acido sovrasta il mix della cassa.",
    ifLow: "L'attacco 303 diventa una sfumatura impercettibile sotto la botta principale.",
    tip: "💡 Regolalo attorno a 0.85 per un mix bilanciato."
  },

  // ==========================================
  // MODULO 2: CORPO & PUGNO NELLO STOMACO (CASSA)
  // ==========================================
  body_startFreq: {
    title: "PICCO INIZIALE (Start Frequency Cassa)",
    what: "Frequenza iniziale da cui comincia la picchiata di tono principale della cassa.",
    ifHigh: "Discesa di tono amplissima e drammatica con un impatto acustico potente.",
    ifLow: "Discesa più corta e controllata, con un timbro più compatto e cupo.",
    tip: "💡 400Hz-600Hz per Techno/Hardcore, 700Hz+ per Frenchcore e Uptempo."
  },
  body_punchFreq: {
    title: "PUGNO PUNCH (Punch Frequency Cassa)",
    what: "Frequenza cardine su cui si sofferma il colpo per dare la sensazione di pugno fisico.",
    ifHigh: "Il pugno si concentra sulle medio-basse (160-250Hz), dando una botta secca e definita.",
    ifLow: "Il pugno si concentra più in basso (90-130Hz), dando una sensazione di botta pesante e scura.",
    tip: "💡 140Hz-180Hz è il punto dolce per far vibrare il torace in discoteca."
  },
  body_tailFreq: {
    title: "NOTA DEL BASSO CASSA (Tail Root Note)",
    what: "Frequenza fondamentale del sub su cui si stabilizza la cassa dopo il colpo.",
    ifHigh: "La cassa è intonata più alta (55-65Hz - note La/Si/Do), ideale per ritmi veloci.",
    ifLow: "Sub profondissimo e sismico (38-48Hz - note Re/Mi/Fa) che fa tremare il pavimento.",
    tip: "💡 Accordalo con la tonalità della tua traccia per un basso perfetto."
  },
  body_punchDecay: {
    title: "VELOCITÀ BOTTA (Punch Decay Cassa)",
    what: "Durata della discesa iniziale dal picco al pugno principale.",
    ifHigh: "La botta si prolunga nel tempo dando una sensazione di cassa grande e pesante.",
    ifLow: "La botta è istantanea e chirurgica, lasciando subito spazio alla coda sub.",
    tip: "💡 Tienilo tra 0.025s e 0.045s per la massima pacca."
  },
  body_tailDecay: {
    title: "LUNGHEZZA CODA CASSA (Tail Decay)",
    what: "Durata temporale della nota del basso sub prima di dissolversi completamente.",
    ifHigh: "La cassa ha una coda lunga che riempie tutto lo spazio tra un colpo e l'altro.",
    ifLow: "La cassa si ferma subito, diventando cortissima ed evitando sovrapposizioni a BPM alti.",
    tip: "💡 Se suoni a 200+ BPM usa code corte (0.2s); a 135 BPM usa code più lunghe (0.35s-0.5s)."
  },
  fm_amount: {
    title: "TIMBRO METALLICO (FM Amount Cassa)",
    what: "Quantità di modulazione di frequenza applicata per dare un timbro ruvido e metallico.",
    ifHigh: "La cassa acquisisce un suono abrasivo, robotico e industriale tipico dello Schranz o Rawstyle.",
    ifLow: "Il corpo rimane puro, liscio, caldo e privo di asperità metalliche.",
    tip: "💡 Usalo per casse aggressive in stile Industrial Techno o Hardstyle."
  },
  fm_ratio: {
    title: "ARMONICI METALLO (FM Ratio Cassa)",
    what: "Rapporto moltiplicatore della frequenza modulante FM.",
    ifHigh: "Genera squilli e sfumature metalliche più acute e complesse.",
    ifLow: "Genera modulazioni più lente e pesanti vicine alle basse frequenze.",
    tip: "💡 Rapporti a 2.0x o 3.0x offrono gli armonici più musicali."
  },
  body_volume: {
    title: "VOLUME CORPO CASSA (Body Level)",
    what: "Volume complessivo dell'oscillatore che genera il corpo e la nota di basso della cassa.",
    ifHigh: "Il corpo domina con massima energia sui bassi.",
    ifLow: "Il corpo viene attenuato lasciando risaltare solo l'attacco e il rimbombo.",
    tip: "💡 Lascialo a 1.0 per la massima potenza."
  },

  // ==========================================
  // MODULO 3: BASSI SUB & RIMBOMBO (CASSA)
  // ==========================================
  sub_boost: {
    title: "SPINTA SUBWOOFER (Sub Weight Cassa)",
    what: "Equalizzazione ed enfasi mirata sulle frequenze sub sotto gli 80Hz.",
    ifHigh: "Aumenta la pressione dell'aria e la vibrazione percepibile con i subwoofer fisici.",
    ifLow: "Bassi più controllati ed asciutti, evitando risonanze eccessive.",
    tip: "💡 Aumentalo se ascolti su casse con subwoofer e vuoi sentire tremare la stanza."
  },
  rumble_volume: {
    title: "RIMBOMBO RAVE (Rumble Mix Cassa)",
    what: "Volume del generatore di riverbero sub filtrato (il tipico Techno Rumble da club/warehouse).",
    ifHigh: "Crea un tappeto di rimbombo cavernoso e profondo che riempie la traccia tra una cassa e l'altra.",
    ifLow: "Cassa completamente asciutta senza alcun effetto ambiente.",
    tip: "💡 Il segreto delle casse Techno berlinesi (Berghain/Industrial)."
  },
  rumble_decay: {
    title: "DURATA RIMBOMBO (Rumble Decay Cassa)",
    what: "Quanto a lungo persiste l'eco del rimbombo dopo ogni colpo.",
    ifHigh: "L'eco dura fino al colpo successivo creando un'onda continua e ipnotica.",
    ifLow: "L'eco si estingue rapidamente lasciando pause di silenzio pulite.",
    tip: "💡 Sincronizzalo a orecchio con la velocità BPM del brano."
  },
  rumble_cutoff: {
    title: "CALORE RIMBOMBO (Rumble Filter Cassa)",
    what: "Frequenza di taglio del filtro passa-basso applicato al riverbero del rimbombo.",
    ifHigh: "Il rimbombo è più udibile e chiaro, con frequenze fino a 150-200Hz.",
    ifLow: "Il rimbombo è ultra-scuro e concentrato solo nelle frequenze sismiche più profonde.",
    tip: "💡 Tienilo sotto i 130Hz per non rubare spazio ai sintetizzatori medi."
  },
  rumble_ducking: {
    title: "PULIZIA BOTTA CASSA (Sidechain Ducking)",
    what: "Attenua temporaneamente il rimbombo durante i primi 40 millisecondi del colpo.",
    ifHigh: "Il punch colpisce pulito e nitido, poi il rimbombo entra morbido subito dopo senza impastare.",
    ifLow: "Il rimbombo suona continuo anche sopra il punch rischiando di creare confusione e fango.",
    tip: "💡 Tienilo sempre sopra 0.75 per un mix professionale pulito."
  },

  // ==========================================
  // MODULO 4: DISTORSIONE HARDCORE & TONO (CASSA)
  // ==========================================
  drive_amount: {
    title: "SATURAZIONE FUOCO (Overdrive Cassa)",
    what: "Quantità di saturazione armonica non-lineare applicata a tutto il kick drum.",
    ifHigh: "Distorsione rovente, ricca di calore e armonici devastanti per casse piene e cattive.",
    ifLow: "Nessuna distorsione, suono pulito e acusticamente lineare.",
    tip: "💡 Se usi la modalità Diodo ottieni un suono acido; con Valvolare un suono caldo e grosso."
  },
  fold_amount: {
    title: "GRATTATA ESTREMA (Wavefolder Cassa)",
    what: "Algoritmo di piegatura d'onda che ripiega i picchi del segnale su se stessi generando nuovi armonici metallici.",
    ifHigh: "Genera una distorsione metallica estrema e graffiante tipica di Schranz, Rawstyle e Frenchcore.",
    ifLow: "Nessun effetto di ripiegatura, segnale privo di grattata metallica.",
    tip: "💡 Portalo a 3.0x-5.0x per una cassa industriale ruvida come carta vetrata."
  },
  eq_low: {
    title: "BASSI PESANTI CASSA (Low Shelf EQ)",
    what: "Equalizzatore per aumentare o attenuare il peso complessivo dei bassi.",
    ifHigh: "Cassa più pesante e con più massa sui bassi.",
    ifLow: "Cassa più asciutta e alleggerita.",
    tip: "💡 Aumenta di +3dB/+5dB per casse massicce da rave."
  },
  eq_midFreq: {
    title: "ZONA FREQUENZA MEDI (Mid EQ Freq Cassa)",
    what: "Sceglie la frequenza centrale su cui applicare l'equalizzazione delle medie.",
    ifHigh: "Interviene sulle frequenze alte (1000-1800Hz) per dare presenza acuta.",
    ifLow: "Interviene sulle medio-basse (300-600Hz) per modellare il corpo e il legno della cassa.",
    tip: "💡 Posizionalo a 500-700Hz per trovare il punto esatto di risonanza del pugno."
  },
  eq_midGain: {
    title: "PUGNO MEDIO CASSA (Mid EQ Gain)",
    what: "Aumenta (boost) o scava (cut) le frequenze medie selezionate.",
    ifHigh: "Dà una risonanza spinta, aggressiva e 'honky' tipica dell'Hardstyle e Early Gabber.",
    ifLow: "Scava i medi creando una cassa più scura con soli sub profondi e click acuto (stile Berlino).",
    tip: "💡 Scava a -4dB per Techno scura; alza a +4dB per Hardcore."
  },
  eq_high: {
    title: "TAGLIO ACUTO CASSA (High Shelf EQ)",
    what: "Equalizzatore delle frequenze acute sopra i 4500Hz.",
    ifHigh: "Rende la cassa ariosa, presente e con un click molto brillante.",
    ifLow: "Rende la cassa scura, morbida e vintage.",
    tip: "💡 Aggiungi +2dB/+4dB per dare vivacità all'attacco 303."
  },
  master_gain: {
    title: "VOLUME USCITA CASSA (Master Gain)",
    what: "Volume finale prima del limiter morbido di sicurezza.",
    ifHigh: "Segnale più caldo e spinto contro il limiter, aumentando il volume apparente percepito.",
    ifLow: "Volume generale più basso e con più dinamica libera.",
    tip: "💡 Tienilo tra 1.1x e 1.3x per evitare clip digitali sgradevoli."
  },

  // ==========================================
  // MODULO BASSLINE & SINTETIZZATORE BASSI
  // ==========================================
  bass_cutoff: {
    title: "APERTURA FILTRO BASSO (Bass Cutoff)",
    what: "Frequenza di taglio del filtro passa-basso applicato alla linea di basso.",
    ifHigh: "Il basso apre tutte le frequenze alte, diventando luminoso, acido e aggressivo.",
    ifLow: "Il basso si chiude, diventando un sub scuro, rotondo e felpato.",
    tip: "💡 Per Rolling Techno tienilo tra 300Hz-600Hz; per Acid 303 aprilo sopra 2000Hz."
  },
  bass_resonance: {
    title: "ACIDITÀ BASSO 303 (Bass Resonance)",
    what: "Risonanza acida a diodi sul filtro del sintetizzatore di basso.",
    ifHigh: "Genera fischi e risonanze squelchy tipiche delle linee di basso TB-303 Acid.",
    ifLow: "Basso pulito e lineare senza risonanze esagerate.",
    tip: "💡 Alzalo sopra 14Q quando usi pattern con note alte e slide per il classico effetto acido."
  },
  bass_envMod: {
    title: "TAGLIO DINAMICO BASSO (Filter Env Mod)",
    what: "Quantità di apertura istantanea del filtro all'inizio di ogni singola nota di basso.",
    ifHigh: "Ogni nota 'plucca' e schiocca in modo netto e incisivo.",
    ifLow: "Le note scorrono fluide senza scatto di apertura del filtro.",
    tip: "💡 Portalo a 0.85 per bassi percussivi rimbalzanti (Frenchcore e Donk)."
  },
  bass_decay: {
    title: "LUNGHEZZA NOTA BASSO (Bass Decay)",
    what: "Durata della discesa dell'inviluppo per ogni nota di basso.",
    ifHigh: "Le note sono lunghe, piene e colmano lo spazio sonoro.",
    ifLow: "Le note sono cortissime e secche, ideali per ritmi veloci a 16esimi.",
    tip: "💡 A 200 BPM usa decay corti (0.12s) per evitare impastamenti."
  },
  bass_detune: {
    title: "SPESSORE DETUNE REESE (Osc Detune)",
    what: "Scorda leggermente il secondo oscillatore rispetto al primo per creare sfasamenti armonici e spessore.",
    ifHigh: "Crea il tipico basso largo, minaccioso e ruggente 'Reese' da Industrial/Drum&Bass.",
    ifLow: "Oscillatori perfettamente intonati, basso compatto e solido al centro.",
    tip: "💡 Usalo con onde Sawtooth per un basso mostruosamente grosso."
  },
  bass_osc2_mix: {
    title: "MIX OSCILLATORE 2 (Bilanciamento OSC)",
    what: "Quanto pesa il secondo oscillatore rispetto al primo nel timbro del basso.",
    ifHigh: "Il secondo oscillatore (spesso Quadra) domina: basso più cavo, ronzante e presente nei medi.",
    ifLow: "Resta quasi solo il primo oscillatore: timbro più semplice e diretto.",
    tip: "💡 Alzalo insieme al Detune per un Reese più largo; abbassalo per un basso più pulito."
  },
  bass_drive: {
    title: "DISTORSIONE BASSO (Bass Drive)",
    what: "Saturatore overdrive a diodo dedicato per scaldare e incattivire la linea di basso.",
    ifHigh: "Distorsione aggressiva e graffiante che rende il basso protagonista assoluto.",
    ifLow: "Timbro pulito, caldo e privo di asperità digitali.",
    tip: "💡 Aumentalo per tracce Schranz, Rawstyle e Uptempo Zaag."
  },
  bass_sub_level: {
    title: "SUB PROFONDO BASSO (Sub Sine Layer)",
    what: "Livello di un oscillatore sinusoidale puro accordato un'ottava sotto per garantire massima pancia.",
    ifHigh: "Aggiunge un sub-basso potente e pulito che fa tremare le fondamenta del locale.",
    ifLow: "Basso privo di sotto-fondamentale, più leggero e scavato.",
    tip: "💡 Lascialo a 0.7-0.9 per avere un basso che spacca su qualsiasi sound system."
  },
  bass_glide: {
    title: "SCIVOLAMENTO NOTE (303 Glide / Portamento)",
    what: "Velocità di transizione da una nota alla successiva quando uno step ha lo 'SLIDE' attivo.",
    ifHigh: "Scivolamenti lunghi, fluidi e morbidi tra le note (il leggendario effetto TB-303 Slide).",
    ifLow: "Cambio nota istantaneo e secco.",
    tip: "💡 Attiva lo SLIDE sugli step del sequencer per sentire la magia acida."
  },
  bass_sidechain: {
    title: "AGGANCIO CON LA CASSA (Sidechain Ducking)",
    what: "Abbassa automaticamente il volume del basso nell'istante esatto in cui batte la cassa.",
    ifHigh: "La cassa entra senza ostacoli con massima potenza, e il basso entra in levare senza mai impastarsi.",
    ifLow: "Cassa e basso suonano contemporaneamente a pieno volume, rischiando di far tremare troppo il mixer.",
    tip: "💡 Tienilo sopra 0.80 per il groove perfetto cassa-basso."
  },
  bass_volume: {
    title: "VOLUME GENERALE BASSO (Bass Level)",
    what: "Livello di mix della linea di basso rispetto alla cassa.",
    ifHigh: "Basso in primo piano.",
    ifLow: "Basso di sottofondo.",
    tip: "💡 Bilancialo a 0.90 per un impatto sonoro uniforme."
  }
};
