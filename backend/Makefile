.PHONY: run test format check

run:
	API_ADDR=:8081 go run ./cmd/api

test:
	go test ./...

format:
	go fmt ./...

check: format test
	go vet ./...
