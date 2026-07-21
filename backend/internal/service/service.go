package service

import (
	"errors"
	"fmt"
	"math"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"gaudeamus/mentor-api/internal/domain"
	"gaudeamus/mentor-api/internal/store"
)

type Error struct {
	Code    string
	Message string
	Status  int
}

func (e *Error) Error() string { return e.Message }

func validation(message string) error {
	return &Error{Code: "validation_error", Message: message, Status: 422}
}
func conflict(message string) error  { return &Error{Code: "conflict", Message: message, Status: 409} }
func forbidden(message string) error { return &Error{Code: "forbidden", Message: message, Status: 403} }
func notFound(resource string) error {
	return &Error{Code: "not_found", Message: resource + " nije pronađen.", Status: 404}
}

type Service struct {
	store           *store.Store
	platformFee     float64
	now             func() time.Time
	authMu          sync.RWMutex
	credentials     map[string]credential
	sessions        map[string]session
	oauthStates     map[string]oauthState
	authStatePath   string
	demoCredentials bool
}

func New(repository *store.Store, platformFee float64) *Service {
	service, _ := NewPersistentWithDemo(repository, platformFee, "", true)
	return service
}

func NewPersistent(repository *store.Store, platformFee float64, authStatePath string) (*Service, error) {
	return NewPersistentWithDemo(repository, platformFee, authStatePath, true)
}

func NewPersistentWithDemo(repository *store.Store, platformFee float64, authStatePath string, demoCredentials bool) (*Service, error) {
	service := &Service{store: repository, platformFee: platformFee, now: func() time.Time { return time.Now().UTC() }, credentials: make(map[string]credential), sessions: make(map[string]session), oauthStates: make(map[string]oauthState), authStatePath: authStatePath, demoCredentials: demoCredentials}
	if demoCredentials {
		service.initializeDemoCredentials()
	}
	if err := service.loadAuthState(); err != nil {
		return nil, err
	}
	service.authMu.Lock()
	err := service.persistAuthLocked()
	service.authMu.Unlock()
	if err != nil {
		return nil, err
	}
	return service, nil
}

type TutorView struct {
	domain.TutorProfile
	User           domain.User      `json:"user"`
	SubjectDetails []domain.Subject `json:"subjectDetails"`
	NextAvailable  *time.Time       `json:"nextAvailable,omitempty"`
}

type TutorSearch struct {
	Query    string
	Subject  string
	Level    string
	Badge    string
	MinPrice float64
	MaxPrice float64
	Verified *bool
	Limit    int
	Offset   int
}

func (s *Service) SearchTutors(filter TutorSearch) ([]TutorView, int) {
	query := strings.ToLower(strings.TrimSpace(filter.Query))
	if filter.Offset < 0 {
		filter.Offset = 0
	}
	if filter.Limit < 0 {
		filter.Limit = 0
	}
	views := make([]TutorView, 0)
	for _, tutor := range s.store.Tutors() {
		user, err := s.store.User(tutor.UserID)
		if err != nil || user.Status != "active" {
			continue
		}
		subjects := make([]domain.Subject, 0, len(tutor.Subjects))
		matchesOffering := false
		for _, offered := range tutor.Subjects {
			subject, subjectErr := s.store.Subject(offered.SubjectID)
			if subjectErr != nil {
				continue
			}
			subjects = append(subjects, subject)
			subjectMatches := filter.Subject == "" || strings.EqualFold(filter.Subject, subject.ID) || strings.EqualFold(filter.Subject, subject.Slug)
			levelMatches := filter.Level == "" || containsFold(offered.Levels, filter.Level)
			priceMatches := (filter.MinPrice == 0 || offered.PriceEUR >= filter.MinPrice) && (filter.MaxPrice == 0 || offered.PriceEUR <= filter.MaxPrice)
			if subjectMatches && levelMatches && priceMatches {
				matchesOffering = true
			}
		}
		haystack := strings.ToLower(user.Name + " " + tutor.Headline + " " + tutor.Bio)
		for _, subject := range subjects {
			haystack += " " + strings.ToLower(subject.Name)
		}
		if query != "" && !strings.Contains(haystack, query) {
			continue
		}
		if !matchesOffering {
			continue
		}
		if filter.Badge != "" && !strings.EqualFold(tutor.Badge, filter.Badge) {
			continue
		}
		if filter.Verified != nil && tutor.Verified != *filter.Verified {
			continue
		}
		tutor.SearchRankingScore = rankingScore(tutor)
		view := TutorView{TutorProfile: tutor, User: user, SubjectDetails: subjects}
		for _, slot := range s.store.Availability(tutor.UserID) {
			if slot.Status == "open" && slot.StartsAt.After(s.now()) {
				start := slot.StartsAt
				view.NextAvailable = &start
				break
			}
		}
		views = append(views, view)
	}
	sort.Slice(views, func(i, j int) bool {
		if views[i].SearchRankingScore != views[j].SearchRankingScore {
			return views[i].SearchRankingScore > views[j].SearchRankingScore
		}
		if views[i].Rating != views[j].Rating {
			return views[i].Rating > views[j].Rating
		}
		if views[i].ReviewCount != views[j].ReviewCount {
			return views[i].ReviewCount > views[j].ReviewCount
		}
		return views[i].Slug < views[j].Slug
	})
	total := len(views)
	if filter.Offset > total {
		return []TutorView{}, total
	}
	views = views[filter.Offset:]
	if filter.Limit > 0 && filter.Limit < len(views) {
		views = views[:filter.Limit]
	}
	return views, total
}

func containsFold(values []string, target string) bool {
	for _, value := range values {
		if strings.EqualFold(value, target) {
			return true
		}
	}
	return false
}

func rankingScore(t domain.TutorProfile) float64 {
	lessons := math.Min(math.Log10(float64(t.LessonsCompleted)+1)/4, 1)
	response := math.Max(0, 1-float64(t.ResponseMinutes)/120)
	verified := 0.0
	if t.Verified {
		verified = 1
	}
	score := (t.Rating/5)*35 + (t.RepeatRate/100)*25 + lessons*20 + response*10 + verified*10
	return math.Round(score*100) / 100
}

func (s *Service) Tutor(id string) (TutorView, error) {
	tutor, user, err := s.store.Tutor(id)
	if err != nil {
		return TutorView{}, notFound("Profesor")
	}
	tutor.SearchRankingScore = rankingScore(tutor)
	view := TutorView{TutorProfile: tutor, User: user}
	for _, offered := range tutor.Subjects {
		if subject, subjectErr := s.store.Subject(offered.SubjectID); subjectErr == nil {
			view.SubjectDetails = append(view.SubjectDetails, subject)
		}
	}
	return view, nil
}

type CreateBookingInput struct {
	TutorID        string    `json:"tutorId" binding:"required"`
	SubjectID      string    `json:"subjectId" binding:"required"`
	AvailabilityID string    `json:"availabilityId" binding:"required"`
	StartsAt       time.Time `json:"startsAt" binding:"required"`
	EndsAt         time.Time `json:"endsAt" binding:"required"`
	Topic          string    `json:"topic" binding:"required"`
	Goal           string    `json:"goal" binding:"required"`
	StudentNote    string    `json:"studentNote"`
}

func (s *Service) CreateBooking(studentID string, input CreateBookingInput) (domain.Booking, error) {
	student, err := s.store.User(studentID)
	if err != nil || student.Role != domain.RoleStudent {
		return domain.Booking{}, forbidden("Rezervaciju može izraditi samo učenik.")
	}
	if !input.EndsAt.After(input.StartsAt) {
		return domain.Booking{}, validation("Završetak termina mora biti nakon početka.")
	}
	duration := input.EndsAt.Sub(input.StartsAt)
	if duration < 30*time.Minute || duration > 2*time.Hour {
		return domain.Booking{}, validation("Sat mora trajati između 30 i 120 minuta.")
	}
	tutor, _, err := s.store.Tutor(input.TutorID)
	if err != nil {
		return domain.Booking{}, notFound("Profesor")
	}
	pricePerHour := 0.0
	for _, offered := range tutor.Subjects {
		if offered.SubjectID == input.SubjectID {
			pricePerHour = offered.PriceEUR
			break
		}
	}
	if pricePerHour == 0 {
		return domain.Booking{}, validation("Odabrani profesor ne predaje taj predmet.")
	}
	slot, err := s.store.AvailabilitySlot(input.AvailabilityID)
	if err != nil {
		return domain.Booking{}, notFound("Termin")
	}
	if slot.TutorID != input.TutorID || !slot.StartsAt.Equal(input.StartsAt) || !slot.EndsAt.Equal(input.EndsAt) {
		return domain.Booking{}, validation("Termin ne odgovara raspoloživosti profesora.")
	}
	price := roundMoney(pricePerHour * duration.Hours())
	fee := roundMoney(price * s.platformFee)
	booking := domain.Booking{
		ID: s.store.NextID("book"), StudentID: studentID, TutorID: input.TutorID,
		SubjectID: input.SubjectID, AvailabilityID: input.AvailabilityID,
		StartsAt: input.StartsAt, EndsAt: input.EndsAt, Topic: strings.TrimSpace(input.Topic),
		Goal: strings.TrimSpace(input.Goal), StudentNote: strings.TrimSpace(input.StudentNote),
		Status: "awaiting_payment", PaymentStatus: "pending", PriceEUR: price,
		PlatformFeeEUR: fee, TutorPayoutEUR: roundMoney(price - fee), Currency: "EUR", CreatedAt: s.now(),
	}
	lesson := domain.Lesson{ID: s.store.NextID("lesson"), BookingID: booking.ID, Status: "scheduled", RecordingStatus: "pending", TranscriptStatus: "pending"}
	conversation := domain.Conversation{ID: s.store.NextID("conversation"), BookingID: booking.ID, ParticipantIDs: []string{studentID, input.TutorID}, CreatedAt: s.now()}
	booking.LessonID = lesson.ID
	booking.ConversationID = conversation.ID
	if err := s.store.ReserveBooking(booking, lesson, conversation); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return domain.Booking{}, notFound("Termin")
		}
		return domain.Booking{}, conflict(err.Error())
	}
	return booking, nil
}

func (s *Service) PayBooking(actorID, bookingID string) (domain.Booking, domain.Payment, error) {
	booking, err := s.store.Booking(bookingID)
	if err != nil {
		return domain.Booking{}, domain.Payment{}, notFound("Rezervacija")
	}
	if actorID != booking.StudentID {
		return domain.Booking{}, domain.Payment{}, forbidden("Samo učenik koji je rezervirao termin može izvršiti plaćanje.")
	}
	if booking.PaymentStatus == "paid" {
		return domain.Booking{}, domain.Payment{}, conflict("Rezervacija je već plaćena.")
	}
	if booking.Status == "cancelled" {
		return domain.Booking{}, domain.Payment{}, conflict("Otkazanu rezervaciju nije moguće platiti.")
	}
	booking.PaymentStatus = "paid"
	booking.Status = "confirmed"
	payment := domain.Payment{ID: s.store.NextID("pay"), BookingID: booking.ID, StudentID: booking.StudentID, TutorID: booking.TutorID, AmountEUR: booking.PriceEUR, PlatformFeeEUR: booking.PlatformFeeEUR, TutorPayoutEUR: booking.TutorPayoutEUR, Status: "captured", Provider: "demo", CreatedAt: s.now()}
	if err := s.store.CapturePayment(booking, payment); err != nil {
		return domain.Booking{}, domain.Payment{}, err
	}
	return booking, payment, nil
}

func (s *Service) CancelBooking(actorID, bookingID, reason string) (domain.Booking, error) {
	booking, err := s.store.Booking(bookingID)
	if err != nil {
		return domain.Booking{}, notFound("Rezervacija")
	}
	actor, actorErr := s.store.User(actorID)
	if actorErr != nil {
		return domain.Booking{}, forbidden("Nepoznat korisnik.")
	}
	if actor.Role != domain.RoleAdmin && actorID != booking.StudentID && actorID != booking.TutorID {
		return domain.Booking{}, forbidden("Nemate pravo otkazati ovu rezervaciju.")
	}
	if booking.Status == "completed" || booking.Status == "cancelled" {
		return domain.Booking{}, conflict("Rezervaciju u ovom statusu nije moguće otkazati.")
	}
	booking.Status = "cancelled"
	booking.CancellationBy = actorID
	booking.CancellationReason = strings.TrimSpace(reason)
	if booking.PaymentStatus == "paid" {
		if booking.StartsAt.Sub(s.now()) >= 24*time.Hour {
			booking.PaymentStatus = "refunded"
		} else {
			booking.PaymentStatus = "refund_review"
		}
	}
	return booking, s.store.CancelBooking(booking)
}

func (s *Service) StartLesson(actorID, lessonID string) (domain.Lesson, error) {
	lesson, err := s.store.Lesson(lessonID)
	if err != nil {
		return domain.Lesson{}, notFound("Sat")
	}
	booking, bookingErr := s.store.Booking(lesson.BookingID)
	if bookingErr != nil {
		return domain.Lesson{}, notFound("Rezervacija")
	}
	actor, _ := s.store.User(actorID)
	if actor.Role != domain.RoleAdmin && actorID != booking.StudentID && actorID != booking.TutorID {
		return domain.Lesson{}, forbidden("Nemate pristup ovom satu.")
	}
	if booking.Status != "confirmed" {
		return domain.Lesson{}, conflict("Sat se može pokrenuti tek nakon potvrđenog plaćanja.")
	}
	if lesson.Status != "scheduled" {
		return domain.Lesson{}, conflict("Sat je već pokrenut ili završen.")
	}
	now := s.now()
	lesson.StartedAt = &now
	lesson.Status = "live"
	lesson.RecordingStatus = "recording"
	lesson.TranscriptStatus = "live"
	return lesson, s.store.PutLesson(lesson)
}

func (s *Service) EndLesson(actorID, lessonID string) (domain.Lesson, domain.LearningPack, error) {
	lesson, err := s.store.Lesson(lessonID)
	if err != nil {
		return domain.Lesson{}, domain.LearningPack{}, notFound("Sat")
	}
	booking, bookingErr := s.store.Booking(lesson.BookingID)
	if bookingErr != nil {
		return domain.Lesson{}, domain.LearningPack{}, notFound("Rezervacija")
	}
	actor, _ := s.store.User(actorID)
	if actor.Role != domain.RoleAdmin && actorID != booking.TutorID {
		return domain.Lesson{}, domain.LearningPack{}, forbidden("Sat može završiti profesor ili administrator.")
	}
	if lesson.Status != "live" {
		return domain.Lesson{}, domain.LearningPack{}, conflict("Samo aktivan sat može završiti.")
	}
	now := s.now()
	lesson.EndedAt = &now
	lesson.Status = "completed"
	lesson.RecordingStatus = "ready"
	lesson.TranscriptStatus = "ready"
	lesson.QualityScore = 0.96
	booking.Status = "completed"
	pack := s.generateLearningPack(lesson, booking)
	if err := s.store.CompleteLesson(lesson, booking, pack); err != nil {
		return domain.Lesson{}, domain.LearningPack{}, err
	}
	return lesson, pack, nil
}

func (s *Service) generateLearningPack(lesson domain.Lesson, booking domain.Booking) domain.LearningPack {
	subject, _ := s.store.Subject(booking.SubjectID)
	concept := booking.Topic
	if concept == "" {
		concept = "ključni koncepti iz lekcije"
	}
	return domain.LearningPack{
		ID: s.store.NextID("pack"), LessonID: lesson.ID, StudentID: booking.StudentID, SubjectID: booking.SubjectID,
		Title:           subject.Name + " · " + concept,
		Summary:         fmt.Sprintf("Na satu smo razložili temu %q u jasne korake, provjerili razumijevanje na primjerima i povezali postupak s ciljem: %s.", concept, booking.Goal),
		KeyConcepts:     []string{"Prepoznaj što je zadano i što se traži", "Odaberi pravilo prije računanja", "Provjeri rezultat obrnutim postupkom"},
		Formulas:        []string{"postupak = razumijevanje + primjena + provjera", "napredak = fokus × redovita vježba"},
		PracticeTasks:   []string{"Riješi jedan osnovni primjer bez bilješki", "Objasni postupak vlastitim riječima", "Riješi složeniji primjer i označi korak u kojem nisi siguran"},
		Flashcards:      []domain.Flashcard{{Front: "Koji je prvi korak?", Back: "Prepoznati podatke, cilj i pravilo koje ih povezuje."}, {Front: "Kako provjeriti razumijevanje?", Back: "Objasniti postupak bez gledanja u rješenje."}},
		Quiz:            []domain.QuizQuestion{{ID: "q1", Prompt: "Koja strategija najbolje smanjuje pogreške?", Options: []string{"Preskakanje koraka", "Zapis postupka i provjera", "Pamćenje rezultata", "Brže računanje"}, Answer: 1, Reason: "Jasan zapis omogućuje da se svaka pretpostavka i račun provjere."}},
		MasteryEstimate: 0.82, Recommendations: []string{"Ponovi flash kartice sutra", "Riješi tri zadatka rastuće težine", "Rezerviraj provjeru znanja za sedam dana"}, GeneratedAt: s.now(),
	}
}

type CreateReviewInput struct {
	BookingID string `json:"bookingId" binding:"required"`
	Rating    int    `json:"rating" binding:"required"`
	Comment   string `json:"comment" binding:"required"`
}

func (s *Service) CreateReview(studentID string, input CreateReviewInput) (domain.Review, error) {
	booking, err := s.store.Booking(input.BookingID)
	if err != nil {
		return domain.Review{}, notFound("Rezervacija")
	}
	if booking.StudentID != studentID {
		return domain.Review{}, forbidden("Možete ocijeniti samo vlastiti sat.")
	}
	if booking.Status != "completed" {
		return domain.Review{}, conflict("Ocjena je moguća tek nakon održanog sata.")
	}
	if input.Rating < 1 || input.Rating > 5 {
		return domain.Review{}, validation("Ocjena mora biti između 1 i 5.")
	}
	for _, review := range s.store.Reviews(booking.TutorID) {
		if review.BookingID == input.BookingID {
			return domain.Review{}, conflict("Ovaj sat je već ocijenjen.")
		}
	}
	review := domain.Review{ID: s.store.NextID("review"), BookingID: booking.ID, StudentID: studentID, TutorID: booking.TutorID, Rating: input.Rating, Comment: strings.TrimSpace(input.Comment), CreatedAt: s.now()}
	tutor, _, _ := s.store.Tutor(booking.TutorID)
	previousCount := tutor.ReviewCount
	previousTotal := tutor.Rating * float64(previousCount)
	tutor.ReviewCount = previousCount + 1
	tutor.Rating = math.Round(((previousTotal+float64(input.Rating))/float64(tutor.ReviewCount))*100) / 100
	tutor.ReputationScore = rankingScore(tutor)
	if err := s.store.AddReview(review, tutor); err != nil {
		return domain.Review{}, err
	}
	return review, nil
}

var contactPatterns = []struct {
	name string
	re   *regexp.Regexp
}{
	{"email", regexp.MustCompile(`(?i)[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}`)},
	{"phone", regexp.MustCompile(`(?i)(?:\+?385|0)[\s./-]?[1-9](?:[\s./-]?\d){6,9}`)},
	{"external_messaging", regexp.MustCompile(`(?i)\b(whats\s*app[a-zčćžšđ]*|viber[a-zčćžšđ]*|telegram[a-zčćžšđ]*|instagram[a-zčćžšđ]*|insta|snapchat[a-zčćžšđ]*)\b`)},
}

type SendMessageInput struct {
	Body string `json:"body" binding:"required"`
}

func (s *Service) SendMessage(senderID, conversationID string, input SendMessageInput) (domain.Message, *domain.TrustEvent, error) {
	actor, err := s.store.User(senderID)
	if err != nil {
		return domain.Message{}, nil, forbidden("Nepoznat pošiljatelj.")
	}
	conversation, err := s.store.Conversation(conversationID)
	if err != nil {
		return domain.Message{}, nil, notFound("Razgovor")
	}
	if actor.Role != domain.RoleAdmin && !contains(conversation.ParticipantIDs, senderID) {
		return domain.Message{}, nil, forbidden("Nemate pristup ovom razgovoru.")
	}
	body := strings.TrimSpace(input.Body)
	if body == "" || len([]rune(body)) > 2000 {
		return domain.Message{}, nil, validation("Poruka mora sadržavati između 1 i 2000 znakova.")
	}
	moderation := "clean"
	redacted := body
	var event *domain.TrustEvent
	detections := make([]string, 0)
	for _, pattern := range contactPatterns {
		if pattern.re.MatchString(redacted) {
			moderation = "contact_blocked"
			redacted = pattern.re.ReplaceAllString(redacted, "[kontakt uklonjen]")
			detections = append(detections, pattern.name)
		}
	}
	if len(detections) > 0 {
		created := domain.TrustEvent{ID: s.store.NextID("trust"), UserID: senderID, ConversationID: conversationID, Type: "contact_sharing_attempt", Severity: "medium", Evidence: strings.Join(detections, ","), Status: "open", CreatedAt: s.now()}
		event = &created
		_ = s.store.PutTrustEvent(created)
	}
	message := domain.Message{ID: s.store.NextID("msg"), ConversationID: conversationID, SenderID: senderID, Body: redacted, Moderation: moderation, CreatedAt: s.now()}
	return message, event, s.store.PutMessage(message)
}

type GenerateTestInput struct {
	SubjectID     string `json:"subjectId" binding:"required"`
	QuestionCount int    `json:"questionCount"`
}

type GeneratedTest struct {
	ID          string                `json:"id"`
	StudentID   string                `json:"studentId"`
	SubjectID   string                `json:"subjectId"`
	FocusTopics []string              `json:"focusTopics"`
	Questions   []domain.QuizQuestion `json:"questions"`
	GeneratedAt time.Time             `json:"generatedAt"`
}

func (s *Service) GenerateTest(studentID string, input GenerateTestInput) (GeneratedTest, error) {
	student, _, err := s.store.Student(studentID)
	if err != nil {
		return GeneratedTest{}, notFound("Učenik")
	}
	if _, err := s.store.Subject(input.SubjectID); err != nil {
		return GeneratedTest{}, notFound("Predmet")
	}
	weak := make([]domain.TopicMastery, 0)
	for _, mastery := range student.Mastery {
		if mastery.SubjectID == input.SubjectID {
			weak = append(weak, mastery)
		}
	}
	sort.Slice(weak, func(i, j int) bool { return weak[i].Mastery < weak[j].Mastery })
	focus := []string{"temeljni koncepti"}
	if len(weak) > 0 {
		focus = []string{weak[0].Topic}
	}
	count := input.QuestionCount
	if count < 3 {
		count = 3
	}
	if count > 10 {
		count = 10
	}
	questions := make([]domain.QuizQuestion, 0, count)
	for index := 1; index <= count; index++ {
		questions = append(questions, domain.QuizQuestion{ID: fmt.Sprintf("q%d", index), Prompt: fmt.Sprintf("Zadatak %d: primijeni razumijevanje teme %s na novi primjer.", index, focus[0]), Options: []string{"Postupak A", "Postupak B", "Postupak C", "Nema dovoljno podataka"}, Answer: (index - 1) % 3, Reason: "Objašnjenje će se prikazati nakon predaje testa."})
	}
	return GeneratedTest{ID: s.store.NextID("test"), StudentID: studentID, SubjectID: input.SubjectID, FocusTopics: focus, Questions: questions, GeneratedAt: s.now()}, nil
}

func (s *Service) StudentDashboard(studentID string) (map[string]any, error) {
	student, user, err := s.store.Student(studentID)
	if err != nil {
		return nil, notFound("Učenik")
	}
	bookings := make([]domain.Booking, 0)
	for _, booking := range s.store.Bookings() {
		if booking.StudentID == studentID {
			bookings = append(bookings, booking)
		}
	}
	return map[string]any{"user": user, "profile": student, "bookings": bookings, "nextBooking": firstUpcoming(bookings, s.now())}, nil
}

func (s *Service) TutorDashboard(tutorID string) (map[string]any, error) {
	tutor, user, err := s.store.Tutor(tutorID)
	if err != nil {
		return nil, notFound("Profesor")
	}
	bookings := make([]domain.Booking, 0)
	revenue := 0.0
	for _, booking := range s.store.Bookings() {
		if booking.TutorID == tutor.UserID {
			bookings = append(bookings, booking)
			if booking.PaymentStatus == "paid" {
				revenue += booking.TutorPayoutEUR
			}
		}
	}
	return map[string]any{"user": user, "profile": tutor, "bookings": bookings, "availability": s.store.Availability(tutor.UserID), "payoutEur": roundMoney(revenue)}, nil
}

func (s *Service) AdminDashboard() map[string]any {
	gmv := 0.0
	revenue := 0.0
	for _, payment := range s.store.Payments() {
		if payment.Status == "captured" {
			gmv += payment.AmountEUR
			revenue += payment.PlatformFeeEUR
		}
	}
	return map[string]any{"counts": s.store.Counts(), "gmvEur": roundMoney(gmv), "platformRevenueEur": roundMoney(revenue), "takeRate": s.platformFee, "openTrustEvents": countOpen(s.store.TrustEvents()), "generatedAt": s.now()}
}

func firstUpcoming(bookings []domain.Booking, now time.Time) *domain.Booking {
	var found *domain.Booking
	for index := range bookings {
		booking := bookings[index]
		if booking.StartsAt.Before(now) || booking.Status == "cancelled" {
			continue
		}
		if found == nil || booking.StartsAt.Before(found.StartsAt) {
			copy := booking
			found = &copy
		}
	}
	return found
}

func countOpen(events []domain.TrustEvent) int {
	count := 0
	for _, event := range events {
		if event.Status == "open" {
			count++
		}
	}
	return count
}
func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
func roundMoney(value float64) float64 { return math.Round(value*100) / 100 }
