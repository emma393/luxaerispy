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
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon-16.png">
  <link rel="shortcut icon" href="/assets/images/favicon.ico">
  <link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<header class="site-header">
  <div class="container nav">
    <a class="logo-wrap" href="/index.html">
      <img class="logo-img" src="/assets/images/logo-header.png" alt="LuxAeris shield logo">
      <div>
        <div class="brand-name">{{ site_name }}</div>
        <div class="brand-tag">{{ brand_tagline }}</div>
      </div>
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
    </nav>
  </div>
</header>
<main>
  <section class="page-hero">
    <div class="container">
      <p class="kicker">Guide</p>
      <h1>{{ h1 }}</h1>
      <p>{{ intro }}</p>
    </div>
  </section>
  <section class="section" style="padding-top:0">
    <div class="container">
      <div class="feature-grid">
        <article class="panel">
          <img src="{{ image_url }}" alt="{{ h1 }}" style="width:100%;height:340px;object-fit:cover;border-radius:22px;border:1px solid var(--line)">
          <div class="card-grid" style="grid-template-columns:1fr; margin-top:18px">
            {% for section in sections %}
            <section class="card">
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
          </div>
        </article>
        <aside class="panel">
          <h2 style="font-family:Georgia,serif">Next useful pages</h2>
          <p class="section-intro" style="max-width:none">Use these related pages to move from general browsing into a clearer premium booking decision.</p>
          {% if related_links %}
          <div class="card-grid" style="grid-template-columns:1fr; margin-top:18px">
            {% for item in related_links %}
            <a class="card" href="{{ item.href }}" style="text-decoration:none">
              <h3>{{ item.label }}</h3>
              <p>Open the related page.</p>
            </a>
            {% endfor %}
          </div>
          {% endif %}
          <p style="margin-top:18px"><a class="btn btn-primary" href="{{ request_quote_url }}">Open request form</a></p>
        </aside>
      </div>
    </div>
  </section>
</main>
<footer class="footer">
  <div class="container footer-grid">
    <div><strong>{{ site_name }}</strong><p>{{ brand_tagline }}</p></div>
    <div><strong>Explore</strong><p><a href="/destinations/index.html">Destinations</a><br><a href="/routes/index.html">Routes</a><br><a href="/airports/index.html">Airports</a><br><a href="/airlines/index.html">Airlines</a></p></div>
    <div><strong>Support</strong><p><a href="/contact.html">Contact</a><br><a href="/faq.html">FAQ</a><br><a href="/request.html">Request Quote</a></p></div>
    <div><strong>Company</strong><p><a href="/about.html">About</a><br><a href="/privacy-policy.html">Privacy Policy</a><br><a href="/terms-and-conditions.html">Terms & Conditions</a><br><a href="/cookie-policy.html">Cookie Policy</a></p></div>
  </div>
  <div class="container legal-links">
    <a href="/about.html">About</a>
    <a href="/contact.html">Contact</a>
    <a href="/privacy-policy.html">Privacy Policy</a>
    <a href="/terms-and-conditions.html">Terms & Conditions</a>
    <a href="/cookie-policy.html">Cookie Policy</a>
    <a href="/disclaimer.html">Disclaimer</a>
    <a href="/faq.html">FAQ</a>
    <a href="/sitemap-page.html">Sitemap</a>
  </div>
</footer>
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
