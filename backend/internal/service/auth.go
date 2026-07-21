package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode"

	"golang.org/x/crypto/bcrypt"

	"gaudeamus/mentor-api/internal/domain"
	"gaudeamus/mentor-api/internal/store"
)

const demoPassword = "Gaudeamus2026!"

type credential struct {
	UserID       string
	PasswordHash []byte
	Demo         bool
}

type session struct {
	UserID    string
	ExpiresAt time.Time
}

type oauthState struct {
	Nonce     string
	ReturnTo  string
	Role      domain.Role
	ExpiresAt time.Time
}

type authState struct {
	Version     int                   `json:"version"`
	Credentials map[string]credential `json:"credentials"`
	Sessions    map[string]session    `json:"sessions"`
}

type RegisterInput struct {
	Name          string      `json:"name" binding:"required"`
	Email         string      `json:"email" binding:"required"`
	Password      string      `json:"password" binding:"required"`
	Role          domain.Role `json:"role" binding:"required"`
	AcceptedTerms bool        `json:"acceptedTerms"`
	Grade         string      `json:"grade"`
	School        string      `json:"school"`
	Goals         []string    `json:"goals"`
	Headline      string      `json:"headline"`
	Bio           string      `json:"bio"`
	SubjectIDs    []string    `json:"subjectIds"`
	Levels        []string    `json:"levels"`
	PriceEUR      float64     `json:"priceEur"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthResult struct {
	User      domain.User `json:"user"`
	Token     string      `json:"-"`
	ExpiresAt time.Time   `json:"expiresAt"`
	Dashboard string      `json:"dashboard"`
}

type GoogleOAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type GoogleIdentity struct {
	Subject       string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

func (s *Service) initializeDemoCredentials() {
	hash, err := bcrypt.GenerateFromPassword([]byte(demoPassword), bcrypt.DefaultCost)
	if err != nil {
		return
	}
	s.authMu.Lock()
	defer s.authMu.Unlock()
	for _, user := range s.store.SeedUsers() {
		s.credentials[strings.ToLower(user.Email)] = credential{UserID: user.ID, PasswordHash: hash, Demo: true}
	}
}

func (s *Service) Register(input RegisterInput) (AuthResult, error) {
	name := strings.TrimSpace(input.Name)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if len([]rune(name)) < 3 {
		return AuthResult{}, validation("Ime i prezime moraju imati najmanje 3 znaka.")
	}
	if !validEmail(email) {
		return AuthResult{}, validation("Unesite valjanu e-mail adresu.")
	}
	if input.Role != domain.RoleStudent && input.Role != domain.RoleTutor {
		return AuthResult{}, validation("Odaberite ulogu učenika ili profesora.")
	}
	if !input.AcceptedTerms {
		return AuthResult{}, validation("Potrebno je prihvatiti uvjete korištenja i pravila privatnosti.")
	}
	if err := validatePassword(input.Password); err != nil {
		return AuthResult{}, err
	}
	if _, err := s.store.UserByEmail(email); err == nil {
		return AuthResult{}, conflict("Račun s ovom e-mail adresom već postoji.")
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return AuthResult{}, fmt.Errorf("hash password: %w", err)
	}
	identifier, err := randomToken(8)
	if err != nil {
		return AuthResult{}, err
	}
	userID := string(input.Role) + "-" + strings.ToLower(identifier[:10])
	user := domain.User{ID: userID, Email: email, Name: name, Role: input.Role, Status: "active", Locale: "hr-HR", EmailVerified: false, AuthProvider: "password", CreatedAt: s.now()}

	var student *domain.StudentProfile
	var tutor *domain.TutorProfile
	if input.Role == domain.RoleStudent {
		student = &domain.StudentProfile{UserID: userID, Grade: strings.TrimSpace(input.Grade), School: strings.TrimSpace(input.School), Goals: input.Goals, Preferences: []string{"Objašnjenje korak po korak"}, Mastery: []domain.TopicMastery{}}
	} else {
		if len(input.SubjectIDs) == 0 {
			return AuthResult{}, validation("Profesor mora odabrati barem jedan predmet.")
		}
		if input.PriceEUR < 10 || input.PriceEUR > 100 {
			return AuthResult{}, validation("Cijena sata mora biti između 10 i 100 €.")
		}
		requestedLevels := input.Levels
		if len(requestedLevels) == 0 {
			requestedLevels = []string{domain.DefaultEducationLevelID}
		}
		levelNames := make([]string, 0, len(requestedLevels))
		for _, requested := range requestedLevels {
			level, levelErr := s.store.EducationLevel(strings.TrimSpace(requested))
			if levelErr != nil {
				return AuthResult{}, validation("Odabrana je nepoznata razina obrazovanja.")
			}
			if !containsFold(levelNames, level.Name) {
				levelNames = append(levelNames, level.Name)
			}
		}
		offerings := make([]domain.TutorSubject, 0, len(input.SubjectIDs))
		for _, subjectID := range input.SubjectIDs {
			subject, subjectErr := s.store.Subject(subjectID)
			if subjectErr != nil {
				return AuthResult{}, validation("Odabran je nepoznat predmet.")
			}
			offeringLevels := make([]string, 0, len(levelNames))
			for _, levelName := range levelNames {
				if containsFold(subject.Levels, levelName) {
					offeringLevels = append(offeringLevels, levelName)
				}
			}
			if len(offeringLevels) == 0 {
				return AuthResult{}, validation("Odabrana razina nije dostupna za predmet " + subject.Name + ".")
			}
			offerings = append(offerings, domain.TutorSubject{SubjectID: subject.ID, PriceEUR: input.PriceEUR, Levels: offeringLevels})
		}
		tutor = &domain.TutorProfile{UserID: userID, Slug: slugify(name) + "-" + strings.ToLower(identifier[:4]), Headline: strings.TrimSpace(input.Headline), Bio: strings.TrimSpace(input.Bio), Subjects: offerings, Languages: []string{"Hrvatski"}, Badge: "Novi mentor", Verified: false, ResponseMinutes: 60, ReputationScore: 50}
	}
	s.authMu.Lock()
	s.credentials[email] = credential{UserID: userID, PasswordHash: passwordHash}
	if err := s.persistAuthLocked(); err != nil {
		delete(s.credentials, email)
		s.authMu.Unlock()
		return AuthResult{}, fmt.Errorf("persist credential: %w", err)
	}
	s.authMu.Unlock()
	if err := s.store.CreateAccount(user, student, tutor); err != nil {
		s.authMu.Lock()
		delete(s.credentials, email)
		_ = s.persistAuthLocked()
		s.authMu.Unlock()
		if strings.Contains(err.Error(), "email") {
			return AuthResult{}, conflict("Račun s ovom e-mail adresom već postoji.")
		}
		return AuthResult{}, err
	}
	return s.createSession(user)
}

func (s *Service) Login(input LoginInput) (AuthResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	s.authMu.RLock()
	stored, ok := s.credentials[email]
	s.authMu.RUnlock()
	if !ok || bcrypt.CompareHashAndPassword(stored.PasswordHash, []byte(input.Password)) != nil {
		return AuthResult{}, &Error{Code: "invalid_credentials", Message: "E-mail ili lozinka nisu ispravni.", Status: http.StatusUnauthorized}
	}
	user, err := s.store.User(stored.UserID)
	if err != nil || user.Status != "active" {
		return AuthResult{}, forbidden("Račun nije aktivan.")
	}
	return s.createSession(user)
}

func (s *Service) Authenticate(rawToken string) (domain.User, error) {
	if rawToken == "" {
		return domain.User{}, store.ErrNotFound
	}
	key := tokenHash(rawToken)
	s.authMu.RLock()
	stored, ok := s.sessions[key]
	s.authMu.RUnlock()
	if !ok || stored.ExpiresAt.Before(s.now()) {
		if ok {
			s.authMu.Lock()
			delete(s.sessions, key)
			_ = s.persistAuthLocked()
			s.authMu.Unlock()
		}
		return domain.User{}, store.ErrNotFound
	}
	return s.store.User(stored.UserID)
}

func (s *Service) Logout(rawToken string) {
	if rawToken == "" {
		return
	}
	s.authMu.Lock()
	delete(s.sessions, tokenHash(rawToken))
	_ = s.persistAuthLocked()
	s.authMu.Unlock()
}

func (s *Service) createSession(user domain.User) (AuthResult, error) {
	raw, err := randomToken(32)
	if err != nil {
		return AuthResult{}, err
	}
	expires := s.now().Add(7 * 24 * time.Hour)
	s.authMu.Lock()
	s.sessions[tokenHash(raw)] = session{UserID: user.ID, ExpiresAt: expires}
	if err := s.persistAuthLocked(); err != nil {
		delete(s.sessions, tokenHash(raw))
		s.authMu.Unlock()
		return AuthResult{}, fmt.Errorf("persist session: %w", err)
	}
	s.authMu.Unlock()
	return AuthResult{User: user, Token: raw, ExpiresAt: expires, Dashboard: dashboardFor(user.Role)}, nil
}

func (s *Service) NewGoogleAuthorization(config GoogleOAuthConfig, returnTo string, requestedRoles ...domain.Role) (string, error) {
	requestedRole := domain.RoleStudent
	if len(requestedRoles) > 0 {
		requestedRole = requestedRoles[0]
	}
	if requestedRole != domain.RoleStudent && requestedRole != domain.RoleTutor {
		return "", validation("Google registracija podržava samo učenika ili profesora.")
	}
	state, err := randomToken(32)
	if err != nil {
		return "", err
	}
	nonce, err := randomToken(24)
	if err != nil {
		return "", err
	}
	s.authMu.Lock()
	s.oauthStates[tokenHash(state)] = oauthState{Nonce: nonce, ReturnTo: sanitizeReturnTo(returnTo), Role: requestedRole, ExpiresAt: s.now().Add(10 * time.Minute)}
	s.authMu.Unlock()
	values := url.Values{"client_id": {config.ClientID}, "redirect_uri": {config.RedirectURL}, "response_type": {"code"}, "scope": {"openid email profile"}, "state": {state}, "nonce": {nonce}, "prompt": {"select_account"}, "include_granted_scopes": {"true"}}
	return "https://accounts.google.com/o/oauth2/v2/auth?" + values.Encode(), nil
}

func (s *Service) CompleteGoogleAuthorization(ctx context.Context, config GoogleOAuthConfig, state, code string) (AuthResult, string, error) {
	stored, err := s.consumeOAuthState(state)
	if err != nil {
		return AuthResult{}, "/", err
	}
	identity, err := exchangeGoogleIdentity(ctx, config, code)
	if err != nil {
		return AuthResult{}, stored.ReturnTo, err
	}
	if !identity.EmailVerified || !validEmail(identity.Email) {
		return AuthResult{}, stored.ReturnTo, forbidden("Google e-mail nije potvrđen.")
	}
	result, err := s.loginGoogleIdentity(identity, stored.Role)
	return result, stored.ReturnTo, err
}

func (s *Service) GoogleDemo(email string) (AuthResult, error) {
	user, err := s.store.UserByEmail(email)
	if err != nil {
		return AuthResult{}, notFound("Demo Google račun")
	}
	user.EmailVerified = true
	if !strings.Contains(user.AuthProvider, "google") {
		user.AuthProvider += ",google"
	}
	_ = s.store.PutUser(user)
	return s.createSession(user)
}

func (s *Service) consumeOAuthState(raw string) (oauthState, error) {
	key := tokenHash(raw)
	s.authMu.Lock()
	defer s.authMu.Unlock()
	stored, ok := s.oauthStates[key]
	delete(s.oauthStates, key)
	if !ok || stored.ExpiresAt.Before(s.now()) {
		return oauthState{}, &Error{Code: "invalid_oauth_state", Message: "Google prijava je istekla ili nije valjana. Pokušajte ponovno.", Status: http.StatusUnauthorized}
	}
	return stored, nil
}

func (s *Service) loginGoogleIdentity(identity GoogleIdentity, requestedRole domain.Role) (AuthResult, error) {
	email := strings.ToLower(identity.Email)
	user, err := s.store.UserByEmail(email)
	if errors.Is(err, store.ErrNotFound) {
		if requestedRole != domain.RoleStudent && requestedRole != domain.RoleTutor {
			requestedRole = domain.RoleStudent
		}
		identifier, tokenErr := randomToken(8)
		if tokenErr != nil {
			return AuthResult{}, tokenErr
		}
		user = domain.User{ID: string(requestedRole) + "-" + strings.ToLower(identifier[:10]), Email: email, Name: strings.TrimSpace(identity.Name), Role: requestedRole, AvatarURL: identity.Picture, Status: "active", Locale: "hr-HR", EmailVerified: true, AuthProvider: "google", CreatedAt: s.now()}
		var student *domain.StudentProfile
		var tutor *domain.TutorProfile
		if requestedRole == domain.RoleTutor {
			tutor = &domain.TutorProfile{UserID: user.ID, Slug: slugify(user.Name) + "-" + strings.ToLower(identifier[:4]), Languages: []string{"Hrvatski"}, Badge: "Novi mentor", ResponseMinutes: 60, ReputationScore: 50}
		} else {
			student = &domain.StudentProfile{UserID: user.ID, Goals: []string{"Postaviti prvi cilj učenja"}, Preferences: []string{"Personalizirano objašnjenje"}, Mastery: []domain.TopicMastery{}}
		}
		if createErr := s.store.CreateAccount(user, student, tutor); createErr != nil {
			return AuthResult{}, createErr
		}
	} else if err != nil {
		return AuthResult{}, err
	} else {
		user.EmailVerified = true
		if identity.Picture != "" {
			user.AvatarURL = identity.Picture
		}
		if !strings.Contains(user.AuthProvider, "google") {
			user.AuthProvider += ",google"
		}
		_ = s.store.PutUser(user)
	}
	return s.createSession(user)
}

func exchangeGoogleIdentity(ctx context.Context, config GoogleOAuthConfig, code string) (GoogleIdentity, error) {
	form := url.Values{"code": {code}, "client_id": {config.ClientID}, "client_secret": {config.ClientSecret}, "redirect_uri": {config.RedirectURL}, "grant_type": {"authorization_code"}}
	request, _ := http.NewRequestWithContext(ctx, http.MethodPost, "https://oauth2.googleapis.com/token", strings.NewReader(form.Encode()))
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return GoogleIdentity{}, fmt.Errorf("google token exchange: %w", err)
	}
	defer response.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if response.StatusCode != http.StatusOK {
		return GoogleIdentity{}, &Error{Code: "google_oauth_failed", Message: "Google prijava nije uspjela. Pokušajte ponovno.", Status: http.StatusUnauthorized}
	}
	var token struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &token); err != nil || token.AccessToken == "" {
		return GoogleIdentity{}, errors.New("invalid Google token response")
	}
	userinfoRequest, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://openidconnect.googleapis.com/v1/userinfo", nil)
	userinfoRequest.Header.Set("Authorization", "Bearer "+token.AccessToken)
	userinfoResponse, err := http.DefaultClient.Do(userinfoRequest)
	if err != nil {
		return GoogleIdentity{}, fmt.Errorf("google userinfo: %w", err)
	}
	defer userinfoResponse.Body.Close()
	if userinfoResponse.StatusCode != http.StatusOK {
		return GoogleIdentity{}, errors.New("Google userinfo request failed")
	}
	var identity GoogleIdentity
	if err := json.NewDecoder(io.LimitReader(userinfoResponse.Body, 1<<20)).Decode(&identity); err != nil {
		return GoogleIdentity{}, err
	}
	return identity, nil
}

func validatePassword(password string) error {
	if len([]rune(password)) < 10 {
		return validation("Lozinka mora imati najmanje 10 znakova.")
	}
	var upper, lower, number bool
	for _, value := range password {
		upper = upper || unicode.IsUpper(value)
		lower = lower || unicode.IsLower(value)
		number = number || unicode.IsDigit(value)
	}
	if !upper || !lower || !number {
		return validation("Lozinka mora sadržavati veliko slovo, malo slovo i broj.")
	}
	return nil
}

func validEmail(email string) bool {
	return regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`).MatchString(email)
}
func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.NewReplacer("č", "c", "ć", "c", "ž", "z", "š", "s", "đ", "d", " ", "-").Replace(value)
	return regexp.MustCompile(`[^a-z0-9-]+`).ReplaceAllString(value, "")
}
func sanitizeReturnTo(value string) string {
	if strings.HasPrefix(value, "/") && !strings.HasPrefix(value, "//") {
		return value
	}
	return "/ucenik"
}
func dashboardFor(role domain.Role) string {
	if role == domain.RoleTutor {
		return "/profesor"
	}
	if role == domain.RoleAdmin {
		return "/admin"
	}
	return "/ucenik"
}
func tokenHash(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
func randomToken(bytesCount int) (string, error) {
	data := make([]byte, bytesCount)
	if _, err := rand.Read(data); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(data), nil
}

func (s *Service) loadAuthState() error {
	if s.authStatePath == "" {
		return nil
	}
	data, err := os.ReadFile(s.authStatePath)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("read auth state: %w", err)
	}
	var state authState
	if err := json.Unmarshal(data, &state); err != nil {
		return fmt.Errorf("decode auth state: %w", err)
	}
	s.authMu.Lock()
	defer s.authMu.Unlock()
	for email, value := range state.Credentials {
		user, userErr := s.store.User(value.UserID)
		if userErr == nil && strings.EqualFold(user.Email, email) && len(value.PasswordHash) > 0 && (s.demoCredentials || !value.Demo) {
			s.credentials[strings.ToLower(email)] = value
		}
	}
	for hash, value := range state.Sessions {
		if value.ExpiresAt.After(s.now()) {
			if _, userErr := s.store.User(value.UserID); userErr == nil {
				s.sessions[hash] = value
			}
		}
	}
	return nil
}

func (s *Service) persistAuthLocked() error {
	if s.authStatePath == "" {
		return nil
	}
	state := authState{Version: 1, Credentials: make(map[string]credential, len(s.credentials)), Sessions: make(map[string]session, len(s.sessions))}
	for email, value := range s.credentials {
		state.Credentials[email] = value
	}
	for hash, value := range s.sessions {
		if value.ExpiresAt.After(s.now()) {
			state.Sessions[hash] = value
		}
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	directory := filepath.Dir(s.authStatePath)
	if err := os.MkdirAll(directory, 0o700); err != nil {
		return err
	}
	temporary := s.authStatePath + ".tmp"
	if err := os.WriteFile(temporary, data, 0o600); err != nil {
		return err
	}
	return os.Rename(temporary, s.authStatePath)
}
