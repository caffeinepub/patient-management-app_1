import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity,
  Heart,
  HelpCircle,
  Loader2,
  Plus,
  Sparkles,
  Thermometer,
  Wind,
  X,
} from "lucide-react";
import { useState } from "react";
import GastrointestinalExam from "./GastrointestinalExam";
import InvestigationProfile from "./InvestigationProfile";
import MusculoskeletalExam from "./MusculoskeletalExam";
import NeurologicalExam from "./NeurologicalExam";
import QuestionStepper from "./QuestionStepper";
import RespiratoryExam from "./RespiratoryExam";
import SystemicExaminationSection from "./SystemicExaminationSection";

// ─── Data constants ───────────────────────────────────────────────────────────

const systemReviewData: Record<string, string[]> = {
  Cardiovascular: [
    "Chest pain",
    "Palpitations",
    "Shortness of breath",
    "Leg swelling",
    "Syncope",
  ],
  Respiratory: [
    "Cough",
    "Shortness of breath",
    "Wheezing",
    "Hemoptysis",
    "Chest pain",
  ],
  Gastrointestinal: [
    "Abdominal pain",
    "Nausea",
    "Vomiting",
    "Diarrhea",
    "Constipation",
    "Blood in stool",
  ],
  Genitourinary: [
    "Dysuria",
    "Frequency",
    "Hematuria",
    "Incontinence",
    "Urgency",
  ],
  Neurological: [
    "Headache",
    "Dizziness",
    "Seizures",
    "Weakness",
    "Numbness",
    "Vision changes",
  ],
  Musculoskeletal: [
    "Joint pain",
    "Muscle pain",
    "Back pain",
    "Stiffness",
    "Swelling",
  ],
  Endocrine: [
    "Heat/cold intolerance",
    "Weight changes",
    "Excessive thirst",
    "Frequent urination",
  ],
  Psychiatric: ["Depression", "Anxiety", "Sleep disturbances", "Mood changes"],
};

const medicalHistoryOptions = [
  "DM",
  "HTN",
  "Asthma",
  "IHD",
  "CKD",
  "COPD",
  "TB",
  "Cancer",
];

const surgicalHistoryQuestions = [
  { q: "Any previous surgeries?", options: ["Yes", "No"] },
  { q: "Type of surgery / সার্জারির ধরন", options: [] },
  { q: "When was it done? / কখন হয়েছিল?", options: [] },
  { q: "Any complications? / কোনো জটিলতা?", options: ["No", "Yes - specify"] },
];

const personalHistoryQuestions = [
  {
    q: "Smoking status / ধূমপানের অবস্থা",
    options: ["Non-smoker", "Current smoker", "Ex-smoker"],
  },
  {
    q: "Alcohol consumption / অ্যালকোহল সেবন",
    options: ["None", "Occasional", "Regular"],
  },
  { q: "Diet / খাদ্যাভ্যাস", options: ["Regular", "Vegetarian", "Irregular"] },
  { q: "Occupation / পেশা", options: [] },
  { q: "Exercise / ব্যায়াম", options: ["None", "Light", "Moderate", "Regular"] },
];

const familyHistoryQuestions = [
  {
    q: "Any family history of diabetes? / পরিবারে ডায়াবেটিস?",
    options: [
      "No",
      "Yes - Father",
      "Yes - Mother",
      "Yes - Sibling",
      "Yes - Other",
    ],
  },
  {
    q: "Any family history of hypertension? / পরিবারে উচ্চ রক্তচাপ?",
    options: [
      "No",
      "Yes - Father",
      "Yes - Mother",
      "Yes - Sibling",
      "Yes - Other",
    ],
  },
  {
    q: "Any family history of heart disease? / পরিবারে হৃদরোগ?",
    options: ["No", "Yes - specify"],
  },
  {
    q: "Any family history of cancer? / পরিবারে ক্যান্সার?",
    options: ["No", "Yes - specify"],
  },
];

const immunizationQuestions = [
  { q: "BCG vaccination / বিসিজি টিকা", options: ["Yes", "No", "Unknown"] },
  {
    q: "COVID-19 vaccination / কোভিড-১৯ টিকা",
    options: [
      "Not vaccinated",
      "Partially vaccinated",
      "Fully vaccinated",
      "Booster received",
    ],
  },
  {
    q: "Tetanus toxoid / টিটেনাস টক্সয়েড",
    options: ["Up to date", "Not sure", "Not received"],
  },
  { q: "Other vaccinations / অন্যান্য টিকা", options: [] },
];

const allergyQuestions = [
  { q: "Any drug allergies? / ওষুধে এলার্জি?", options: ["No", "Yes - specify"] },
  { q: "Any food allergies? / খাবারে এলার্জি?", options: ["No", "Yes - specify"] },
  {
    q: "Environmental allergies? / পরিবেশগত এলার্জি?",
    options: ["No", "Dust", "Pollen", "Animal dander", "Other"],
  },
  {
    q: "Type of reaction / প্রতিক্রিয়ার ধরন",
    options: ["Rash", "Swelling", "Breathing difficulty", "Other"],
  },
];

const obstetricQuestions = [
  { q: "Gravida (Total pregnancies) / মোট গর্ভধারণ", options: [] },
  { q: "Para (Live births) / জীবিত সন্তান", options: [] },
  { q: "Abortion (Miscarriages) / গর্ভপাত", options: [] },
  { q: "Last menstrual period (LMP) / শেষ মাসিকের তারিখ", options: [] },
  {
    q: "Any pregnancy complications? / গর্ভাবস্থায় জটিলতা?",
    options: ["No", "Yes - specify"],
  },
];

const gynaecologicalQuestions = [
  {
    q: "Menstrual cycle regularity / মাসিকের নিয়মিততা",
    options: ["Regular", "Irregular"],
  },
  {
    q: "Duration of period / মাসিকের সময়কাল",
    options: ["3-5 days", "5-7 days", "> 7 days"],
  },
  {
    q: "Menstrual pain / মাসিকের ব্যথা",
    options: ["None", "Mild", "Moderate", "Severe"],
  },
  { q: "Age at menarche / প্রথম মাসিকের বয়স", options: [] },
  {
    q: "Menopause status / মেনোপজের অবস্থা",
    options: [
      "Premenopausal",
      "Perimenopausal",
      "Postmenopausal",
      "Not applicable",
    ],
  },
];

const generalExaminationCategories: Record<string, string[]> = {
  Appearance: ["Well", "Ill-looking", "Distressed", "Toxic"],
  "Body Build": ["Normal", "Obese", "Thin", "Cachexic"],
  Nutrition: ["Well-nourished", "Malnourished", "Overweight"],
  Cooperation: ["Cooperative", "Uncooperative", "Agitated", "Confused"],
  Decubitus: [
    "Any position",
    "Orthopnea",
    "Prefers lying down",
    "Cannot lie flat",
  ],
  Dehydration: ["Not dehydrated", "Mild", "Moderate", "Severe"],
  Edema: [
    "Absent",
    "Pedal edema",
    "Facial edema",
    "Generalized",
    "Pitting",
    "Non-pitting",
  ],
  "Bony tenderness": ["Absent", "Present - specify location"],
  Anemia: ["No pallor", "Mild pallor", "Moderate pallor", "Severe pallor"],
  Jaundice: ["Absent", "Mild icterus", "Moderate icterus", "Severe icterus"],
  Cyanosis: ["Absent", "Central", "Peripheral", "Both"],
  Clubbing: ["Absent", "Grade 1", "Grade 2", "Grade 3", "Grade 4"],
  Koilonychia: ["Absent", "Present"],
  Leukonychia: ["Absent", "Present"],
  "Body hair": ["Normal", "Excessive", "Sparse", "Loss of axillary/pubic hair"],
  Pigmentation: ["Normal", "Hyperpigmentation", "Hypopigmentation", "Vitiligo"],
  "Lymph nodes": [
    "Not palpable",
    "Cervical enlarged",
    "Axillary enlarged",
    "Inguinal enlarged",
    "Generalized lymphadenopathy",
  ],
  "Thyroid gland": [
    "Not palpable",
    "Palpable - normal",
    "Enlarged - diffuse",
    "Enlarged - nodular",
  ],
  Breasts: [
    "Normal",
    "Mass detected",
    "Discharge",
    "Tenderness",
    "Not examined",
  ],
  "DRE/Genitalia": ["Normal", "Abnormal - specify", "Not examined"],
};

const commonComplaints: Record<string, { q: string; options: string[] }[]> = {
  Cough: [
    {
      q: "When did the cough start?",
      options: ["< 1 week", "1-2 weeks", "2-4 weeks", "> 1 month"],
    },
    {
      q: "Is it dry or productive (with phlegm)?",
      options: ["Dry", "Productive", "Both"],
    },
    {
      q: "Any associated symptoms (fever, shortness of breath)?",
      options: ["None", "Fever", "Shortness of breath", "Both"],
    },
    { q: "Does anything make it better or worse?", options: [] },
  ],
  Fever: [
    {
      q: "When did the fever start?",
      options: ["< 24 hours", "1-3 days", "3-7 days", "> 1 week"],
    },
    {
      q: "What is the highest temperature recorded?",
      options: ["< 100°F", "100-102°F", "102-104°F", "> 104°F"],
    },
    {
      q: "Is it continuous or intermittent?",
      options: ["Continuous", "Intermittent", "Only at night"],
    },
    {
      q: "Any associated symptoms (chills, sweating, body aches)?",
      options: [],
    },
  ],
  Headache: [
    {
      q: "When did the headache start?",
      options: ["< 24 hours", "1-3 days", "3-7 days", "> 1 week"],
    },
    {
      q: "Location of pain (frontal, temporal, occipital)?",
      options: ["Frontal", "Temporal", "Occipital", "Whole head"],
    },
    {
      q: "Severity (1-10 scale)?",
      options: ["1-3 Mild", "4-6 Moderate", "7-10 Severe"],
    },
    { q: "Any associated symptoms (nausea, vision changes)?", options: [] },
  ],
  "Abdominal Pain": [
    {
      q: "When did the pain start?",
      options: ["< 6 hours", "6-24 hours", "1-3 days", "> 3 days"],
    },
    {
      q: "Location of pain?",
      options: [
        "Upper abdomen",
        "Lower abdomen",
        "Right side",
        "Left side",
        "All over",
      ],
    },
    {
      q: "Type of pain (sharp, dull, cramping)?",
      options: ["Sharp", "Dull", "Cramping", "Burning"],
    },
    { q: "Any associated symptoms (nausea, vomiting, diarrhea)?", options: [] },
  ],
  "Chest Pain": [
    {
      q: "When did the pain start?",
      options: ["< 1 hour", "1-6 hours", "6-24 hours", "> 24 hours"],
    },
    {
      q: "Location and radiation?",
      options: [
        "Central chest",
        "Left side",
        "Right side",
        "Radiates to arm",
        "Radiates to jaw",
      ],
    },
    {
      q: "Nature of pain (sharp, pressure, burning)?",
      options: ["Sharp", "Pressure", "Burning", "Squeezing"],
    },
    {
      q: "Any associated symptoms (shortness of breath, sweating)?",
      options: [],
    },
  ],
  "Back Pain": [
    {
      q: "When did the pain start?",
      options: ["< 24 hours", "1-7 days", "1-4 weeks", "> 1 month"],
    },
    {
      q: "Location (upper, middle, lower back)?",
      options: ["Upper back", "Middle back", "Lower back"],
    },
    { q: "Any trauma or injury?", options: ["Yes", "No"] },
    { q: "Any radiation to legs or numbness?", options: [] },
  ],
  "Sore Throat": [
    {
      q: "When did it start?",
      options: ["< 24 hours", "1-3 days", "3-7 days", "> 1 week"],
    },
    {
      q: "Difficulty swallowing?",
      options: ["No", "Mild", "Moderate", "Severe"],
    },
    { q: "Any associated symptoms (fever, cough)?", options: [] },
    {
      q: "Any visible swelling or white patches?",
      options: ["No", "Yes - swelling", "Yes - white patches", "Both"],
    },
  ],
  Dizziness: [
    {
      q: "When did the dizziness start?",
      options: ["< 1 hour", "1-24 hours", "1-7 days", "> 1 week"],
    },
    {
      q: "Is it spinning sensation or light-headedness?",
      options: ["Spinning", "Light-headed", "Both"],
    },
    { q: "Any associated symptoms (nausea, hearing loss)?", options: [] },
    {
      q: "Does it occur with position changes?",
      options: ["Yes", "No", "Sometimes"],
    },
  ],
  "Nausea/Vomiting": [
    {
      q: "When did it start?",
      options: ["< 6 hours", "6-24 hours", "1-3 days", "> 3 days"],
    },
    {
      q: "Frequency of vomiting?",
      options: ["Not vomiting", "1-2 times", "3-5 times", "> 5 times"],
    },
    { q: "Any blood in vomit?", options: ["No", "Yes"] },
    { q: "Any associated symptoms (abdominal pain, diarrhea)?", options: [] },
  ],
  Diarrhea: [
    {
      q: "When did it start?",
      options: ["< 24 hours", "1-3 days", "3-7 days", "> 1 week"],
    },
    {
      q: "Frequency per day?",
      options: ["3-5 times", "6-10 times", "> 10 times"],
    },
    {
      q: "Any blood or mucus in stool?",
      options: ["No", "Blood", "Mucus", "Both"],
    },
    { q: "Any associated symptoms (fever, abdominal pain)?", options: [] },
  ],
  "Shortness of Breath": [
    {
      q: "When did it start?",
      options: ["< 1 hour", "1-6 hours", "6-24 hours", "> 24 hours"],
    },
    {
      q: "Is it at rest or with exertion?",
      options: ["At rest", "With exertion", "Both"],
    },
    { q: "Any chest pain or wheezing?", options: [] },
    {
      q: "Any leg swelling?",
      options: ["No", "Yes - mild", "Yes - moderate", "Yes - severe"],
    },
  ],
  Fatigue: [
    {
      q: "How long have you felt tired?",
      options: ["< 1 week", "1-4 weeks", "1-3 months", "> 3 months"],
    },
    { q: "Does rest help?", options: ["Yes", "No", "Partially"] },
    {
      q: "Any weight changes?",
      options: ["No change", "Weight loss", "Weight gain"],
    },
    { q: "Any other symptoms?", options: [] },
  ],
  Rash: [
    {
      q: "When did the rash appear?",
      options: ["< 24 hours", "1-3 days", "3-7 days", "> 1 week"],
    },
    {
      q: "Location and spread?",
      options: ["Localized", "Spreading", "All over body"],
    },
    {
      q: "Is it itchy or painful?",
      options: ["Not itchy/painful", "Itchy", "Painful", "Both"],
    },
    { q: "Any recent new medications or exposures?", options: [] },
  ],
  "Joint Pain": [
    {
      q: "Which joint(s) are affected?",
      options: ["Knee", "Hip", "Shoulder", "Elbow", "Wrist", "Multiple joints"],
    },
    {
      q: "When did it start?",
      options: ["< 1 week", "1-4 weeks", "1-3 months", "> 3 months"],
    },
    {
      q: "Any swelling or redness?",
      options: ["No", "Swelling only", "Redness only", "Both"],
    },
    { q: "Any morning stiffness?", options: [] },
  ],
  "Ear Pain": [
    { q: "Which ear is affected?", options: ["Left", "Right", "Both"] },
    {
      q: "When did it start?",
      options: ["< 24 hours", "1-3 days", "3-7 days", "> 1 week"],
    },
    { q: "Any discharge or hearing loss?", options: [] },
    {
      q: "Any recent cold or flu?",
      options: ["No", "Yes - current", "Yes - recent"],
    },
  ],
  "Eye Problem": [
    {
      q: "What is the main symptom (pain, redness, vision change)?",
      options: ["Pain", "Redness", "Vision change", "Discharge", "Multiple"],
    },
    {
      q: "When did it start?",
      options: ["< 24 hours", "1-3 days", "3-7 days", "> 1 week"],
    },
    { q: "One or both eyes?", options: ["Left eye", "Right eye", "Both eyes"] },
    { q: "Any discharge or sensitivity to light?", options: [] },
  ],
  "Urinary Problem": [
    {
      q: "What is the main issue (pain, frequency, blood)?",
      options: ["Pain/burning", "Frequency", "Blood in urine", "Multiple"],
    },
    {
      q: "When did it start?",
      options: ["< 24 hours", "1-3 days", "3-7 days", "> 1 week"],
    },
    { q: "Any fever or back pain?", options: [] },
    {
      q: "Any difficulty urinating?",
      options: [
        "No",
        "Yes - difficulty starting",
        "Yes - weak stream",
        "Yes - incomplete emptying",
      ],
    },
  ],
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface VitalSignsForm {
  blood_pressure: string;
  pulse: string | number;
  heart_rate?: string | number;
  temperature: string | number;
  respiratory_rate: string | number;
  oxygen_saturation: string | number;
}

interface VisitFormData {
  patient_id?: bigint;
  visit_type?: string;
  visit_date?: string;
  chief_complaint?: string;
  complaint_details?: Record<string, unknown>;
  system_review?: Record<string, unknown>;
  past_medical_history?: Record<string, string>;
  past_surgical_history?: string;
  personal_history?: string;
  family_history?: string;
  immunization_history?: string;
  allergy_history?: string;
  drug_history?: { drug_name: string; dose: string; daily_dose: string }[];
  obstetric_history?: string;
  gynaecological_history?: string;
  other_history?: string;
  history_of_present_illness?: string;
  vital_signs?: VitalSignsForm;
  general_examination?: Record<string, string>;
  systemic_examination?: Record<string, string>;
  physical_examination?: string;
  investigation_profile?: {
    name: string;
    result: string;
    unit: string;
    category: string;
  }[];
  brief_summary?: string;
  brief_summary_history?: string;
  brief_summary_examination?: string;
  brief_summary_investigation?: string;
  full_evaluation?: string;
  analysis?: string;
  diagnosis?: string;
  notes?: string;
  other_medical_history?: string;
  salient_features?: string;
}

interface VisitFormProps {
  patientId: bigint;
  patient?: {
    fullName?: string;
    dateOfBirth?: bigint;
    gender?: string;
    address?: string;
  };
  patientType?: string;
  visit?: Partial<VisitFormData>;
  onSubmit: (data: {
    patientId: bigint;
    visitDate: bigint;
    chiefComplaint: string;
    historyOfPresentIllness: string | null;
    vitalSigns: {
      bloodPressure?: string;
      pulse?: string;
      temperature?: string;
      respiratoryRate?: string;
      oxygenSaturation?: string;
    };
    physicalExamination: string | null;
    diagnosis: string | null;
    notes: string | null;
    visitType: string;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function nowDateTimeLocal() {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString().slice(0, 16);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VisitForm({
  patientId,
  patient,
  patientType,
  visit,
  onSubmit,
  onCancel,
  isLoading,
}: VisitFormProps) {
  const [visitType, setVisitType] = useState(
    visit?.visit_type || (patientType === "outdoor" ? "outdoor" : "admitted"),
  );

  const [formData, setFormData] = useState<VisitFormData>(
    visit || {
      patient_id: patientId,
      visit_type: visitType,
      visit_date: nowDateTimeLocal(),
      chief_complaint: "",
      complaint_details: {},
      system_review: {},
      past_medical_history: {},
      past_surgical_history: "",
      personal_history: "",
      family_history: "",
      immunization_history: "",
      allergy_history: "",
      drug_history: [{ drug_name: "", dose: "", daily_dose: "" }],
      salient_features: "",
      obstetric_history: "",
      gynaecological_history: "",
      other_history: "",
      history_of_present_illness: "",
      vital_signs: {
        blood_pressure: "",
        pulse: "",
        temperature: "",
        respiratory_rate: "",
        oxygen_saturation: "",
      },
      general_examination: {},
      systemic_examination: {},
      physical_examination: "",
      investigation_profile: [],
      brief_summary: "",
      full_evaluation: "",
      analysis: "",
      diagnosis: "",
      notes: "",
    },
  );

  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [complaintAnswers, setComplaintAnswers] = useState<
    Record<string, string[]>
  >({});
  const [customComplaints, setCustomComplaints] = useState<
    Record<string, { q: string; options: string[] }[]>
  >({});
  const [complaintQuestions, setComplaintQuestions] = useState<
    Record<string, { q: string; options: string[] }[]>
  >({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newComplaint, setNewComplaint] = useState("");
  const [newQuestions, setNewQuestions] = useState([
    { q: "", options: [] as string[] },
    { q: "", options: [] as string[] },
    { q: "", options: [] as string[] },
    { q: "", options: [] as string[] },
  ]);
  const [systemReviewAnswers, setSystemReviewAnswers] = useState<
    Record<string, string[]>
  >({});
  const [customSystems, setCustomSystems] = useState<Record<string, string[]>>(
    {},
  );
  const [medicalHistory, setMedicalHistory] = useState<Record<string, string>>(
    {},
  );
  const [generalExamFindings, setGeneralExamFindings] = useState<
    Record<string, string>
  >({});
  const [systemicExamFindings, _setSystemicExamFindings] = useState<
    Record<string, string>
  >({});
  const [respiratoryExam, setRespiratoryExam] = useState<any>({});
  const [neurologicalExam, setNeurologicalExam] = useState<any>({});
  const [gastrointestinalExam, setGastrointestinalExam] = useState<any>({});
  const [musculoskeletalExam, setMusculoskeletalExam] = useState<any>({});

  const [showSurgicalQuestions, setShowSurgicalQuestions] = useState(false);
  const [showPersonalQuestions, setShowPersonalQuestions] = useState(false);
  const [showFamilyQuestions, setShowFamilyQuestions] = useState(false);
  const [showImmunizationQuestions, setShowImmunizationQuestions] =
    useState(false);
  const [showAllergyQuestions, setShowAllergyQuestions] = useState(false);
  const [showObstetricQuestions, setShowObstetricQuestions] = useState(false);
  const [showGynaecologicalQuestions, setShowGynaecologicalQuestions] =
    useState(false);

  const [surgicalHistoryAnswers, setSurgicalHistoryAnswers] = useState(
    Array(surgicalHistoryQuestions.length).fill("") as string[],
  );
  const [personalHistoryAnswers, setPersonalHistoryAnswers] = useState(
    Array(personalHistoryQuestions.length).fill("") as string[],
  );
  const [familyHistoryAnswers, setFamilyHistoryAnswers] = useState(
    Array(familyHistoryQuestions.length).fill("") as string[],
  );
  const [immunizationAnswers, setImmunizationAnswers] = useState(
    Array(immunizationQuestions.length).fill("") as string[],
  );
  const [allergyAnswers, setAllergyAnswers] = useState(
    Array(allergyQuestions.length).fill("") as string[],
  );
  const [obstetricAnswers, setObstetricAnswers] = useState(
    Array(obstetricQuestions.length).fill("") as string[],
  );
  const [gynaecologicalAnswers, setGynaecologicalAnswers] = useState(
    Array(gynaecologicalQuestions.length).fill("") as string[],
  );

  const [extraHistoryQuestions, setExtraHistoryQuestions] = useState<
    Record<string, { q: string; options: string[] }[]>
  >({});
  const [extraHistoryAnswers, setExtraHistoryAnswers] = useState<
    Record<string, string[]>
  >({});
  const [newHistoryQuestionText, setNewHistoryQuestionText] = useState<
    Record<string, string>
  >({});

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleChange = (field: keyof VisitFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVitalChange = (field: keyof VitalSignsForm, value: string) => {
    setFormData((prev) => ({
      ...prev,
      vital_signs: {
        ...prev.vital_signs!,
        [field]: value === "" ? "" : value,
      },
    }));
  };

  const handleDrugHistoryChange = (
    index: number,
    field: string,
    value: string,
  ) => {
    const newDrugs = [...(formData.drug_history || [])];
    newDrugs[index] = { ...newDrugs[index], [field]: value };
    setFormData((prev) => ({ ...prev, drug_history: newDrugs }));
  };

  const addDrugHistory = () => {
    setFormData((prev) => ({
      ...prev,
      drug_history: [
        ...(prev.drug_history || []),
        { drug_name: "", dose: "", daily_dose: "" },
      ],
    }));
  };

  const removeDrugHistory = (index: number) => {
    if ((formData.drug_history || []).length > 1) {
      setFormData((prev) => ({
        ...prev,
        drug_history: (prev.drug_history || []).filter((_, i) => i !== index),
      }));
    }
  };

  const toggleSystemReview = (system: string, symptom: string) => {
    setSystemReviewAnswers((prev) => {
      const systemSymptoms = prev[system] || [];
      const newSymptoms = systemSymptoms.includes(symptom)
        ? systemSymptoms.filter((s) => s !== symptom)
        : [...systemSymptoms, symptom];
      return { ...prev, [system]: newSymptoms };
    });
  };

  const toggleMedicalHistory = (condition: string) => {
    setMedicalHistory((prev) => ({
      ...prev,
      [condition]:
        prev[condition] === "+" ? "-" : prev[condition] === "-" ? "" : "+",
    }));
  };

  const toggleGeneralExam = (finding: string, status: string) => {
    setGeneralExamFindings((prev) => ({
      ...prev,
      [finding]: prev[finding] === status ? "" : status,
    }));
  };

  const addHistoryQuestion = (sectionKey: string) => {
    const text = (newHistoryQuestionText[sectionKey] || "").trim();
    if (!text) return;
    setExtraHistoryQuestions((prev) => ({
      ...prev,
      [sectionKey]: [...(prev[sectionKey] || []), { q: text, options: [] }],
    }));
    setExtraHistoryAnswers((prev) => ({
      ...prev,
      [sectionKey]: [...(prev[sectionKey] || []), ""],
    }));
    setNewHistoryQuestionText((prev) => ({ ...prev, [sectionKey]: "" }));
  };

  const allComplaints = { ...commonComplaints, ...customComplaints };

  const getComplaintQuestions = (complaint: string) => {
    const baseQuestions = allComplaints[complaint] || [];
    const additionalQuestions = complaintQuestions[complaint] || [];
    return [...baseQuestions, ...additionalQuestions];
  };

  const handleTemplateSelect = (template: string) => {
    const isSelected = selectedComplaints.includes(template);
    const updated = isSelected
      ? selectedComplaints.filter((c) => c !== template)
      : [...selectedComplaints, template];
    setSelectedComplaints(updated);
    if (!isSelected) {
      setComplaintAnswers((prev) => ({
        ...prev,
        [template]: allComplaints[template].map(() => ""),
      }));
    } else {
      const newAnswers = { ...complaintAnswers };
      delete newAnswers[template];
      setComplaintAnswers(newAnswers);
    }
    setFormData((prev) => ({ ...prev, chief_complaint: updated.join(", ") }));
  };

  const handleAddComplaint = () => {
    if (newComplaint.trim()) {
      const questions = newQuestions.filter((item) => item.q.trim() !== "");
      if (questions.length > 0) {
        setCustomComplaints((prev) => ({ ...prev, [newComplaint]: questions }));
        setNewComplaint("");
        setNewQuestions([
          { q: "", options: [] },
          { q: "", options: [] },
          { q: "", options: [] },
          { q: "", options: [] },
        ]);
        setShowAddDialog(false);
      }
    }
  };

  const handleQuestionChange = (
    index: number,
    field: string,
    value: string,
  ) => {
    const updated = [...newQuestions];
    if (field === "question") {
      updated[index] = { ...updated[index], q: value };
    } else if (field === "options") {
      updated[index] = {
        ...updated[index],
        options: value
          .split(",")
          .map((opt) => opt.trim())
          .filter((opt) => opt !== ""),
      };
    }
    setNewQuestions(updated);
  };

  const handleAnswerChange = (
    complaint: string,
    questionIndex: number,
    value: string,
  ) => {
    setComplaintAnswers((prev) => ({
      ...prev,
      [complaint]: (prev[complaint] || []).map((ans, idx) =>
        idx === questionIndex ? value : ans,
      ),
    }));
  };

  const handleAddQuestionToComplaint = (complaint: string) => {
    const newQuestion = window.prompt("Enter new question:");
    if (newQuestion?.trim()) {
      const options = window.prompt(
        "Enter options (comma separated, or leave empty):",
      );
      const newQuestionObj = {
        q: newQuestion.trim(),
        options: options
          ? options
              .split(",")
              .map((o) => o.trim())
              .filter((o) => o)
          : [],
      };
      setComplaintQuestions((prev) => ({
        ...prev,
        [complaint]: [...(prev[complaint] || []), newQuestionObj],
      }));
      setComplaintAnswers((prev) => ({
        ...prev,
        [complaint]: [...(prev[complaint] || []), ""],
      }));
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const buildSummary = (
      baseQs: { q: string; options: string[] }[],
      baseAnswers: string[],
      sectionKey: string,
    ) =>
      [
        ...baseQs.map((q, i) =>
          baseAnswers[i] ? `${q.q}: ${baseAnswers[i]}` : "",
        ),
        ...(extraHistoryQuestions[sectionKey] || []).map((q, i) =>
          extraHistoryAnswers[sectionKey]?.[i]
            ? `${q.q}: ${extraHistoryAnswers[sectionKey][i]}`
            : "",
        ),
      ]
        .filter((s) => s)
        .join("\n");

    const surgicalHistorySummary = buildSummary(
      surgicalHistoryQuestions,
      surgicalHistoryAnswers,
      "surgical",
    );
    const personalHistorySummary = buildSummary(
      personalHistoryQuestions,
      personalHistoryAnswers,
      "personal",
    );
    const familyHistorySummary = buildSummary(
      familyHistoryQuestions,
      familyHistoryAnswers,
      "family",
    );
    const immunizationSummary = buildSummary(
      immunizationQuestions,
      immunizationAnswers,
      "immunization",
    );
    const allergySummary = buildSummary(
      allergyQuestions,
      allergyAnswers,
      "allergy",
    );
    const obstetricSummary = buildSummary(
      obstetricQuestions,
      obstetricAnswers,
      "obstetric",
    );
    const gynaecologicalSummary = buildSummary(
      gynaecologicalQuestions,
      gynaecologicalAnswers,
      "gynaecological",
    );

    // Build HPI from history sections (outdoor) or direct field (admitted)
    let historyOfPresentIllness: string | null = null;
    if (visitType === "outdoor") {
      const sections = [
        surgicalHistorySummary &&
          `Past Surgical History:\n${surgicalHistorySummary}`,
        personalHistorySummary &&
          `Personal History:\n${personalHistorySummary}`,
        familyHistorySummary && `Family History:\n${familyHistorySummary}`,
        immunizationSummary && `Immunization History:\n${immunizationSummary}`,
        allergySummary && `Allergy History:\n${allergySummary}`,
        obstetricSummary && `Obstetric History:\n${obstetricSummary}`,
        gynaecologicalSummary &&
          `Gynaecological History:\n${gynaecologicalSummary}`,
        formData.other_history && `Other History:\n${formData.other_history}`,
      ].filter(Boolean);
      historyOfPresentIllness =
        sections.length > 0 ? sections.join("\n\n") : null;
    } else {
      historyOfPresentIllness =
        formData.history_of_present_illness?.trim() || null;
    }

    // Build physical examination text
    let physicalExamination: string | null = null;
    {
      const genExamLines = Object.entries(generalExamFindings)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`);
      const sysExamLines = Object.entries(systemicExamFindings)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`);
      const respLines = Object.entries(respiratoryExam)
        .filter(
          ([, v]) =>
            v &&
            (Array.isArray(v)
              ? (v as string[]).length > 0
              : typeof v === "object"
                ? Object.keys(v as object).length > 0
                : true),
        )
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
      const neuroLines = Object.entries(neurologicalExam)
        .filter(
          ([, v]) =>
            v &&
            (Array.isArray(v)
              ? (v as string[]).length > 0
              : typeof v === "object"
                ? Object.keys(v as object).length > 0
                : true),
        )
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
      const giLines = Object.entries(gastrointestinalExam)
        .filter(
          ([, v]) =>
            v && (Array.isArray(v) ? (v as string[]).length > 0 : true),
        )
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
      const mskLines = Object.entries(musculoskeletalExam)
        .filter(
          ([, v]) =>
            v &&
            (Array.isArray(v)
              ? (v as string[]).length > 0
              : typeof v === "object"
                ? Object.keys(v as object).length > 0
                : true),
        )
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
      const parts = [
        genExamLines.length > 0 &&
          `General Examination:\n${genExamLines.join("\n")}`,
        sysExamLines.length > 0 &&
          `Systemic Examination:\n${sysExamLines.join("\n")}`,
        respLines.length > 0 && `Respiratory Exam:\n${respLines.join("\n")}`,
        neuroLines.length > 0 && `Neurological Exam:\n${neuroLines.join("\n")}`,
        giLines.length > 0 && `Gastrointestinal Exam:\n${giLines.join("\n")}`,
        mskLines.length > 0 && `Musculoskeletal Exam:\n${mskLines.join("\n")}`,
      ].filter(Boolean);
      physicalExamination = parts.length > 0 ? parts.join("\n\n") : null;
    }

    // Build vitalSigns
    const vs = formData.vital_signs;
    const toStr = (v: string | number | undefined) =>
      v !== undefined && v !== "" ? String(v) : undefined;

    const vitalSigns = {
      bloodPressure: vs?.blood_pressure?.trim() || undefined,
      pulse: toStr(vs?.pulse),
      temperature: toStr(vs?.temperature),
      respiratoryRate: toStr(vs?.respiratory_rate),
      oxygenSaturation: toStr(vs?.oxygen_saturation),
    };

    // Build notes
    const notesParts = [
      formData.brief_summary,
      formData.full_evaluation,
      formData.analysis,
      Array.isArray(formData.investigation_profile) &&
      formData.investigation_profile.length > 0
        ? formData.investigation_profile
            .map((inv) => `${inv.name}: ${inv.result} ${inv.unit}`.trim())
            .join("\n")
        : undefined,
      formData.notes,
    ].filter(Boolean);
    const notes = notesParts.length > 0 ? notesParts.join("\n\n") : null;

    const chiefComplaint =
      selectedComplaints.length > 0
        ? selectedComplaints.join(", ")
        : formData.chief_complaint?.trim() || "";

    const visitDate =
      BigInt(new Date(formData.visit_date || nowDateTimeLocal()).getTime()) *
      1000000n;

    onSubmit({
      patientId,
      visitDate,
      chiefComplaint,
      historyOfPresentIllness,
      vitalSigns,
      physicalExamination,
      diagnosis: formData.diagnosis?.trim() || null,
      notes,
      visitType,
    });
  };

  const generateSalientFeatures = (): string => {
    // Patient info
    const title = patient?.gender?.toLowerCase() === "female" ? "Mrs/Ms" : "Mr";
    const name = patient?.fullName || "...";
    let age = "...";
    if (patient?.dateOfBirth) {
      const ms = Number(patient.dateOfBirth) / 1_000_000;
      age = String(Math.floor((Date.now() - ms) / (365.25 * 24 * 3600 * 1000)));
    }
    const occupation = personalHistoryAnswers[3]?.trim() || "...";
    const address = patient?.address?.trim() || "...";
    const htn = medicalHistory.HTN === "+" ? "hypertensive" : "normotensive";
    const dm = medicalHistory.DM === "+" ? "diabetic" : "nondiabetic";

    // Chief complaints
    const complaints =
      selectedComplaints.length > 0
        ? selectedComplaints.join(", ")
        : formData.chief_complaint?.trim() || "...";

    // Personal history - smoking
    const smokingStatus = personalHistoryAnswers[0]?.trim();
    const smokingLine =
      smokingStatus && smokingStatus !== "Non-smoker"
        ? `He/She is a ${smokingStatus.toLowerCase()}.`
        : "";

    // Family history - non-"No" entries
    const familyLines = familyHistoryAnswers
      .map((ans, i) =>
        ans && ans !== "No"
          ? `${familyHistoryQuestions[i].q.split("/")[0].trim()}: ${ans}`
          : "",
      )
      .filter(Boolean);
    const familyLine =
      familyLines.length > 0
        ? `On query, family history reveals ${familyLines.join("; ")}.`
        : "";

    // Drug history
    const drugs = (formData.drug_history || []).filter((d) =>
      d.drug_name?.trim(),
    );
    const drugLine =
      drugs.length > 0
        ? `He/She uses ${drugs.map((d) => d.drug_name.trim()).join(", ")}.`
        : "";

    // General examination
    const genExamParts = Object.entries(generalExamFindings)
      .filter(([k, v]) => v && !k.endsWith("_note"))
      .map(([k, v]) => `${k}: ${v}`);
    const genExamLine =
      genExamParts.length > 0
        ? `On general examination: ${genExamParts.join(", ")}.`
        : "On general examination: within normal limits.";

    // Systemic examination summary
    const flattenExam = (
      exam: Record<string, unknown>,
      label: string,
    ): string => {
      const parts: string[] = [];
      for (const [, v] of Object.entries(exam)) {
        if (!v) continue;
        if (Array.isArray(v) && v.length > 0) parts.push(...v.map(String));
        else if (typeof v === "object" && v !== null) {
          const sub = Object.values(v as Record<string, unknown>)
            .filter(Boolean)
            .map(String);
          parts.push(...sub);
        } else if (typeof v === "string" && v.trim()) parts.push(v);
      }
      return parts.length > 0
        ? `${label}: ${parts.slice(0, 4).join(", ")}.`
        : "";
    };

    const respLine = flattenExam(respiratoryExam, "Respiratory system");
    const neuroLine = flattenExam(neurologicalExam, "Neurological system");
    const giLine = flattenExam(gastrointestinalExam, "Gastrointestinal system");
    const mskLine = flattenExam(musculoskeletalExam, "Musculoskeletal system");
    const systemicLines = [respLine, neuroLine, giLine, mskLine].filter(
      Boolean,
    );
    const systemicLine =
      systemicLines.length > 0
        ? `On systemic examination: ${systemicLines.join(" ")}`
        : "";

    const parts = [
      `${title} ${name}, ${age} years old, ${occupation}, ${htn}, ${dm}, hailing from ${address}, presented with ${complaints}.`,
      smokingLine,
      familyLine,
      drugLine,
      genExamLine,
      systemicLine,
    ].filter(Boolean);

    return `Salient Features\n\n${parts.join(" ")}`;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const drugHistory = formData.drug_history || [
    { drug_name: "", dose: "", daily_dose: "" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Visit Type */}
      <div className="space-y-3">
        <Label>Visit Type *</Label>
        <div className="grid grid-cols-2 gap-4">
          <Card
            className={`cursor-pointer transition-all ${
              visitType === "outdoor"
                ? "border-teal-500 bg-teal-50 shadow-md"
                : "border-slate-200 hover:border-slate-300"
            }`}
            onClick={() => setVisitType("outdoor")}
            data-ocid="visit_form.toggle"
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">🚶</div>
              <h4 className="font-semibold text-slate-800">Outdoor Patient</h4>
              <p className="text-xs text-slate-500 mt-1">Outpatient care</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all ${
              visitType === "admitted"
                ? "border-teal-500 bg-teal-50 shadow-md"
                : "border-slate-200 hover:border-slate-300"
            }`}
            onClick={() => setVisitType("admitted")}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">🏥</div>
              <h4 className="font-semibold text-slate-800">Admitted Patient</h4>
              <p className="text-xs text-slate-500 mt-1">Inpatient care</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Visit Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="visit_date">Visit Date &amp; Time *</Label>
          <Input
            id="visit_date"
            type="datetime-local"
            value={formData.visit_date || ""}
            onChange={(e) => handleChange("visit_date", e.target.value)}
            required
            className="h-11"
            data-ocid="visit_form.input"
          />
        </div>
      </div>

      {/* Chief Complaints */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Chief Complaints *</Label>
          <span className="text-xs text-slate-500">
            Select one or more complaints
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.keys(allComplaints).map((complaint) => (
            <Badge
              key={complaint}
              variant={
                selectedComplaints.includes(complaint) ? "default" : "outline"
              }
              className={`cursor-pointer hover:bg-teal-50 ${
                selectedComplaints.includes(complaint)
                  ? "bg-teal-600 hover:bg-teal-700"
                  : ""
              }`}
              onClick={() => handleTemplateSelect(complaint)}
            >
              {complaint}
              {selectedComplaints.includes(complaint) && (
                <X className="h-3 w-3 ml-1" />
              )}
            </Badge>
          ))}
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-slate-100 border-dashed"
            onClick={() => setShowAddDialog(true)}
            data-ocid="visit_form.open_modal_button"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Custom
          </Badge>
        </div>

        {selectedComplaints.length > 0 && (
          <Input
            value={selectedComplaints
              .map((c, idx) => `${idx + 1}. ${c}`)
              .join(", ")}
            readOnly
            className="bg-slate-50 h-11"
            placeholder="Selected complaints"
          />
        )}
      </div>

      {/* Complaint Question Steppers */}
      {selectedComplaints.length > 0 && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border-l-4 border-teal-500 p-4 rounded-lg">
            <p className="text-sm font-medium text-teal-900">
              📋 Please answer the following questions for each selected
              complaint
            </p>
          </div>
          {selectedComplaints.map((complaint) => (
            <Card
              key={complaint}
              className="border-2 border-teal-200 shadow-md bg-gradient-to-br from-white to-blue-50/30"
            >
              <CardHeader className="pb-4 bg-gradient-to-r from-teal-500 to-blue-500 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                    <HelpCircle className="h-5 w-5" />
                    {complaint}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddQuestionToComplaint(complaint)}
                    className="h-8 text-white hover:bg-white/20"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Question
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <QuestionStepper
                  questions={getComplaintQuestions(complaint)}
                  answers={complaintAnswers[complaint] || []}
                  onChange={(idx, value) =>
                    handleAnswerChange(complaint, idx, value)
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Custom Complaint Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg" data-ocid="visit_form.dialog">
          <DialogHeader>
            <DialogTitle>Add Custom Chief Complaint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_complaint">Complaint Name *</Label>
              <Input
                id="new_complaint"
                value={newComplaint}
                onChange={(e) => setNewComplaint(e.target.value)}
                placeholder="e.g., Joint Pain"
                className="h-11"
                data-ocid="visit_form.input"
              />
            </div>
            <div className="space-y-3">
              <Label>Questions to Ask (at least 1 required)</Label>
              {newQuestions.map((item, idx) => (
                <div
                  key={String(idx)}
                  className="space-y-2 p-3 border rounded-lg bg-slate-50"
                >
                  <Input
                    value={item.q}
                    onChange={(e) =>
                      handleQuestionChange(idx, "question", e.target.value)
                    }
                    placeholder={`Question ${idx + 1}`}
                    className="h-10 bg-white"
                  />
                  <Input
                    value={item.options.join(", ")}
                    onChange={(e) =>
                      handleQuestionChange(idx, "options", e.target.value)
                    }
                    placeholder="Options (comma separated, optional)"
                    className="h-10 bg-white text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewComplaint("");
                  setNewQuestions([
                    { q: "", options: [] },
                    { q: "", options: [] },
                    { q: "", options: [] },
                    { q: "", options: [] },
                  ]);
                }}
                data-ocid="visit_form.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddComplaint}
                className="bg-teal-600 hover:bg-teal-700"
                data-ocid="visit_form.confirm_button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Complaint
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Outdoor-only sections */}
      {visitType === "outdoor" && (
        <>
          {/* System Review */}
          <Card className="border-slate-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  System Review
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const systemName = window.prompt("Enter new system name:");
                    if (systemName?.trim()) {
                      setCustomSystems((prev) => ({
                        ...prev,
                        [systemName.trim()]: [],
                      }));
                    }
                  }}
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add System
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries({ ...systemReviewData, ...customSystems }).map(
                ([system, symptoms]) => (
                  <div key={system} className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      {system}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {symptoms.map((symptom) => (
                        <Badge
                          key={symptom}
                          variant={
                            systemReviewAnswers[system]?.includes(symptom)
                              ? "default"
                              : "outline"
                          }
                          className={`cursor-pointer ${
                            systemReviewAnswers[system]?.includes(symptom)
                              ? "bg-teal-600"
                              : ""
                          }`}
                          onClick={() => toggleSystemReview(system, symptom)}
                        >
                          {symptom}
                        </Badge>
                      ))}
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-slate-100 border-dashed"
                        onClick={() => {
                          const symptom = window.prompt(
                            `Add symptom to ${system}:`,
                          );
                          if (symptom?.trim()) {
                            if (customSystems[system]) {
                              setCustomSystems((prev) => ({
                                ...prev,
                                [system]: [...prev[system], symptom.trim()],
                              }));
                            } else {
                              setCustomSystems((prev) => ({
                                ...prev,
                                [system]: [
                                  ...(systemReviewData[system] || []),
                                  symptom.trim(),
                                ],
                              }));
                            }
                          }
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Badge>
                    </div>
                  </div>
                ),
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card className="border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Past Medical History */}
              <div className="space-y-3">
                <Label>Past Medical History</Label>
                <div className="flex flex-wrap gap-2">
                  {medicalHistoryOptions.map((condition) => (
                    <Badge
                      key={condition}
                      variant="outline"
                      className={`cursor-pointer ${
                        medicalHistory[condition] === "+"
                          ? "bg-green-50 border-green-500 text-green-700"
                          : medicalHistory[condition] === "-"
                            ? "bg-red-50 border-red-500 text-red-700"
                            : ""
                      }`}
                      onClick={() => toggleMedicalHistory(condition)}
                    >
                      {condition}
                      {medicalHistory[condition] || ""}
                    </Badge>
                  ))}
                </div>
                <Input
                  value={(formData as any).other_medical_history || ""}
                  onChange={(e) =>
                    handleChange(
                      "other_medical_history" as keyof VisitFormData,
                      e.target.value,
                    )
                  }
                  placeholder="Other chronic disease / অন্যান্য দীর্ঘমেয়াদী রোগ..."
                  className="h-10 text-sm"
                />
              </div>

              {/* History sections helper */}
              {(
                [
                  {
                    key: "surgical",
                    label: "Past Surgical History / অতীতের অস্ত্রোপচারের ইতিহাস",
                    show: showSurgicalQuestions,
                    setShow: setShowSurgicalQuestions,
                    questions: surgicalHistoryQuestions,
                    answers: surgicalHistoryAnswers,
                    setAnswers: setSurgicalHistoryAnswers,
                  },
                  {
                    key: "personal",
                    label: "Personal History / ব্যক্তিগত ইতিহাস",
                    show: showPersonalQuestions,
                    setShow: setShowPersonalQuestions,
                    questions: personalHistoryQuestions,
                    answers: personalHistoryAnswers,
                    setAnswers: setPersonalHistoryAnswers,
                  },
                  {
                    key: "family",
                    label: "Family History / পারিবারিক ইতিহাস",
                    show: showFamilyQuestions,
                    setShow: setShowFamilyQuestions,
                    questions: familyHistoryQuestions,
                    answers: familyHistoryAnswers,
                    setAnswers: setFamilyHistoryAnswers,
                  },
                  {
                    key: "immunization",
                    label: "Immunization History / টিকার ইতিহাস",
                    show: showImmunizationQuestions,
                    setShow: setShowImmunizationQuestions,
                    questions: immunizationQuestions,
                    answers: immunizationAnswers,
                    setAnswers: setImmunizationAnswers,
                  },
                  {
                    key: "allergy",
                    label: "Allergy History / এলার্জির ইতিহাস",
                    show: showAllergyQuestions,
                    setShow: setShowAllergyQuestions,
                    questions: allergyQuestions,
                    answers: allergyAnswers,
                    setAnswers: setAllergyAnswers,
                  },
                  {
                    key: "obstetric",
                    label: "Obstetric History / প্রসূতি ইতিহাস",
                    show: showObstetricQuestions,
                    setShow: setShowObstetricQuestions,
                    questions: obstetricQuestions,
                    answers: obstetricAnswers,
                    setAnswers: setObstetricAnswers,
                  },
                  {
                    key: "gynaecological",
                    label: "Gynaecological History / স্ত্রীরোগ বিষয়ক ইতিহাস",
                    show: showGynaecologicalQuestions,
                    setShow: setShowGynaecologicalQuestions,
                    questions: gynaecologicalQuestions,
                    answers: gynaecologicalAnswers,
                    setAnswers: setGynaecologicalAnswers,
                  },
                ] as {
                  key: string;
                  label: string;
                  show: boolean;
                  setShow: (v: boolean) => void;
                  questions: { q: string; options: string[] }[];
                  answers: string[];
                  setAnswers: (v: string[]) => void;
                }[]
              ).map(
                ({
                  key,
                  label,
                  show,
                  setShow,
                  questions,
                  answers,
                  setAnswers,
                }) => (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>{label}</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShow(!show)}
                        className="h-8"
                      >
                        {show ? "Hide" : "Answer"} Questions
                      </Button>
                    </div>
                    {show && (
                      <>
                        <QuestionStepper
                          questions={questions}
                          answers={answers}
                          onChange={(idx, value) => {
                            const a = [...answers];
                            a[idx] = value;
                            setAnswers(a);
                          }}
                        />
                        {(extraHistoryQuestions[key] || []).map(
                          (item, eIdx) => (
                            <div
                              key={`ex-${key}-${item.q}-${eIdx}`}
                              className="space-y-2"
                            >
                              <Label className="text-sm font-medium text-blue-700">
                                {item.q}
                              </Label>
                              <Input
                                value={extraHistoryAnswers[key]?.[eIdx] || ""}
                                onChange={(e) => {
                                  const arr = [
                                    ...(extraHistoryAnswers[key] || []),
                                  ];
                                  arr[eIdx] = e.target.value;
                                  setExtraHistoryAnswers((prev) => ({
                                    ...prev,
                                    [key]: arr,
                                  }));
                                }}
                                placeholder="Type answer..."
                                className="h-10 bg-blue-50"
                              />
                            </div>
                          ),
                        )}
                        <div className="flex gap-2 pt-2 border-t border-dashed border-slate-200 mt-2">
                          <Input
                            value={newHistoryQuestionText[key] || ""}
                            onChange={(e) =>
                              setNewHistoryQuestionText((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder="Add a question..."
                            className="h-9 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addHistoryQuestion(key);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addHistoryQuestion(key)}
                            className="h-9 px-3 shrink-0"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ),
              )}

              {/* Drug History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Drug History</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDrugHistory}
                    className="h-8"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Drug
                  </Button>
                </div>
                {drugHistory.map((drug, index) => (
                  <Card
                    key={drug.drug_name || String(index)}
                    className="bg-slate-50 border-slate-200 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          value={drug.drug_name}
                          onChange={(e) =>
                            handleDrugHistoryChange(
                              index,
                              "drug_name",
                              e.target.value,
                            )
                          }
                          placeholder="Drug name"
                          className="h-9 bg-white"
                        />
                        <Input
                          value={drug.dose}
                          onChange={(e) =>
                            handleDrugHistoryChange(
                              index,
                              "dose",
                              e.target.value,
                            )
                          }
                          placeholder="Dose"
                          className="h-9 bg-white"
                        />
                        <Input
                          value={drug.daily_dose}
                          onChange={(e) =>
                            handleDrugHistoryChange(
                              index,
                              "daily_dose",
                              e.target.value,
                            )
                          }
                          placeholder="Daily dose"
                          className="h-9 bg-white"
                        />
                      </div>
                      {drugHistory.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDrugHistory(index)}
                          className="h-9 w-9 text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Other History */}
              <div className="space-y-2">
                <Label htmlFor="other_history">Other History</Label>
                <Textarea
                  id="other_history"
                  value={formData.other_history || ""}
                  onChange={(e) =>
                    handleChange("other_history", e.target.value)
                  }
                  placeholder="Other relevant history..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Admitted HPI */}
      {visitType === "admitted" && (
        <div className="space-y-2">
          <Label htmlFor="history_of_present_illness">
            History of Present Illness
          </Label>
          <Textarea
            id="history_of_present_illness"
            value={formData.history_of_present_illness || ""}
            onChange={(e) =>
              handleChange("history_of_present_illness", e.target.value)
            }
            placeholder="Detailed history of the current illness..."
            rows={6}
          />
        </div>
      )}

      {/* Vital Signs */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-600" />
            Vital Signs
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-slate-500 flex items-center gap-1">
              <Heart className="h-3 w-3" /> Blood Pressure
            </Label>
            <Input
              type="text"
              value={formData.vital_signs?.blood_pressure || ""}
              onChange={(e) =>
                handleChange("vital_signs", {
                  ...formData.vital_signs,
                  blood_pressure: e.target.value,
                })
              }
              placeholder="120/80 mmHg"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-500">Pulse (bpm)</Label>
            <Input
              type="number"
              value={formData.vital_signs?.pulse || ""}
              onChange={(e) => handleVitalChange("pulse", e.target.value)}
              placeholder="72"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-500 flex items-center gap-1">
              <Heart className="h-3 w-3" /> Heart Rate (bpm)
            </Label>
            <Input
              type="number"
              value={formData.vital_signs?.heart_rate || ""}
              onChange={(e) => handleVitalChange("heart_rate", e.target.value)}
              placeholder="72"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-500 flex items-center gap-1">
              <Thermometer className="h-3 w-3" /> Temp (°F)
            </Label>
            <Input
              type="number"
              step="0.1"
              value={formData.vital_signs?.temperature || ""}
              onChange={(e) => handleVitalChange("temperature", e.target.value)}
              placeholder="98.6"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-500 flex items-center gap-1">
              <Wind className="h-3 w-3" /> Resp Rate (/min)
            </Label>
            <Input
              type="number"
              value={formData.vital_signs?.respiratory_rate || ""}
              onChange={(e) =>
                handleVitalChange("respiratory_rate", e.target.value)
              }
              placeholder="16"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-500">SpO2 (%)</Label>
            <Input
              type="number"
              value={formData.vital_signs?.oxygen_saturation || ""}
              onChange={(e) =>
                handleVitalChange("oxygen_saturation", e.target.value)
              }
              placeholder="98"
              className="h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* General Examination */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">
            General Examination / সাধারণ পরীক্ষা
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(generalExaminationCategories).map(
            ([category, options]) => (
              <div key={category} className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  {category}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {options.map((option) => (
                    <Badge
                      key={option}
                      variant={
                        generalExamFindings[category] === option
                          ? "default"
                          : "outline"
                      }
                      className={`cursor-pointer ${
                        generalExamFindings[category] === option
                          ? "bg-teal-600"
                          : ""
                      }`}
                      onClick={() => toggleGeneralExam(category, option)}
                    >
                      {option}
                    </Badge>
                  ))}
                </div>
                <Input
                  value={generalExamFindings[`${category}_note`] || ""}
                  onChange={(e) =>
                    setGeneralExamFindings((prev) => ({
                      ...prev,
                      [`${category}_note`]: e.target.value,
                    }))
                  }
                  placeholder={`Add note for ${category}...`}
                  className="h-9 text-sm bg-slate-50"
                />
              </div>
            ),
          )}
        </CardContent>
      </Card>

      {/* Systemic Examination */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">
            Systemic Examination / পদ্ধতিগত পরীক্ষা
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="respiratory">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger
                value="respiratory"
                data-ocid="systemic.respiratory.tab"
              >
                Respiratory
              </TabsTrigger>
              <TabsTrigger
                value="neurological"
                data-ocid="systemic.neurological.tab"
              >
                Neurological
              </TabsTrigger>
              <TabsTrigger
                value="gastrointestinal"
                data-ocid="systemic.gastrointestinal.tab"
              >
                GI
              </TabsTrigger>
              <TabsTrigger
                value="musculoskeletal"
                data-ocid="systemic.musculoskeletal.tab"
              >
                MSK
              </TabsTrigger>
            </TabsList>
            <TabsContent value="respiratory">
              <RespiratoryExam
                data={respiratoryExam}
                onChange={setRespiratoryExam}
              />
            </TabsContent>
            <TabsContent value="neurological">
              <NeurologicalExam
                data={neurologicalExam}
                onChange={setNeurologicalExam}
              />
            </TabsContent>
            <TabsContent value="gastrointestinal">
              <GastrointestinalExam
                data={gastrointestinalExam}
                onChange={setGastrointestinalExam}
              />
            </TabsContent>
            <TabsContent value="musculoskeletal">
              <MusculoskeletalExam
                data={musculoskeletalExam}
                onChange={setMusculoskeletalExam}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Salient Features */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center justify-between">
            <span>Salient Features / বিশেষ বৈশিষ্ট্য</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const generated = generateSalientFeatures();
                handleChange("salient_features", generated);
              }}
              className="flex items-center gap-2 text-teal-700 border-teal-300 hover:bg-teal-50"
              data-ocid="salient_features.button"
            >
              <Sparkles className="h-4 w-4" />
              Auto-Generate
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.salient_features || ""}
            onChange={(e) => handleChange("salient_features", e.target.value)}
            placeholder="Click 'Auto-Generate' to build the salient features from form data, or type manually..."
            rows={12}
            className="bg-slate-50 font-mono text-sm leading-relaxed"
            data-ocid="salient_features.textarea"
          />
          <p className="text-xs text-slate-400 mt-2">
            Auto-generated from entered data. You can edit the text freely.
          </p>
        </CardContent>
      </Card>

      {/* Outdoor extra sections */}
      {visitType === "outdoor" && (
        <>
          <Card className="border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">
                Investigation Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InvestigationProfile
                data={
                  Array.isArray(formData.investigation_profile)
                    ? formData.investigation_profile
                    : []
                }
                onChange={(data) => handleChange("investigation_profile", data)}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                Brief Summary / সংক্ষিপ্ত সারসংক্ষেপ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">
                  Patient Detail &amp; History / রোগীর বিবরণ ও ইতিহাস
                </Label>
                <Textarea
                  value={formData.brief_summary_history || ""}
                  onChange={(e) =>
                    handleChange("brief_summary_history", e.target.value)
                  }
                  placeholder="Summarise patient background, presenting complaint and relevant history..."
                  rows={3}
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">
                  Examination Findings / পরীক্ষার ফলাফল
                </Label>
                <Textarea
                  value={formData.brief_summary_examination || ""}
                  onChange={(e) =>
                    handleChange("brief_summary_examination", e.target.value)
                  }
                  placeholder="Summarise general and systemic examination findings..."
                  rows={3}
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">
                  Investigation Findings / তদন্তের ফলাফল
                </Label>
                <Textarea
                  value={formData.brief_summary_investigation || ""}
                  onChange={(e) =>
                    handleChange("brief_summary_investigation", e.target.value)
                  }
                  placeholder="Summarise key investigation results..."
                  rows={3}
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">
                  Overall Brief Summary / সামগ্রিক সারসংক্ষেপ
                </Label>
                <Textarea
                  value={formData.brief_summary || ""}
                  onChange={(e) =>
                    handleChange("brief_summary", e.target.value)
                  }
                  placeholder="Overall brief summary of the visit..."
                  rows={3}
                  className="bg-slate-50"
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="full_evaluation">Full Evaluation</Label>
            <Textarea
              id="full_evaluation"
              value={formData.full_evaluation || ""}
              onChange={(e) => handleChange("full_evaluation", e.target.value)}
              placeholder="Full evaluation..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="analysis">Analysis</Label>
            <Textarea
              id="analysis"
              value={formData.analysis || ""}
              onChange={(e) => handleChange("analysis", e.target.value)}
              placeholder="Analysis and assessment..."
              rows={4}
            />
          </div>
        </>
      )}

      {/* Diagnosis */}
      <div className="space-y-2">
        <Label htmlFor="diagnosis">Diagnosis</Label>
        <Textarea
          id="diagnosis"
          value={formData.diagnosis || ""}
          onChange={(e) => handleChange("diagnosis", e.target.value)}
          placeholder="Diagnosis..."
          rows={2}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ""}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Any additional notes..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-11 px-6"
          data-ocid="visit_form.cancel_button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 px-6 bg-teal-600 hover:bg-teal-700"
          data-ocid="visit_form.submit_button"
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {visit ? "Update Visit" : "Save Visit"}
        </Button>
      </div>
    </form>
  );
}
