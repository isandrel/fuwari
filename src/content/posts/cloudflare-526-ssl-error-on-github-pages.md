---
title: Cloudflare 526 SSL Error on GitHub Pages
published: 2026-04-11
description: 'Why a GitHub Pages site behind Cloudflare suddenly returned 526, how the certificate flow actually works, and how to recover without guesswork.'
image: ''
tags: [Cloudflare, GitHub Pages, SSL, TLS, DNS]
category: 'Development'
draft: false
---

## The Error That Looked Simpler Than It Was

One morning the site was unavailable behind a terse Cloudflare page: **526 Invalid SSL certificate**. The message sounded precise enough that it seemed like a single expired certificate should explain it. But this was not a single-server setup I controlled end to end. The site was hosted on GitHub Pages, while the custom domain was proxied through Cloudflare.

That detail changed how I had to debug it. The setup had been stable before, which made the failure easy to misread as a temporary glitch. GitHub Pages was showing hints about certificate provisioning, retries, and domain validation, yet no individual layer looked obviously broken. The problem was the full request path: a multi-provider chain that could fail even when each piece looked mostly reasonable on its own.

## What 526 Actually Means Here

In this setup, a **526** usually does not mean the visitor's browser failed to establish HTTPS with Cloudflare. It means Cloudflare rejected the TLS certificate presented by the **origin** it was trying to reach. With a traditional deployment, that origin would be your own server. Here, the origin was GitHub Pages.

More specifically, this failure usually appears when Cloudflare is doing strict origin validation and does not accept the certificate GitHub Pages presents for the custom domain. That can happen if the GitHub Pages origin certificate is missing, mismatched, not fully provisioned yet, or otherwise falls short of Cloudflare's trust checks.

That is what makes the error easy to misinterpret. The visible failure appears at the edge, but the trust failure sits one hop deeper:

```text
Browser -> Cloudflare -> GitHub Pages
```

The browser can be perfectly happy with Cloudflare while Cloudflare still refuses to trust the origin connection behind the scenes. From the visitor's perspective, the site is simply down. Architecturally, the browser-to-Cloudflare leg may be healthy while the Cloudflare-to-GitHub-Pages leg is the part that failed.

## The Hidden Conflict Between Cloudflare and GitHub Pages

The awkward part is that GitHub Pages manages certificates for custom domains automatically, but it still needs the domain's DNS records to resolve in a way GitHub can verify while that certificate is being provisioned or renewed. Once Cloudflare proxying enters the picture, GitHub may have a harder time confirming that the custom domain is pointing at Pages in the way it expects.

That also helps explain why the setup can look stable for a long time and then fail later without any obvious change on your side. A reprovisioning cycle, renewal check, or stricter validation path can expose the fact that this DNS dependency was never reliably satisfied.

That is why GitHub Pages can show messages about TLS certificate provisioning, retries, or even **NotServedByPagesError**, while the user-facing outage appears as a Cloudflare 526. Those signals are still useful, but they describe what GitHub sees from its side, not the whole multi-provider interaction. The practical issue is that Cloudflare is enforcing strict origin validation and, in this state, not accepting the certificate currently presented by the GitHub Pages origin.

## The Recovery Sequence That Worked

Once I stopped treating the outage as a generic SSL mishap and started treating it as a **GitHub Pages plus Cloudflare interaction problem**, the recovery path became much clearer.

### Recovery checklist

- Temporarily switch the GitHub Pages-related DNS records in Cloudflare to **DNS only** so GitHub can validate the custom domain directly.
- Wait for GitHub Pages to recognize the domain cleanly instead of showing certificate provisioning or retry warnings.
- Confirm that HTTPS is fully enabled in GitHub Pages before adding another layer back on top.
- Re-enable the Cloudflare proxy only if you actually need it.
- If you keep Cloudflare in front of GitHub Pages, **Full** can be the more practical choice over **Full (strict)** for this particular architecture, because strict origin validation is often where this arrangement becomes brittle. That is a situational compromise for GitHub Pages behind Cloudflare, not a general TLS best practice.

The most useful references were GitHub's guide to [managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), GitHub's notes on [troubleshooting custom domains and GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages), and Cloudflare's explanation of [Error 526](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-526/). For a community report that closely mirrors this failure mode, [github/pages-health-check#153](https://github.com/github/pages-health-check/issues/153) is worth reading as well.

None of that is especially dramatic, but it is practical: let GitHub Pages complete the certificate relationship it expects, then decide whether Cloudflare should sit in front of it again. And if you find yourself repeatedly accommodating that handoff, it is worth asking whether the hosting split is earning its keep.

## Why It Worked Before and Then Suddenly Failed

This is the part that makes the problem feel unfair. The setup had already earned trust by working once, and long enough stability creates a quiet assumption that the architecture must be sound.

But certificate provisioning and validation are delayed tests. Issuance, renewal, reprovisioning, and validation do not happen just once at the moment you first configure the site. They recur later, under slightly different timing and DNS conditions. A configuration can therefore pass the first time and still be structurally fragile.

That is why "it used to work" is a weak comfort here. The arrangement may have survived the first certificate lifecycle, then failed when GitHub Pages needed to verify the custom domain again and Cloudflare's proxying may have obscured the direct relationship GitHub expected. In other words, the outage did not necessarily signal a brand-new mistake. It revealed an old architectural compromise that had finally been tested again.

## When I Would Use GitHub Pages vs Cloudflare Pages

My conclusion is fairly simple now.

If I want an uncomplicated site on a `github.io` subdomain, GitHub Pages remains elegant and pleasantly low-maintenance. But if I am using a custom domain and already relying on Cloudflare for DNS, TLS, and edge features, [Cloudflare Pages](https://developers.cloudflare.com/pages/) is usually the cleaner fit.

```text
GitHub for source control and CI
Cloudflare for hosting, TLS, and edge delivery
```

That split removes an awkward trust boundary. Instead of placing GitHub Pages behind a Cloudflare proxy and hoping certificate lifecycles continue to cooperate, it keeps hosting and edge concerns in the same platform. For simple projects, that architectural tidiness is worth more than it first appears.

## Final Takeaway

A **526** in this setup is rarely just "an SSL problem" in the vague, everyday sense. More often, it is a sign that Cloudflare and GitHub Pages have drifted out of alignment during certificate validation or reprovisioning.

Once I framed it that way, the fix stopped feeling mysterious. Let GitHub Pages see the custom domain directly long enough to recover, verify that HTTPS is genuinely healthy at the origin layer, and only then reintroduce Cloudflare with settings that match the architecture instead of arguing with it.

If I were choosing from scratch today, I would be much less eager to place GitHub Pages behind Cloudflare proxying for a custom domain. It can work, until the day the certificate lifecycle asks the setup to prove itself again.
