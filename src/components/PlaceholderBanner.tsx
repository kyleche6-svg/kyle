import { Warning } from "@phosphor-icons/react/dist/ssr";

export function PlaceholderBanner() {
  return (
    <div className="mb-8 flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
      <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
      <span>
        <strong className="font-semibold">[PLACEHOLDER]</strong> This page is
        draft content generated for structure only. It is not binding legal
        language and must be reviewed and replaced by a licensed attorney
        before this site accepts real payments or real users.
      </span>
    </div>
  );
}
