---
title: Setting Up Google Drive Client ID for Rclone
published: 2026-01-26
description: 'CLI-focused guide to create your own Google Drive client ID for rclone.'
image: ''
tags: [Rclone, Google Drive, Cloud Storage, API, CLI]
category: 'Development'
draft: false
---

## Overview

This guide walks through creating your own Google Drive OAuth client for rclone. The official [rclone Google Drive docs](https://rclone.org/drive/) strongly recommend using your own client ID instead of the shared default so you control the project, consent screen, and API quota for your setup. If you want the rclone-specific background first, see [making your own client ID](https://rclone.org/drive/#making-your-own-client-id).

The flow is mostly CLI-driven, but a few steps still must be completed in the Google Cloud web console.

---

## Prerequisites

> [!IMPORTANT]
> The Google account you use to create the OAuth client in Google Cloud does not have to be the same account you later use with rclone. You can create the client in one account and authenticate rclone against another Google Drive account when you configure the remote.

### Required Tools

You need:

- `gcloud` to create and manage the Google Cloud project from the CLI
- `rclone` to configure and use the Google Drive remote

Verify both commands are available:

```bash
which gcloud
which rclone
```

Install them using your platform's normal package manager or the official installation instructions for your operating system before continuing.

### Authenticate with Google Cloud

```bash
# Sign in to gcloud
gcloud auth login

# Verify authentication
gcloud auth list
```

> [!NOTE]
> **Billing account**: Creating a project, enabling the Google Drive API, and creating an OAuth client for personal rclone use typically do not require a billing account. If Google Cloud asks you to link one because of account or organization policy, you can do that in [Google Cloud Billing](https://console.cloud.google.com/billing). Normal rclone authentication against Google Drive does not by itself imply paid usage.

---

## CLI Setup Process

### Step 1: Create a New Project

```bash
# Create a unique project ID using timestamp
PROJECT_ID="rclone-drive-$(date +%s)"
echo "Creating project: $PROJECT_ID"

# Create new project
gcloud projects create $PROJECT_ID --name="Rclone Google Drive"

# Set as active project
gcloud config set project $PROJECT_ID
```

### Step 2: Enable Google Drive API

```bash
# Enable Drive API for the project
gcloud services enable drive.googleapis.com

# Verify it's enabled
gcloud services list --enabled | grep drive
# You should see a line mentioning drive.googleapis.com and the Google Drive API
```

### Step 3: Configure OAuth Consent Screen

OAuth consent configuration must be done in the web console. Google’s exact button labels may change, but the required setup is stable in the official docs for [configuring OAuth consent](https://developers.google.com/workspace/guides/configure-oauth-consent).

Open the OAuth consent screen for the project you created in Step 1:

[OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)

If you have multiple Google accounts signed in, make sure you are viewing the correct account and selected project.

In the web console, complete these required pieces before creating the OAuth client:

1. Enter the basic app information, such as the app name and contact emails.
2. Choose an audience that fits your use case.
   - For most personal setups, choose **External**.
   - Choose **Internal** only if you are using a Google Workspace organization and only need access within that organization.
3. Add the scopes rclone needs for Google Drive access. The official [rclone Drive guide](https://rclone.org/drive/#making-your-own-client-id) calls out these scopes:
   ```
   https://www.googleapis.com/auth/docs
   https://www.googleapis.com/auth/drive
   https://www.googleapis.com/auth/drive.metadata.readonly
   ```
4. If the app is still in Testing status, add yourself as a test user before trying to authenticate with rclone.
5. Save the consent-screen configuration.

> [!NOTE]
> This section is one of the parts that cannot be completed purely from the CLI. Use the console for consent-screen setup, then return to the terminal for the rest of the workflow.

### Step 4: Create OAuth 2.0 Client ID

Open the project's credentials page in the Google Cloud console:

[Credentials](https://console.cloud.google.com/apis/credentials)

Make sure the project from Step 1 is selected before continuing.

This step must also be done in the web console.

1. Create a new **OAuth client ID** credential.
2. Set the application type to **Desktop app**, which matches Google’s guidance for [desktop app OAuth clients](https://developers.google.com/identity/protocols/oauth2/native-app).
3. Give the client a name such as `rclone-client`.
4. Create the credential, then copy the **Client ID** and **Client Secret** or download the JSON for safekeeping.

> [!IMPORTANT]
> Save these credentials securely. You will need them for the rclone configuration step.

### Step 5: Configure Rclone

Now configure rclone with the Client ID and Client Secret from Step 4. The browser-based authorization is still required, but rclone handles the local desktop flow for you in a CLI-friendly way.

```bash
# Start rclone interactive configuration
rclone config

# Follow the prompts:
# n                          # New remote
# gdrive                     # Name it "gdrive" (or your choice)
# drive                      # Type number for "Google Drive"
# <paste CLIENT_ID>          # Your client ID from Step 4
# <paste CLIENT_SECRET>      # Your client secret from Step 4
# 1                          # Scope: Full access to all files
# <Enter>                    # Leave root_folder_id blank
# <Enter>                    # Leave service_account_file blank
# n                          # No advanced config
# y                          # Use web browser to authenticate
#                            # Browser opens - sign in with the Google Drive account you want to access
# y                          # Confirm the configuration looks good
# q                          # Quit config
```

Alternatively, for a non-interactive setup:

```bash
# Set your credentials as environment variables first
export CLIENT_ID="your-client-id.apps.googleusercontent.com"
export CLIENT_SECRET="your-client-secret"

# Create rclone remote non-interactively
rclone config create gdrive drive \
  client_id "$CLIENT_ID" \
  client_secret "$CLIENT_SECRET" \
  scope "drive"

# Then manually authorize (will open browser)
rclone config reconnect gdrive:
```

#### For Headless Servers:

```bash
# On your local machine with a browser:
rclone authorize "drive" "$CLIENT_ID" "$CLIENT_SECRET"

# Copy the token output, then on your headless server:
rclone config
# Follow prompts, and when asked for the token, paste it
```

---

## Verification

Test the remote after setup with a few low-risk checks:

```bash
# Confirm the remote can list top-level directories
rclone lsd gdrive:

# Confirm Drive account information is reachable
rclone about gdrive:

# Sample the first level of files without walking the whole Drive
rclone ls gdrive: --max-depth 1 | head -10
```

If those succeed, the remote is usually configured correctly. If you also want a write test, upload a temporary file to a throwaway folder and remove it afterward.

---

## Publishing the App (Optional)

For the first authentication, Google may show an unverified-app warning because this is your own OAuth client and not a broadly verified public app. The exact warning text can change, but the important point is that this is expected for a personal setup.

If you keep the app as **External** and leave it in **Testing**:

> [!WARNING]
> **Testing mode vs. production**:
> - Google limits **External** apps in **Testing** to listed test users.
> - For apps requesting Drive scopes, the authorization expires after **7 days**.
> - If you requested offline access, the refresh token expires on the same schedule, so you should expect to re-authenticate.
> - Google documents this behavior in its general [OAuth 2.0 guidance](https://developers.google.com/identity/protocols/oauth2), where Testing-mode external apps receive refresh tokens that expire in 7 days unless they request only basic OpenID profile scopes.

If you want longer-lived authorizations for normal use, return to the web console and move the app toward production status. Google’s consent-screen and audience guidance is documented in [Configure OAuth consent](https://developers.google.com/workspace/guides/configure-oauth-consent). Whether you also need Google verification depends on the scopes you request and how widely you intend to distribute the app.

---

## Troubleshooting

If setup does not work the first time, these commands usually narrow it down quickly:

```bash
# Show the current remote configuration
rclone config show

# Re-run the browser authorization flow
rclone config reconnect gdrive:

# Retry with debug logging if authentication succeeds but operations fail
rclone ls gdrive: --log-level DEBUG

# Confirm the Drive API is enabled for the project
gcloud services list --enabled --project="$PROJECT_ID" | grep drive
```

Common fixes:

- **Access denied or app not available**: make sure the app is configured on the OAuth consent screen and your Google account is added as a test user when the app is still in Testing.
- **Invalid client or unauthorized_client**: re-check the Client ID and Client Secret copied from the Google Cloud credentials page.
- **Expired or revoked token**: run `rclone config reconnect gdrive:` and complete the sign-in flow again.
- **No browser available**: use the headless-server flow from the configuration section and paste the generated token manually.

If the remote still fails, it is often faster to delete just the rclone remote and re-create it than to keep retrying a broken configuration.

---

## Cleanup

If you want to remove the setup later:

```bash
rclone config delete gdrive
gcloud projects delete "$PROJECT_ID"
```

If you may reuse the setup later, delete only the rclone remote and keep the Google Cloud project and OAuth client in place.
