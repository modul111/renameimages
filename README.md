# renameimages

Image Renamer Pro - simple web app to batch rename images, strip metadata, and download as PNG.

## How to run locally

Requirements:
- .NET 8 SDK

From repository root:

```powershell
cd C:\Users\ASUS\source\repos\renameimages
dotnet build
dotnet run --project renameimages
```

Open http://localhost:5000 (or the URL shown in console).

## Docker

Build image:

```powershell
docker build -t renameimages:local ./renameimages
```

Run:

```powershell
docker run -p 8080:80 renameimages:local
```

## Notes
- Uploaded files are validated server-side: only JPG/PNG allowed and MIME/signature checked.
- Files are saved to `wwwroot/uploads` with GUID filenames.
- CSP header is set in `Program.cs`. Consider tightening by removing `unsafe-inline` and migrating inline scripts to external files with nonce.
- `robots.txt` is provided in `wwwroot/robots.txt`.
