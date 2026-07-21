package domain

import "time"

type Role string

const (
	RoleStudent Role = "student"
	RoleTutor   Role = "tutor"
	RoleAdmin   Role = "admin"
)

type User struct {
	ID            string    `json:"id"`
	Email         string    `json:"email"`
	Name          string    `json:"name"`
	Role          Role      `json:"role"`
	AvatarURL     string    `json:"avatarUrl,omitempty"`
	Status        string    `json:"status"`
	Locale        string    `json:"locale"`
	EmailVerified bool      `json:"emailVerified"`
	AuthProvider  string    `json:"authProvider"`
	CreatedAt     time.Time `json:"createdAt"`
}

const DefaultEducationLevelID = "srednja-skola"

type EducationLevel struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	SortOrder   int    `json:"sortOrder"`
	IsDefault   bool   `json:"isDefault"`
}

type Subject struct {
	ID          string   `json:"id"`
	Slug        string   `json:"slug"`
	Name        string   `json:"name"`
	Category    string   `json:"category"`
	Description string   `json:"description"`
	Levels      []string `json:"levels"`
	TutorCount  int      `json:"tutorCount"`
}

type TutorSubject struct {
	SubjectID string   `json:"subjectId"`
	PriceEUR  float64  `json:"priceEur"`
	Levels    []string `json:"levels"`
}

type Qualification struct {
	Title    string `json:"title"`
	Issuer   string `json:"issuer"`
	Year     int    `json:"year"`
	Verified bool   `json:"verified"`
}

type TutorProfile struct {
	UserID             string          `json:"userId"`
	Slug               string          `json:"slug"`
	Headline           string          `json:"headline"`
	Bio                string          `json:"bio"`
	VideoURL           string          `json:"videoUrl,omitempty"`
	Subjects           []TutorSubject  `json:"subjects"`
	Languages          []string        `json:"languages"`
	Qualifications     []Qualification `json:"qualifications"`
	Rating             float64         `json:"rating"`
	ReviewCount        int             `json:"reviewCount"`
	LessonsCompleted   int             `json:"lessonsCompleted"`
	UniqueStudents     int             `json:"uniqueStudents"`
	RepeatRate         float64         `json:"repeatRate"`
	ResponseMinutes    int             `json:"responseMinutes"`
	Badge              string          `json:"badge"`
	Verified           bool            `json:"verified"`
	CancellationRate   float64         `json:"cancellationRate"`
	ReputationScore    float64         `json:"reputationScore"`
	SearchRankingScore float64         `json:"searchRankingScore"`
}

type TopicMastery struct {
	SubjectID string  `json:"subjectId"`
	Topic     string  `json:"topic"`
	Mastery   float64 `json:"mastery"`
	Trend     string  `json:"trend"`
}

type StudentProfile struct {
	UserID       string         `json:"userId"`
	Grade        string         `json:"grade"`
	School       string         `json:"school"`
	Goals        []string       `json:"goals"`
	Preferences  []string       `json:"preferences"`
	StreakDays   int            `json:"streakDays"`
	LessonsTaken int            `json:"lessonsTaken"`
	Mastery      []TopicMastery `json:"mastery"`
}

type AvailabilitySlot struct {
	ID         string    `json:"id"`
	TutorID    string    `json:"tutorId"`
	StartsAt   time.Time `json:"startsAt"`
	EndsAt     time.Time `json:"endsAt"`
	Status     string    `json:"status"`
	Recurrence string    `json:"recurrence,omitempty"`
}

type Booking struct {
	ID                 string    `json:"id"`
	LessonID           string    `json:"lessonId,omitempty"`
	ConversationID     string    `json:"conversationId,omitempty"`
	StudentID          string    `json:"studentId"`
	TutorID            string    `json:"tutorId"`
	SubjectID          string    `json:"subjectId"`
	AvailabilityID     string    `json:"availabilityId,omitempty"`
	StartsAt           time.Time `json:"startsAt"`
	EndsAt             time.Time `json:"endsAt"`
	Topic              string    `json:"topic"`
	Goal               string    `json:"goal"`
	StudentNote        string    `json:"studentNote,omitempty"`
	Status             string    `json:"status"`
	PaymentStatus      string    `json:"paymentStatus"`
	PriceEUR           float64   `json:"priceEur"`
	PlatformFeeEUR     float64   `json:"platformFeeEur"`
	TutorPayoutEUR     float64   `json:"tutorPayoutEur"`
	Currency           string    `json:"currency"`
	CreatedAt          time.Time `json:"createdAt"`
	CancellationBy     string    `json:"cancellationBy,omitempty"`
	CancellationReason string    `json:"cancellationReason,omitempty"`
}

type Lesson struct {
	ID               string     `json:"id"`
	BookingID        string     `json:"bookingId"`
	Status           string     `json:"status"`
	StartedAt        *time.Time `json:"startedAt,omitempty"`
	EndedAt          *time.Time `json:"endedAt,omitempty"`
	RecordingStatus  string     `json:"recordingStatus"`
	TranscriptStatus string     `json:"transcriptStatus"`
	QualityScore     float64    `json:"qualityScore,omitempty"`
}

type QuizQuestion struct {
	ID      string   `json:"id"`
	Prompt  string   `json:"prompt"`
	Options []string `json:"options"`
	Answer  int      `json:"answer"`
	Reason  string   `json:"reason"`
}

type Flashcard struct {
	Front string `json:"front"`
	Back  string `json:"back"`
}

type LearningPack struct {
	ID              string         `json:"id"`
	LessonID        string         `json:"lessonId"`
	StudentID       string         `json:"studentId"`
	SubjectID       string         `json:"subjectId"`
	Title           string         `json:"title"`
	Summary         string         `json:"summary"`
	KeyConcepts     []string       `json:"keyConcepts"`
	Formulas        []string       `json:"formulas"`
	PracticeTasks   []string       `json:"practiceTasks"`
	Flashcards      []Flashcard    `json:"flashcards"`
	Quiz            []QuizQuestion `json:"quiz"`
	MasteryEstimate float64        `json:"masteryEstimate"`
	Recommendations []string       `json:"recommendations"`
	GeneratedAt     time.Time      `json:"generatedAt"`
}

type Review struct {
	ID        string    `json:"id"`
	BookingID string    `json:"bookingId"`
	StudentID string    `json:"studentId"`
	TutorID   string    `json:"tutorId"`
	Rating    int       `json:"rating"`
	Comment   string    `json:"comment"`
	CreatedAt time.Time `json:"createdAt"`
}

type Message struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversationId"`
	SenderID       string    `json:"senderId"`
	Body           string    `json:"body"`
	Moderation     string    `json:"moderation"`
	CreatedAt      time.Time `json:"createdAt"`
}

type Conversation struct {
	ID             string    `json:"id"`
	BookingID      string    `json:"bookingId,omitempty"`
	ParticipantIDs []string  `json:"participantIds"`
	CreatedAt      time.Time `json:"createdAt"`
}

type TrustEvent struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId"`
	ConversationID string    `json:"conversationId,omitempty"`
	Type           string    `json:"type"`
	Severity       string    `json:"severity"`
	Evidence       string    `json:"evidence"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"createdAt"`
}

type Payment struct {
	ID             string    `json:"id"`
	BookingID      string    `json:"bookingId"`
	StudentID      string    `json:"studentId"`
	TutorID        string    `json:"tutorId"`
	AmountEUR      float64   `json:"amountEur"`
	PlatformFeeEUR float64   `json:"platformFeeEur"`
	TutorPayoutEUR float64   `json:"tutorPayoutEur"`
	Status         string    `json:"status"`
	Provider       string    `json:"provider"`
	CreatedAt      time.Time `json:"createdAt"`
}

type SeedData struct {
	EducationLevels []EducationLevel   `json:"educationLevels"`
	Users           []User             `json:"users"`
	Subjects        []Subject          `json:"subjects"`
	Tutors          []TutorProfile     `json:"tutors"`
	Students        []StudentProfile   `json:"students"`
	Availability    []AvailabilitySlot `json:"availability"`
	Bookings        []Booking          `json:"bookings"`
	Lessons         []Lesson           `json:"lessons"`
	Reviews         []Review           `json:"reviews"`
	Conversations   []Conversation     `json:"conversations"`
	Messages        []Message          `json:"messages"`
	LearningPacks   []LearningPack     `json:"learningPacks"`
	TrustEvents     []TrustEvent       `json:"trustEvents"`
	Payments        []Payment          `json:"payments"`
}
