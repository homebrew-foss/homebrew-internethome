---
layout: base.njk
title: Homebrew Webring
---

# Homebrew Webring

Welcome to the Homebrew Webring! This is a collection of FOSS communities and sites dedicated to open source software and knowledge sharing.

## What is a Webring?

> *A webring is a collection of websites linked together in a circular structure, allowing visitors to navigate from one site to the next. It's a way to discover and explore related communities and projects.*

## Sites in the Ring
  
{%- for group in sites.ring %}
<h3 class="webring-group-title">{{ group.org }}</h3>
<div class="webring-grid">
{%- for site in group.sites %}
<div class="webring-card">
  <a href="{{ site.url }}" class="webring-card-link" target="_blank" rel="noopener noreferrer">
    <div class="webring-card-header">
      {%- if site.favicon %}
      <img class="webring-favicon" src="{{ site.favicon }}" alt="" width="16" height="16" onerror="this.style.display='none'" />
      {%- else %}
      <img class="webring-favicon" src="https://www.google.com/s2/favicons?domain={{ site.url }}&sz=32" alt="" width="16" height="16" onerror="this.style.display='none'" />
      {%- endif %}
      <h4 class="webring-card-title">{{ site.title }}</h4>
    </div>
    <p class="webring-card-url">{{ site.url | remove: 'https://' | remove: 'http://' }}</p>
  </a>
  {%- if site.blog and site.blog.size > 0 %}
  <div class="webring-feeds">
    {%- for feed in site.blog %}
    <a href="{{ feed.url }}" class="webring-feed-badge" target="_blank" rel="noopener noreferrer">{{ feed.title }}</a>
    {%- endfor %}
  </div>
  {%- endif %}
</div>
{% endfor %}
</div>
{% endfor %}

## Want to Join the Webring?

To add your site to the Homebrew Webring, please:

1. Make sure your site focuses on tech, knowledge sharing and open source technologies
2. Add the webring navigation links to your footer
3. [Open a PR](https://github.com/homebrew-foss/homebrew-internethome/) to request inclusion

Here's a snippet you can add to your footer HTML:

```html
<div class="webring-section">
  <div class="webring-header">
    <h3><a href="https://homebrew.hsp-ec.xyz/webring">Homebrew Webring</a></h3>
  </div>
  <div class="webring-nav">
    <a href="https://homebrew.hsp-ec.xyz/ring/prev?site=YOUR_SITE_URL" class="webring-link">← Previous</a>
    <a href="https://homebrew.hsp-ec.xyz/ring/random?site=YOUR_SITE_URL" class="webring-link">🔀 Random</a>
    <a href="https://homebrew.hsp-ec.xyz/ring/next?site=YOUR_SITE_URL" class="webring-link">Next →</a>
  </div>
</div>
```

Replace `YOUR_SITE_URL` with your website's URL (e.g., `https://yoursite.com`).


The webring helps create a community of like-minded developers and enthusiasts sharing their knowledge and passion for open source.


