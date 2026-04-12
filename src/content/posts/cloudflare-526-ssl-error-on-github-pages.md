---
title: Cloudflare 526 on GitHub Pages
published: 2026-04-11
description: 'Why Cloudflare 526 appeared on a GitHub Pages site, why it can return around Let’s Encrypt renewal time, and how to fix it.'
image: ''
tags: [Cloudflare, GitHub Pages, SSL, TLS, DNS]
category: 'Development'
draft: false
---

## The Error That Looked Simpler Than It Was

One morning the site was unavailable behind a terse Cloudflare page: **526 Invalid SSL certificate**. That message sounded precise enough that it was easy to assume one bad certificate would explain everything. But the site was hosted on GitHub Pages, while the custom domain was proxied through Cloudflare.

That changed the debugging process. GitHub Pages was showing certificate provisioning and domain-validation hints, yet the user-facing outage appeared at Cloudflare. The real problem was the full request path, not one isolated layer.

## What 526 Actually Means Here

In this setup, a **526** usually does not mean the browser failed to establish HTTPS with Cloudflare. It means Cloudflare rejected the TLS certificate presented by the **origin** it was trying to reach. In this case, the origin was GitHub Pages.

That is what makes the error easy to misread:

```text
Browser -> Cloudflare -> GitHub Pages
```

The browser-to-Cloudflare leg may be healthy while the Cloudflare-to-origin leg fails.

## The Hidden Conflict Between Cloudflare and GitHub Pages

GitHub Pages manages certificates for custom domains automatically, but it still needs DNS to resolve in a way GitHub can verify while the certificate is being provisioned or renewed. GitHub's documentation says GitHub Pages requests those certificates from **Let's Encrypt** after its DNS checks pass. That matters because Let's Encrypt certificates are **90-day certificates**, so this setup is tested again at renewal time instead of only on day one.

Once Cloudflare proxying enters the picture, GitHub may have a harder time confirming that the custom domain points at Pages in the way it expects. That helps explain why a setup can look stable for a long time and then fail later without any obvious change on your side. A reprovisioning cycle, renewal check, or stricter validation pass can expose a DNS dependency that was never reliably satisfied.

That is why GitHub Pages can show messages about TLS certificate provisioning, retries, or even **NotServedByPagesError**, while the visible outage appears as a Cloudflare 526. Those signals are still useful, but they describe what GitHub sees from its side, not the whole multi-provider interaction. The practical issue is that Cloudflare is enforcing origin validation and, in this state, may not accept the certificate currently presented by the GitHub Pages origin.

## The Recovery Sequence That Worked

### Recovery checklist

- Switch the GitHub Pages-related DNS records in Cloudflare to **DNS only** temporarily.
- Wait for GitHub Pages to finish domain validation and HTTPS provisioning cleanly.
- Confirm HTTPS is fully enabled in GitHub Pages.
- Re-enable the Cloudflare proxy only if you still need it.
- If you keep this architecture, **Full** is often more practical than **Full (strict)** here. That tradeoff is specific to GitHub Pages behind Cloudflare, not general TLS advice.

The most useful references were GitHub's guide to [managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), GitHub's notes on [troubleshooting custom domains and GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages), Cloudflare's explanation of [Error 526](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-526/), and Let's Encrypt's documentation that [certificates issued on or after 2026-03-13 have a lifetime of 90 days](https://letsencrypt.org/docs/rate-limits/#certificate-lifetimes). For a community report that closely mirrors this failure mode, [github/pages-health-check#153](https://github.com/github/pages-health-check/issues/153) is worth reading as well.

## Why It Worked Before and Then Suddenly Failed

This is why the problem often feels unfair. A GitHub Pages site behind Cloudflare can look stable for a long time and still fail later when certificate provisioning or renewal runs again.

Because GitHub Pages requests custom-domain certificates from Let's Encrypt, and Let's Encrypt certificates are 90-day certificates, the weak point is revisited regularly. If DNS validation is only barely working, or only works when Cloudflare is temporarily out of the way, the next renewal cycle can surface the same problem again.

The outage does not necessarily mean a brand-new mistake. It can mean an old compromise was tested again.

## When I Would Use GitHub Pages vs Cloudflare Pages

If I want a simple site on a `github.io` subdomain, GitHub Pages is still a clean option. But if I am using a custom domain and already relying on Cloudflare for DNS and TLS, [Cloudflare Pages](https://developers.cloudflare.com/pages/) is usually the cleaner fit.

It avoids putting GitHub Pages behind a Cloudflare proxy and reduces the chance of certificate lifecycle issues between providers.

## Final Takeaway

A **526** in this setup usually points to the Cloudflare-to-origin leg, not the browser side. For GitHub Pages behind Cloudflare, the practical recovery path is to let GitHub Pages validate and provision HTTPS cleanly first, then reintroduce the proxy if needed.
