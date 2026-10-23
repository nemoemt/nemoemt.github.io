/* ─────────────────────────────────────────────────────────────
   SKILL SHEETS — the medical and trauma checklists the tool grades on.
   Shared by the tool (index.html) and the scenario editor (editor/).
   Edit with care: proctor responses in scenarios.js are matched to these
   item texts exactly, so renaming an item disconnects its responses.
   ───────────────────────────────────────────────────────────── */

const MEDICAL_SHEET = {
  name: 'Medical Assessment',
  sections: [
    {
      title: 'Scene Size-Up',
      items: [
        'Takes or verbalizes appropriate BSI/PPE precautions',
        'Determines the scene/situation is safe',
        'Determines the mechanism of injury or nature of illness',
        'Determines the number of patients',
        'Requests additional help (ALS, PD, FD) if necessary'
      ]
    },
    {
      title: 'Primary Assessment — General Impression',
      items: [
        'Patient description (age, sex assigned at birth)',
        'Determines responsiveness — AVPU',
        'If alert → A&O out of 4 (who/where/when/general)',
        'Considers spine stabilization',
        'Determines apparent life threats',
        'Determines chief complaint'
      ]
    },
    {
      title: 'Primary Assessment — Airway',
      items: [
        'Identifies if there is an obstruction',
        'Opens/clears airway if needed'
      ]
    },
    {
      title: 'Primary Assessment — Breathing',
      items: [
        'Tidal volume (adequate chest rise/fall)',
        'Relative rate (fast, slow, regular)',
        'Respiratory pattern (regular, irregular)',
        'Accessory muscle use',
        'SpO₂',
        'Lung sounds',
        'Initiates appropriate oxygen therapy / ventilatory mgmt if needed'
      ]
    },
    {
      title: 'Primary Assessment — Circulation',
      items: [
        'Assess/control major bleeding',
        { subgroup: 'Skin', items: [
          'Color',
          'Temperature',
          'Moisture'
        ]},
        { subgroup: 'Pulse', items: [
          'Strength (weak, strong, bounding)',
          'Rate (fast, slow, regular)',
          'Regularity (regular, irregular)',
          'Equality (symmetrical, asymmetrical)'
        ]},
        'Capillary refill',
        'Identify if patient is in shock',
        'If shock → initiate shock treatment',
        'Identify patient priority (stable/unstable) and transport decision'
      ]
    },
    {
      title: 'History — OPQRST (History of Present Illness)',
      items: [
        'Onset',
        'Provocation / palliation',
        'Quality',
        'Radiation',
        'Severity',
        'Time'
      ]
    },
    {
      title: 'History — AMPLE (Past Medical)',
      items: [
        'Allergies',
        'Medications',
        'Past pertinent medical history',
        'Last oral intake',
        'Events leading up to present illness'
      ]
    },
    {
      title: 'Vital Signs',
      items: [
        'Blood pressure',
        'Pulse rate and quality',
        'Ventilatory rate and quality'
      ]
    },
    {
      title: 'Diagnostics',
      items: [
        'Blood glucose level',
        'SpO₂'
      ]
    },
    {
      title: 'Field Impression & Reassessment',
      items: [
        'States field impression of patient',
        'Administers proper treatment',
        'Determines reassessment frequency & re-evaluates transport decision',
        'Repeats primary assessment',
        'Evaluates response to treatments',
        'Reassesses patient complaints',
        'Provides accurate verbal report to receiving facility'
      ]
    }
  ],
  // Branching complaint-specific sections
  complaints: {
    respiratory: {
      label: 'Respiratory',
      sections: [
        {
          title: 'Respiratory — Associated Signs & Symptoms',
          items: ['Chest pain', 'Weakness', 'Fever', 'Swollen hands or feet', 'Cough']
        },
        {
          title: 'Respiratory — Specific Questions',
          items: [
            'Respiratory infection / symptoms of one?',
            'Cough? Productive? What coughing up?',
            'More comfortable in any position?'
          ]
        },
        {
          title: 'Respiratory — Focused Assessment',
          items: [
            'Look: accessory muscle use',
            'Look: tracheal tugging',
            'Look: jugular vein distention (JVD)',
            'Look: abnormal positioning',
            'Listen: breath sounds (grunting, wheezing, rales, stridor)',
            'Feel: tracheal deviation'
          ]
        },
        {
          title: 'Respiratory — Treatment',
          items: [
            'Proper oxygen therapy',
            'If wheezing → 2.5 mg Albuterol + 0.5 mg Atrovent via nebulizer'
          ]
        }
      ]
    },
    cardiac: {
      label: 'Cardiac',
      sections: [
        {
          title: 'Cardiac — Associated Signs & Symptoms',
          items: ['Shortness of breath', 'Weakness', 'Dizziness', 'Palpitations']
        },
        {
          title: 'Cardiac — Specific Questions',
          items: [
            'Respiratory infection / symptoms?',
            'Cough? Productive? What coughing up?',
            'Does pain change with movement or deep breath?'
          ]
        },
        {
          title: 'Cardiac — Focused Assessment',
          items: [
            'Look: JVD',
            'Look: peripheral edema',
            'Look: pursed-lip breathing',
            'Look: pink frothy sputum',
            'Listen: breath sounds'
          ]
        },
        {
          title: 'Cardiac — Treatment',
          items: [
            'Proper oxygen therapy',
            'If indicated → 324 mg Aspirin',
            'If indicated → 0.4 mg Nitroglycerin'
          ]
        }
      ]
    },
    neurological: {
      label: 'Neurological',
      sections: [
        {
          title: 'Neuro — Associated Signs & Symptoms',
          items: ['Headache', 'Blurred vision', 'Cloudiness or confusion', 'Other noticeable deficits']
        },
        {
          title: 'Neuro — Specific Questions',
          items: [
            'Seeing/hearing things not there?',
            'Want to hurt yourself or others?',
            'Is presentation normal for patient? What is different / when did it begin?',
            'Recent drugs or alcohol? When/what/how much?',
            'History of diabetes? Recent blood sugars?',
            'Fever?',
            'Open wounds?'
          ]
        },
        {
          title: 'Neuro — Focused Assessment',
          items: [
            'Look: pupils (PEARL)',
            'Look: drug/alcohol paraphernalia',
            'Look: active seizure',
            'Feel: head injuries',
            'Feel: PMS (pulse, motor, sensory)',
            'Cincinnati Stroke Scale (FAST)',
            'Smell: fruity/acetone breath',
            'Smell: alcohol on breath'
          ]
        },
        {
          title: 'Neuro — Treatment',
          items: [
            'Proper oxygen therapy',
            'If hypoglycemic → 15 g oral glucose',
            'If possible opiate OD → 2 mg Narcan intranasally',
            'If risky weather → remove patient from environment'
          ]
        }
      ]
    },
    anaphylaxis: {
      label: 'Anaphylaxis',
      sections: [
        {
          title: 'Anaphylaxis — Associated Signs & Symptoms',
          items: ['Weakness', 'Shortness of breath', 'Itchiness', 'Chest pain']
        },
        {
          title: 'Anaphylaxis — Specific Questions',
          items: [
            'Encountered known allergen?',
            'Taken anything to treat? (EpiPen, inhaler, Benadryl)',
            'New medications, foods, or cleaning products?'
          ]
        },
        {
          title: 'Anaphylaxis — Focused Assessment',
          items: [
            'Look: accessory muscle use',
            'Look: abnormal positioning (tripod, sniffing)',
            'Look: peripheral edema',
            'Look: facial swelling',
            'Listen: breath sounds'
          ]
        },
        {
          title: 'Anaphylaxis — Treatment',
          items: [
            'Proper oxygen therapy',
            'If wheezing → 2.5 mg Albuterol + 0.5 mg Atrovent',
            'If anaphylactic → 0.3 mg Epinephrine (0.15 mg if under 66 lbs)'
          ]
        }
      ]
    },
    abdominal: {
      label: 'Abdominal',
      sections: [
        {
          title: 'Abdominal — Associated Signs & Symptoms',
          items: ['Weakness', 'Shortness of breath', 'Chest pain']
        },
        {
          title: 'Abdominal — Specific Questions',
          items: [
            'Vomiting? Describe; coffee-ground emesis or BRB?',
            'Unusual bowel habits? Describe; dark tarry stool?',
            'Pain with urination? Unusual odors? Urine appearance?',
            'If female: vaginal discharge? Could be pregnant?'
          ]
        },
        {
          title: 'Abdominal — Focused Assessment',
          items: [
            'Look: discoloration',
            'Look: distention',
            'Look: obvious injury',
            'Look: swelling',
            'Look: visible masses',
            'Listen: periodic bowel sounds',
            'Palpate quadrants: tenderness',
            'Palpate quadrants: rebound tenderness',
            'Palpate quadrants: guarding/rigidity',
            'Palpate quadrants: unusual masses'
          ]
        },
        {
          title: 'Abdominal — Treatment',
          items: ['Proper oxygen therapy']
        }
      ]
    }
  }
};

const TRAUMA_SHEET = {
  name: 'Trauma Assessment',
  sections: [
    {
      title: 'Scene Size-Up',
      items: [
        'Takes or verbalizes appropriate BSI/PPE precautions',
        'Determines the scene/situation is safe',
        'Determines the mechanism of injury or nature of illness',
        'Determines the number of patients',
        'Requests additional help (ALS, PD, FD) if necessary'
      ]
    },
    {
      title: 'Primary Assessment — General Impression',
      items: [
        'Patient description (age, sex assigned at birth)',
        'Determines responsiveness — AVPU',
        'If alert → A&O out of 4',
        'Considers spine stabilization',
        'Determines apparent life threats',
        'Determines chief complaint'
      ]
    },
    {
      title: 'Primary Assessment — Airway',
      items: [
        'Identifies if there is an obstruction',
        'Opens/clears airway if needed'
      ]
    },
    {
      title: 'Primary Assessment — Breathing',
      items: [
        'Tidal volume',
        'Relative rate',
        'Respiratory pattern',
        'Accessory muscle use',
        'SpO₂',
        'Lung sounds',
        'Initiates oxygen therapy / ventilatory mgmt if needed'
      ]
    },
    {
      title: 'Primary Assessment — Circulation',
      items: [
        'Assess/control major bleeding',
        { subgroup: 'Skin', items: [
          'Color',
          'Temperature',
          'Moisture'
        ]},
        { subgroup: 'Pulse', items: [
          'Strength (weak, strong, bounding)',
          'Rate (fast, slow, regular)',
          'Regularity (regular, irregular)',
          'Equality (symmetrical, asymmetrical)'
        ]},
        'Capillary refill',
        'Identify if patient is in shock',
        'If shock → initiate shock treatment',
        'Patient priority & transport decision'
      ]
    },
    {
      title: 'Vital Signs',
      items: ['Blood pressure', 'Pulse rate and quality', 'Ventilatory rate and quality']
    },
    {
      title: 'Diagnostics',
      items: ['Blood glucose level', 'SpO₂']
    },
    {
      title: 'AMPLE History',
      items: ['Allergies', 'Medications', 'Past pertinent history', 'Last oral intake', 'Events leading up']
    },
    {
      title: 'Secondary — Head',
      items: [
        'Inspect face & scalp for DCAP-BTLS',
        'Inspect head for bleeding',
        'Inspect for Raccoon Eyes',
        'Inspect for Battle\'s Sign',
        'Inspect ears & nose for fluid (CSF, blood)',
        'Inspect mouth (missing teeth, injury, abnormal odors)',
        'Assess eyes — PEARL',
        'Palpate facial structures (crepitus, instability, deformity)',
        'Treatment: head — control bleeding (direct pressure, soft tissue only)',
      ]
    },
    {
      title: 'Secondary — Neck',
      items: [
        'Inspect neck for DCAP-BTLS',
        'Inspect neck for bleeding',
        'Inspect for JVD',
        'Inspect for subcutaneous emphysema on neck',
        'Palpate trachea — deviation',
        'Palpate cervical spine — inline, deformity, tenderness, fracture',
        'Treatment: neck — control bleeding',
        'Treatment: apply C-collar if needed'
      ]
    },
    {
      title: 'Secondary — Chest',
      items: [
        'Inspect chest for DCAP-BTLS',
        'Inspect chest for bleeding',
        'Inspect for sucking chest wound on chest',
        'Inspect for subcutaneous emphysema on chest',
        'Inspect for paradoxical movement',
        'Assess rate, tidal volume, rhythm, accessory muscle use',
        'Palpate shoulders',
        'Palpate clavicles',
        'Palpate sternum',
        'Palpate ribs',
        'Listen to lung sounds',
        'Treatment: chest — control bleeding',
      ]
    },
    {
      title: 'Secondary — Abdomen',
      items: [
        'Inspect abdomen for DCAP-BTLS',
        'Inspect abdomen for bleeding',
        'Inspect for evisceration',
        'Inspect for bruising around umbilicus (Cullen\'s)',
        'Inspect for bruising on flanks (Grey-Turner\'s)',
        'Palpate all four quadrants — rigidity',
        'Palpate quadrants — pulsating masses',
        'Palpate quadrants — unusual masses',
        'Treatment: abdomen — control bleeding',
      ]
    },
    {
      title: 'Secondary — Pelvis',
      items: [
        'Inspect pelvis for DCAP-BTLS',
        'Inspect pelvis for bleeding',
        'If male → inspect for priapism',
        'Push pelvic bones together and down — crepitus, instability',
        'Treatment: pelvis — control bleeding',
        'Treatment: pelvis — immobilize if needed'
      ]
    },
    {
      title: 'Secondary — Lower Extremities',
      items: [
        'Inspect lower extremities for DCAP-BTLS',
        'Inspect lower extremities for bleeding',
        'Assess each lower extremity for PMS',
        'Palpate down lower extremities — crepitus, instability, deformity',
        'Treatment: lower ext — control bleeding',
        'Treatment: lower ext — splint area if fracture',
        'Treatment: lower ext — immobilize if needed'
      ]
    },
    {
      title: 'Secondary — Upper Extremities',
      items: [
        'Inspect upper extremities for DCAP-BTLS',
        'Inspect upper extremities for bleeding',
        'Assess each upper extremity for PMS',
        'Palpate down upper extremities — crepitus, instability, deformity',
        'Treatment: upper ext — control bleeding',
        'Treatment: upper ext — splint area if fracture',
        'Treatment: upper ext — immobilize if needed'
      ]
    },
    {
      title: 'Secondary — Posterior',
      items: [
        'Inspect posterior for DCAP-BTLS',
        'Inspect posterior for bleeding',
        'Inspect for sucking chest wound on back',
        'Inspect for subcutaneous emphysema on back',
        'Palpate spine for crepitus, deformity, tenderness',
        'Treatment: posterior — control bleeding',
        'Treatment: posterior — immobilize if needed'
      ]
    },
    {
      title: 'Field Impression & Reassessment',
      items: [
        'States field impression of patient',
        'Administers proper treatment',
        'Determines reassessment frequency & re-evaluates transport decision',
        'Repeats primary assessment',
        'Evaluates response to treatments',
        'Reassesses patient complaints',
        'Provides accurate verbal report to receiving facility'
      ]
    }
  ]
};
