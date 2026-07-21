package httpapi

import (
	"errors"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"gaudeamus/mentor-api/internal/domain"
	"gaudeamus/mentor-api/internal/service"
	"gaudeamus/mentor-api/internal/store"
)

type Config struct {
	AllowedOrigins     []string
	DemoMode           bool
	Version            string
	FrontendURL        string
	CookieSecure       bool
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
}

type API struct {
	service *service.Service
	store   *store.Store
	config  Config
}

type actorKey struct{}

func NewRouter(repository *store.Store, services *service.Service, config Config) *gin.Engine {
	api := &API{store: repository, service: services, config: config}
	router := gin.New()
	router.Use(gin.Recovery(), api.requestContext(), api.cors())
	router.GET("/health", api.health)

	v1 := router.Group("/api/v1")
	v1.GET("/meta", api.meta)
	v1.GET("/education-levels", api.educationLevels)
	v1.GET("/subjects", api.subjects)
	v1.GET("/subjects/:id", api.subject)
	v1.GET("/tutors", api.tutors)
	v1.GET("/tutors/:id", api.tutor)
	v1.GET("/tutors/:id/availability", api.availability)
	v1.GET("/tutors/:id/reviews", api.reviews)
	v1.GET("/demo/identities", api.demoIdentities)
	v1.POST("/auth/register", api.register)
	v1.POST("/auth/login", api.login)
	v1.POST("/auth/logout", api.logout)
	v1.GET("/auth/session", api.authSession)
	v1.POST("/auth/password/forgot", api.forgotPassword)
	v1.GET("/auth/google/start", api.googleStart)
	v1.GET("/auth/google/callback", api.googleCallback)
	v1.POST("/auth/google/demo", api.googleDemo)

	authenticated := v1.Group("")
	authenticated.Use(api.requireActor())
	authenticated.GET("/users/me", api.me)
	authenticated.PATCH("/users/me", api.updateMe)
	authenticated.GET("/students/:id", api.student)
	authenticated.GET("/bookings", api.bookings)
	authenticated.POST("/bookings", api.createBooking)
	authenticated.GET("/bookings/:id", api.booking)
	authenticated.POST("/bookings/:id/pay", api.payBooking)
	authenticated.PATCH("/bookings/:id/cancel", api.cancelBooking)
	authenticated.POST("/lessons/:id/start", api.startLesson)
	authenticated.POST("/lessons/:id/end", api.endLesson)
	authenticated.GET("/lessons/:id/learning-pack", api.learningPack)
	authenticated.GET("/conversations", api.conversations)
	authenticated.GET("/conversations/:id/messages", api.messages)
	authenticated.POST("/conversations/:id/messages", api.sendMessage)
	authenticated.POST("/reviews", api.createReview)
	authenticated.POST("/ai/tests", api.generateTest)
	authenticated.GET("/dashboards/student/:id", api.studentDashboard)
	authenticated.GET("/dashboards/tutor/:id", api.tutorDashboard)

	admin := authenticated.Group("/admin")
	admin.Use(api.requireRole(domain.RoleAdmin))
	admin.GET("/dashboard", api.adminDashboard)
	admin.GET("/trust-events", api.trustEvents)
	admin.GET("/dataset", api.dataset)
	return router
}

func (a *API) requestContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = "req-" + strconv.FormatInt(time.Now().UnixNano(), 36)
		}
		c.Header("X-Request-ID", requestID)
		if token, err := c.Cookie("gm_session"); err == nil {
			if user, authErr := a.service.Authenticate(token); authErr == nil {
				c.Set("actor", user)
			}
		}
		if _, authenticated := c.Get("actor"); !authenticated {
			if id := strings.TrimSpace(c.GetHeader("X-Demo-User-ID")); id != "" {
				if user, err := a.store.User(id); err == nil {
					c.Set("actor", user)
				}
			}
		}
		c.Next()
	}
}

func (a *API) cors() gin.HandlerFunc {
	allowed := make(map[string]bool, len(a.config.AllowedOrigins))
	for _, origin := range a.config.AllowedOrigins {
		allowed[strings.TrimSpace(origin)] = true
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Demo-User-ID, X-Request-ID")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func (a *API) requireActor() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := c.Get("actor"); !ok {
			fail(c, http.StatusUnauthorized, "unauthorized", "Prijavite se kako biste nastavili.")
			c.Abort()
			return
		}
		c.Next()
	}
}

func (a *API) requireRole(role domain.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		actor, _ := currentActor(c)
		if actor.Role != role {
			fail(c, http.StatusForbidden, "forbidden", "Ova akcija nije dostupna vašoj ulozi.")
			c.Abort()
			return
		}
		c.Next()
	}
}

func (a *API) health(c *gin.Context) {
	ok(c, gin.H{"status": "ok", "service": "gaudeamus-mentor-api", "version": a.config.Version, "time": time.Now().UTC()})
}

func (a *API) meta(c *gin.Context) {
	ok(c, gin.H{
		"name": "Gaudeamus Mentor API", "version": a.config.Version, "environment": "prototype",
		"platformFeeRate": 0.15, "currency": "EUR", "locale": "hr-HR", "demoMode": a.config.DemoMode,
		"defaultEducationLevelId": domain.DefaultEducationLevelID,
		"capabilities":            []string{"marketplace", "booking", "payments", "video lesson lifecycle", "AI learning packs", "personalized tests", "messaging moderation", "reputation", "analytics"},
	})
}

func (a *API) educationLevels(c *gin.Context) {
	values := a.store.EducationLevels()
	list(c, values, len(values))
}
func (a *API) subjects(c *gin.Context) { list(c, a.store.Subjects(), len(a.store.Subjects())) }
func (a *API) subject(c *gin.Context) {
	value, err := a.store.Subject(c.Param("id"))
	if err != nil {
		writeError(c, serviceNotFound("Predmet"))
		return
	}
	ok(c, value)
}

func (a *API) tutors(c *gin.Context) {
	limit, err := queryInteger(c, "limit", 24)
	if err != nil || limit < 1 || limit > 100 {
		fail(c, http.StatusUnprocessableEntity, "validation_error", "Parametar limit mora biti cijeli broj između 1 i 100.")
		return
	}
	offset, err := queryInteger(c, "offset", 0)
	if err != nil || offset < 0 {
		fail(c, http.StatusUnprocessableEntity, "validation_error", "Parametar offset mora biti nenegativan cijeli broj.")
		return
	}
	minPrice, err := queryNumber(c, "minPrice")
	if err != nil || minPrice < 0 {
		fail(c, http.StatusUnprocessableEntity, "validation_error", "Parametar minPrice mora biti nenegativan broj.")
		return
	}
	maxPrice, err := queryNumber(c, "maxPrice")
	if err != nil || maxPrice < 0 {
		fail(c, http.StatusUnprocessableEntity, "validation_error", "Parametar maxPrice mora biti nenegativan broj.")
		return
	}
	if maxPrice > 0 && minPrice > maxPrice {
		fail(c, http.StatusUnprocessableEntity, "validation_error", "Parametar minPrice ne može biti veći od maxPrice.")
		return
	}
	levelName := ""
	if rawLevel := strings.TrimSpace(c.Query("level")); rawLevel != "" {
		level, levelErr := a.store.EducationLevel(rawLevel)
		if levelErr != nil {
			fail(c, http.StatusUnprocessableEntity, "validation_error", "Odabrana razina obrazovanja nije poznata.")
			return
		}
		levelName = level.Name
	}
	filter := service.TutorSearch{Query: c.Query("q"), Subject: c.Query("subject"), Level: levelName, Badge: c.Query("badge"), MinPrice: minPrice, MaxPrice: maxPrice, Limit: limit, Offset: offset}
	if raw := c.Query("verified"); raw != "" {
		normalized := strings.ToLower(strings.TrimSpace(raw))
		if normalized != "true" && normalized != "false" {
			fail(c, http.StatusUnprocessableEntity, "validation_error", "Parametar verified mora biti true ili false.")
			return
		}
		value := normalized == "true"
		filter.Verified = &value
	}
	values, total := a.service.SearchTutors(filter)
	list(c, values, total)
}

func (a *API) tutor(c *gin.Context) {
	value, err := a.service.Tutor(c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}
	ok(c, value)
}
func (a *API) availability(c *gin.Context) {
	profile, _, err := a.store.Tutor(c.Param("id"))
	if err != nil {
		writeError(c, serviceNotFound("Profesor"))
		return
	}
	values := a.store.Availability(profile.UserID)
	if c.Query("status") != "" {
		filtered := values[:0]
		for _, value := range values {
			if value.Status == c.Query("status") {
				filtered = append(filtered, value)
			}
		}
		values = filtered
	}
	list(c, values, len(values))
}
func (a *API) reviews(c *gin.Context) {
	profile, _, err := a.store.Tutor(c.Param("id"))
	if err != nil {
		writeError(c, serviceNotFound("Profesor"))
		return
	}
	values := a.store.Reviews(profile.UserID)
	list(c, values, len(values))
}

func (a *API) demoIdentities(c *gin.Context) {
	if !a.config.DemoMode {
		fail(c, http.StatusNotFound, "not_found", "Demo identiteti nisu dostupni.")
		return
	}
	users := a.store.Users()
	safe := make([]gin.H, 0, len(users))
	for _, user := range users {
		safe = append(safe, gin.H{"id": user.ID, "email": user.Email, "name": user.Name, "role": user.Role, "avatarUrl": user.AvatarURL})
	}
	list(c, safe, len(safe))
}

func (a *API) register(c *gin.Context) {
	var input service.RegisterInput
	if !bind(c, &input) {
		return
	}
	result, err := a.service.Register(input)
	if err != nil {
		writeError(c, err)
		return
	}
	a.setSessionCookie(c, result.Token, result.ExpiresAt)
	created(c, result)
}

func (a *API) login(c *gin.Context) {
	var input service.LoginInput
	if !bind(c, &input) {
		return
	}
	result, err := a.service.Login(input)
	if err != nil {
		writeError(c, err)
		return
	}
	a.setSessionCookie(c, result.Token, result.ExpiresAt)
	ok(c, result)
}

func (a *API) logout(c *gin.Context) {
	if token, err := c.Cookie("gm_session"); err == nil {
		a.service.Logout(token)
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("gm_session", "", -1, "/", "", a.config.CookieSecure, true)
	ok(c, gin.H{"signedOut": true})
}

func (a *API) authSession(c *gin.Context) {
	actor, okActor := currentActor(c)
	if !okActor {
		fail(c, http.StatusUnauthorized, "unauthorized", "Niste prijavljeni.")
		return
	}
	ok(c, gin.H{"user": actor, "dashboard": dashboardForRole(actor.Role)})
}

func (a *API) forgotPassword(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required"`
	}
	if !bind(c, &input) {
		return
	}
	ok(c, gin.H{"message": "Ako račun postoji, poslali smo upute za obnovu lozinke.", "delivery": "demo"})
}

func (a *API) googleStart(c *gin.Context) {
	returnTo := c.DefaultQuery("returnTo", "/ucenik")
	requestedRole := domain.Role(c.DefaultQuery("role", string(domain.RoleStudent)))
	if requestedRole != domain.RoleStudent && requestedRole != domain.RoleTutor {
		fail(c, http.StatusUnprocessableEntity, "validation_error", "Google registracija podržava samo učenika ili profesora.")
		return
	}
	if a.config.GoogleClientID == "" || a.config.GoogleClientSecret == "" {
		if !a.config.DemoMode {
			fail(c, http.StatusServiceUnavailable, "google_sso_not_configured", "Google prijava još nije konfigurirana.")
			return
		}
		c.Redirect(http.StatusTemporaryRedirect, strings.TrimRight(a.config.FrontendURL, "/")+"/auth/google-demo?returnTo="+url.QueryEscape(returnTo)+"&role="+url.QueryEscape(string(requestedRole)))
		return
	}
	authorizationURL, err := a.service.NewGoogleAuthorization(service.GoogleOAuthConfig{ClientID: a.config.GoogleClientID, ClientSecret: a.config.GoogleClientSecret, RedirectURL: a.config.GoogleRedirectURL}, returnTo, requestedRole)
	if err != nil {
		writeError(c, err)
		return
	}
	c.Redirect(http.StatusTemporaryRedirect, authorizationURL)
}

func (a *API) googleCallback(c *gin.Context) {
	result, returnTo, err := a.service.CompleteGoogleAuthorization(c.Request.Context(), service.GoogleOAuthConfig{ClientID: a.config.GoogleClientID, ClientSecret: a.config.GoogleClientSecret, RedirectURL: a.config.GoogleRedirectURL}, c.Query("state"), c.Query("code"))
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, strings.TrimRight(a.config.FrontendURL, "/")+"/prijava?error=google")
		return
	}
	a.setSessionCookie(c, result.Token, result.ExpiresAt)
	c.Redirect(http.StatusTemporaryRedirect, strings.TrimRight(a.config.FrontendURL, "/")+"/auth/callback?returnTo="+url.QueryEscape(returnTo))
}

func (a *API) googleDemo(c *gin.Context) {
	if !a.config.DemoMode {
		fail(c, http.StatusNotFound, "not_found", "Demo Google prijava nije dostupna.")
		return
	}
	var input struct {
		Email string `json:"email" binding:"required"`
	}
	if !bind(c, &input) {
		return
	}
	result, err := a.service.GoogleDemo(input.Email)
	if err != nil {
		writeError(c, err)
		return
	}
	a.setSessionCookie(c, result.Token, result.ExpiresAt)
	ok(c, result)
}

func (a *API) setSessionCookie(c *gin.Context, token string, expiresAt time.Time) {
	c.SetSameSite(http.SameSiteLaxMode)
	maxAge := int(time.Until(expiresAt).Seconds())
	c.SetCookie("gm_session", token, maxAge, "/", "", a.config.CookieSecure, true)
}

func (a *API) me(c *gin.Context) { actor, _ := currentActor(c); ok(c, actor) }
func (a *API) updateMe(c *gin.Context) {
	actor, _ := currentActor(c)
	var input struct {
		Name   string `json:"name" binding:"required"`
		Locale string `json:"locale"`
	}
	if !bind(c, &input) {
		return
	}
	if len([]rune(strings.TrimSpace(input.Name))) < 3 {
		writeError(c, &service.Error{Code: "validation_error", Message: "Ime mora imati najmanje 3 znaka.", Status: http.StatusUnprocessableEntity})
		return
	}
	actor.Name = strings.TrimSpace(input.Name)
	if input.Locale == "hr-HR" || input.Locale == "en-GB" {
		actor.Locale = input.Locale
	}
	if err := a.store.PutUser(actor); err != nil {
		writeError(c, err)
		return
	}
	ok(c, actor)
}
func (a *API) student(c *gin.Context) {
	actor, _ := currentActor(c)
	if actor.Role != domain.RoleAdmin && actor.ID != c.Param("id") {
		writeError(c, serviceForbidden("Nemate pristup tom profilu."))
		return
	}
	profile, user, err := a.store.Student(c.Param("id"))
	if err != nil {
		writeError(c, serviceNotFound("Učenik"))
		return
	}
	ok(c, gin.H{"user": user, "profile": profile})
}

func (a *API) bookings(c *gin.Context) {
	actor, _ := currentActor(c)
	values := make([]domain.Booking, 0)
	for _, booking := range a.store.Bookings() {
		if actor.Role == domain.RoleAdmin || actor.ID == booking.StudentID || actor.ID == booking.TutorID {
			values = append(values, booking)
		}
	}
	list(c, values, len(values))
}
func (a *API) booking(c *gin.Context) {
	actor, _ := currentActor(c)
	value, err := a.store.Booking(c.Param("id"))
	if err != nil {
		writeError(c, serviceNotFound("Rezervacija"))
		return
	}
	if actor.Role != domain.RoleAdmin && actor.ID != value.StudentID && actor.ID != value.TutorID {
		writeError(c, serviceForbidden("Nemate pristup ovoj rezervaciji."))
		return
	}
	ok(c, value)
}
func (a *API) createBooking(c *gin.Context) {
	actor, _ := currentActor(c)
	var input service.CreateBookingInput
	if !bind(c, &input) {
		return
	}
	value, err := a.service.CreateBooking(actor.ID, input)
	if err != nil {
		writeError(c, err)
		return
	}
	created(c, value)
}
func (a *API) payBooking(c *gin.Context) {
	actor, _ := currentActor(c)
	booking, payment, err := a.service.PayBooking(actor.ID, c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}
	ok(c, gin.H{"booking": booking, "payment": payment})
}
func (a *API) cancelBooking(c *gin.Context) {
	actor, _ := currentActor(c)
	var input struct {
		Reason string `json:"reason" binding:"required"`
	}
	if !bind(c, &input) {
		return
	}
	value, err := a.service.CancelBooking(actor.ID, c.Param("id"), input.Reason)
	if err != nil {
		writeError(c, err)
		return
	}
	ok(c, value)
}

func (a *API) startLesson(c *gin.Context) {
	actor, _ := currentActor(c)
	value, err := a.service.StartLesson(actor.ID, c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}
	ok(c, value)
}
func (a *API) endLesson(c *gin.Context) {
	actor, _ := currentActor(c)
	lesson, pack, err := a.service.EndLesson(actor.ID, c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}
	ok(c, gin.H{"lesson": lesson, "learningPack": pack})
}
func (a *API) learningPack(c *gin.Context) {
	value, err := a.store.LearningPack(c.Param("id"))
	if err != nil {
		writeError(c, serviceNotFound("AI paket"))
		return
	}
	actor, _ := currentActor(c)
	if actor.Role != domain.RoleAdmin && actor.ID != value.StudentID {
		writeError(c, serviceForbidden("Nemate pristup ovom AI paketu."))
		return
	}
	ok(c, value)
}

func (a *API) messages(c *gin.Context) {
	actor, _ := currentActor(c)
	conversation, err := a.store.Conversation(c.Param("id"))
	if err != nil {
		writeError(c, serviceNotFound("Razgovor"))
		return
	}
	if actor.Role != domain.RoleAdmin && !isParticipant(conversation.ParticipantIDs, actor.ID) {
		writeError(c, serviceForbidden("Nemate pristup ovom razgovoru."))
		return
	}
	values := a.store.Messages(c.Param("id"))
	list(c, values, len(values))
}

func (a *API) conversations(c *gin.Context) {
	actor, _ := currentActor(c)
	values := make([]gin.H, 0)
	for _, conversation := range a.store.Conversations() {
		if actor.Role != domain.RoleAdmin && !isParticipant(conversation.ParticipantIDs, actor.ID) {
			continue
		}
		var participant domain.User
		for _, participantID := range conversation.ParticipantIDs {
			if participantID != actor.ID {
				participant, _ = a.store.User(participantID)
				break
			}
		}
		messages := a.store.Messages(conversation.ID)
		lastMessage := "Novi sigurni razgovor"
		updatedAt := conversation.CreatedAt
		if len(messages) > 0 {
			lastMessage = messages[len(messages)-1].Body
			updatedAt = messages[len(messages)-1].CreatedAt
		}
		values = append(values, gin.H{"id": conversation.ID, "bookingId": conversation.BookingID, "participant": participant, "lastMessage": lastMessage, "updatedAt": updatedAt})
	}
	list(c, values, len(values))
}
func (a *API) sendMessage(c *gin.Context) {
	actor, _ := currentActor(c)
	var input service.SendMessageInput
	if !bind(c, &input) {
		return
	}
	message, event, err := a.service.SendMessage(actor.ID, c.Param("id"), input)
	if err != nil {
		writeError(c, err)
		return
	}
	created(c, gin.H{"message": message, "trustEvent": event})
}
func (a *API) createReview(c *gin.Context) {
	actor, _ := currentActor(c)
	var input service.CreateReviewInput
	if !bind(c, &input) {
		return
	}
	value, err := a.service.CreateReview(actor.ID, input)
	if err != nil {
		writeError(c, err)
		return
	}
	created(c, value)
}
func (a *API) generateTest(c *gin.Context) {
	actor, _ := currentActor(c)
	var input service.GenerateTestInput
	if !bind(c, &input) {
		return
	}
	value, err := a.service.GenerateTest(actor.ID, input)
	if err != nil {
		writeError(c, err)
		return
	}
	created(c, value)
}

func (a *API) studentDashboard(c *gin.Context) {
	actor, _ := currentActor(c)
	if actor.Role != domain.RoleAdmin && actor.ID != c.Param("id") {
		writeError(c, serviceForbidden("Nemate pristup toj nadzornoj ploči."))
		return
	}
	value, err := a.service.StudentDashboard(c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}
	ok(c, value)
}
func (a *API) tutorDashboard(c *gin.Context) {
	actor, _ := currentActor(c)
	if actor.Role != domain.RoleAdmin && actor.ID != c.Param("id") {
		writeError(c, serviceForbidden("Nemate pristup toj nadzornoj ploči."))
		return
	}
	value, err := a.service.TutorDashboard(c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}
	ok(c, value)
}
func (a *API) adminDashboard(c *gin.Context) { ok(c, a.service.AdminDashboard()) }
func (a *API) trustEvents(c *gin.Context) {
	values := a.store.TrustEvents()
	list(c, values, len(values))
}
func (a *API) dataset(c *gin.Context) {
	ok(c, gin.H{"counts": a.store.Counts(), "users": a.store.Users(), "subjects": a.store.Subjects(), "tutors": a.store.Tutors(), "students": a.store.Students(), "bookings": a.store.Bookings()})
}

func currentActor(c *gin.Context) (domain.User, bool) {
	value, ok := c.Get("actor")
	if !ok {
		return domain.User{}, false
	}
	actor, ok := value.(domain.User)
	return actor, ok
}
func queryNumber(c *gin.Context, key string) (float64, error) {
	value := strings.TrimSpace(c.Query(key))
	if value == "" {
		return 0, nil
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err == nil && (math.IsNaN(parsed) || math.IsInf(parsed, 0)) {
		return 0, strconv.ErrSyntax
	}
	return parsed, err
}
func queryInteger(c *gin.Context, key string, fallback int) (int, error) {
	value := strings.TrimSpace(c.Query(key))
	if value == "" {
		return fallback, nil
	}
	return strconv.Atoi(value)
}
func dashboardForRole(role domain.Role) string {
	if role == domain.RoleTutor {
		return "/profesor"
	}
	if role == domain.RoleAdmin {
		return "/admin"
	}
	return "/ucenik"
}
func isParticipant(values []string, id string) bool {
	for _, value := range values {
		if value == id {
			return true
		}
	}
	return false
}

func bind(c *gin.Context, target any) bool {
	if err := c.ShouldBindJSON(target); err != nil {
		fail(c, http.StatusUnprocessableEntity, "validation_error", "Neispravan zahtjev: "+err.Error())
		return false
	}
	return true
}
func ok(c *gin.Context, value any)      { c.JSON(http.StatusOK, gin.H{"data": value}) }
func created(c *gin.Context, value any) { c.JSON(http.StatusCreated, gin.H{"data": value}) }
func list(c *gin.Context, value any, total int) {
	c.JSON(http.StatusOK, gin.H{"data": value, "meta": gin.H{"total": total}})
}
func fail(c *gin.Context, status int, code, message string) {
	c.JSON(status, gin.H{"error": gin.H{"code": code, "message": message}, "requestId": c.Writer.Header().Get("X-Request-ID")})
}
func writeError(c *gin.Context, err error) {
	var appErr *service.Error
	if errors.As(err, &appErr) {
		fail(c, appErr.Status, appErr.Code, appErr.Message)
		return
	}
	fail(c, http.StatusInternalServerError, "internal_error", "Dogodila se neočekivana pogreška.")
}
func serviceNotFound(resource string) error {
	return &service.Error{Code: "not_found", Message: resource + " nije pronađen.", Status: http.StatusNotFound}
}
func serviceForbidden(message string) error {
	return &service.Error{Code: "forbidden", Message: message, Status: http.StatusForbidden}
}
