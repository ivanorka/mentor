package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"gaudeamus/mentor-api/internal/httpapi"
	"gaudeamus/mentor-api/internal/service"
	"gaudeamus/mentor-api/internal/store"
)

const version = "0.1.0"

func main() {
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}
	seedPath := env("SEED_FILE", "data/seed.json")
	snapshotPath := env("DATA_SNAPSHOT_FILE", "data/runtime.snapshot.json")
	authStatePath := env("AUTH_STATE_FILE", "data/auth.runtime.json")
	repository, err := store.Load(seedPath, snapshotPath)
	if err != nil {
		slog.Error("backend startup failed", "error", err)
		os.Exit(1)
	}
	fee := envFloat("PLATFORM_FEE_RATE", 0.15)
	demoMode := env("DEMO_MODE", "true") == "true"
	services, err := service.NewPersistentWithDemo(repository, fee, authStatePath, demoMode)
	if err != nil {
		slog.Error("auth state startup failed", "error", err)
		os.Exit(1)
	}
	router := httpapi.NewRouter(repository, services, httpapi.Config{
		AllowedOrigins:     strings.Split(env("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"), ","),
		DemoMode:           demoMode,
		Version:            version,
		FrontendURL:        env("FRONTEND_URL", "http://localhost:3000"),
		CookieSecure:       env("COOKIE_SECURE", "false") == "true",
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:  env("GOOGLE_REDIRECT_URL", "http://localhost:8081/api/v1/auth/google/callback"),
	})

	server := &http.Server{
		Addr:              env("API_ADDR", ":8081"),
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	go func() {
		slog.Info("Gaudeamus Mentor API started", "address", server.Addr, "version", version, "seed", seedPath)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server stopped unexpectedly", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		slog.Error("graceful shutdown failed", "error", err)
	}
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
func envFloat(key string, fallback float64) float64 {
	value, err := strconv.ParseFloat(os.Getenv(key), 64)
	if err != nil {
		return fallback
	}
	return value
}
