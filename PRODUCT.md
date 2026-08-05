# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Reframed (this session) toward professional/institutional-style users — analysts, desk traders, and finance professionals who expect terminal-grade tooling — rather than casual retail. Still self-serve subscription (no enterprise sales motion exists), so the audience is a professional working alone or on a small team, not a procurement-gated institution. Comfortable with financial terminology (tickers, forex pairs, analyst ratings, EPS, PEG ratios) and expects density and precision over hand-holding.

## Product Purpose

A market-intelligence dashboard that surfaces what a professional would otherwise piece together across a Bloomberg-style terminal, compliance feeds, and a research desk: USD/forex/commodity price movement, congressional stock trade disclosures (STOCK Act filings), and market-moving social posts correlated with historical price reaction. Subscription SaaS gated by Stripe (self-serve, not enterprise sales).

## Positioning

Correlates public information (politician trades, market-moving posts, economic calendar) with price action in one place, without ever generating its own buy/sell predictions — a hard constraint the product owner set explicitly. Real third-party analyst consensus data (Buy/Hold/Sell ratings, price targets) is displayed and attributed; the app never outputs its own forecast. Positioning is professional-grade tooling, not a claim of institutional/bank customers — no such customers exist yet (see Evidence on Hand); the tone is aimed at how a finance professional works, not who currently uses the product.

## Operating Context

Web app, dark-mode only (financial-terminal category convention, confirmed by product owner). Core authenticated surfaces: USD/commodities dashboard with economic calendar, stock screener with analyst consensus, congressional trade tracker, market-moving tweet tracker. Public surfaces: landing page, two-tier pricing (monthly/yearly), legal pages (Terms/Privacy/Disclaimer/Refund — currently attorney-review placeholders).

## Capabilities and Constraints

- Auth: email/password (NextAuth Credentials), bot-protected (Cloudflare Turnstile), rate-limited.
- Billing: Stripe Checkout + Customer Portal, monthly $12.99 / yearly $99.99.
- Data sources: Twelve Data (forex/commodities/stocks, free tier, mock fallback when unconfigured), X API (tweet tracking, pay-per-use, mock fallback), no free official source exists for congressional trades or economic calendar (mock data, documented as a follow-up).
- Hard constraint, explicitly stated by the product owner: the app must never generate or display its own "this will go up/down" predictions or personalized investment advice. "Not financial advice" disclaimer required on any page showing tickers, trades, or patterns.
- Legal copy is placeholder-only pending attorney review.

## Brand Commitments

- Name: DollarWatch (working title, may change).
- Visual world already established this session (not being replaced by this init): dark background (#020617), elevated panel surface (#0e1223), indigo-blue accent (#5e6ad2) for interactive elements only, semantic green (#22c55e) / red (#ef4444) reserved strictly for gain/loss indicators (never used as decoration), Geist Sans for UI text, Geist Mono strictly for numeric/data values (prices, tickers, tabular figures), Phosphor icons (outline, regular weight) throughout. Explicitly rejected: cyberpunk/HUD/neon-glow/scanline aesthetics, despite "fintech dashboard" sometimes trending that direction — product owner confirmed flat/restrained direction instead.

## Evidence on Hand

No real customer testimonials, logos, or press exist yet (pre-launch). Do not fabricate them; any social-proof section must be marked synthetic/placeholder or omitted. Stock/analyst/politician-trade/economic-event data on non-billing pages is mock or on-demand-generated, clearly labeled as such in-product.

## Product Principles

1. Never generate investment predictions or advice — only display real, attributed third-party data.
2. Financial-terminal restraint over decoration: the data is the interface, not chrome around it.
3. Every mock/placeholder data source is visibly labeled as such, never presented as if it were live/real without qualification.
4. Extend the already-established visual world rather than reinventing it per-surface.

## Accessibility & Inclusion

No formal standard specified by the product owner yet. Financial data tables should remain legible (WCAG AA contrast minimum) given the target user reads dense numeric tables.
