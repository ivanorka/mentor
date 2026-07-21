import { educationLevelLabel, type EducationLevelId } from "./lib/catalog";

export type TutorOffering = {
  subjectId: string;
  subjectSlug: string;
  subject: string;
  price: number;
  levels: EducationLevelId[];
};

export type Tutor = {
  slug: string;
  name: string;
  initials: string;
  role: string;
  subjects: string[];
  rating: number;
  reviews: number;
  lessons: number;
  students: number;
  repeatRate: number;
  response: string;
  price: number;
  level: string;
  accent: string;
  quote: string;
  nextSlot: string;
  verified: boolean;
  elite?: boolean;
  levels: EducationLevelId[];
  offerings: TutorOffering[];
  matchStyles?: string[];
  matchGoals?: string[];
  matchScore?: number;
  matchReasons?: string[];
  rankingScore?: number;
  video?: boolean;
  nextAvailable?: string;
};

type TutorSeed = {
  slug: string;
  name: string;
  role: string;
  quote: string;
  offerings: TutorOffering[];
  rating: number;
  reviews: number;
  lessons: number;
  students: number;
  repeatRate: number;
  responseMinutes: number;
  accent: string;
  elite?: boolean;
  video?: boolean;
  matchStyles?: string[];
  matchGoals?: string[];
};

function tutorFromSeed(seed: TutorSeed): Tutor {
  const levels = [...new Set(seed.offerings.flatMap((offering) => offering.levels))];
  return {
    slug: seed.slug,
    name: seed.name,
    initials: seed.name.split(" ").map((part) => part[0]).join("").slice(0, 2),
    role: seed.role,
    subjects: seed.offerings.map((offering) => offering.subject),
    rating: seed.rating,
    reviews: seed.reviews,
    lessons: seed.lessons,
    students: seed.students,
    repeatRate: seed.repeatRate,
    response: `${seed.responseMinutes} min`,
    price: Math.min(...seed.offerings.map((offering) => offering.price)),
    level: levels.map(educationLevelLabel).join(" · "),
    levels,
    offerings: seed.offerings,
    accent: seed.accent,
    quote: seed.quote,
    nextSlot: "Termin na upit",
    verified: true,
    elite: seed.elite,
    video: seed.video,
    matchStyles: seed.matchStyles ?? ["koraci", "praksa"],
    matchGoals: seed.matchGoals ?? ["razumijevanje", "ispit", "ocjena"],
  };
}

export const tutors: Tutor[] = [
  {
    slug: "ana-kovac",
    name: "Ana Kovač",
    initials: "AK",
    role: "mag. educ. math. et phys.",
    subjects: ["Matematika", "Fizika"],
    rating: 4.98,
    reviews: 184,
    lessons: 1250,
    students: 320,
    repeatRate: 95,
    response: "8 min",
    price: 18,
    level: "Srednja škola · Matura",
    accent: "coral",
    quote: "Matematika postaje jasna kada pronađemo objašnjenje koje odgovara baš tebi.",
    nextSlot: "Danas u 18:30",
    verified: true,
    elite: true,
    levels: ["srednja-skola", "matura", "fakultet"],
    offerings: [
      { subjectId: "subject-math", subjectSlug: "matematika", subject: "Matematika", price: 18, levels: ["srednja-skola", "matura", "fakultet"] },
      { subjectId: "subject-physics", subjectSlug: "fizika", subject: "Fizika", price: 18, levels: ["srednja-skola", "matura"] },
    ],
    matchStyles: ["koraci", "vizualno", "praksa"],
    matchGoals: ["razumijevanje", "ispit", "ocjena", "izvrsnost"],
    video: true,
  },
  {
    slug: "marko-horvat",
    name: "Marko Horvat",
    initials: "MH",
    role: "profesor fizike i informatike",
    subjects: ["Fizika", "Informatika"],
    rating: 4.96,
    reviews: 126,
    lessons: 842,
    students: 214,
    repeatRate: 91,
    response: "14 min",
    price: 17,
    level: "Osnovna · Srednja škola",
    accent: "blue",
    quote: "Povezujemo formule sa stvarnim svijetom i rješavamo zadatke bez preskakanja koraka.",
    nextSlot: "Sutra u 17:00",
    verified: true,
    levels: ["osnovna-skola", "srednja-skola", "matura", "fakultet"],
    offerings: [
      { subjectId: "subject-physics", subjectSlug: "fizika", subject: "Fizika", price: 17, levels: ["osnovna-skola", "srednja-skola", "matura"] },
      { subjectId: "subject-informatics", subjectSlug: "informatika", subject: "Informatika", price: 19, levels: ["srednja-skola", "fakultet"] },
    ],
    matchStyles: ["koraci", "vizualno", "praksa"],
    matchGoals: ["razumijevanje", "ispit", "izvrsnost"],
    video: true,
  },
  {
    slug: "lucija-maric",
    name: "Lucija Marić",
    initials: "LM",
    role: "mag. philol. angl. et germ.",
    subjects: ["Engleski jezik", "Njemački jezik"],
    rating: 4.99,
    reviews: 208,
    lessons: 1094,
    students: 287,
    repeatRate: 97,
    response: "5 min",
    price: 16,
    level: "Sve razine · Konverzacija",
    accent: "gold",
    quote: "Jezik učimo kroz razgovor, situacije i teme koje su učeniku zaista važne.",
    nextSlot: "Danas u 20:00",
    verified: true,
    elite: true,
    levels: ["osnovna-skola", "srednja-skola", "matura", "odrasli"],
    offerings: [
      { subjectId: "subject-english", subjectSlug: "engleski-jezik", subject: "Engleski jezik", price: 16, levels: ["osnovna-skola", "srednja-skola", "matura", "odrasli"] },
      { subjectId: "subject-german", subjectSlug: "njemacki-jezik", subject: "Njemački jezik", price: 17, levels: ["osnovna-skola", "srednja-skola", "odrasli"] },
    ],
    matchStyles: ["razgovor", "vizualno"],
    matchGoals: ["razumijevanje", "ispit", "ocjena", "izvrsnost"],
    video: true,
  },
  {
    slug: "ivan-juric",
    name: "Ivan Jurić",
    initials: "IJ",
    role: "doktorand kemije",
    subjects: ["Kemija", "Biologija"],
    rating: 4.92,
    reviews: 74,
    lessons: 436,
    students: 118,
    repeatRate: 88,
    response: "22 min",
    price: 15,
    level: "Srednja škola · Fakultet",
    accent: "mint",
    quote: "Kompleksne procese pretvaramo u jednostavne mentalne modele koji se lako pamte.",
    nextSlot: "Četvrtak u 16:30",
    verified: true,
    levels: ["srednja-skola", "matura", "fakultet"],
    offerings: [
      { subjectId: "subject-chemistry", subjectSlug: "kemija", subject: "Kemija", price: 15, levels: ["srednja-skola", "matura", "fakultet"] },
      { subjectId: "subject-biology", subjectSlug: "biologija", subject: "Biologija", price: 15, levels: ["srednja-skola", "matura"] },
    ],
    matchStyles: ["vizualno", "koraci", "praksa"],
    matchGoals: ["razumijevanje", "ispit", "ocjena"],
  },
  tutorFromSeed({
    slug: "petra-babic", name: "Petra Babić", role: "profesorica hrvatskog jezika", accent: "coral",
    quote: "Esej i književnost pretvaramo u argumente koje učenik zna samostalno braniti.",
    offerings: [{ subjectId: "subject-croatian", subjectSlug: "hrvatski-jezik", subject: "Hrvatski jezik", price: 16, levels: ["osnovna-skola", "srednja-skola", "matura"] }],
    rating: 4.94, reviews: 91, lessons: 612, students: 167, repeatRate: 90, responseMinutes: 19,
    matchStyles: ["koraci", "razgovor"], matchGoals: ["razumijevanje", "ispit", "ocjena"],
  }),
  tutorFromSeed({
    slug: "nikola-radic", name: "Nikola Radić", role: "software engineer i STEM mentor", accent: "blue", elite: true, video: true,
    quote: "Programiranje učimo gradeći male sustave koji rade, a algoritme razumijemo vizualno.",
    offerings: [
      { subjectId: "subject-informatics", subjectSlug: "informatika", subject: "Informatika", price: 22, levels: ["srednja-skola", "fakultet"] },
      { subjectId: "subject-math", subjectSlug: "matematika", subject: "Matematika", price: 20, levels: ["srednja-skola", "matura"] },
    ],
    rating: 4.97, reviews: 112, lessons: 729, students: 201, repeatRate: 93, responseMinutes: 11,
    matchStyles: ["vizualno", "praksa", "koraci"], matchGoals: ["razumijevanje", "ispit", "izvrsnost"],
  }),
  tutorFromSeed({
    slug: "sara-matic", name: "Sara Matić", role: "profesorica povijesti i geografije", accent: "gold",
    quote: "Gradivo povezujemo u priče, uzroke i posljedice koje ostaju u pamćenju.",
    offerings: [
      { subjectId: "subject-history", subjectSlug: "povijest", subject: "Povijest", price: 14, levels: ["osnovna-skola", "srednja-skola", "matura"] },
      { subjectId: "subject-geography", subjectSlug: "geografija", subject: "Geografija", price: 14, levels: ["osnovna-skola", "srednja-skola", "matura"] },
    ],
    rating: 4.9, reviews: 55, lessons: 331, students: 102, repeatRate: 86, responseMinutes: 28,
    matchStyles: ["vizualno", "razgovor", "koraci"],
  }),
  tutorFromSeed({
    slug: "filip-novak", name: "Filip Novak", role: "financijski analitičar i edukator", accent: "mint",
    quote: "Ekonomiju prevodim iz grafikona i formula u odluke iz stvarnog poslovnog svijeta.",
    offerings: [
      { subjectId: "subject-economics", subjectSlug: "ekonomija", subject: "Ekonomija", price: 21, levels: ["srednja-skola", "fakultet"] },
      { subjectId: "subject-math", subjectSlug: "matematika", subject: "Matematika", price: 19, levels: ["srednja-skola", "fakultet"] },
    ],
    rating: 4.93, reviews: 67, lessons: 408, students: 121, repeatRate: 89, responseMinutes: 17,
    matchStyles: ["praksa", "vizualno", "koraci"],
  }),
  tutorFromSeed({
    slug: "ema-bozic", name: "Ema Božić", role: "mentorica stranih jezika", accent: "coral", video: true,
    quote: "Samopouzdanje u govoru gradimo kroz kratke, svakodnevne situacije i pametno ponavljanje.",
    offerings: [{ subjectId: "subject-english", subjectSlug: "engleski-jezik", subject: "Engleski jezik", price: 15, levels: ["osnovna-skola", "srednja-skola", "odrasli"] }],
    rating: 4.91, reviews: 49, lessons: 286, students: 94, repeatRate: 87, responseMinutes: 9,
    matchStyles: ["razgovor", "praksa"],
  }),
  tutorFromSeed({
    slug: "dario-vukovic", name: "Dario Vuković", role: "inženjer elektrotehnike", accent: "blue",
    quote: "Fiziku i tehničke predmete rješavamo sustavno, od skice do provjere jedinica.",
    offerings: [
      { subjectId: "subject-physics", subjectSlug: "fizika", subject: "Fizika", price: 20, levels: ["srednja-skola", "fakultet"] },
      { subjectId: "subject-informatics", subjectSlug: "informatika", subject: "Informatika", price: 21, levels: ["srednja-skola", "fakultet"] },
    ],
    rating: 4.95, reviews: 83, lessons: 511, students: 143, repeatRate: 92, responseMinutes: 16,
    matchStyles: ["koraci", "praksa", "vizualno"],
  }),
  tutorFromSeed({
    slug: "iva-grgic", name: "Iva Grgić", role: "biostatističarka i STEM mentorica", accent: "gold", elite: true, video: true,
    quote: "Brojeve pretvaramo u zaključke, a statistiku u alat za pametnije odluke.",
    offerings: [
      { subjectId: "subject-math", subjectSlug: "matematika", subject: "Matematika", price: 19, levels: ["srednja-skola", "matura", "fakultet"] },
      { subjectId: "subject-biology", subjectSlug: "biologija", subject: "Biologija", price: 18, levels: ["srednja-skola", "matura"] },
      { subjectId: "subject-economics", subjectSlug: "ekonomija", subject: "Ekonomija", price: 19, levels: ["fakultet"] },
    ],
    rating: 4.96, reviews: 96, lessons: 584, students: 152, repeatRate: 94, responseMinutes: 12,
    matchStyles: ["vizualno", "praksa", "koraci"], matchGoals: ["razumijevanje", "ispit", "izvrsnost"],
  }),
  tutorFromSeed({
    slug: "josip-peric", name: "Josip Perić", role: "klasični filolog i profesor", accent: "mint",
    quote: "Jezik učimo kroz obrasce, kontekst i poveznice koje ubrzavaju pamćenje.",
    offerings: [
      { subjectId: "subject-latin", subjectSlug: "latinski-jezik", subject: "Latinski jezik", price: 16, levels: ["srednja-skola", "fakultet"] },
      { subjectId: "subject-croatian", subjectSlug: "hrvatski-jezik", subject: "Hrvatski jezik", price: 16, levels: ["srednja-skola", "matura"] },
    ],
    rating: 4.89, reviews: 38, lessons: 244, students: 81, repeatRate: 84, responseMinutes: 31,
    matchStyles: ["koraci", "razgovor"],
  }),
  tutorFromSeed({
    slug: "marina-lerotic", name: "Marina Lerotić", role: "profesorica francuskog jezika i fonetike", accent: "coral", video: true,
    quote: "Francuski gradimo kroz izgovor, korisne obrasce i razgovore koji brzo donose sigurnost.",
    offerings: [{ subjectId: "subject-french", subjectSlug: "francuski-jezik", subject: "Francuski jezik", price: 17, levels: ["osnovna-skola", "srednja-skola", "matura", "odrasli"] }],
    rating: 4.96, reviews: 88, lessons: 493, students: 139, repeatRate: 92, responseMinutes: 12,
    matchStyles: ["razgovor", "koraci"],
  }),
  tutorFromSeed({
    slug: "luka-benedetti", name: "Luka Benedetti", role: "talijanist i prevoditelj", accent: "blue", video: true,
    quote: "Talijanski učimo kroz stvarne situacije, kulturu i kratke govorne izazove bez straha od pogreške.",
    offerings: [{ subjectId: "subject-italian", subjectSlug: "talijanski-jezik", subject: "Talijanski jezik", price: 16, levels: ["osnovna-skola", "srednja-skola", "matura", "odrasli"] }],
    rating: 4.94, reviews: 73, lessons: 382, students: 114, repeatRate: 90, responseMinutes: 15,
    matchStyles: ["razgovor", "praksa"],
  }),
  tutorFromSeed({
    slug: "sofia-martin", name: "Sofia Martin", role: "izvorna govornica i mentorica španjolskog", accent: "gold", elite: true, video: true,
    quote: "Španjolski povezujemo s glazbom, putovanjima i svakodnevnim razgovorom uz jasnu gramatičku strukturu.",
    offerings: [{ subjectId: "subject-spanish", subjectSlug: "spanjolski-jezik", subject: "Španjolski jezik", price: 18, levels: ["osnovna-skola", "srednja-skola", "matura", "odrasli"] }],
    rating: 4.99, reviews: 119, lessons: 641, students: 177, repeatRate: 96, responseMinutes: 7,
    matchStyles: ["razgovor", "vizualno", "praksa"], matchGoals: ["razumijevanje", "ispit", "izvrsnost"],
  }),
  tutorFromSeed({
    slug: "tomislav-kralj", name: "Tomislav Kralj", role: "statističar i data science mentor", accent: "mint", elite: true, video: true,
    quote: "Statistiku pretvaramo iz apstraktnih formula u zaključke koje možemo objasniti i obraniti.",
    offerings: [{ subjectId: "subject-statistics", subjectSlug: "statistika", subject: "Statistika", price: 23, levels: ["srednja-skola", "matura", "fakultet"] }],
    rating: 4.97, reviews: 104, lessons: 568, students: 146, repeatRate: 94, responseMinutes: 13,
    matchStyles: ["vizualno", "praksa", "koraci"], matchGoals: ["razumijevanje", "ispit", "izvrsnost"],
  }),
  tutorFromSeed({
    slug: "andrea-pavic", name: "Andrea Pavić", role: "ovlaštena računovotkinja i edukatorica", accent: "coral", video: true,
    quote: "Knjiženja i izvještaje povezujemo s poslovnim događajima kako bi računovodstvo imalo smisla.",
    offerings: [{ subjectId: "subject-accounting", subjectSlug: "racunovodstvo", subject: "Računovodstvo", price: 20, levels: ["srednja-skola", "fakultet", "odrasli"] }],
    rating: 4.95, reviews: 92, lessons: 477, students: 132, repeatRate: 93, responseMinutes: 10,
    matchStyles: ["praksa", "koraci"],
  }),
  tutorFromSeed({
    slug: "matija-saric", name: "Matija Šarić", role: "senior developer i mentor programiranja", accent: "blue", elite: true, video: true,
    quote: "Kod pišemo od prvog sata, uz male projekte, testiranje i razumijevanje zašto rješenje radi.",
    offerings: [{ subjectId: "subject-programming", subjectSlug: "programiranje", subject: "Programiranje", price: 25, levels: ["osnovna-skola", "srednja-skola", "fakultet", "odrasli"] }],
    rating: 4.98, reviews: 141, lessons: 812, students: 219, repeatRate: 95, responseMinutes: 9,
    matchStyles: ["praksa", "koraci", "vizualno"], matchGoals: ["razumijevanje", "ispit", "izvrsnost"],
  }),
  tutorFromSeed({
    slug: "helena-basic", name: "Helena Bašić", role: "profesorica filozofije i logike", accent: "gold", video: true,
    quote: "Argumente rastavljamo na jasne korake, a filozofske ideje povezujemo s pitanjima današnjeg svijeta.",
    offerings: [{ subjectId: "subject-philosophy", subjectSlug: "filozofija-i-logika", subject: "Filozofija i logika", price: 16, levels: ["srednja-skola", "matura", "fakultet"] }],
    rating: 4.93, reviews: 61, lessons: 337, students: 106, repeatRate: 89, responseMinutes: 18,
    matchStyles: ["razgovor", "koraci"],
  }),
  tutorFromSeed({
    slug: "damjan-vukic", name: "Damjan Vukić", role: "psiholog i istraživački mentor", accent: "mint", video: true,
    quote: "Psihologiju učimo kroz eksperimente, primjere i kritičko čitanje istraživanja, bez mehaničkog pamćenja.",
    offerings: [{ subjectId: "subject-psychology", subjectSlug: "psihologija", subject: "Psihologija", price: 19, levels: ["srednja-skola", "matura", "fakultet", "odrasli"] }],
    rating: 4.96, reviews: 79, lessons: 421, students: 123, repeatRate: 92, responseMinutes: 14,
    matchStyles: ["razgovor", "praksa", "vizualno"],
  }),
];

export const lessonHistory = [
  { title: "Derivacije složenih funkcija", subject: "Matematika", tutor: "Ana Kovač", date: "18. srpnja", progress: 84, tone: "coral" },
  { title: "Newtonovi zakoni", subject: "Fizika", tutor: "Marko Horvat", date: "15. srpnja", progress: 72, tone: "blue" },
  { title: "Academic writing: essay", subject: "Engleski", tutor: "Lucija Marić", date: "11. srpnja", progress: 91, tone: "gold" },
];

export const weekSlots = [
  { day: "PON", date: "21", slots: ["16:00", "18:30"] },
  { day: "UTO", date: "22", slots: ["17:00", "19:00"] },
  { day: "SRI", date: "23", slots: ["15:30", "18:30", "20:00"] },
  { day: "ČET", date: "24", slots: ["16:00", "17:30"] },
  { day: "PET", date: "25", slots: ["14:00", "18:00"] },
];
