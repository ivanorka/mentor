package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"gaudeamus/mentor-api/internal/domain"
)

func TestSeedIntegrityAndComputedTutorCounts(t *testing.T) {
	repository, err := Load("../../data/seed.json", "")
	if err != nil {
		t.Fatalf("load seed: %v", err)
	}
	levels := repository.EducationLevels()
	if len(levels) != 5 || levels[1].ID != domain.DefaultEducationLevelID || !levels[1].IsDefault {
		t.Fatalf("unexpected education levels: %+v", levels)
	}
	for index, expected := range []string{"osnovna-skola", "srednja-skola", "matura", "fakultet", "odrasli"} {
		if levels[index].ID != expected {
			t.Fatalf("education level %d: got %q, expected %q", index, levels[index].ID, expected)
		}
	}
	if counts := repository.Counts(); counts["subjects"] != 20 || counts["tutors"] != 20 || counts["students"] != 20 {
		t.Fatalf("unexpected expanded seed counts: %+v", counts)
	}

	knownLevels := make(map[string]bool, len(levels))
	for _, level := range levels {
		knownLevels[level.Name] = true
	}
	for _, subject := range repository.Subjects() {
		if subject.TutorCount < 1 {
			t.Errorf("subject %s has no real tutor offering", subject.ID)
		}
		for _, level := range subject.Levels {
			if !knownLevels[level] {
				t.Errorf("subject %s uses unknown level %q", subject.ID, level)
			}
		}
	}
	for _, tutor := range repository.Tutors() {
		user, err := repository.User(tutor.UserID)
		if err != nil || user.Role != domain.RoleTutor {
			t.Errorf("tutor profile %s has no tutor user", tutor.UserID)
		}
		for _, offering := range tutor.Subjects {
			subject, err := repository.Subject(offering.SubjectID)
			if err != nil {
				t.Errorf("tutor %s references missing subject %s", tutor.UserID, offering.SubjectID)
				continue
			}
			for _, level := range offering.Levels {
				if !containsString(subject.Levels, level) {
					t.Errorf("tutor %s offers unsupported level %q for %s", tutor.UserID, level, subject.ID)
				}
			}
		}
	}
	for _, student := range repository.Students() {
		user, err := repository.User(student.UserID)
		if err != nil || user.Role != domain.RoleStudent {
			t.Errorf("student profile %s has no student user", student.UserID)
		}
		for _, mastery := range student.Mastery {
			if _, err := repository.Subject(mastery.SubjectID); err != nil {
				t.Errorf("student %s references missing mastery subject %s", student.UserID, mastery.SubjectID)
			}
		}
	}
	for _, tutorID := range []string{"tutor-marina-lerotic", "tutor-luka-benedetti", "tutor-sofia-martin", "tutor-tomislav-kralj", "tutor-andrea-pavic", "tutor-matija-saric", "tutor-helena-basic", "tutor-damjan-vukic"} {
		future := false
		for _, slot := range repository.Availability(tutorID) {
			if slot.Status == "open" && slot.StartsAt.After(time.Date(2026, 7, 22, 0, 0, 0, 0, time.UTC)) {
				future = true
				break
			}
		}
		if !future {
			t.Errorf("new tutor %s has no future open availability", tutorID)
		}
	}

	chemistry, err := repository.Subject("subject-chemistry")
	if err != nil || chemistry.TutorCount != 1 {
		t.Fatalf("tutorCount must be computed from offerings, got %+v (%v)", chemistry, err)
	}
}

func TestLoadMergesNewSeedCatalogWithRuntimeSnapshot(t *testing.T) {
	temporary := t.TempDir()
	seedPath := filepath.Join(temporary, "seed.json")
	snapshotPath := filepath.Join(temporary, "runtime.snapshot.json")
	now := time.Date(2026, 7, 22, 12, 0, 0, 0, time.UTC)
	seed := domain.SeedData{
		EducationLevels: []domain.EducationLevel{{ID: domain.DefaultEducationLevelID, Name: "Srednja škola", SortOrder: 20, IsDefault: true}},
		Users: []domain.User{
			{ID: "tutor-seed", Email: "seed@example.test", Name: "Seed Tutor", Role: domain.RoleTutor, Status: "active", CreatedAt: now},
			{ID: "tutor-new", Email: "new@example.test", Name: "New Tutor", Role: domain.RoleTutor, Status: "active", CreatedAt: now},
		},
		Subjects: []domain.Subject{
			{ID: "subject-old", Slug: "old", Name: "Updated catalog name", Levels: []string{"Srednja škola"}, TutorCount: 99},
			{ID: "subject-new", Slug: "new", Name: "New catalog subject", Levels: []string{"Srednja škola"}},
		},
		Tutors: []domain.TutorProfile{
			{UserID: "tutor-seed", Slug: "seed", Subjects: []domain.TutorSubject{{SubjectID: "subject-old", PriceEUR: 20, Levels: []string{"Srednja škola"}}}},
			{UserID: "tutor-new", Slug: "new", Subjects: []domain.TutorSubject{{SubjectID: "subject-new", PriceEUR: 21, Levels: []string{"Srednja škola"}}}},
		},
	}
	runtime := domain.SeedData{
		Users: []domain.User{
			{ID: "tutor-seed", Email: "seed@example.test", Name: "Runtime name", Role: domain.RoleTutor, Status: "active", CreatedAt: now},
			{ID: "student-runtime", Email: "runtime@example.test", Name: "Registered Student", Role: domain.RoleStudent, Status: "active", CreatedAt: now},
		},
		Subjects: []domain.Subject{{ID: "subject-old", Slug: "old", Name: "Stale snapshot name", Levels: []string{"Srednja škola"}}},
		Students: []domain.StudentProfile{{UserID: "student-runtime", Grade: "3. razred"}},
		Bookings: []domain.Booking{{ID: "booking-runtime", StudentID: "student-runtime", TutorID: "tutor-seed", SubjectID: "subject-old", StartsAt: now, EndsAt: now.Add(time.Hour), Status: "confirmed"}},
	}
	writeSeedFixture(t, seedPath, seed)
	writeSeedFixture(t, snapshotPath, runtime)

	repository, err := Load(seedPath, snapshotPath)
	if err != nil {
		t.Fatalf("load merged store: %v", err)
	}
	if subject, err := repository.Subject("subject-old"); err != nil || subject.Name != "Updated catalog name" || subject.TutorCount != 1 {
		t.Fatalf("seed catalog must win while counts stay derived: %+v (%v)", subject, err)
	}
	if _, err := repository.Subject("subject-new"); err != nil {
		t.Fatalf("new seed subject missing: %v", err)
	}
	if user, err := repository.User("student-runtime"); err != nil || user.Name != "Registered Student" {
		t.Fatalf("registered runtime user was not preserved: %+v (%v)", user, err)
	}
	if user, err := repository.User("tutor-seed"); err != nil || user.Name != "Runtime name" {
		t.Fatalf("runtime user updates must survive catalog merge: %+v (%v)", user, err)
	}
	if _, _, err := repository.Tutor("tutor-new"); err != nil {
		t.Fatalf("new seed tutor missing: %v", err)
	}
	if _, err := repository.Booking("booking-runtime"); err != nil {
		t.Fatalf("runtime transaction was not preserved: %v", err)
	}
}

func writeSeedFixture(t *testing.T, path string, value domain.SeedData) {
	t.Helper()
	data, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("encode fixture: %v", err)
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
