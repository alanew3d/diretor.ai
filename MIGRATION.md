# Audiovisual Studio and strategic Manager

This change serves the audiovisual presentation at `diretor.ai`, preserves the existing strategic application at `/manager`, and maps the `studio.diretor.ai` host to the Studio preview in the same Vercel project.

## Scope

- The existing application's HTML is preserved in `manager/index.html`; only canonical, Open Graph and manifest URLs change.
- Existing `/api/*` handlers and `/kbc` paths retain their addresses. The payment email's access link points to `/manager`.
- Existing browser storage keys are unchanged. Manager remains on the same origin, so no database or browser data migration is introduced.
- Old root hash links such as `/#app:diagnosis` forward to `/manager#app:diagnosis`; portfolio anchors keep their meaning.
- The Studio is a browser-local planning preview. It does not call generation providers, connect accounts, collect payments or synchronize projects.

## Deployment

Use the existing `diretor_ai` project and add `studio.diretor.ai` to it after the tested deployment is ready. Host-based routes are declared in `vercel.json`; DNS must use the values returned for that specific domain by Vercel.

Before promotion, test the preview at `/`, `/manager`, `/manager#login`, `/kbc` and `/studio/studio.html`. Recheck the subdomain after domain assignment. Existing webhook URLs remain unchanged.

## Validation

Run `node --test tests/migration.test.mjs` from the repository root. These checks verify route destinations and preservation of the legacy code; they do not replace browser checks of the real Vercel deployment.

## Rollback

The prior production commit is `6e9fa234320c7c7d835d788d4c35bc480979c09a`. Revert the migration commit or restore the previous Vercel production deployment. No database migration or deletion is part of this change.
