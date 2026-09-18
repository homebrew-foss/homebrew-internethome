---
date: "2026-02-02"
title: "Rolling your own links+ash"
tags: [linkstash, meta, serverless, matrix, go, HSP]
description: "This post is about an experiment I ran for our student tech community (HSP) to collect and archive links we share"
permalink: posts/{{ title | slug }}/index.html
author_name: "Nathan Paul"
author_link: "https://polarhive.net"
---

# This post talks about my linkstash workflow and the small tools I built around it

So, I help run a student tech community called [HSP](https://hsp-ec.xyz). We talk about cool stuff and share interesting links and articles we find during the week. I thought of an idea or rather an experiment that helps us maintain a neat list of all the links that were shared this week. HSP is all about knowledge sharing and building things in public. ref: *["Working with the Garage Door up"](https://notes.andymatuschak.org/About_these_notes?stackedNotes=zCMhncA1iSE74MKKYQS5PBZ)*

Unfortunately, WhatsApp is our primary means of communication in college, it is very convenient --- all our college groups rely on it, and not to mention apps such as Discord / Telegram may get blocked on college WiFi depending on the university IT policy.

![A post shared in our WhatsApp community](https://polarhive.net/blog/linkstash/wa.png)

> *We primarily share links on our HSP Mentor+Mentee group chat and it spirals into cool discussions held loosely by half-broken reply threads.*

WhatsApp offers no public developer API. One way of collating links could be: exporting chats at the end of the week and running a python script to filter links? or forcing everyone onto a different platform. This feels like friction --- I wanted something that would collect links automatically and show up instantly in a simple public-facing web interface.

# Alternatives?

I don't want to setup a machine dedicated to running an android VM and re-exporting chats will take a lot of time, I'd want it to show up on the linkstash instantly. P.S. You can also implement userbots that puppets your personal WhatsApp account.

> [linkstash.hsp-ec.xyz](https://linkstash.hsp-ec.xyz) grew out of this experiment!

![alt text](https://polarhive.net/blog/linkstash/image.png)

What you see here is a tiny PWA for bookmarking and offline reading that plugs into a couple of helper tools I wrote: `ash` and `lava`

# Ingredients

- [`/ash`](https://polarhive.net/blog/linkstash/ash)  is a lightweight [matrix] client that watches all my chats (WhatsApp is where most of the club groups are at)
- [`/lava`](https://polarhive.net/blog/linkstash/lava) is a HTML to markdown parser that works over an API, it uses the Defuddle (Obsidian Web Clipper) library for all the heavy work
- [`linkstash.hsp-ec.xyz`](https://linkstash.hsp-ec.xyz) our club linkstash ^^

Each of these tools work independently, but When combined with [/lava](https://polarhive.net/blog/linkstash/lava) (a daemon for clipping markdown) and [/ash](https://polarhive.net/blog/linkstash/ash) ([matrix] client for link extraction), it forms a complete personal web archiving pipeline.

I use it to archive the web, organize my reading queue, share links with others, and it pairs nicely with my existing UNIX-based workflow. Borrowing from the Obsidian philosophy, it does one thing and does it well. Checkout my blog post on how I use [Obsidian](https://polarhive.net/blog/obsidian) for more context.

## What you'll need

- `vps/homeserver` for running ash 24/7
- `beeper` [matrix] server that helps bridge all my chat-apps
- `render` for running lava over an API
- `ash` [matrix] client/bot that watches bridged beeper rooms and extracts links
- `lava` HTML→Markdown extractor (can also run as a daemon and saves clippings)
- `linkstash` the web app and API that stores links and provides a PWA reader

---

## 1. lava: clipping daemon

Lava watches a designated file for example, `todo.md` and processes new URLs as you add them. It saves extracted content as Markdown with YAML frontmatter, so clippings drop straight into your Obsidian vault.

Example: I dump a link I find into my `todo.md` file

```bash
[mint:polarhive/lava]$ bun start --daemon
[INFO] Processing 1 link(s) initially...
[INFO] Processing 1 link(s) [parser=puppeteer, format=md, save=yes]
[INFO] ✓ Saved: /Users/polarhive/.config/obsidian/wiki/clippings/lava/nk521-ncmc-transit-card-_notes_on_ncmc_transit_cards_infra_+_my_assumptions.md
[INFO] Processed: https://github.com/nk521/ncmc-transit-card
[INFO] ✓ Checked off [1/1]: https://github.com/nk521/ncmc-transit-card
[INFO] All links processed.
[INFO] 🌋 Lava is watching for new links (parser: puppeteer)...
```

### Mobile workflow

The VPS / PC that runs lava: watches a links file for changes. Processes new links immediately and marks them as handled

![alt text](https://polarhive.net/blog/linkstash/sync.png)

Run Lava as a background daemon, use your phone’s Share/Share Sheet to append links to `todo.md`, and let the daemon do the rest. Since the file syncs (git, Dropbox, Syncthing, etc.), processed clippings appear on every device.

You could also map a key in `niri/sway` or your WM or your choice to dump all URLs to a todo.md file when you're on a PC.

```bash
echo "https://example.com" >> todo.md
```

The cool part, this runs asynchronously! your vault will have an offline and durable collection of all the links your want to read on the go!

## 2. ash — [matrix] link extractor

[/ash](https://polarhive.net/blog/linkstash/ash) is a small [matrix] bot (written in Go) that monitors rooms, extracts URLs from messages, and forwards them (via webhook) to Linkstash or other services.

> Matrix is a federated, open protocol for real-time communication. Rooms have event histories and, for rooms the bot is in, [/ash](https://polarhive.net/blog/linkstash/ash) can read events, parse URLs, and capture links without relying on any third-party scraping service.

- [/ash](https://polarhive.net/blog/linkstash/ash) will read configured rooms off `config.json` and filter messages by room
- Dump room messages to a local SQLite log
- Extract URLs and `POST` them to a webhook (e.g., linkstash’s `/api/add`)
- Optionally respond to simple `/bot` commands in monitored rooms

You can either use this like me, for managing cool communities, read links that were sent to yourself, or run a userbot from any chat!

### Hooks

![alt text](https://polarhive.net/blog/linkstash/ash.png)

> You can swap this hook out for any other API/Slack/Discord webhook of your choice.

### Userbots

You can also implement a userbot that puppets your personal WhatsApp account.

![](https://polarhive.net/blog/linkstash/beeper.jpg)

---

# Tech Stack

This workflow is custom-built and opinionated; I've managed to create a workflow that mitigates any limitations and works seamlessly on a free-tier with my existing tools. Links are stored in Turso (SQLite-compatible), content is cached locally in the browser, and it integrates with my remotely-based backup system for my vault.

Linkstash relies on your browser's localStorage and Service Worker to cache content offline! As long as you have the data on your device, it works within this workflow.

This post is much less about Linkstash in of itself; but how it works well with my current linux workflow. You'll notice this as I flesh out my usecases but first: let's see what's under the hood!

![alt text](https://polarhive.net/blog/linkstash/reader.png)

## Reader mode

The reader is a distraction-free renderer with Markdown, image proxying, and touch navigation. There’s a small admin UI (protected by an auth key) for deleting items, viewing the queue, and managing the DB when needed.

## Clubs and your tech community

Linkstash can be used for small communities: shared collections, voting, comments, and curated topic lists. Hosting and privacy are managed by the club, not by a central platform.

- Self-hosted: you control the bot and data
- Private: no third-party analytics or lock-in
- Customizable: add commands or integrations that suit your workflow

This setup keeps discovery friction low (share a link once), keeps storage simple (JSON/SQLite), and gives you multiple ways to consume content (PWA, Obsidian clippings, JSON exports). It’s intentionally small and durable --- the sort of tool I want to keep running for years.

PS. I was inspired to blog about this after attending a CLI Heroes meetup last Saturday. A bunch of cool Obsidian users and I thought this would be really cool!

## Privacy

Ash only reads rooms you explicitly configure. Webhooks point to your infrastructure, so the content stays under your control.

```json
{
	"MATRIX_HOMESERVER": "https://matrix.org",
	"MATRIX_USER": "@user:matrix.org",
	"MATRIX_ROOM_ID": [{ "id": "!room:matrix.org", "comment": "My Room" }]
}
```

## Pipeline

1. Discovery: links sent over WhatsApp chats appear in [matrix]
2. Collect: [/ash](https://polarhive.net/blog/linkstash/ash) extracts URLs and forwards them to Linkstash if they're on a whitelist
3. Parse: linkstash forwards the URL to lava and waits for a md + response
4. Store: linkstash saves metadata in Turso
5. Consume: The PWA reader fetches content and caches for offline reading

---

## Extensibilty

Add a link via the web UI or the API; devices sync with Turso and you can export the DB or content. I often use scripts locally to dump `json`/`md` from my browser bookmarks and other notes which have a bunch of links.

The app is simple to self-host: Vercel/Render. Set environment variables for the auth key and your database URL and you’re good to go.

*--- Happy Hacking!*

---
> Originally published at [https://polarhive.net/blog/linkstash/](https://polarhive.net/blog/linkstash) and syndicated here.
