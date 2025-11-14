# Start CENSO3 Development Environment

Start both backend API and frontend development servers for CENSO3.

## Steps:

1. Start the .NET API service in the background
2. Start the Angular development server
3. Provide URLs for accessing both services

Use the following commands:

```bash
# Start .NET API (in background)
cd C:\Users\fbarra.TYM\source\repos\CENSO3\Code\Tym.Censo3.ApiService
start dotnet run

# Wait a moment for API to start
timeout /t 5

# Start Angular dev server
cd C:\Users\fbarra.TYM\source\repos\CENSO3\Code\Tym.Censo3.WebFront
npm start
```

Inform the user:
- Backend API: https://localhost:7001 (or configured port)
- Frontend: http://localhost:4200
- Swagger UI: https://localhost:7001/swagger/index.html
