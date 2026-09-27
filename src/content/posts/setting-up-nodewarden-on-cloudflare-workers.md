---
title: "Setting Up NodeWarden on Cloudflare Workers"
published: 2026-09-22
description:
  "Deploy NodeWarden with D1 and R2, set the JWT secret, connect a Bitwarden
  client, and verify backups before trusting it with a vault."
image: ""
tags: [NodeWarden, Cloudflare Workers, D1, R2, Self-Hosting]
category: "Development"
draft: false
lang: "en"
---

[NodeWarden](https://github.com/shuaiplus/NodeWarden) runs a
Bitwarden-compatible server on Cloudflare Workers. Its web vault and API run in
one Worker; D1 stores the database, while R2 stores attachments and Send files.
This guide follows the upstream repository's default **R2** configuration. It
covers a first deployment through the Cloudflare website or a local terminal,
followed by the same account, client, and backup checks.

I checked upstream `main` at
[commit `a72592e`](https://github.com/shuaiplus/NodeWarden/tree/a72592e76e80f1e31eebde0c0216d2a77004440f)
on September 22, 2026. Check the scripts and bindings in the commit you deploy;
the [project Wiki](https://nodewarden.app/guide/quick-start) may describe
another revision.

The steps below target upstream `main`. A customized fork can change
registration, client compatibility, and deployment controls. Review that fork's
diff separately instead of copying its settings into a new instance.

NodeWarden is an independent project, not a Bitwarden service. Read its
[disclaimer and feature list](https://github.com/shuaiplus/NodeWarden#readme)
before importing a vault. Keep an export of any existing password manager until
you have tested a restore path.

## What the deployment needs

The repository's Wrangler configuration declares the Worker and storage
bindings. You add the runtime secret after deployment:

<!-- markdownlint-disable MD013 -->

| Component         | Binding or setting                            | Purpose                                                                   |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| Cloudflare Worker | `nodewarden`                                  | Serves the API and built web vault                                        |
| D1 database       | `DB` (`nodewarden-db`)                        | Stores accounts and vault records                                         |
| R2 bucket         | `ATTACHMENTS` (`nodewarden-attachments`)      | Stores attachments and Send files                                         |
| Durable Objects   | `NOTIFICATIONS_HUB`, `BACKUP_TRANSFER_RUNNER` | Handles notifications and backup transfer work                            |
| Runtime secret    | `JWT_SECRET`                                  | Signs authentication tokens; use a random value of at least 32 characters |

<!-- markdownlint-enable MD013 -->

You need a Cloudflare account. The website route also needs a GitHub account;
the terminal route needs Git, Bun, and Node.js/npm. The source repository has a
`package-lock.json`, and its Wrangler build hook runs `npm run build`. Using Bun
for local installation and commands does not remove that npm requirement from
the current project configuration.

For the default storage mode, enable an
[R2 subscription](https://developers.cloudflare.com/r2/get-started/) in your
Cloudflare account before deploying. Cloudflare includes some usage at no cost,
but R2 still has an account checkout step and usage-based billing. NodeWarden
also offers a KV attachment mode in `wrangler.kv.toml`; it has different file
limits and is outside the default path below.

The default `wrangler.toml` names its R2 bucket `nodewarden-attachments`. Create
that bucket in the Cloudflare account you will deploy to, or confirm that an
existing bucket with that exact name is the one you intend to use.

## Using the Cloudflare website UI

1. Fork the
   [upstream NodeWarden repository](https://github.com/shuaiplus/NodeWarden)
   into your GitHub account. GitHub's
   [fork guide](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/fork-a-repo)
   explains the owner and branch choices. Keep the default branch for this
   unmodified-upstream route.
2. In Cloudflare, open **Storage & databases → R2**. Create the
   `nodewarden-attachments` bucket if it does not exist. Check its account and
   name before continuing.
3. Open **Workers & Pages → Create application → Import a repository**. Choose
   the **Worker** import, connect GitHub, and select your fork. Cloudflare calls
   this integration
   [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).
4. Select the fork's `main` branch. Set the build command to `npm run build` and
   the deploy command to `npm run deploy`, as the current NodeWarden README
   specifies. Use the repository root as the root directory. Match the Worker
   name in Cloudflare to `name = "nodewarden"` in `wrangler.toml`.
5. Save and deploy. Read the build log, then open the Worker under **Workers &
   Pages**. Confirm its D1 binding is named `DB` and its R2 binding is named
   `ATTACHMENTS`. Check that both point to resources in the intended account.
   Check the Durable Object bindings and migrations as well.
6. Under **Settings → Variables and Secrets**, add `JWT_SECRET` as a **Secret**,
   not a text variable. Generate and save a random value of at least 32
   characters in your password manager. Deploy the secret change, then check
   that the Worker lists the secret name without revealing its value.

Wrangler can
[provision a D1 database automatically](https://developers.cloudflare.com/workers/wrangler/configuration/#automatic-provisioning)
when its binding lacks a resource ID. Cloudflare labels that feature beta. A
website build does not write a generated database ID back to your GitHub
repository, so the binding check in step 5 matters. If D1 provisioning fails,
create the `nodewarden-db` database, attach it to the `DB` binding, and
redeploy. Do not start registering users against an unknown or temporary
database. NodeWarden initializes its D1 schema on a request; the upstream
quick-deploy path does not ask you to upload SQL manually.

This website route deploys on pushes to the connected production branch. The
build command runs at build time; `JWT_SECRET` belongs in the Worker's
**runtime** Variables and Secrets, not in a build variable or a GitHub file.
Cloudflare manages the build token for its Git connection. This route does not
require a separate GitHub Actions deployment workflow.

## Using the CLI

Use this route if you want to deploy from a local checkout. It does not require
a GitHub fork or Cloudflare's Git integration. The commands use Bun without
changing the repository's committed npm lockfile:

```bash
git clone https://github.com/shuaiplus/NodeWarden.git
cd NodeWarden
bun install --no-save
bunx wrangler login
bunx wrangler whoami
bunx wrangler r2 bucket list
```

`bun install --no-save` installs dependencies without writing `bun.lock` or
changing `package.json`. Check the account reported by `whoami` before you
create resources or deploy; a successful login alone does not identify which
Cloudflare account will own your vault.

If the bucket list does not include `nodewarden-attachments`, create it in the
same account **before** `bun run deploy`:

```bash
bunx wrangler r2 bucket create nodewarden-attachments
```

Deploy once the intended bucket exists:

```bash
bun run deploy
```

`bun run deploy` invokes the repository's Wrangler script; Wrangler still calls
the repository's `npm run build` hook. Review Wrangler's output for the account,
Worker URL, D1 database, R2 bucket, and Durable Object migrations. A failed
resource or migration step is a failed deployment, even if a Worker URL already
exists.

After the Worker exists, attach the JWT secret through Wrangler's interactive
prompt:

```bash
bunx wrangler secret put JWT_SECRET
```

Paste a unique random value of at least 32 characters at the prompt. Do not put
it in the command line, `wrangler.toml`, shell history, or Git. Cloudflare's
[secret documentation](https://developers.cloudflare.com/workers/configuration/secrets/)
explains that `secret put` creates and deploys a new Worker version. Verify the
secret name and database inventory without printing secret values:

```bash
bunx wrangler secret list
bunx wrangler d1 list
```

Confirm that the deployed Worker binds `DB` to the intended `nodewarden-db`
database and `ATTACHMENTS` to the intended R2 bucket in Cloudflare. Resource
lists alone do not prove which resource the Worker uses.

## Verify either deployment before registering

The CLI and website routes must end at the same state:

- The Worker has an active deployment and serves its Web Vault over HTTPS.
- `DB` points to the intended D1 database; `ATTACHMENTS` points to the intended
  R2 bucket.
- The Durable Object bindings are present, and the deployment log shows no
  migration error.
- `JWT_SECRET` appears as a runtime **Secret**. The Web Vault no longer shows
  the missing- or weak-secret warning.

Check these before creating the first account. A page that loads without an
error does not prove the database and file bucket point to the right resources.

## Connect the first account and a client

The generated `workers.dev` URL is enough where your network can reach it. If
you need a custom domain, attach it under **Worker → Settings → Domains & Routes
→ Add → Custom Domain** before registering. Cloudflare requires an active zone
and will manage the Worker DNS record and certificate. Read its
[Custom Domains guide](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
before replacing an existing DNS record. Use the final HTTPS hostname for
registration and clients once it works.

Open the selected HTTPS URL and create your first account. In upstream
NodeWarden, the first account becomes the administrator; later registrations
require an invite code. Create that account only after the D1 and R2 bindings
and `JWT_SECRET` are correct. Save the master password and recovery material
through your normal secure process. The NodeWarden server cannot recover an
unknown master password for you. A two-step-login recovery code disables the
second factor; it does not recover the master password.

To connect a Bitwarden browser extension or mobile app, choose **Self-hosted**
on its login screen and enter the NodeWarden URL, including `https://`. Do not
append `/api` or `/identity`; the client adds those paths itself. Bitwarden
documents the
[client-side server selection](https://bitwarden.com/help/change-client-environment/)
for each platform. Sign in, add one test item, and confirm it syncs to a second
client. Test an attachment if you plan to use R2 storage. NodeWarden's
[client guide](https://nodewarden.app/guide/core/clients) documents the expected
server URL and login path.

After login, enable two-step login and store its recovery code away from the
vault. Keep the master password hint free of the password itself. These checks
follow NodeWarden's
[first-login guidance](https://nodewarden.app/guide/quick-start).

## Back up before regular use or updates

Successful login and sync do not prove that you can restore the vault. Store a
separate backup of the D1 database and R2 objects, and retain the configuration
and secret needed to operate the Worker. A D1 export alone does not contain
attachment objects. Cloudflare documents
[D1 export](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
and [R2 access methods](https://developers.cloudflare.com/r2/get-started/);
verify the exported data in an isolated location before you rely on it.

NodeWarden also has an instance backup center. After the first login, configure
a WebDAV or S3-compatible target or download a local backup ZIP. Choose
**include attachments** if you need the file bodies in that backup, then
rehearse a restore on a test instance. Read the project's
[backup scope](https://nodewarden.app/guide/backup/scope): current instance
backups omit Send entries and Send files, along with device sessions and API
keys. Do not assume that one ZIP captures every part of a running instance.

An encrypted vault export adds a second recovery route. Choose a format you can
restore to a different account if migration is the goal: Bitwarden distinguishes
[password-protected exports from account-restricted exports](https://bitwarden.com/help/encrypted-export/).
Keep exports out of Git and ordinary shared folders.

## Update the source without losing the vault

GitHub's
[Sync fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/syncing-a-fork)
command updates a fork branch from upstream. If you used the Cloudflare website
route, review the upstream commits and your backup first, then choose **Sync
fork → Update branch** on GitHub. Cloudflare builds and deploys the connected
branch after the update. The current upstream tree does **not** contain an
automatic `sync-upstream.yml` workflow; older tutorials that tell you to enable
it describe a different revision. Do not turn on unattended production updates
for a password manager just because a fork exposes an automation option.

For a clean CLI clone with no local changes, fetch and inspect upstream before
deploying a new version. `git pull --ff-only` refuses to create a merge commit
when the local branch has diverged:

```bash
git fetch origin
git log --oneline HEAD..origin/main
git pull --ff-only
bun install --no-save
bun run deploy
```

Record the old deployed commit and confirm that the Worker still points to the
original D1 database and R2 bucket. Keep `JWT_SECRET` stable: changing it
invalidates active tokens and can leave encrypted backup settings unreadable
until an administrator repairs them. After deployment, sign in, check sync from
a client, and verify attachment access. If an update fails, restore the prior
Worker code and configuration first; restore D1 or R2 data only after you
determine that the data itself changed. Replacing a healthy database with an
older backup would lose newer vault entries.

For ongoing diagnostics, consider sampled Workers Logs and Traces, with request
bodies and authentication tokens excluded from logs. The upstream Wrangler
configuration does not enable that observability by default, so treat it as a
deliberate production configuration change rather than an assumed feature.

## Troubleshooting

- **The import screen asks for a Pages project:** return to **Workers & Pages**
  and choose the Worker repository import. NodeWarden's `wrangler.toml` deploys
  a Worker with static assets and API routes, not a standalone Pages site.
- **The Web Vault warns about `JWT_SECRET`:** confirm the exact secret name,
  length, runtime location, and deployed version. A build variable or a value
  checked into `wrangler.toml` is not the runtime Secret NodeWarden needs.
- **A deployment succeeds but registration or attachments fail:** check the
  Worker's `DB` and `ATTACHMENTS` bindings and inspect the deployment log for
  resource or Durable Object migration errors. Do not register against a new
  database created by accident.
- **The `workers.dev` hostname does not open on your network:** test another
  network, then use a custom domain on a Cloudflare-managed zone if needed. Keep
  the old working hostname until HTTPS and client sync pass on the new one.
- **A guide mentions `scripts/ensure-d1.cjs`:** check the `package.json` and
  `wrangler.toml` in the commit you deployed. The upstream `main` revision
  checked for this article calls `wrangler deploy` directly and has no
  `ensure-d1.cjs`; its D1 binding has no checked-in database ID.

## References

### Project documentation

- [NodeWarden README and deployment commands](https://github.com/shuaiplus/NodeWarden#readme)
- [NodeWarden Quick Start](https://nodewarden.app/guide/quick-start)
- [NodeWarden configuration and secret lifecycle](https://nodewarden.app/guide/deployment/configuration)
- [NodeWarden backup scope](https://nodewarden.app/guide/backup/scope)

### GitHub and Cloudflare

- [GitHub: fork a repository](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/fork-a-repo)
- [GitHub: sync a fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/syncing-a-fork)
- [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Cloudflare Wrangler automatic provisioning](https://developers.cloudflare.com/workers/wrangler/configuration/#automatic-provisioning)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Bitwarden client server selection](https://bitwarden.com/help/change-client-environment/)
