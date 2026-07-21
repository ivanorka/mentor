package service

import (
	"net/url"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"gaudeamus/mentor-api/internal/domain"
	"gaudeamus/mentor-api/internal/store"
)

func testService(t *testing.T) (*Service, *store.Store) {
	t.Helper()
	repository, err := store.Load("../../data/seed.json", "")
	if err != nil {
		t.Fatalf("load seed: %v", err)
	}
	return New(repository, 0.15), repository
}

func TestCreateBookingCalculatesFeeAndPreventsConflict(t *testing.T) {
	services, repository := testService(t)
	start := time.Date(2026, 7, 22, 16, 30, 0, 0, time.UTC)
	input := CreateBookingInput{TutorID: "tutor-ana-kovac", SubjectID: "subject-math", AvailabilityID: "slot-ana-01", StartsAt: start, EndsAt: start.Add(time.Hour), Topic: "Integrali", Goal: "Priprema za maturu"}
	booking, err := services.CreateBooking("student-luka-petrovic", input)
	if err != nil {
		t.Fatalf("create booking: %v", err)
	}
	if booking.PriceEUR != 18 || booking.PlatformFeeEUR != 2.7 || booking.TutorPayoutEUR != 15.3 {
		t.Fatalf("unexpected money split: %+v", booking)
	}
	if booking.LessonID == "" {
		t.Fatal("expected booking to create a scheduled lesson")
	}
	if lesson, err := repository.Lesson(booking.LessonID); err != nil || lesson.Status != "scheduled" {
		t.Fatalf("expected scheduled lesson, got %+v (%v)", lesson, err)
	}
	if conversation, err := repository.Conversation(booking.ConversationID); err != nil || len(conversation.ParticipantIDs) != 2 {
		t.Fatalf("expected private booking conversation, got %+v (%v)", conversation, err)
	}
	if _, err := services.CreateBooking("student-mia-rogic", input); err == nil {
		t.Fatal("expected conflicting booking to fail")
	}
}

func TestMessageModerationRedactsContactAndCreatesTrustEvent(t *testing.T) {
	services, _ := testService(t)
	message, event, err := services.SendMessage("student-luka-petrovic", "conversation-luka-ana", SendMessageInput{Body: "Javi mi se na 091 234 5678 ili WhatsApp."})
	if err != nil {
		t.Fatalf("send message: %v", err)
	}
	if message.Moderation != "contact_blocked" {
		t.Fatalf("expected blocked moderation, got %s", message.Moderation)
	}
	if event == nil || event.Type != "contact_sharing_attempt" {
		t.Fatalf("expected trust event, got %+v", event)
	}
	if message.Body == "Javi mi se na 091 234 5678 ili WhatsApp." {
		t.Fatal("expected contact data to be redacted")
	}
	if strings.Contains(strings.ToLower(message.Body), "whatsapp") || strings.Contains(message.Body, "091") {
		t.Fatalf("expected every contact signal to be redacted, got %q", message.Body)
	}
}

func TestTutorSearchRequiresOneOfferingToMatchEveryFilter(t *testing.T) {
	services, _ := testService(t)
	values, _ := services.SearchTutors(TutorSearch{Subject: "subject-german", Level: "Matura", Limit: 100})
	for _, value := range values {
		if value.UserID == "tutor-lucija-maric" {
			t.Fatal("German subject must not borrow the Matura level from the tutor's English offering")
		}
	}
	values, _ = services.SearchTutors(TutorSearch{Subject: "subject-economics", MaxPrice: 20, Limit: 100})
	for _, value := range values {
		if value.UserID == "tutor-filip-novak" {
			t.Fatal("Economics subject must not borrow the lower price from the tutor's math offering")
		}
	}
}

func TestTutorSearchUsesDeterministicSlugTieBreak(t *testing.T) {
	services, repository := testService(t)
	for _, fixture := range []struct {
		id   string
		slug string
		name string
	}{{id: "tutor-tie-z", slug: "z-tie", name: "Z Tie"}, {id: "tutor-tie-a", slug: "a-tie", name: "A Tie"}} {
		if err := repository.PutUser(domain.User{ID: fixture.id, Email: fixture.id + "@example.test", Name: fixture.name, Role: domain.RoleTutor, Status: "active", Locale: "hr-HR"}); err != nil {
			t.Fatalf("put tie user: %v", err)
		}
		if err := repository.PutTutor(domain.TutorProfile{
			UserID: fixture.id, Slug: fixture.slug, Headline: "deterministic tie probe", Rating: 4.8, ReviewCount: 20,
			RepeatRate: 80, ResponseMinutes: 20, LessonsCompleted: 100, Verified: true,
			Subjects: []domain.TutorSubject{{SubjectID: "subject-math", PriceEUR: 20, Levels: []string{"Srednja škola"}}},
		}); err != nil {
			t.Fatalf("put tie tutor: %v", err)
		}
	}
	values, total := services.SearchTutors(TutorSearch{Query: "deterministic tie probe", Subject: "subject-math", Level: "Srednja škola", Limit: 10})
	if total != 2 || len(values) != 2 || values[0].Slug != "a-tie" || values[1].Slug != "z-tie" {
		t.Fatalf("expected deterministic slug order, got %+v", values)
	}
}

func TestTutorRegistrationUsesCanonicalLevelsAndSecondaryDefault(t *testing.T) {
	services, repository := testService(t)
	result, err := services.Register(RegisterInput{
		Name: "Maja Default", Email: "maja.default@example.test", Password: "Sigurna2026!", Role: domain.RoleTutor,
		AcceptedTerms: true, SubjectIDs: []string{"subject-math"}, PriceEUR: 20,
	})
	if err != nil {
		t.Fatalf("register tutor with default level: %v", err)
	}
	profile, _, err := repository.Tutor(result.User.ID)
	if err != nil || len(profile.Subjects) != 1 || len(profile.Subjects[0].Levels) != 1 || profile.Subjects[0].Levels[0] != "Srednja škola" {
		t.Fatalf("expected secondary-only legacy offering, got %+v (%v)", profile, err)
	}

	result, err = services.Register(RegisterInput{
		Name: "Maja Jezici", Email: "maja.jezici@example.test", Password: "Sigurna2026!", Role: domain.RoleTutor,
		AcceptedTerms: true, SubjectIDs: []string{"subject-english"}, Levels: []string{"matura", "odrasli"}, PriceEUR: 22,
	})
	if err != nil {
		t.Fatalf("register tutor with canonical levels: %v", err)
	}
	profile, _, _ = repository.Tutor(result.User.ID)
	if got := strings.Join(profile.Subjects[0].Levels, ","); got != "Matura,Odrasli" {
		t.Fatalf("canonical IDs must persist as compatible labels, got %q", got)
	}

	if _, err := services.Register(RegisterInput{
		Name: "Maja Invalid", Email: "maja.invalid@example.test", Password: "Sigurna2026!", Role: domain.RoleTutor,
		AcceptedTerms: true, SubjectIDs: []string{"subject-math"}, Levels: []string{"odrasli"}, PriceEUR: 20,
	}); err == nil {
		t.Fatal("expected a level with no subject intersection to be rejected")
	}
}

func TestCreateReviewPreservesHistoricalAggregate(t *testing.T) {
	services, repository := testService(t)
	booking := domain.Booking{
		ID: "booking-review-regression", StudentID: "student-mia-rogic", TutorID: "tutor-ana-kovac", SubjectID: "subject-math",
		StartsAt: time.Date(2026, 7, 1, 10, 0, 0, 0, time.UTC), EndsAt: time.Date(2026, 7, 1, 11, 0, 0, 0, time.UTC), Status: "completed", PaymentStatus: "paid",
	}
	if err := repository.PutBooking(booking); err != nil {
		t.Fatalf("put completed booking: %v", err)
	}
	if _, err := services.CreateReview("student-mia-rogic", CreateReviewInput{BookingID: booking.ID, Rating: 4, Comment: "Vrlo dobar sat."}); err != nil {
		t.Fatalf("create review: %v", err)
	}
	tutor, _, _ := repository.Tutor("tutor-ana-kovac")
	if tutor.ReviewCount != 185 || tutor.Rating != 4.97 {
		t.Fatalf("historical aggregate must be updated, not reset: rating=%v count=%d", tutor.Rating, tutor.ReviewCount)
	}
}

func TestGoogleRequestedTutorRoleSurvivesOAuthStateAndExistingRoleWins(t *testing.T) {
	services, repository := testService(t)
	authorizationURL, err := services.NewGoogleAuthorization(GoogleOAuthConfig{ClientID: "client", RedirectURL: "https://api.example.test/callback"}, "/profesor", domain.RoleTutor)
	if err != nil {
		t.Fatalf("create authorization: %v", err)
	}
	parsed, err := url.Parse(authorizationURL)
	if err != nil {
		t.Fatalf("parse authorization URL: %v", err)
	}
	stored, err := services.consumeOAuthState(parsed.Query().Get("state"))
	if err != nil || stored.Role != domain.RoleTutor || stored.ReturnTo != "/profesor" {
		t.Fatalf("requested tutor role was not bound to OAuth state: %+v (%v)", stored, err)
	}

	identity := GoogleIdentity{Subject: "google-tutor", Email: "google.tutor@example.test", EmailVerified: true, Name: "Google Tutor", Picture: "https://example.test/avatar.jpg"}
	created, err := services.loginGoogleIdentity(identity, domain.RoleTutor)
	if err != nil || created.User.Role != domain.RoleTutor {
		t.Fatalf("create Google tutor: %+v (%v)", created, err)
	}
	if _, _, err := repository.Tutor(created.User.ID); err != nil {
		t.Fatalf("Google tutor profile missing: %v", err)
	}
	if _, _, err := repository.Student(created.User.ID); err == nil {
		t.Fatal("Google tutor must not receive a student profile")
	}
	existing, err := services.loginGoogleIdentity(identity, domain.RoleStudent)
	if err != nil || existing.User.Role != domain.RoleTutor || existing.User.ID != created.User.ID {
		t.Fatalf("existing Google user role must not be overwritten: %+v (%v)", existing, err)
	}
}

func TestRegisterCreatesStudentAndSession(t *testing.T) {
	services, _ := testService(t)
	result, err := services.Register(RegisterInput{
		Name: "Petra Horvat", Email: "petra@example.test", Password: "Sigurna2026!",
		Role: domain.RoleStudent, AcceptedTerms: true, Grade: "3. razred gimnazije",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if result.Token == "" || result.Dashboard != "/ucenik" || result.User.Role != domain.RoleStudent {
		t.Fatalf("unexpected auth result: %+v", result)
	}
	authenticated, err := services.Authenticate(result.Token)
	if err != nil || authenticated.Email != "petra@example.test" {
		t.Fatalf("expected session to authenticate Petra, got %+v (%v)", authenticated, err)
	}
	if _, err := services.Register(RegisterInput{
		Name: "Druga Petra", Email: "petra@example.test", Password: "Sigurna2026!",
		Role: domain.RoleStudent, AcceptedTerms: true,
	}); err == nil {
		t.Fatal("expected duplicate email registration to fail")
	}
}

func TestLoginDemoCredentialAndLogout(t *testing.T) {
	services, _ := testService(t)
	result, err := services.Login(LoginInput{Email: "luka.petrovic@example.test", Password: demoPassword})
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if _, err := services.Authenticate(result.Token); err != nil {
		t.Fatalf("authenticate: %v", err)
	}
	services.Logout(result.Token)
	if _, err := services.Authenticate(result.Token); err == nil {
		t.Fatal("expected logged out session to be invalid")
	}
	if _, err := services.Login(LoginInput{Email: "luka.petrovic@example.test", Password: "pogresna"}); err == nil {
		t.Fatal("expected invalid password to fail")
	}
}

func TestRegisteredAccountAndSessionSurviveRestart(t *testing.T) {
	temporary := t.TempDir()
	snapshotPath := filepath.Join(temporary, "runtime.snapshot.json")
	authPath := filepath.Join(temporary, "auth.runtime.json")

	repository, err := store.Load("../../data/seed.json", snapshotPath)
	if err != nil {
		t.Fatalf("load seed: %v", err)
	}
	first, err := NewPersistent(repository, 0.15, authPath)
	if err != nil {
		t.Fatalf("create persistent service: %v", err)
	}
	registered, err := first.Register(RegisterInput{Name: "Petra Trajna", Email: "petra.trajna@example.test", Password: "Sigurna2026!", Role: domain.RoleStudent, AcceptedTerms: true, Grade: "3. razred"})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	restartedRepository, err := store.Load("../../data/seed.json", snapshotPath)
	if err != nil {
		t.Fatalf("reload snapshot: %v", err)
	}
	restarted, err := NewPersistent(restartedRepository, 0.15, authPath)
	if err != nil {
		t.Fatalf("reload auth state: %v", err)
	}
	if _, err := restarted.Login(LoginInput{Email: "petra.trajna@example.test", Password: "Sigurna2026!"}); err != nil {
		t.Fatalf("login after restart: %v", err)
	}
	user, err := restarted.Authenticate(registered.Token)
	if err != nil || user.Email != "petra.trajna@example.test" {
		t.Fatalf("persistent session failed: %+v (%v)", user, err)
	}
	restarted.Logout(registered.Token)

	thirdRepository, _ := store.Load("../../data/seed.json", snapshotPath)
	third, err := NewPersistent(thirdRepository, 0.15, authPath)
	if err != nil {
		t.Fatalf("third restart: %v", err)
	}
	if _, err := third.Authenticate(registered.Token); err == nil {
		t.Fatal("expected persisted logout to revoke the old session")
	}

	productionRepository, _ := store.Load("../../data/seed.json", snapshotPath)
	production, err := NewPersistentWithDemo(productionRepository, 0.15, authPath, false)
	if err != nil {
		t.Fatalf("production-mode restart: %v", err)
	}
	if _, err := production.Login(LoginInput{Email: "petra.trajna@example.test", Password: "Sigurna2026!"}); err != nil {
		t.Fatalf("real registered account should work without demo mode: %v", err)
	}
	if _, err := production.Login(LoginInput{Email: "luka.petrovic@example.test", Password: demoPassword}); err == nil {
		t.Fatal("seed demo credential must be disabled outside demo mode")
	}
}
