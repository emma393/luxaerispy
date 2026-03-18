from __future__ import annotations
from pathlib import Path
from jinja2 import Environment, BaseLoader, select_autoescape
from .utils import ensure_dir

BASE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}</title>
  <meta name="description" content="{{ description }}">
  <meta name="robots" content="index, follow">
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
  <link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<header class="site-header"><div class="container nav">
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
  <a href="/cabins/index.html">Cabins</a>
  <a href="/tools/index.html">Tools</a>
  <a href="/search.html">Search</a>
  <a class="btn btn-primary" href="/request.html">Request Quote</a>
</nav></div></header>

<main class="container">
  <section class="page-hero">
    <p class="kicker">Guide</p>
    <h1>{{ h1 }}</h1>
    <p>{{ intro }}</p>
  </section>

  <section class="feature-grid">
    <article class="panel">
      <div class="card">
        <img src="{{ image_url }}" alt="{{ h1 }}" style="width:100%;height:320px;object-fit:cover;border-radius:20px;border:1px solid rgba(255,255,255,.08);">
      </div>
      {% for section in sections %}
      <section class="card" style="margin-top:18px;">
        <h2>{{ section.title }}</h2>
        <p>{{ section.text }}</p>
        {% if section.links %}
        <ul>
          {% for item in section.links %}
          <li><a href="{{ item.href }}">{{ item.label }}</a></li>
          {% endfor %}
        </ul>
        {% endif %}
      </section>
      {% endfor %}
    </article>

    <aside class="panel">
      <div class="card">
        <h3>Request a premium quote</h3>
        <p>Move from research into a tailored premium itinerary with LuxAeris.</p>
        <a class="btn btn-primary" href="{{ request_quote_url }}">Open request form</a>
      </div>
      {% if related_links %}
      <div class="card" style="margin-top:18px;">
        <h3>Related pages</h3>
        <ul>
          {% for item in related_links %}
          <li><a href="{{ item.href }}">{{ item.label }}</a></li>
          {% endfor %}
        </ul>
      </div>
      {% endif %}
    </aside>
  </section>
</main>

<footer class="footer"><div class="container footer-grid">
<div><strong>{{ site_name }}</strong><p>Luxury business class, first class, and premium travel research with structured route, airport, and airline guides.</p></div>
<div><strong>Explore</strong><p><a href="/destinations/index.html">All destinations</a><br><a href="/airlines/index.html">Airlines</a><br><a href="/routes/index.html">Routes</a></p></div>
<div><strong>Guides</strong><p><a href="/cabins/index.html">Cabins</a><br><a href="/airports/index.html">Airports</a><br><a href="/search.html">Search</a></p></div>
<div><strong>Quote</strong><p><a href="/request.html">Open request form</a></p></div>
</div></footer>
</body>
</html>
"""

env = Environment(loader=BaseLoader(), autoescape=select_autoescape(enabled_extensions=("html",)))

def write_page(output_root: Path, rel_path: str, context: dict) -> None:
    template = env.from_string(BASE_TEMPLATE)
    html = template.render(**context)
    path = output_root / rel_path
    ensure_dir(path.parent)
    path.write_text(html, encoding="utf-8")
