@echo off
curl -X POST http://localhost:3000/api/links -H "Content-Type: application/json" -d "{\"url\":\"https://www.example.com/test-page\"}" -s
