FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/mentor-api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=build /out/mentor-api /app/mentor-api
COPY --from=build /src/data/seed.json /app/data/seed.json
EXPOSE 8081
ENV API_ADDR=:8081
ENTRYPOINT ["/app/mentor-api"]
