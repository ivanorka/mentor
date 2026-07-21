package store

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"gaudeamus/mentor-api/internal/domain"
)

var ErrNotFound = errors.New("resource not found")

type Store struct {
	mu            sync.RWMutex
	seedUserIDs   map[string]bool
	users         map[string]domain.User
	subjects      map[string]domain.Subject
	tutors        map[string]domain.TutorProfile
	students      map[string]domain.StudentProfile
	availability  map[string]domain.AvailabilitySlot
	bookings      map[string]domain.Booking
	lessons       map[string]domain.Lesson
	reviews       map[string]domain.Review
	conversations map[string]domain.Conversation
	messages      map[string]domain.Message
	learningPacks map[string]domain.LearningPack
	trustEvents   map[string]domain.TrustEvent
	payments      map[string]domain.Payment
	sequence      uint64
	snapshotPath  string
}

func Load(seedPath, snapshotPath string) (*Store, error) {
	data, err := os.ReadFile(seedPath)
	if err != nil {
		return nil, fmt.Errorf("read seed data: %w", err)
	}
	var seed domain.SeedData
	if err := json.Unmarshal(data, &seed); err != nil {
		return nil, fmt.Errorf("decode seed data: %w", err)
	}
	seedUserIDs := make(map[string]bool, len(seed.Users))
	for _, value := range seed.Users {
		seedUserIDs[value.ID] = true
	}
	if snapshotPath != "" {
		if snapshot, readErr := os.ReadFile(snapshotPath); readErr == nil {
			if err := json.Unmarshal(snapshot, &seed); err != nil {
				return nil, fmt.Errorf("decode runtime snapshot: %w", err)
			}
		} else if !errors.Is(readErr, os.ErrNotExist) {
			return nil, fmt.Errorf("read runtime snapshot: %w", readErr)
		}
	}

	s := &Store{
		seedUserIDs:   seedUserIDs,
		users:         make(map[string]domain.User),
		subjects:      make(map[string]domain.Subject),
		tutors:        make(map[string]domain.TutorProfile),
		students:      make(map[string]domain.StudentProfile),
		availability:  make(map[string]domain.AvailabilitySlot),
		bookings:      make(map[string]domain.Booking),
		lessons:       make(map[string]domain.Lesson),
		reviews:       make(map[string]domain.Review),
		conversations: make(map[string]domain.Conversation),
		messages:      make(map[string]domain.Message),
		learningPacks: make(map[string]domain.LearningPack),
		trustEvents:   make(map[string]domain.TrustEvent),
		payments:      make(map[string]domain.Payment),
		sequence:      1000,
		snapshotPath:  snapshotPath,
	}
	for _, value := range seed.Users {
		if value.AuthProvider == "" {
			value.AuthProvider = "password"
		}
		if strings.HasSuffix(value.Email, ".test") {
			value.EmailVerified = true
		}
		s.users[value.ID] = value
	}
	for _, value := range seed.Subjects {
		s.subjects[value.ID] = value
	}
	for _, value := range seed.Tutors {
		if value.VideoURL == "" && value.Verified {
			value.VideoURL = "/demo/video/" + value.Slug
		}
		s.tutors[value.UserID] = value
	}
	for _, value := range seed.Students {
		s.students[value.UserID] = value
	}
	for _, value := range seed.Availability {
		s.availability[value.ID] = value
	}
	for _, value := range seed.Bookings {
		s.bookings[value.ID] = value
	}
	for _, value := range seed.Lessons {
		s.lessons[value.ID] = value
		if booking, ok := s.bookings[value.BookingID]; ok && booking.LessonID == "" {
			booking.LessonID = value.ID
			s.bookings[value.BookingID] = booking
		}
	}
	for _, value := range seed.Reviews {
		s.reviews[value.ID] = value
	}
	for _, value := range seed.Conversations {
		s.conversations[value.ID] = value
		if booking, ok := s.bookings[value.BookingID]; ok && booking.ConversationID == "" {
			booking.ConversationID = value.ID
			s.bookings[value.BookingID] = booking
		}
	}
	for _, value := range seed.Messages {
		s.messages[value.ID] = value
	}
	for _, value := range seed.LearningPacks {
		s.learningPacks[value.ID] = value
	}
	for _, value := range seed.TrustEvents {
		s.trustEvents[value.ID] = value
	}
	for _, value := range seed.Payments {
		s.payments[value.ID] = value
	}
	s.recalculateSequence()
	return s, nil
}

func (s *Store) recalculateSequence() {
	observe := func(id string) {
		separator := strings.LastIndex(id, "-")
		if separator < 0 || separator == len(id)-1 {
			return
		}
		value, err := strconv.ParseUint(id[separator+1:], 10, 64)
		if err == nil && value > s.sequence {
			s.sequence = value
		}
	}
	for id := range s.users {
		observe(id)
	}
	for id := range s.subjects {
		observe(id)
	}
	for id := range s.availability {
		observe(id)
	}
	for id := range s.bookings {
		observe(id)
	}
	for id := range s.lessons {
		observe(id)
	}
	for id := range s.reviews {
		observe(id)
	}
	for id := range s.conversations {
		observe(id)
	}
	for id := range s.messages {
		observe(id)
	}
	for id := range s.learningPacks {
		observe(id)
	}
	for id := range s.trustEvents {
		observe(id)
	}
	for id := range s.payments {
		observe(id)
	}
}

func (s *Store) NextID(prefix string) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sequence++
	return fmt.Sprintf("%s-%06d", prefix, s.sequence)
}

func (s *Store) User(id string) (domain.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	value, ok := s.users[id]
	if !ok {
		return domain.User{}, ErrNotFound
	}
	return value, nil
}

func (s *Store) UserByEmail(email string) (domain.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	normalized := strings.ToLower(strings.TrimSpace(email))
	for _, value := range s.users {
		if strings.ToLower(value.Email) == normalized {
			return value, nil
		}
	}
	return domain.User{}, ErrNotFound
}

func (s *Store) PutUser(value domain.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users[value.ID] = value
	return s.persistLocked()
}

func (s *Store) CreateAccount(user domain.User, student *domain.StudentProfile, tutor *domain.TutorProfile) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, existing := range s.users {
		if strings.EqualFold(existing.Email, user.Email) {
			return errors.New("email already exists")
		}
	}
	s.users[user.ID] = user
	if student != nil {
		s.students[student.UserID] = *student
	}
	if tutor != nil {
		s.tutors[tutor.UserID] = *tutor
	}
	return s.persistLocked()
}

func (s *Store) Users() []domain.User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	values := make([]domain.User, 0, len(s.users))
	for _, value := range s.users {
		values = append(values, value)
	}
	sort.Slice(values, func(i, j int) bool { return values[i].Name < values[j].Name })
	return values
}

func (s *Store) SeedUsers() []domain.User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	values := make([]domain.User, 0, len(s.seedUserIDs))
	for id := range s.seedUserIDs {
		if value, ok := s.users[id]; ok {
			values = append(values, value)
		}
	}
	sort.Slice(values, func(i, j int) bool { return values[i].Name < values[j].Name })
	return values
}

func (s *Store) Subject(id string) (domain.Subject, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	value, ok := s.subjects[id]
	if !ok {
		for _, subject := range s.subjects {
			if subject.Slug == id {
				return subject, nil
			}
		}
		return domain.Subject{}, ErrNotFound
	}
	return value, nil
}

func (s *Store) Subjects() []domain.Subject {
	s.mu.RLock()
	defer s.mu.RUnlock()
	values := make([]domain.Subject, 0, len(s.subjects))
	for _, value := range s.subjects {
		values = append(values, value)
	}
	sort.Slice(values, func(i, j int) bool { return values[i].Name < values[j].Name })
	return values
}

func (s *Store) Tutor(idOrSlug string) (domain.TutorProfile, domain.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	value, ok := s.tutors[idOrSlug]
	if !ok {
		for _, tutor := range s.tutors {
			if tutor.Slug == idOrSlug {
				value, ok = tutor, true
				break
			}
		}
	}
	if !ok {
		return domain.TutorProfile{}, domain.User{}, ErrNotFound
	}
	return value, s.users[value.UserID], nil
}

func (s *Store) Tutors() []domain.TutorProfile {
	s.mu.RLock()
	defer s.mu.RUnlock()
	values := make([]domain.TutorProfile, 0, len(s.tutors))
	for _, value := range s.tutors {
		values = append(values, value)
	}
	return values
}

func (s *Store) PutTutor(value domain.TutorProfile) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tutors[value.UserID] = value
	return s.persistLocked()
}

func (s *Store) Student(id string) (domain.StudentProfile, domain.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	value, ok := s.students[id]
	if !ok {
		return domain.StudentProfile{}, domain.User{}, ErrNotFound
	}
	return value, s.users[value.UserID], nil
}

func (s *Store) Students() []domain.StudentProfile {
	s.mu.RLock()
	defer s.mu.RUnlock()
	values := make([]domain.StudentProfile, 0, len(s.students))
	for _, value := range s.students {
		values = append(values, value)
	}
	return values
}

func (s *Store) Availability(tutorID string) []domain.AvailabilitySlot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	values := make([]domain.AvailabilitySlot, 0)
	for _, value := range s.availability {
		if tutorID == "" || value.TutorID == tutorID {
			values = append(values, value)
		}
	}
	sort.Slice(values, func(i, j int) bool { return values[i].StartsAt.Before(values[j].StartsAt) })
	return values
}

func (s *Store) AvailabilitySlot(id string) (domain.AvailabilitySlot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	value, ok := s.availability[id]
	if !ok {
		return domain.AvailabilitySlot{}, ErrNotFound
	}
	return value, nil
}

func (s *Store) PutAvailability(value domain.AvailabilitySlot) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.availability[value.ID] = value
	return s.persistLocked()
}

func (s *Store) Booking(id string) (domain.Booking, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	value, ok := s.bookings[id]
	if !ok {
		return domain.Booking{}, ErrNotFound
	}
	return value, nil
}

func (s *Store) Bookings() []domain.Booking {
	s.mu.RLock()
	defer s.mu.RUnlock()
	values := make([]domain.Booking, 0, len(s.bookings))
	for _, value := range s.bookings {
		values = append(values, value)
	}
	sort.Slice(values, func(i, j int) bool { return values[i].StartsAt.After(values[j].StartsAt) })
	return values
}

func (s *Store) PutBooking(value domain.Booking) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bookings[value.ID] = value
	return s.persistLocked()
}

func (s *Store) CapturePayment(booking domain.Booking, payment domain.Payment) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bookings[booking.ID] = booking
	s.payments[payment.ID] = payment
	return s.persistLocked()
}

func (s *Store) CancelBooking(value domain.Booking) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bookings[value.ID] = value
	if value.AvailabilityID != "" {
		if slot, ok := s.availability[value.AvailabilityID]; ok {
			slot.Status = "open"
			s.availability[value.AvailabilityID] = slot
		}
	}
	return s.persistLocked()
}

func (s *Store) ReserveBooking(value domain.Booking, lesson domain.Lesson, conversation domain.Conversation) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if value.AvailabilityID != "" {
		slot, ok := s.availability[value.AvailabilityID]
		if !ok {
			return ErrNotFound
		}
		if slot.Status != "open" {
			return errors.New("availability slot is not open")
		}
		if slot.TutorID != value.TutorID || !value.StartsAt.Equal(slot.StartsAt) || !value.EndsAt.Equal(slot.EndsAt) {
			return errors.New("booking does not match availability slot")
		}
	}
	for _, existing := range s.bookings {
		if existing.TutorID != value.TutorID || existing.Status == "cancelled" {
			continue
		}
		if Overlaps(value.StartsAt, value.EndsAt, existing.StartsAt, existing.EndsAt) {
			return errors.New("tutor already has a booking in this period")
		}
	}
	s.bookings[value.ID] = value
	s.lessons[lesson.ID] = lesson
	s.conversations[conversation.ID] = conversation
	if value.AvailabilityID != "" {
		slot := s.availability[value.AvailabilityID]
		slot.Status = "booked"
		s.availability[value.AvailabilityID] = slot
	}
	return s.persistLocked()
}

func (s *Store) Lesson(idOrBookingID string) (domain.Lesson, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if value, ok := s.lessons[idOrBookingID]; ok {
		return value, nil
	}
	for _, value := range s.lessons {
		if value.BookingID == idOrBookingID {
			return value, nil
		}
	}
	return domain.Lesson{}, ErrNotFound
}

func (s *Store) Lessons() []domain.Lesson {
	s.mu.RLock()
	defer s.mu.RUnlock()
	values := make([]domain.Lesson, 0, len(s.lessons))
	for _, value := range s.lessons {
		values = append(values, value)
	}
	return values
}

func (s *Store) PutLesson(value domain.Lesson) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.lessons[value.ID] = value
	return s.persistLocked()
}

func (s *Store) CompleteLesson(lesson domain.Lesson, booking domain.Booking, pack domain.LearningPack) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.lessons[lesson.ID] = lesson
	s.bookings[booking.ID] = booking
	s.learningPacks[pack.ID] = pack
	return s.persistLocked()
}

func (s *Store) Reviews(tutorID string) []domain.Review {
	s.mu.RLock()
	defer s.mu.RUnlock()
	values := make([]domain.Review, 0)
	for _, value := range s.reviews {
		if tutorID == "" || value.TutorID == tutorID {
			values = append(values, value)
		}
	}
	sort.Slice(values, func(i, j int) bool { return values[i].CreatedAt.After(values[j].CreatedAt) })
	return values
}

func (s *Store) PutReview(value domain.Review) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.reviews[value.ID] = value
	return s.persistLocked()
}

func (s *Store) AddReview(value domain.Review, tutor domain.TutorProfile) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.reviews[value.ID] = value
	s.tutors[tutor.UserID] = tutor
	return s.persistLocked()
}

func (s *Store) Messages(conversationID string) []domain.Message {
	s.mu.RLock()
	defer s.mu.RUnlock()
	values := make([]domain.Message, 0)
	for _, value := range s.messages {
		if value.ConversationID == conversationID {
			values = append(values, value)
		}
	}
	sort.Slice(values, func(i, j int) bool { return values[i].CreatedAt.Before(values[j].CreatedAt) })
	return values
}

func (s *Store) Conversation(id string) (domain.Conversation, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	value, ok := s.conversations[id]
	if !ok {
		return domain.Conversation{}, ErrNotFound
	}
	return value, nil
}

func (s *Store) Conversations() []domain.Conversation {
	s.mu.RLock()
	defer s.mu.RUnlock()
	values := make([]domain.Conversation, 0, len(s.conversations))
	for _, value := range s.conversations {
		values = append(values, value)
	}
	sort.Slice(values, func(i, j int) bool { return values[i].CreatedAt.After(values[j].CreatedAt) })
	return values
}

func (s *Store) PutMessage(value domain.Message) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.messages[value.ID] = value
	return s.persistLocked()
}

func (s *Store) LearningPack(lessonID string) (domain.LearningPack, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, value := range s.learningPacks {
		if value.LessonID == lessonID {
			return value, nil
		}
	}
	return domain.LearningPack{}, ErrNotFound
}

func (s *Store) PutLearningPack(value domain.LearningPack) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.learningPacks[value.ID] = value
	return s.persistLocked()
}

func (s *Store) TrustEvents() []domain.TrustEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()
	values := make([]domain.TrustEvent, 0, len(s.trustEvents))
	for _, value := range s.trustEvents {
		values = append(values, value)
	}
	sort.Slice(values, func(i, j int) bool { return values[i].CreatedAt.After(values[j].CreatedAt) })
	return values
}

func (s *Store) PutTrustEvent(value domain.TrustEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.trustEvents[value.ID] = value
	return s.persistLocked()
}

func (s *Store) PutPayment(value domain.Payment) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.payments[value.ID] = value
	return s.persistLocked()
}

func (s *Store) Payments() []domain.Payment {
	s.mu.RLock()
	defer s.mu.RUnlock()
	values := make([]domain.Payment, 0, len(s.payments))
	for _, value := range s.payments {
		values = append(values, value)
	}
	return values
}

func (s *Store) Counts() map[string]int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return map[string]int{
		"users": len(s.users), "subjects": len(s.subjects), "tutors": len(s.tutors),
		"students": len(s.students), "availabilitySlots": len(s.availability),
		"bookings": len(s.bookings), "lessons": len(s.lessons), "reviews": len(s.reviews),
		"conversations": len(s.conversations), "messages": len(s.messages), "learningPacks": len(s.learningPacks),
		"trustEvents": len(s.trustEvents), "payments": len(s.payments),
	}
}

func (s *Store) persistLocked() error {
	if s.snapshotPath == "" {
		return nil
	}
	seed := domain.SeedData{}
	for _, value := range s.users {
		seed.Users = append(seed.Users, value)
	}
	for _, value := range s.subjects {
		seed.Subjects = append(seed.Subjects, value)
	}
	for _, value := range s.tutors {
		seed.Tutors = append(seed.Tutors, value)
	}
	for _, value := range s.students {
		seed.Students = append(seed.Students, value)
	}
	for _, value := range s.availability {
		seed.Availability = append(seed.Availability, value)
	}
	for _, value := range s.bookings {
		seed.Bookings = append(seed.Bookings, value)
	}
	for _, value := range s.lessons {
		seed.Lessons = append(seed.Lessons, value)
	}
	for _, value := range s.reviews {
		seed.Reviews = append(seed.Reviews, value)
	}
	for _, value := range s.conversations {
		seed.Conversations = append(seed.Conversations, value)
	}
	for _, value := range s.messages {
		seed.Messages = append(seed.Messages, value)
	}
	for _, value := range s.learningPacks {
		seed.LearningPacks = append(seed.LearningPacks, value)
	}
	for _, value := range s.trustEvents {
		seed.TrustEvents = append(seed.TrustEvents, value)
	}
	for _, value := range s.payments {
		seed.Payments = append(seed.Payments, value)
	}
	data, err := json.MarshalIndent(seed, "", "  ")
	if err != nil {
		return err
	}
	temporary := s.snapshotPath + ".tmp"
	if err := os.WriteFile(temporary, data, 0o600); err != nil {
		return err
	}
	return os.Rename(temporary, s.snapshotPath)
}

func Overlaps(startA, endA, startB, endB time.Time) bool {
	return startA.Before(endB) && startB.Before(endA)
}
