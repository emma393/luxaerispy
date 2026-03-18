
from __future__ import annotations
from pathlib import Path
from jinja2 import Environment, BaseLoader, select_autoescape
from .utils import ensure_dir, canonical

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
<header class="site-header">
  <div class="container">
    <a href="/index.html">{{ site_name }}</a>
    <nav>
      <a href="/destinations/index.html">Destinations</a>
      <a href="/airports/index.html">Airports</a>
      <a href="/routes/index.html">Routes</a>
      <a href="/airlines/index.html">Airlines</a>
      <a href="/lounges/index.html">Lounges</a>
      <a href="/aircraft/index.html">Aircraft</a>
      <a href="/request.html">Request Quote</a>
    </nav>
  </div>
</header>

<main class="container">
  <section class="hero">
    <h1>{{ h1 }}</h1>
    <p>{{ intro }}</p>
  </section>

  <section class="content-grid">
    <article class="primary">
      {% for section in sections %}
      <section class="content-block">
        <h2>{{ section.title }}</h2>
        <p>{{ section.text }}</p>
        {% if section.items %}
        <ul>
          {% for item in section.items %}
          <li><a href="{{ item.href }}">{{ item.label }}</a></li>
          {% endfor %}
        </ul>
        {% endif %}
      </section>
      {% endfor %}
    </article>

    <aside class="sidebar">
      <div class="card">
        <img src="{{ image_url }}" alt="{{ h1 }}" style="width:100%;border-radius:16px;">
      </div>
      <div class="card">
        <h3>Request a premium quote</h3>
        <p>Move from research into a tailored premium itinerary with LuxAeris.</p>
        <a href="{{ request_quote_url }}">Open request form</a>
      </div>
      {% if related_links %}
      <div class="card">
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

<footer class="site-footer">
  <div class="container">
    <p>{{ site_name }} — {{ brand_tagline }}</p>
  </div>
</footer>
</body>
</html>
"""

env = Environment(
    loader=BaseLoader(),
    autoescape=select_autoescape(enabled_extensions=("html",))
)

def write_page(output_root: Path, rel_path: str, context: dict) -> None:
    template = env.from_string(BASE_TEMPLATE)
    html = template.render(**context)
    path = output_root / rel_path
    ensure_dir(path.parent)
    path.write_text(html, encoding="utf-8")
