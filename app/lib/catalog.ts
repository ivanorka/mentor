export const EDUCATION_LEVELS = [
  {
    id: "osnovna-skola",
    label: "Osnovna škola",
    shortLabel: "Osnovna",
    description: "Od 1. do 8. razreda",
  },
  {
    id: "srednja-skola",
    label: "Srednja škola",
    shortLabel: "Srednja",
    description: "Gimnazijski i strukovni programi",
  },
  {
    id: "matura",
    label: "Matura",
    shortLabel: "Matura",
    description: "A i B razina državne mature",
  },
  {
    id: "fakultet",
    label: "Fakultet",
    shortLabel: "Fakultet",
    description: "Preddiplomski i diplomski kolegiji",
  },
  {
    id: "odrasli",
    label: "Odrasli",
    shortLabel: "Odrasli",
    description: "Cjeloživotno i profesionalno učenje",
  },
] as const;

export type EducationLevelId = (typeof EDUCATION_LEVELS)[number]["id"];
export type EducationLevelLabel = (typeof EDUCATION_LEVELS)[number]["label"];

export const DEFAULT_EDUCATION_LEVEL_ID: EducationLevelId = "srednja-skola";

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLocaleLowerCase("hr-HR");

export function educationLevel(value?: string | null) {
  if (!value) return undefined;
  const normalized = normalize(value);
  return EDUCATION_LEVELS.find((item) => (
    normalize(item.id) === normalized
    || normalize(item.label) === normalized
    || normalize(item.shortLabel) === normalized
  ));
}

export function educationLevelLabel(id: EducationLevelId): EducationLevelLabel {
  return EDUCATION_LEVELS.find((item) => item.id === id)?.label ?? "Srednja škola";
}

export type SubjectIcon = "sigma" | "atom" | "flask" | "leaf" | "language" | "code" | "history" | "globe" | "economy" | "book";

export type CatalogSubject = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  levelIds: readonly EducationLevelId[];
  tutorCount: number;
  icon: SubjectIcon;
  aliases?: readonly string[];
};

export const SUBJECT_CATALOG: readonly CatalogSubject[] = [
  {
    id: "subject-math",
    slug: "matematika",
    name: "Matematika",
    category: "STEM",
    description: "Od sigurnih osnova do državne mature, statistike i fakultetske analize.",
    levelIds: ["osnovna-skola", "srednja-skola", "matura", "fakultet"],
    tutorCount: 4,
    icon: "sigma",
  },
  {
    id: "subject-physics",
    slug: "fizika",
    name: "Fizika",
    category: "STEM",
    description: "Mehanika, elektromagnetizam, valovi i moderna fizika kroz stvarne primjere.",
    levelIds: ["osnovna-skola", "srednja-skola", "matura", "fakultet"],
    tutorCount: 3,
    icon: "atom",
  },
  {
    id: "subject-chemistry",
    slug: "kemija",
    name: "Kemija",
    category: "STEM",
    description: "Opća, organska i analitička kemija objašnjena jasnim mentalnim modelima.",
    levelIds: ["osnovna-skola", "srednja-skola", "matura", "fakultet"],
    tutorCount: 1,
    icon: "flask",
  },
  {
    id: "subject-biology",
    slug: "biologija",
    name: "Biologija",
    category: "Prirodne znanosti",
    description: "Stanica, genetika, anatomija i ekologija povezani u razumljivu cjelinu.",
    levelIds: ["osnovna-skola", "srednja-skola", "matura"],
    tutorCount: 2,
    icon: "leaf",
  },
  {
    id: "subject-croatian",
    slug: "hrvatski-jezik",
    name: "Hrvatski jezik",
    category: "Jezici",
    description: "Gramatika, književnost, interpretacijski esej i priprema za državnu maturu.",
    levelIds: ["osnovna-skola", "srednja-skola", "matura"],
    tutorCount: 2,
    icon: "book",
  },
  {
    id: "subject-english",
    slug: "engleski-jezik",
    name: "Engleski jezik",
    category: "Jezici",
    description: "Školsko gradivo, matura, konverzacija i poslovni engleski.",
    levelIds: ["osnovna-skola", "srednja-skola", "matura", "odrasli"],
    tutorCount: 2,
    icon: "language",
    aliases: ["Engleski"],
  },
  {
    id: "subject-german",
    slug: "njemacki-jezik",
    name: "Njemački jezik",
    category: "Jezici",
    description: "Gramatika, samouvjeren razgovor i priprema za međunarodne certifikate.",
    levelIds: ["osnovna-skola", "srednja-skola", "odrasli"],
    tutorCount: 1,
    icon: "language",
    aliases: ["Njemački"],
  },
  {
    id: "subject-french",
    slug: "francuski-jezik",
    name: "Francuski jezik",
    category: "Jezici",
    description: "Školsko gradivo, konverzacija i priprema za DELF i DALF certifikate.",
    levelIds: ["osnovna-skola", "srednja-skola", "matura", "odrasli"],
    tutorCount: 1,
    icon: "language",
    aliases: ["Francuski"],
  },
  {
    id: "subject-italian",
    slug: "talijanski-jezik",
    name: "Talijanski jezik",
    category: "Jezici",
    description: "Gramatika i razgovor za školu, putovanja, studij i profesionalne situacije.",
    levelIds: ["osnovna-skola", "srednja-skola", "matura", "odrasli"],
    tutorCount: 1,
    icon: "language",
    aliases: ["Talijanski"],
  },
  {
    id: "subject-spanish",
    slug: "spanjolski-jezik",
    name: "Španjolski jezik",
    category: "Jezici",
    description: "Od prvih rečenica do tečnog razgovora i pripreme za DELE certifikat.",
    levelIds: ["osnovna-skola", "srednja-skola", "matura", "odrasli"],
    tutorCount: 1,
    icon: "language",
    aliases: ["Španjolski"],
  },
  {
    id: "subject-informatics",
    slug: "informatika",
    name: "Informatika",
    category: "Tehnologija",
    description: "Programiranje, algoritmi, baze podataka i digitalna pismenost kroz projekte.",
    levelIds: ["osnovna-skola", "srednja-skola", "fakultet"],
    tutorCount: 3,
    icon: "code",
  },
  {
    id: "subject-programming",
    slug: "programiranje",
    name: "Programiranje",
    category: "Tehnologija",
    description: "Python, JavaScript, algoritmi i izrada projekata uz mentorski code review.",
    levelIds: ["osnovna-skola", "srednja-skola", "fakultet", "odrasli"],
    tutorCount: 1,
    icon: "code",
  },
  {
    id: "subject-history",
    slug: "povijest",
    name: "Povijest",
    category: "Društvene znanosti",
    description: "Povijesni procesi, izvori, uzroci i posljedice bez učenja napamet.",
    levelIds: ["osnovna-skola", "srednja-skola", "matura"],
    tutorCount: 1,
    icon: "history",
  },
  {
    id: "subject-geography",
    slug: "geografija",
    name: "Geografija",
    category: "Društvene znanosti",
    description: "Prostorni procesi, karte, društvena geografija i priprema za ispite.",
    levelIds: ["osnovna-skola", "srednja-skola", "matura"],
    tutorCount: 1,
    icon: "globe",
  },
  {
    id: "subject-economics",
    slug: "ekonomija",
    name: "Ekonomija",
    category: "Društvene znanosti",
    description: "Mikroekonomija, makroekonomija, računovodstvo i poslovna statistika.",
    levelIds: ["srednja-skola", "fakultet", "odrasli"],
    tutorCount: 2,
    icon: "economy",
  },
  {
    id: "subject-statistics",
    slug: "statistika",
    name: "Statistika",
    category: "STEM",
    description: "Vjerojatnost, deskriptivna statistika i analiza podataka kroz praktične primjere.",
    levelIds: ["srednja-skola", "matura", "fakultet", "odrasli"],
    tutorCount: 1,
    icon: "sigma",
  },
  {
    id: "subject-accounting",
    slug: "racunovodstvo",
    name: "Računovodstvo",
    category: "Ekonomija i poslovanje",
    description: "Bilanca, knjiženja, financijski izvještaji i priprema za stručne ispite.",
    levelIds: ["srednja-skola", "fakultet", "odrasli"],
    tutorCount: 1,
    icon: "economy",
  },
  {
    id: "subject-philosophy",
    slug: "filozofija-i-logika",
    name: "Filozofija i logika",
    category: "Društvene znanosti",
    description: "Argumentacija, formalna logika i povijest filozofije za školu, maturu i studij.",
    levelIds: ["srednja-skola", "matura", "fakultet", "odrasli"],
    tutorCount: 1,
    icon: "book",
  },
  {
    id: "subject-psychology",
    slug: "psihologija",
    name: "Psihologija",
    category: "Društvene znanosti",
    description: "Temeljni koncepti, istraživačke metode i priprema ispita kroz studije slučaja.",
    levelIds: ["srednja-skola", "matura", "fakultet", "odrasli"],
    tutorCount: 1,
    icon: "book",
  },
  {
    id: "subject-latin",
    slug: "latinski-jezik",
    name: "Latinski jezik",
    category: "Jezici",
    description: "Gramatika, prijevod, antička kultura i medicinska terminologija.",
    levelIds: ["srednja-skola", "fakultet"],
    tutorCount: 1,
    icon: "book",
  },
] as const;

export type SubjectSlug = (typeof SUBJECT_CATALOG)[number]["slug"];

export function catalogSubject(value?: string | null) {
  if (!value) return undefined;
  const normalized = normalize(value);
  return SUBJECT_CATALOG.find((item) => (
    normalize(item.id) === normalized
    || normalize(item.slug) === normalized
    || normalize(item.name) === normalized
    || item.aliases?.some((alias) => normalize(alias) === normalized)
  ));
}
