# Hope, Inc. Design Tokens

The design-system showcase is in `index.html`; its styles and token definitions are in `style.css`. Treat the custom properties in the `:root` blocks as the source of truth when implementing Hope, Inc. interfaces.

## Use tokens by role

Reference custom properties with CSS `var()` rather than copying their current literal values into feature styles. This keeps components consistent and lets theme changes flow through automatically.

| Purpose | Tokens |
| --- | --- |
| Page and component surfaces | `--bg` for the page, `--surface` for raised content and controls, `--soft` for subtle fills and hover states |
| Text and outlines | `--text`, `--muted`, `--border` |
| Primary actions and focus | `--accent`, `--accent-dark` for hover, `--accent-light` for subtle emphasis, `--on-accent` for text on the accent fill, `--focus-ring` |
| Secondary emphasis | `--sun`, `--sun-light` |
| Feedback | `--danger`; `--color-success` / `--color-success-bg`, `--color-warning` / `--color-warning-bg`, `--color-danger-bg`, `--color-info` / `--color-info-bg` |
| Typography | `--font`; `--font-xs`, `--font-sm`, `--font-lg`, `--font-xl`, `--font-2xl`, `--font-3xl`, `--font-4xl` |
| Layout and shape | `--space-2`, `--space-3`, `--space-4`; `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-pill` |
| Shared dimensions and elevation | `--control-height`, `--shadow-md` |

Choose tokens by meaning, not by appearance. For example, use the warning pair for pending status rather than selecting a yellow value directly. Keep text/background pairs together so contrast remains appropriate in both themes.

## Component examples

```css
.primary-action {
  min-height: var(--control-height);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--accent);
  border-radius: var(--radius-md);
  background: var(--accent);
  color: var(--on-accent);
}

.content-panel {
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  color: var(--text);
}

.primary-action:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.status-pending {
  color: var(--color-warning);
  background: var(--color-warning-bg);
}
```

Use the typography tokens for headings, labels, and supporting content instead of creating parallel size scales. Keep component-specific spacing when it is necessary, but use the shared spacing tokens for common gaps and padding.

## Themes

The default `:root` values are the light theme. The `:root[data-theme="dark"]` block overrides semantic tokens for dark surfaces, text, borders, accents, status colors, and shadows. Production pages should switch the `data-theme` attribute on the document root to `dark` or remove it for light mode. Do not copy the showcase's `:has(#ds-theme-toggle:checked)` selector into product pages; it exists only to make the standalone demo toggle work without application state.

If an implementation needs a reusable value that has no matching token, add or agree on a semantic token in `style.css` and define its theme value there rather than introducing a one-off color or design scale in the component.