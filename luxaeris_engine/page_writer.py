
from __future__ import annotations
from pathlib import Path
from jinja2 import Environment, BaseLoader, select_autoescape
from .utils import ensure_dir

BASE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="content-language" content="en">
  <meta name="language" content="English">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}</title>
  <meta name="description" content="{{ description }}">
  <meta name="robots" content="index, follow">\n  <meta name="theme-color" content="#1f1814">\n  <meta name="format-detection" content="telephone=no">
  <link rel="canonical" href="{{ canonical_url }}">
  <meta property="og:title" content="{{ title }}">
  <meta property="og:description" content="{{ description }}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{{ canonical_url }}">
  <meta property="og:image" content="{{ og_image }}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{{ title }}">
  <meta name="twitter:description" content="{{ description }}">
  <meta name="twitter:image" content="{{ og_image }}">
  <script type="application/ld+json">{{ schema | safe }}</script>
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon.svg">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon.svg">
  <link rel="shortcut icon" href="/assets/images/favicon.svg">
  <link rel="stylesheet" href="/assets/site.css">
  <script defer src="/assets/site.js"></script>
</head>
<body>
<div class="topbar"><div class="container topbar-inner"><span>No booking fees on quote requests</span><span>Business Class • First Class • Premium Economy</span></div></div>
<header class="site-header">
  <div class="container nav">
    <a class="logo-wrap" href="/index.html">
      <img class="logo-img" src="/assets/images/logo-header.png" alt="LuxAeris shield logo">
      <div><div class="brand-name">{{ site_name }}</div><div class="brand-tag">{{ brand_tagline }}</div></div>
    </a>
    <nav class="nav-links">
      <a href="/index.html">Home</a>
      <a href="/destinations/index.html">Destinations</a>
      <a href="/airlines/index.html">Airlines</a>
      <a href="/airports/index.html">Airports</a>
      <a href="/routes/index.html">Routes</a>
      <a href="/tools/index.html">Tools</a>
      <a href="/search.html">Search</a>
      <a class="btn btn-primary" href="/request.html">Request Quote</a>
    </nav>
  </div>
</header>
<a class="btn btn-primary floating-request" href="/request.html">Request Quote</a>
<main>
{% if page_type in ("destination","route") %}
<section class="lux-hero">
  <img src="{{ image_url }}" alt="{{ h1 }}">
  <div class="lux-hero-overlay"></div>
  <div class="container lux-hero-copy">
    <p class="kicker">{{ kicker }}</p>
    <h1>{{ h1 }}</h1>
    <p>{{ intro }}</p>
  </div>
</section>
<section class="section">
  <div class="container">
    <div class="lux-grid-3">
      {% for card in highlight_cards %}
      <article class="card"><h3>{{ card.title }}</h3><p>{{ card.text }}</p></article>
      {% endfor %}
    </div>
    <div class="feature-grid" style="margin-top:28px">
      <article class="panel">
        {% for section in sections %}
        <section class="lux-section">
          <h2>{{ section.title }}</h2>
          <p>{{ section.text }}</p>
          {% if section.links %}
          <div class="card-grid">
            {% for item in section.links[:8] %}
            <a class="card" href="{{ item.href }}" style="text-decoration:none"><h3>{{ item.label }}</h3><p>Open this related guide.</p></a>
            {% endfor %}
          </div>
          {% endif %}
        </section>
        {% endfor %}
      </article>
      <aside class="panel">
        <h2>{{ sidebar_title }}</h2>
        <p class="section-intro" style="max-width:none">{{ sidebar_text }}</p>
        <div class="card-grid" style="margin-top:18px">
          {% for item in related_links[:8] %}
          <a class="card" href="{{ item.href }}" style="text-decoration:none"><h3>{{ item.label }}</h3><p>Continue your premium travel research here.</p></a>
          {% endfor %}
        </div>
      </aside>
    </div>
  </div>
</section>
{% else %}
<section class="page-hero">
  <div class="container"><p class="kicker">{{ kicker }}</p><h1>{{ h1 }}</h1><p>{{ intro }}</p></div>
</section>
<section class="section" style="padding-top:0">
  <div class="container">
    <div class="feature-grid">
      <article class="panel">
        <img src="{{ image_url }}" alt="{{ h1 }}" style="width:100%;height:340px;object-fit:cover;border-radius:22px;border:1px solid var(--line)">
        {% for section in sections %}
        <section class="lux-section"><h2>{{ section.title }}</h2><p>{{ section.text }}</p>
          {% if section.links %}
          <div class="card-grid">{% for item in section.links[:8] %}<a class="card" href="{{ item.href }}" style="text-decoration:none"><h3>{{ item.label }}</h3><p>Open this related guide.</p></a>{% endfor %}</div>
          {% endif %}
        </section>
        {% endfor %}
      </article>
      <aside class="panel">
        <h2>{{ sidebar_title }}</h2><p class="section-intro" style="max-width:none">{{ sidebar_text }}</p>
        <div class="card-grid" style="margin-top:18px">{% for item in related_links[:8] %}<a class="card" href="{{ item.href }}" style="text-decoration:none"><h3>{{ item.label }}</h3><p>Open the related page.</p></a>{% endfor %}</div>
      </aside>
    </div>
  </div>
</section>
{% endif %}
</main>
<footer class="footer">
  <div class="container footer-grid">
    <div><strong>{{ site_name }}</strong><p>{{ brand_tagline }}</p></div>
    <div><strong>Explore</strong><p><a href="/destinations/index.html">Destinations</a><br><a href="/airlines/index.html">Airlines</a><br><a href="/routes/index.html">Routes</a><br><a href="/airports/index.html">Airports</a></p></div>
    <div><strong>Support</strong><p><a href="/contact.html">Contact</a><br><a href="/faq.html">FAQ</a><br><a href="/request.html">Request Quote</a></p></div>
    <div><strong>Company</strong><p><a href="/about.html">About</a><br><a href="/privacy-policy.html">Privacy Policy</a><br><a href="/terms-and-conditions.html">Terms & Conditions</a><br><a href="/cookie-policy.html">Cookie Policy</a></p></div>
  </div>
</footer>
<div id="cookieBanner" class="cookie-banner" style="display:none"><div class="cookie-inner"><div><strong style="color:#fff8f1">Cookie notice</strong><p>LuxAeris uses cookies and similar technologies to improve site functionality, remember preferences, and understand website usage.</p></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-secondary" id="cookieReject" type="button">Reject</button><button class="btn btn-primary" id="cookieAccept" type="button">Accept</button></div></div></div>
</body></html>"""

env = Environment(loader=BaseLoader(), autoescape=select_autoescape(enabled_extensions=("html",)))
def write_page(output_root: Path, rel_path: str, context: dict) -> None:
    template = env.from_string(BASE_TEMPLATE)
    html = template.render(**context)
    path = output_root / rel_path
    ensure_dir(path.parent)
    path.write_text(html, encoding="utf-8")
