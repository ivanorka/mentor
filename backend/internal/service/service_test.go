package service

import (
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
