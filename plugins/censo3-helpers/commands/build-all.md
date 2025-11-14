# Build All CENSO3 Projects

Build the entire CENSO3 solution including backend and frontend.

## Steps:

1. Clean and build the .NET solution
2. Build the Angular frontend
3. Report build status and any errors

Use the following commands:

```bash
# Build .NET solution
cd C:\Users\fbarra.TYM\source\repos\CENSO3\Code
dotnet clean CENSO3.sln
dotnet build CENSO3.sln

# Build Angular frontend
cd C:\Users\fbarra.TYM\source\repos\CENSO3\Code\Tym.Censo3.WebFront
npm run build
```

Report the build results with success or error details.
