# Nate&Co Animated Orbital Observatory Logo Pack

Built from the uploaded `nateandco-primary-horizontal.svg` template.

## Files

- `assets/svg/nateandco-primary-horizontal-static.svg`
  - Your original uploaded template, preserved unchanged.

- `assets/svg/nateandco-primary-horizontal-animated.svg`
  - Main animated horizontal logo.

- `assets/svg/nateandco-icon-animated.svg`
  - Animated icon-only version.

- `assets/css/nateandco-logo.css`
  - Optional helper CSS for sizing/embedding.

- `demo/index.html`
  - Standalone preview page.

## Recommended website usage

For the homepage hero:

```html
<object
  class="nateco-logo-embed nateco-logo-embed--hero"
  data="assets/svg/nateandco-primary-horizontal-animated.svg"
  type="image/svg+xml">
</object>
```

For static nav/header use, keep using a non-animated logo to avoid visual noise.

## Motion behaviour

The SVG includes:

- slow clockwise outer orbit
- slower counter-rotating inner orbit
- pulsing signal node
- soft beacon blink
- `prefers-reduced-motion` support

## Important note

If you embed the SVG using `<img>`, many browsers still animate inline SVG styles, but `<object>` or inline SVG gives the most reliable animation behaviour.
