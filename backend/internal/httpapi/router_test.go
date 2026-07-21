package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"gaudeamus/mentor-api/internal/service"
	"gaudeamus/mentor-api/internal/store"
)

func testRouter(t *testing.T) http.Handler {
	t.Helper()
	repository, err := store.Load("../../data/seed.json", "")
	if err != nil {
		t.Fatalf("load seed: %v", err)
	}
	return NewRouter(repository, service.New(repository, 0.15), Config{AllowedOrigins: []string{"http://localhost:3000"}, DemoMode: true, Version: "test"})
}

func TestHealthAndTutorSearch(t *testing.T) {
	router := testRouter(t)
	for _, path := range []string{"/health", "/api/v1/tutors?subject=matematika"} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if response.Code != http.StatusOK {
			t.Fatalf("%s returned %d: %s", path, response.Code, response.Body.String())
		}
	}
}

func TestEducationLevelsMetaAndCanonicalLevelSearch(t *testing.T) {
	router := testRouter(t)
	for _, path := range []string{"/api/v1/education-levels", "/api/v1/meta", "/api/v1/tutors?level=srednja-skola"} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if response.Code != http.StatusOK {
			t.Fatalf("%s returned %d: %s", path, response.Code, response.Body.String())
		}
		if path == "/api/v1/education-levels" && !bytes.Contains(response.Body.Bytes(), []byte(`"id":"srednja-skola"`)) {
			t.Fatalf("education levels missing canonical default: %s", response.Body.String())
		}
		if path == "/api/v1/meta" && !bytes.Contains(response.Body.Bytes(), []byte(`"defaultEducationLevelId":"srednja-skola"`)) {
			t.Fatalf("meta missing default education level: %s", response.Body.String())
		}
	}
}

func TestTutorSearchRejectsUnsafeQueryParameters(t *testing.T) {
	router := testRouter(t)
	for _, path := range []string{
		"/api/v1/tutors?offset=-1",
		"/api/v1/tutors?limit=0",
		"/api/v1/tutors?limit=101",
		"/api/v1/tutors?minPrice=nope",
		"/api/v1/tutors?minPrice=25&maxPrice=20",
		"/api/v1/tutors?verified=maybe",
		"/api/v1/tutors?level=nepoznata-razina",
	} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if response.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s returned %d, expected 422: %s", path, response.Code, response.Body.String())
		}
	}
}

func TestGoogleStartCarriesRequestedTutorRole(t *testing.T) {
	router := testRouter(t)
	request := httptest.NewRequest(http.MethodGet, "/api/v1/auth/google/start?returnTo=%2Fprofesor&role=tutor", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusTemporaryRedirect || response.Header().Get("Location") != "/auth/google-demo?returnTo=%2Fprofesor&role=tutor" {
		t.Fatalf("unexpected tutor Google redirect: %d %q", response.Code, response.Header().Get("Location"))
	}

	invalidRequest := httptest.NewRequest(http.MethodGet, "/api/v1/auth/google/start?role=admin", nil)
	invalidResponse := httptest.NewRecorder()
	router.ServeHTTP(invalidResponse, invalidRequest)
	if invalidResponse.Code != http.StatusUnprocessableEntity {
		t.Fatalf("invalid Google role returned %d: %s", invalidResponse.Code, invalidResponse.Body.String())
	}
}

func TestProtectedRouteRequiresDemoIdentity(t *testing.T) {
	router := testRouter(t)
	request := httptest.NewRequest(http.MethodGet, "/api/v1/bookings", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", response.Code)
	}
}

func TestConversationRejectsUnrelatedStudent(t *testing.T) {
	router := testRouter(t)
	request := httptest.NewRequest(http.MethodGet, "/api/v1/conversations/conversation-luka-ana/messages", nil)
	request.Header.Set("X-Demo-User-ID", "student-mia-rogic")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", response.Code, response.Body.String())
	}
}

func TestPasswordLoginSetsSessionCookie(t *testing.T) {
	router := testRouter(t)
	payload, _ := json.Marshal(map[string]string{"email": "luka.petrovic@example.test", "password": "Gaudeamus2026!"})
	loginRequest := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(payload))
	loginRequest.Header.Set("Content-Type", "application/json")
	loginResponse := httptest.NewRecorder()
	router.ServeHTTP(loginResponse, loginRequest)
	if loginResponse.Code != http.StatusOK {
		t.Fatalf("login returned %d: %s", loginResponse.Code, loginResponse.Body.String())
	}
	cookies := loginResponse.Result().Cookies()
	if len(cookies) == 0 || cookies[0].Name != "gm_session" || !cookies[0].HttpOnly {
		t.Fatalf("expected HttpOnly session cookie, got %+v", cookies)
	}
	sessionRequest := httptest.NewRequest(http.MethodGet, "/api/v1/auth/session", nil)
	sessionRequest.AddCookie(cookies[0])
	sessionResponse := httptest.NewRecorder()
	router.ServeHTTP(sessionResponse, sessionRequest)
	if sessionResponse.Code != http.StatusOK {
		t.Fatalf("session returned %d: %s", sessionResponse.Code, sessionResponse.Body.String())
	}

	conversationRequest := httptest.NewRequest(http.MethodGet, "/api/v1/conversations", nil)
	conversationRequest.AddCookie(cookies[0])
	conversationResponse := httptest.NewRecorder()
	router.ServeHTTP(conversationResponse, conversationRequest)
	if conversationResponse.Code != http.StatusOK {
		t.Fatalf("conversations returned %d: %s", conversationResponse.Code, conversationResponse.Body.String())
	}

	updatePayload, _ := json.Marshal(map[string]string{"name": "Luka Petrović", "locale": "hr-HR"})
	updateRequest := httptest.NewRequest(http.MethodPatch, "/api/v1/users/me", bytes.NewReader(updatePayload))
	updateRequest.Header.Set("Content-Type", "application/json")
	updateRequest.AddCookie(cookies[0])
	updateResponse := httptest.NewRecorder()
	router.ServeHTTP(updateResponse, updateRequest)
	if updateResponse.Code != http.StatusOK {
		t.Fatalf("update profile returned %d: %s", updateResponse.Code, updateResponse.Body.String())
	}
}

func TestDemoGoogleLoginSetsCookie(t *testing.T) {
	router := testRouter(t)
	payload, _ := json.Marshal(map[string]string{"email": "ana.kovac@example.test"})
	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/google/demo", bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusOK || len(response.Result().Cookies()) == 0 {
		t.Fatalf("Google demo login returned %d: %s", response.Code, response.Body.String())
	}
}
