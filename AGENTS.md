<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep gift redemption in a standalone reusable component, independent of the account page, so it can be placed elsewhere without losing its existing wallet flow.

- Manual mobile-money deposits (Wave CI, Orange CM) go through the generic public.create_manual_deposit / public.submit_manual_proof functions; a new country is a provider config in src/components/WaveCheckout.tsx, never a new SQL function.

- Team overview and invitee lists share the browser-safe query options in src/lib/team.ts so all three referral levels and first-purchase validity stay consistent without duplicating data access.
- Home action links use the reusable HomeActions component with source SVG icons and semantic gradient tokens to keep their proportions and styling consistent.
