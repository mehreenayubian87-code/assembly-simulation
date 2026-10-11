# Assembly — health policy negotiation simulation

An independent WHO-inspired audiovisual teaching prototype. Fictional country mandates and outcome models; not affiliated with WHO.

## Publish on GitHub Pages

1. Create an empty public repository on GitHub with default branch main.
2. Upload this folder's contents, including .github/workflows/pages.yml and dist/. Do not upload this folder as a nested directory.
3. In the repository, open Settings → Pages → Build and deployment → Source → GitHub Actions.
4. Open Actions → Publish Assembly → Run workflow. Later pushes to main deploy automatically.
5. After the workflow succeeds, open the URL shown in the deployment. A project site normally uses https://USERNAME.github.io/REPOSITORY/.

This export contains no Sites hosting configuration, Git history, credentials or ChatGPT-hosted asset dependencies. Audio, scripts and Babylon.js are local; its third-party license is in dist/vendor. Google Fonts is optional and falls back to system fonts. A custom domain is optional.

## Run locally

Serve dist/ with a static HTTP server. Do not double-click index.html: dialogue loads through HTTP.

Solo students select one of five roles. Groups of 2–5 use one shared screen and distinct roles. Each participant reads a role briefing. Negotiation ends with a downloadable policy agreement PDF. The optional implementation plan has a Return to simulation button. State stays in memory; refresh resets it.

## Migration status

These files are prepared for GitHub Pages; preparing them does not publish the repository or disable any previous hosted site. Verify the GitHub deployment before retiring the old address.
