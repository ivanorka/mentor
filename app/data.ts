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
  levels?: string[];
  video?: boolean;
  nextAvailable?: string;
};

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
  },
  {
    slug: "lucija-maric",
    name: "Lucija Marić",
    initials: "LM",
    role: "mag. philol. angl. et germ.",
    subjects: ["Engleski", "Njemački"],
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
  },
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
